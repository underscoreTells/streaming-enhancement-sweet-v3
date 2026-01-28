import { EventEmitter } from 'events';
import { Logger } from 'winston';
import type { 
  PlatformOAuthStrategy, 
  PlatformWebSocketStrategy, 
  PlatformRestStrategy 
} from '../interfaces';
import type { KickOAuth } from './KickOAuth';
import type { TokenSet } from '../types';
import { PusherWebSocket } from './websocket/PusherWebSocket';
import { KickEventHandler, createEventHandlers } from './event';
import { RestClient, getUser } from './rest';

export type ConnectionState = 'connecting' | 'connected' | 'disconnecting' | 'disconnected' | 'error';

export interface KickStrategyConfig {
  pusherAppKey?: string;
  pusherCluster?: string;
  baseUrl?: string;
}

export interface KickHealthStatus {
  platform: string;
  state: ConnectionState;
  websocket: {
    connected: boolean;
    region: string | null;
    appKey: string | null;
  };
  rest: {
    baseUrl: string;
  };
}

export class KickStrategy extends EventEmitter 
  implements PlatformOAuthStrategy, PlatformWebSocketStrategy, PlatformRestStrategy {
  
  readonly platform = 'kick';
  
  private connectionState: ConnectionState = 'disconnected';
  
  private websocketClient: PusherWebSocket | null = null;
  private eventHandler: KickEventHandler | null = null;
  private restClient: RestClient | null = null;
  
  constructor(
    private logger: Logger,
    private oauth: KickOAuth,
    private config: KickStrategyConfig = {}
  ) {
    super();
    this.setMaxListeners(100);
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  getHealthStatus(): KickHealthStatus {
    return {
      platform: this.platform,
      state: this.connectionState,
      websocket: {
        connected: this.websocketClient?.isConnected() ?? false,
        region: this.websocketClient?.getCurrentRegion() ?? null,
        appKey: this.config.pusherAppKey ?? 'eb1d5f283081a78b932c',
      },
      rest: {
        baseUrl: this.config.baseUrl ?? 'https://kick.com',
      },
    };
  }

  private setConnectionState(state: ConnectionState) {
    const oldState = this.connectionState;
    this.connectionState = state;
    this.emit('connectionStateChanged', { oldState, newState: state });
    this.logger.debug(`KickStrategy connection state: ${oldState} -> ${state}`);
  }

  /**
   * PlatformOAuthStrategy implementation
   */
  async startOAuth(username: string): Promise<string> {
    return this.oauth.startOAuth(username);
  }

  async handleCallback(code: string, state: string): Promise<TokenSet> {
    return this.oauth.handleCallback(code, state);
  }

  async getAccessToken(username: string): Promise<TokenSet> {
    return this.oauth.getAccessToken(username);
  }

  async refreshToken(username: string): Promise<TokenSet> {
    return this.oauth.refreshToken(username);
  }

  /**
   * PlatformWebSocketStrategy implementation
   */
  async connect(): Promise<void> {
    this.setConnectionState('connecting');
    
    try {
      this.restClient = new RestClient(this.logger, {
        baseUrl: this.config.baseUrl,
      });

      this.websocketClient = new PusherWebSocket(this.logger, {
        appKey: this.config.pusherAppKey || 'eb1d5f283081a78b932c',
        cluster: this.config.pusherCluster || 'mt1',
        autoRegion: true,
        baseUrl: this.config.baseUrl,
      });

      this.websocketClient.on('connected', () => {
        this.logger.info('Pusher WebSocket connected');
      });

      this.websocketClient.on('disconnected', () => {
        this.logger.warn('Pusher WebSocket disconnected');
      });

      this.websocketClient.on('subscribed', (data) => {
        this.logger.debug('Subscribed to channel:', data);
        this.emit('subscribed', data);
      });

      this.websocketClient.on('unsubscribed', (data) => {
        this.logger.debug('Unsubscribed from channel:', data);
        this.emit('unsubscribed', data);
      });

      this.websocketClient.on('channelEvent', (message) => {
        this.logger.debug('Received channel event:', message.event);
        this.emit('channelEvent', message);
        this.handleChannelEvent(message);
      });

      this.websocketClient.on('chatEvent', (message) => {
        this.logger.debug('Received chat event:', message.event);
        this.emit('chatEvent', message);
        this.handleChatEvent(message);
      });

      this.websocketClient.on('event', (message) => {
        this.logger.debug('Received generic event:', message.event);
        this.emit('event', message);
      });

      this.eventHandler = new KickEventHandler(this.logger);
      const handlers = createEventHandlers(this.logger);
      for (const [eventType, handler] of handlers.entries()) {
        this.eventHandler.register(eventType, handler);
      }

      await this.websocketClient.connect();

      this.setConnectionState('connected');
      this.logger.info('KickStrategy connected');
    } catch (error) {
      this.setConnectionState('error');
      this.logger.error('Failed to connect KickStrategy:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.setConnectionState('disconnecting');

    try {
      this.websocketClient?.disconnect();
      this.websocketClient = null;
      this.eventHandler = null;
      this.restClient = null;
      
      this.setConnectionState('disconnected');
      this.logger.info('KickStrategy disconnected');
    } catch (error) {
      this.logger.error('Error disconnecting KickStrategy:', error);
      this.setConnectionState('error');
    }
  }

  async subscribeToChannel(channelId: string, username?: string): Promise<void> {
    this.logger.debug(`subscribeToChannel: channelId=${channelId}, username=${username}`);
    
    if (!this.websocketClient) {
      throw new Error('Not connected. Call connect() first.');
    }

    if (!username) {
      throw new Error('Username is required to subscribe to channel');
    }

    try {
      const user = await getUser(this.restClient!, username);
      if (!user) {
        throw new Error(`User ${username} not found`);
      }

      await this.websocketClient.subscribeToChannel(user.id);
      this.logger.info(`Subscribed to channel: ${username} (${user.id})`);
    } catch (error) {
      this.logger.error('Failed to subscribe to channel:', error);
      throw error;
    }
  }

  async subscribeToChat(channelId: string): Promise<void> {
    this.logger.debug(`subscribeToChat: channelId=${channelId}`);
    
    if (!this.websocketClient) {
      throw new Error('Not connected. Call connect() first.');
    }

    try {
      await this.websocketClient.subscribeToChatroomId(channelId);
      this.logger.info(`Subscribed to chat: ${channelId}`);
    } catch (error) {
      this.logger.error('Failed to subscribe to chat:', error);
      throw error;
    }
  }

  async unsubscribeFromChannel(channelId: string): Promise<void> {
    this.logger.debug(`unsubscribeFromChannel: channelId=${channelId}`);
    
    try {
      if (!this.websocketClient) {
        this.logger.warn('WebSocket client not initialized, cannot unsubscribe from channel');
        return;
      }
      
      await this.websocketClient.unsubscribeFromChannel(channelId);
      
      this.logger.info(`Unsubscribed from channel: ${channelId}`);
    } catch (error) {
      this.logger.error('Failed to unsubscribe from channel:', error);
    }
  }

  /**
   * PlatformRestStrategy implementation
   */
  async get(endpoint: string, params?: Record<string, string | number | boolean>): Promise<unknown> {
    if (!this.restClient) {
      throw new Error('REST client not initialized. Call connect() first.');
    }
    return this.restClient.get(endpoint, params);
  }

  async post(endpoint: string, data?: unknown): Promise<unknown> {
    if (!this.restClient) {
      throw new Error('REST client not initialized. Call connect() first.');
    }
    return this.restClient.post(endpoint, data);
  }

  async put(endpoint: string, data?: unknown): Promise<unknown> {
    if (!this.restClient) {
      throw new Error('REST client not initialized. Call connect() first.');
    }
    return this.restClient.put(endpoint, data);
  }

  async delete(endpoint: string): Promise<unknown> {
    if (!this.restClient) {
      throw new Error('REST client not initialized. Call connect() first.');
    }
    return this.restClient.delete(endpoint);
  }

  private handleChannelEvent(message: any): void {
    if (!this.eventHandler) {
      return;
    }

    try {
      let eventData = message.data;
      if (typeof eventData === 'string') {
        eventData = JSON.parse(eventData);
      }

      const eventType = message.event as any;
      if (eventType) {
        this.eventHandler.handle(eventType, eventData).catch(error => {
          this.logger.error(`Error handling channel event ${eventType}:`, error);
        });
      }
    } catch (error) {
      this.logger.error('Error processing channel event:', error);
    }
  }

  private handleChatEvent(message: any): void {
    if (!this.eventHandler) {
      return;
    }

    try {
      let eventData = message.data;
      if (typeof eventData === 'string') {
        eventData = JSON.parse(eventData);
      }

      const eventType = message.event as any;
      if (eventType) {
        this.eventHandler.handle(eventType, eventData).catch(error => {
          this.logger.error(`Error handling chat event ${eventType}:`, error);
        });
      }
    } catch (error) {
      this.logger.error('Error processing chat event:', error);
    }
  }
}
