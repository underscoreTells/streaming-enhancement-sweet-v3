import { Logger } from 'winston';
import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { IrcMessageParser } from './IrcMessageParser';
import type { IrcMessage, IrcTags } from './types';

export interface IrcClientOptions {
  url?: string;
  nick?: string;
  token?: string;
  reconnectBaseDelay?: number;
  maxReconnectAttempts?: number;
}

export class IrcClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private reconnectBaseDelay = 1000;
  private maxReconnectAttempts = 10;

  private readonly defaultUrl = 'wss://irc-ws.chat.twitch.tv:443';
  private readonly options: Required<IrcClientOptions>;

  private connected = false;
  private authenticated = false;

  constructor(
    private logger: Logger,
    options: IrcClientOptions = {}
  ) {
    super();
    this.options = {
      url: options.url ?? this.defaultUrl,
      nick: options.nick ?? '',
      token: options.token ?? '',
      reconnectBaseDelay: options.reconnectBaseDelay ?? 1000,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 10,
    };
    
    this.reconnectBaseDelay = this.options.reconnectBaseDelay;
    this.maxReconnectAttempts = this.options.maxReconnectAttempts;
  }

  async connect(nick: string, token: string): Promise<void> {
    this.options.nick = nick;
    this.options.token = token;

    this.logger.info(`IrcClient connecting as ${this.options.nick}`);
    
    return new Promise<void>((resolve, reject) => {
      const connectionTimeout = setTimeout(() => {
        this.disconnect();
        reject(new Error('IRC connection timeout: authentication not completed'));
      }, 30000); // 30 second timeout

      const cleanup = () => {
        clearTimeout(connectionTimeout);
      };

      const onConnected = () => {
        cleanup();
        resolve();
      };

      const onError = (error: Error) => {
        cleanup();
        this.removeListener('connected', onConnected);
        this.removeListener('error', onError);
        reject(error);
      };

      this.once('connected', onConnected);
      this.once('error', onError);

      this.ws = new WebSocket(this.options.url);

      this.ws.on('open', () => this.onOpen());
      this.ws.on('message', (data) => this.onMessage(data as Buffer));
      this.ws.on('close', (code, reason) => {
        cleanup();
        this.removeListener('connected', onConnected);
        this.removeListener('error', onError);
        this.onClose(code, reason);
      });
      this.ws.on('error', (error) => {
        cleanup();
        this.removeListener('connected', onConnected);
        this.removeListener('error', onError);
        this.onError(error);
      });
      this.ws.on('ping', () => this.onPing());
      this.ws.on('pong', () => this.onPong());
    });
  }

  private onOpen() {
    this.connected = true;
    this.authenticated = false;
    this.logger.info('IRC WebSocket connected');
    
    // Send authentication
    this.authenticate();
  }

  private authenticate() {
    if (!this.options.token || !this.options.nick) {
      this.logger.error('Cannot authenticate: missing token or nick');
      return;
    }

    // Send PASS command (token)
    this.sendRaw(`PASS oauth:${this.options.token}`);
    
    // Send NICK command
    this.sendRaw(`NICK ${this.options.nick}`);
  }

  private onMessage(data: Buffer) {
    const lines = data.toString().split('\r\n');
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      try {
        const message = IrcMessageParser.parse(line);
        this.handleMessage(message);
      } catch (err) {
        this.logger.error('Failed to parse IRC message:', err);
      }
    }
  }

  private handleMessage(message: IrcMessage) {
    this.emit('raw', message);

    switch (message.command) {
      case '001':
      case '002':
      case '003':
        this.logger.debug(`IRC ${message.command}: ${message.params[1]}`);
        break;
      
      case '376':
        this.logger.info('IRC connection ready');
        this.authenticated = true;
        this.emit('connected');
        break;

      case 'PRIVMSG':
        this.handlePrivMsg(message);
        break;

      case 'PING':
        this.sendRaw(`PONG ${message.params[0]}`);
        break;

      case 'NOTICE':
        this.handleNotice(message);
        break;

      default:
        this.logger.debug(`IRC command: ${message.command}`, message.params);
    }
  }

  private handlePrivMsg(message: IrcMessage) {
    const channel = message.params[0];
    const content = message.params[1] || '';
    const tags = message.tags as IrcTags || {};
    
    const chatData = {
      channel,
      content,
      displayName: tags['display-name'] || '',
      userId: tags['user-id'] || '',
      badges: tags.badges || '',
      color: tags.color || '',
      emotes: tags.emotes || '',
      timestamp: tags['tmi-sent-ts'] || Date.now().toString(),
    };

    this.emit('chat', chatData);
  }

  private handleNotice(message: IrcMessage) {
    if (!message.params[1]?.startsWith('Login unsuccessful')) {
      this.logger.debug(`IRC NOTICE: ${message.params[1]}`);
    } else {
      this.logger.error('IRC authentication failed', { message: message.params[1] });
      this.disconnect();
    }
  }

  private onClose(code: number, reason: Buffer) {
    this.logger.info(`IRC WebSocket closed: ${code} - ${reason.toString()}`);
    this.connected = false;
    this.authenticated = false;
    
    if (code !== 1000) {
      this.scheduleReconnect();
    }
  }

  private onError(error: Error) {
    this.logger.error('IRC WebSocket error:', error);
  }

  private onPing() {
    // ws handles PONG automatically
  }

  private onPong() {
    this.logger.debug('IRC PONG received');
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error(`IRC max reconnect attempts reached (${this.maxReconnectAttempts})`);
      this.emit('error', new Error('Max reconnection attempts reached'));
      return;
    }

    const delay = this.reconnectBaseDelay * Math.pow(2, this.reconnectAttempts) + Math.random() * 1000;

    this.logger.info(`IRC reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(this.options.nick, this.options.token).catch((error) => {
        this.logger.error('IRC reconnection failed:', error);
      });
    }, delay);
  }

  join(channel: string) {
    if (!this.connected || !this.authenticated) {
      this.logger.warn('IRC not connected or authenticated, cannot join channel');
      return;
    }
    
    this.sendRaw(`JOIN #${channel.replace(/^#/, '')}`);
  }

  leave(channel: string) {
    if (!this.connected) {
      this.logger.warn('IRC not connected, cannot leave channel');
      return;
    }
    
    this.sendRaw(`PART #${channel.replace(/^#/, '')}`);
  }

  sendMessage(channel: string, message: string) {
    if (!this.connected || !this.authenticated) {
      this.logger.warn('IRC not connected or authenticated, cannot send message');
      return;
    }
    
    this.sendRaw(`PRIVMSG #${channel.replace(/^#/, '')} :${message}`);
  }

  private sendRaw(message: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(`${message}\r\n`);
      this.logger.debug(`IRC sent: ${message}`);
    } else {
      this.logger.warn('IRC not ready to send message');
    }
  }

  disconnect() {
    this.logger.info('IRCClient disconnecting');
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Graceful shutdown');
      this.ws = null;
    }
    
    this.connected = false;
    this.authenticated = false;
    this.reconnectAttempts = 0;
  }

  isConnected(): boolean {
    return this.connected && this.authenticated;
  }
}
