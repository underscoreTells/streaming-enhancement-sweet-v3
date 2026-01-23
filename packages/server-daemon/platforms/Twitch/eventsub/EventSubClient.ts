import { Logger } from 'winston';
import { EventEmitter } from 'events';
import WebSocket from 'ws';
import type { EventSubMessage, SessionWelcome, SessionReconnect } from './types';

export interface EventSubClientOptions {
  url?: string;
  keepaliveSafetyFactor?: number; // Default 2
  reconnectBaseDelay?: number; // Default 1000ms
  maxReconnectAttempts?: number; // Default 10
}

export class EventSubClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private oldWs: WebSocket | null = null; // Old connection during reconnect
  private sessionId: string | null = null;
  private reconnectUrl: string | null = null;
  private keepaliveTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  
  private readonly defaultUrl = 'wss://eventsub.wss.twitch.tv/ws';
  private readonly options: Required<EventSubClientOptions>;

  constructor(
    private logger: Logger,
    options: EventSubClientOptions = {}
  ) {
    super();
    this.options = {
      url: options.url ?? this.defaultUrl,
      keepaliveSafetyFactor: options.keepaliveSafetyFactor ?? 2,
      reconnectBaseDelay: options.reconnectBaseDelay ?? 1000,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 10,
    };
  }

  async connect(url?: string): Promise<void> {
    const connectUrl = url ?? this.options.url;
    
    this.logger.info(`EventSubClient connecting to ${connectUrl}`);
    
    return new Promise<void>((resolve, reject) => {
      const connectionTimeout = setTimeout(() => {
        this.disconnect();
        reject(new Error('EventSub connection timeout: no session_welcome received'));
      }, 30000); // 30 second timeout

      const cleanup = () => {
        clearTimeout(connectionTimeout);
      };

      const onConnected = (session: SessionWelcome) => {
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

      this.ws = new WebSocket(connectUrl);

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
    this.logger.info('EventSub WebSocket connected');
  }

  private onMessage(data: Buffer) {
    try {
      const message: EventSubMessage = JSON.parse(data.toString());
      this.handleTwitchMessage(message);
    } catch (err) {
      this.logger.error('Failed to parse EventSub message:', err);
    }
  }

  private onClose(code: number, reason: Buffer) {
    this.logger.info(`EventSub WebSocket closed: ${code} - ${reason.toString()}`);
    this.clearKeepaliveTimer();
    
    if (code >= 4000 && code <= 4007) {
      this.handleTwitchClose(code);
    } else if (code !== 1000) {
      this.scheduleReconnect();
    }
  }

  private onError(error: Error) {
    this.logger.error('EventSub WebSocket error:', error);
  }

  private onPing() {
    // ws handles PONG automatically (autoPong: true)
  }

  private onPong() {
    this.logger.debug('EventSub PONG received');
  }

  private handleTwitchMessage(message: EventSubMessage) {
    const messageType = message.metadata.message_type;
    
    switch (messageType) {
      case 'session_welcome':
        this.handleWelcome(message.payload as SessionWelcome);
        break;
      case 'session_keepalive':
        this.handleKeepalive();
        break;
      case 'session_reconnect':
        this.handleReconnect(message.payload as SessionReconnect);
        break;
      case 'notification':
        this.emit('notification', message);
        break;
      case 'revocation':
        this.emit('revocation', message);
        break;
      default:
        this.logger.warn(`Unknown message type: ${messageType}`);
    }
  }

  private handleWelcome(session: SessionWelcome) {
    this.logger.info('EventSub welcome received', { sessionId: session.id });
    this.sessionId = session.id;
    this.reconnectUrl = session.reconnect_url ?? null;
    
    this.resetKeepaliveTimer(session.keepalive_timeout_seconds);
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    
    // Close old connection if reconnecting
    if (this.oldWs) {
      this.logger.info('Closing old EventSub connection after successful reconnect');
      this.oldWs.close(1000, 'Reconnected');
      this.oldWs = null;
    }
    
    this.emit('connected', session);
  }

  private handleKeepalive() {
    this.logger.debug('EventSub keepalive received');
    this.resetKeepaliveTimer();
  }

  private resetKeepaliveTimer(timeoutSeconds?: number) {
    this.clearKeepaliveTimer();
    
    if (!this.sessionId) return;
    
    const timeoutMs = (timeoutSeconds ?? 10) * 1000 * this.options.keepaliveSafetyFactor;
    this.keepaliveTimer = setTimeout(() => {
      this.logger.warn('EventSub keepalive timeout - may disconnect');
    }, timeoutMs);
    
    this.logger.debug(`EventSub keepalive timer reset: ${timeoutMs}ms`);
  }

  private clearKeepaliveTimer() {
    if (this.keepaliveTimer) {
      clearTimeout(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
  }

  private handleReconnect(session: SessionReconnect) {
    const newUrl = session.reconnect_url;
    this.logger.info(`EventSub reconnect requested. New URL: ${newUrl}`);
    
    // Store old connection to keep it alive until new connection is established
    this.oldWs = this.ws;
    this.ws = null;
    
    // Connect to new URL; old connection will be closed after session_welcome
    this.connect(newUrl);
  }

  private handleTwitchClose(code: number) {
    const reasons: Record<number, string> = {
      4000: 'Internal server error',
      4001: 'Client sent inbound traffic',
      4002: 'Client failed ping-pong',
      4003: 'Connection unused',
      4004: 'Reconnect grace time expired',
      4005: 'Network timeout',
      4006: 'Network error',
      4007: 'Invalid reconnect URL',
    };
    this.logger.error(`EventSub closed by Twitch: ${code} - ${reasons[code] || 'Unknown'}`);
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.logger.error(`EventSub max reconnect attempts reached (${this.options.maxReconnectAttempts})`);
      this.emit('error', new Error('Max reconnection attempts reached'));
      return;
    }
    
    const delay = this.options.reconnectBaseDelay * Math.pow(2, this.reconnectAttempts) + Math.random() * 1000;
    
    this.logger.info(`EventSub reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts + 1})`);
    
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.reconnectUrl) {
        this.connect(this.reconnectUrl);
      } else {
        this.connect();
      }
    }, delay);
  }

  disconnect() {
    this.logger.info('EventSubClient disconnecting');
    this.clearKeepaliveTimer();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.oldWs) {
      this.oldWs.close(1000, 'Graceful shutdown');
      this.oldWs = null;
    }
    if (this.ws) {
      this.ws.close(1000, 'Graceful shutdown');
      this.ws = null;
    }
    this.sessionId = null;
    this.reconnectUrl = null;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }
}
