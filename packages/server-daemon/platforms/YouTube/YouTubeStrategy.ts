import { EventEmitter } from 'events';
import { Logger } from 'winston';
import type { 
  PlatformOAuthStrategy, 
  PlatformWebSocketStrategy, 
  PlatformRestStrategy 
} from '../interfaces';
import type { YouTubeOAuth } from './YouTubeOAuth';
import type { TokenSet } from '../types';
import { RestClient } from './rest/RestClient';
import { YouTubeLiveChatSSEClient } from './sse';
import { YouTubeChatPollingClient } from './sse';
import { YouTubeEventHandler, createEventHandlers } from './event';
import { BroadcastLifecycleMonitor } from './monitor';
import { StreamHealthMonitor } from './monitor';
import { getChannel } from './rest/getChannel';
import { getLiveStreamByChannel } from './rest/getLiveStream';
import type { YouTubeLiveChatMessage, YouTubeLiveBroadcast } from './rest/types';

export type ConnectionState = 'connecting' | 'connected' | 'disconnecting' | 'disconnected' | 'error';

export interface YouTubeStrategyConfig {
  sseFallbackPolling?: boolean;
  restRateLimitMs?: number;
  broadcastPollInterval?: number;
  healthPollInterval?: number;
  username?: string;
}

export interface YouTubeHealthStatus {
  platform: string;
  state: ConnectionState;
  oauth: {
    initialized: boolean;
    username?: string;
  };
  rest: {
    initialized: boolean;
  };
  sse: {
    enabled: boolean;
    connected: boolean;
    usingFallback: boolean;
  };
  chat: {
    subscribed: boolean;
    liveChatId?: string;
  };
  monitors: {
    broadcastLifecycle: boolean;
    streamHealth: boolean;
  };
}

export class YouTubeStrategy extends EventEmitter 
  implements PlatformOAuthStrategy, PlatformWebSocketStrategy, PlatformRestStrategy {
  
  readonly platform = 'youtube';
  
  private connectionState: ConnectionState = 'disconnected';
  
  private restClient: RestClient | null = null;
  private sseClient: YouTubeLiveChatSSEClient | null = null;
  private pollingClient: YouTubeChatPollingClient | null = null;
  private eventHandler: YouTubeEventHandler | null = null;
  private broadcastLifecycleMonitor: BroadcastLifecycleMonitor | null = null;
  private streamHealthMonitor: StreamHealthMonitor | null = null;
  
  private currentChannelId: string | null = null;
  private currentLiveChatId: string | null = null;
  private currentStreamId: string | null = null;
  private currentBroadcastId: string | null = null;
  private currentUsername: string | null = null;
  
  constructor(
    private logger: Logger,
    private oauth: YouTubeOAuth,
    private config: YouTubeStrategyConfig = {}
  ) {
    super();
    this.setMaxListeners(100);
    
    if (this.config.username) {
      this.currentUsername = this.config.username;
    }
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  getHealthStatus(): YouTubeHealthStatus {
    return {
      platform: this.platform,
      state: this.connectionState,
      oauth: {
        initialized: !!this.oauth,
        username: this.currentUsername || undefined,
      },
      rest: {
        initialized: !!this.restClient,
      },
      sse: {
        enabled: true,
        connected: this.sseClient?.isConnected() ?? false,
        usingFallback: this.pollingClient != null,
      },
      chat: {
        subscribed: this.currentChannelId != null,
        liveChatId: this.currentLiveChatId || undefined,
      },
      monitors: {
        broadcastLifecycle: this.broadcastLifecycleMonitor?.isRunning() ?? false,
        streamHealth: this.streamHealthMonitor?.isRunning() ?? false,
      },
    };
  }

  private setConnectionState(state: ConnectionState) {
    const oldState = this.connectionState;
    this.connectionState = state;
    this.emit('connectionStateChanged', { oldState, newState: state });
    this.logger.debug(`YouTubeStrategy connection state: ${oldState} -> ${state}`);
  }

  async startOAuth(username: string): Promise<string> {
    return this.oauth.generateAuthorizationUrl().then(result => result.url);
  }

  async handleCallback(code: string, state: string): Promise<TokenSet> {
    throw new Error('handleCallback requires username - use OAuthFlow.handleOAuthCallback directly');
  }

  async getAccessToken(username: string): Promise<TokenSet> {
    return this.oauth.getAccessToken(username);
  }

  async refreshToken(username: string): Promise<TokenSet> {
    return this.oauth.refreshToken(username);
  }

  async connect(): Promise<void> {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      return;
    }

    this.setConnectionState('connecting');
    
    try {
      if (this.config.username) {
        this.currentUsername = this.config.username;
      }

      this.restClient = new RestClient(this.logger, {
        rateLimitMs: this.config.restRateLimitMs || 1000,
        username: this.currentUsername || undefined,
      });

      if (this.currentUsername) {
        const tokenSet = await this.oauth.getAccessToken(this.currentUsername);
        this.restClient.setToken(tokenSet.access_token);
        this.restClient.setTokenRefreshCallback(async (username) => {
          const newTokens = await this.oauth.refreshToken(username);
          this.logger.info('Token refreshed successfully for monitoring');
          return newTokens.access_token;
        });
      }

      this.setConnectionState('connected');
      this.logger.info('YouTubeStrategy connected');
    } catch (error) {
      this.setConnectionState('error');
      this.logger.error('Failed to connect YouTubeStrategy:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.setConnectionState('disconnecting');

    try {
      this.currentChannelId = null;
      this.currentLiveChatId = null;
      this.currentStreamId = null;
      this.currentBroadcastId = null;
      this.currentUsername = null;

      this.sseClient?.disconnect();
      this.sseClient = null;

      this.pollingClient?.disconnect();
      this.pollingClient = null;

      this.broadcastLifecycleMonitor?.stopMonitoring();
      this.broadcastLifecycleMonitor = null;

      this.streamHealthMonitor?.stopMonitoring();
      this.streamHealthMonitor = null;

      this.eventHandler = null;
      this.restClient = null;

      this.setConnectionState('disconnected');
      this.logger.info('YouTubeStrategy disconnected');
    } catch (error) {
      this.logger.error('Error disconnecting YouTubeStrategy:', error);
      this.setConnectionState('error');
    }
  }

  async subscribeToChannel(channelId: string, username?: string): Promise<void> {
    if (!this.restClient) {
      throw new Error('Not connected. Call connect() first.');
    }
    
    this.logger.debug(`subscribeToChannel: channelId=${channelId}, username=${username}`);

    try {
      const channel = await getChannel(this.restClient, channelId);
      if (!channel) {
        throw new Error(`Channel ${channelId} not found`);
      }

      this.currentChannelId = channel.id;

      if (username) {
        this.currentUsername = username;
        const tokenSet = await this.oauth.getAccessToken(username);
        this.restClient.setToken(tokenSet.access_token);
        this.restClient.setTokenRefreshCallback(async (username) => {
          const newTokens = await this.oauth.refreshToken(username);
          this.logger.info('Token refreshed successfully');
          return newTokens.access_token;
        });
      }

      const liveStream = await getLiveStreamByChannel(this.restClient, channel.id);
      if (liveStream) {
        this.currentStreamId = liveStream.id;
        this.streamHealthMonitor = new StreamHealthMonitor(this.logger, this.restClient, {
          streamId: liveStream.id,
          pollIntervalMs: this.config.healthPollInterval || 30000,
        });
      }

      this.broadcastLifecycleMonitor = new BroadcastLifecycleMonitor(this.logger, this.restClient, {
        channelId: channel.id,
        pollIntervalMs: this.config.broadcastPollInterval || 15000,
      });

      this.broadcastLifecycleMonitor.on('streamOnline', async (data: any) => {
        this.logger.info(`Stream online for channel ${channel.id}`);
        if (data.broadcastId) {
          this.currentBroadcastId = data.broadcastId;
        }
        this.emit('channelOnline', { platform: 'youtube', channelId: channel.id, broadcastId: data.broadcastId });
      });

      this.broadcastLifecycleMonitor.on('streamOffline', (data: any) => {
        this.logger.info(`Stream offline for channel ${channel.id}`);
        this.emit('channelOffline', { platform: 'youtube', channelId: channel.id, broadcastId: data.broadcastId });
      });

      await this.broadcastLifecycleMonitor.startMonitoring();

      if (this.streamHealthMonitor) {
        this.streamHealthMonitor.on('healthWarning', (data: any) => {
          this.logger.warn(`Stream health warning: ${data.currentHealthStatus}`);
          this.emit('streamHealthWarning', { platform: 'youtube', channelId: channel.id, healthStatus: data.currentHealthStatus });
        });

        this.streamHealthMonitor.on('healthRecovered', (data: any) => {
          this.logger.info(`Stream health recovered: ${data.currentHealthStatus}`);
          this.emit('streamHealthRecovered', { platform: 'youtube', channelId: channel.id, healthStatus: data.currentHealthStatus });
        });

        await this.streamHealthMonitor.startMonitoring();
      }

      this.logger.info(`Subscribed to channel: ${channel.id} (${channel.snippet?.title})`);
      this.emit('subscribed', { platform: 'youtube', channelId: channel.id, username: username });
    } catch (error) {
      this.logger.error('Failed to subscribe to channel:', error);
      throw error;
    }
  }

  async subscribeToChat(channelId: string): Promise<void> {
    if (!this.restClient) {
      throw new Error('Not connected. Call connect() first.');
    }
    
    this.logger.debug(`subscribeToChat: channelId=${channelId}`);

    try {
      const channel = await getChannel(this.restClient, channelId);
      if (!channel) {
        throw new Error(`Channel ${channelId} not found`);
      }

      this.currentChannelId = channel.id;

      const broadcast = await this.restClient.get('/liveBroadcasts', {
        channelId: channel.id,
        part: 'snippet,status',
        broadcastStatus: 'live',
      }) as any;

      let liveChatId: string | null = null;
      if (broadcast.items && broadcast.items.length > 0) {
        liveChatId = broadcast.items[0].snippet.liveChatId;
      }

      if (!liveChatId) {
        this.logger.warn(`No live chat found for channel ${channel.id}`);
        return;
      }

      this.currentLiveChatId = liveChatId;

      this.eventHandler = new YouTubeEventHandler(this.logger);
      const handlers = createEventHandlers(this.logger);
      for (const [eventType, handler] of handlers.entries()) {
        this.eventHandler.register(eventType, handler);
      }

      if (this.currentUsername) {
        const tokenSet = await this.oauth.getAccessToken(this.currentUsername);
        const sseConfig = {
          liveChatId,
          accessToken: tokenSet.access_token,
          pollingFallback: this.config.sseFallbackPolling ?? false,
          maxRetries: 5,
          reconnectDelay: 5000,
        };

        this.sseClient = new YouTubeLiveChatSSEClient(this.logger, sseConfig);

        this.sseClient.on('connected', () => {
          this.logger.debug('SSE connected');
          this.emit('chatConnected', { platform: 'youtube', channelId: channel.id });
        });

        this.sseClient.on('disconnected', () => {
          this.logger.debug('SSE disconnected');
          this.emit('chatDisconnected', { platform: 'youtube', channelId: channel.id });
        });

        this.sseClient.on('error', (error) => {
          this.logger.error('SSE error:', error);
        });

        this.sseClient.on('fallback', () => {
          this.logger.info('Falling back to HTTP polling for chat');
          this.pollingClient = new YouTubeChatPollingClient(this.logger, {
            liveChatId,
            accessToken: tokenSet.access_token,
            initialPollInterval: 5000,
          });

          this.pollingClient.on('stateChanged', (data: any) => {
            this.logger.debug(`Polling client state: ${data.newState}`);
          });

          this.pollingClient.on('message', (message: YouTubeLiveChatMessage) => {
            this.handleChatMessage(message);
          });

          this.pollingClient.on('error', (error) => {
            this.logger.error('Polling client error:', error);
          });

          this.pollingClient.connect();
        });

        this.sseClient.on('message', (message: YouTubeLiveChatMessage) => {
          this.handleChatMessage(message);
        });
      }

      this.logger.info(`Subscribed to chat: ${liveChatId} for channel ${channel.id}`);
    } catch (error) {
      this.logger.error('Failed to subscribe to chat:', error);
      throw error;
    }
  }

  async unsubscribeFromChannel(channelId: string): Promise<void> {
    this.logger.debug(`unsubscribeFromChannel: channelId=${channelId}`);
    
    try {
      if (this.sseClient) {
        this.sseClient.disconnect();
        this.sseClient = null;
      }

      if (this.pollingClient) {
        this.pollingClient.disconnect();
        this.pollingClient = null;
      }

      if (this.broadcastLifecycleMonitor) {
        this.broadcastLifecycleMonitor.stopMonitoring();
        this.broadcastLifecycleMonitor = null;
      }

      if (this.streamHealthMonitor) {
        this.streamHealthMonitor.stopMonitoring();
        this.streamHealthMonitor = null;
      }

      this.currentChannelId = null;
      this.currentLiveChatId = null;
      this.currentStreamId = null;
      this.currentBroadcastId = null;

      this.logger.info(`Unsubscribed from channel: ${channelId}`);
      this.emit('unsubscribed', { platform: 'youtube', channelId });
    } catch (error) {
      this.logger.error('Failed to unsubscribe from channel:', error);
      throw error;
    }
  }

  private handleChatMessage(message: YouTubeLiveChatMessage): void {
    try {
      if (!this.eventHandler) {
        return;
      }

      const eventType = this.getMessageType(message);
      if (eventType) {
        this.eventHandler.handle(eventType, message);
      }

      this.emit('chatMessage', {
        platform: 'youtube',
        channelId: this.currentChannelId,
        message,
      });
    } catch (error) {
      this.logger.error('Error handling chat message:', error);
    }
  }

  private getMessageType(message: YouTubeLiveChatMessage): string | null {
    if (message.snippet.superChatDetails) {
      return 'superChatEvent';
    }
    if (message.snippet.superStickerDetails) {
      return 'superStickerEvent';
    }
    if (message.snippet.textMessageDetails) {
      return 'textMessageEvent';
    }
    return 'textMessageEvent';
  }

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
}
