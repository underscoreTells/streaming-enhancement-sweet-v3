import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { Logger } from 'winston';
import type { Region, PusherMessage } from './types';

interface PusherWebSocketConfig {
  appKey: string;
  cluster?: string;
  region?: Region;
  autoRegion?: boolean;
  baseUrl?: string;
}

export class PusherWebSocket extends EventEmitter {
  private ws: WebSocket | null = null;
  private connected = false;
  private currentRegion: Region | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  
  private messageLimit = 5;
  private messageWindowMs = 1000;
  private messageTimestamps: number[] = [];

  subscribedChannels = new Set<string>();

  constructor(
    private logger: Logger,
    private config: PusherWebSocketConfig
  ) {
    super();
    this.setMaxListeners(100);
  }

  getCurrentRegion(): Region | null {
    return this.currentRegion;
  }

  isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }

  async connect(): Promise<void> {
    if (this.isConnected()) {
      this.logger.debug('PusherWebSocket already connected');
      return;
    }

    let region = this.config.region;
    if (this.config.autoRegion && !region) {
      region = await this.detectBestRegion();
    }

    this.currentRegion = region ?? 'us2';
    const url = this.buildWebSocketUrl(this.currentRegion);

    this.logger.info(`Connecting to Pusher WebSocket: ${url}`);

    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      this.logger.info(`Connected to Pusher WebSocket (region: ${this.currentRegion})`);
      this.connected = true;
      this.reconnectAttempts = 0;
      this.emit('connected');
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      this.handleMessage(data.toString());
    });

    this.ws.on('error', (error) => {
      this.logger.error('Pusher WebSocket error:', error);
      this.emit('error', error);
    });

    this.ws.on('close', () => {
      this.logger.info('Pusher WebSocket connection closed');
      this.connected = false;
      this.emit('disconnected');
      this.scheduleReconnect();
    });
  }

  disconnect(): void {
    this.logger.info('Disconnecting Pusher WebSocket');
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }

    this.connected = false;
    this.subscribedChannels.clear();
    this.reconnectAttempts = 0;
  }

  async subscribeToChannel(channelId: string): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('WebSocket not connected');
    }

    const channel = `channel.${channelId}`;
    await this.sendSubscribe(channel);
    
    this.logger.debug(`Subscribed to channel: ${channel}`);
    this.emit('subscribed', { channel, type: 'channel' });
  }

  async subscribeToChatroomId(chatroomId: string): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('WebSocket not connected');
    }

    const channel = `chatrooms.${chatroomId}.v2`;
    await this.sendSubscribe(channel);
    
    this.logger.debug(`Subscribed to chatroom: ${channel}`);
    this.emit('subscribed', { channel, type: 'chatroom' });
  }

  unsubscribeFromChannel(channelId: string): void {
    const channel = `channel.${channelId}`;
    this.subscribedChannels.delete(channel);
    this.logger.debug(`Unsubscribed from channel: ${channel}`);
  }

  private async sendSubscribe(channel: string): Promise<void> {
    const message = {
      event: 'pusher:subscribe',
      data: {
        channel,
      },
    };
    
    await this.sendMessage(channel, message.event, message.data);
    this.subscribedChannels.add(channel);
  }

  private async sendMessage(channel: string, event: string, data: object): Promise<void> {
    await this.checkRateLimit();

    const message = {
      event,
      channel,
      data: JSON.stringify(data),
    };

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private async checkRateLimit(): Promise<void> {
    let now = Date.now();
    
    this.messageTimestamps = this.messageTimestamps.filter(
      ts => now - ts < this.messageWindowMs
    );

    if (this.messageTimestamps.length >= this.messageLimit) {
      const oldestTimestamp = this.messageTimestamps[0];
      const waitTime = this.messageWindowMs - (now - oldestTimestamp);
      
      this.logger.debug(`Rate limit reached, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      now = Date.now();
      this.messageTimestamps = this.messageTimestamps.filter(
        ts => now - ts < this.messageWindowMs
      );
    }

    this.messageTimestamps.push(now);
  }

  private handleMessage(data: string): void {
    try {
      const message: PusherMessage = JSON.parse(data);

      switch (message.event) {
        case 'pusher:connection_established':
          this.handleConnectionEstablished(message.data);
          break;
        case 'pusher:error':
          this.handleError(message.data);
          break;
        case 'pusher_internal:subscription_succeeded':
          this.handleSubscriptionSucceeded(message.data);
          break;
        default:
          if (message.event.startsWith('pusher:')) {
            this.logger.debug(`Received Pusher event: ${message.event}`);
          } else {
            this.emitEvent(message);
          }
      }
    } catch (error) {
      this.logger.error('Failed to parse Pusher message:', error);
    }
  }

  private handleConnectionEstablished(data: any): void {
    this.logger.debug('Pusher connection established');
    this.emit('pusher:ready', data);
  }

  private handleError(data: any): void {
    this.logger.error(`Pusher error (code: ${data.code}): ${data.message}`);
    this.emit('pusher:error', data);
  }

  private handleSubscriptionSucceeded(data: any): void {
    this.logger.debug('Pusher subscription succeeded');
  }

  private emitEvent(message: PusherMessage): void {
    if (message.channel) {
      if (message.channel.startsWith('channel.')) {
        this.emit('channelEvent', message);
      } else if (message.channel.startsWith('chatrooms.')) {
        this.emit('chatEvent', message);
      }
    }
    
    this.emit('event', message);
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error(`Max reconnect attempts (${this.maxReconnectAttempts}) reached`);
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    this.logger.info(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch(error => {
        this.logger.error(`Reconnect attempt ${this.reconnectAttempts} failed:`, error);
      });
    }, delay);
  }

  private async detectBestRegion(): Promise<Region> {
    this.logger.debug('Detecting best Pusher region');
    
    const regions: Region[] = ['us2', 'eu1', 'as1'];
    const results: Array<{ region: Region; latency: number }> = [];

    for (const region of regions) {
      try {
        const start = Date.now();
        const url = this.buildWebSocketUrl(region);
        const testWs = new WebSocket(url);
        
        await new Promise<void>((resolve, reject) => {
          testWs.on('open', () => {
            testWs.close();
            resolve();
          });
          
          testWs.on('error', reject);
          
          setTimeout(() => {
            testWs.close();
            reject(new Error('Timeout'));
          }, 5000);
        });

        const latency = Date.now() - start;
        results.push({ region, latency });
        this.logger.debug(`Region ${region} latency: ${latency}ms`);
      } catch (error) {
        this.logger.debug(`Failed to ping region ${region}:`, error);
      }
    }

    if (results.length === 0) {
      this.logger.warn('All regions failed, defaulting to us2');
      return 'us2';
    }

    results.sort((a, b) => a.latency - b.latency);
    const best = results[0];
    
    this.logger.info(`Best region: ${best.region} (${best.latency}ms)`);
    return best.region;
  }

  private buildWebSocketUrl(region: Region): string {
    const cluster = this.config.cluster || 'mt1';
    const baseUrl = this.config.baseUrl || `wss://ws-${region}.pusher.com`;
    return `${baseUrl}/app/${this.config.appKey}?protocol=7&client=ts-daemon&version=1.0.0&cluster=${cluster}`;
  }
}
