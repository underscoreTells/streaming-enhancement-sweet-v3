import { EventEmitter } from 'events';
import { Logger } from 'winston';
import type { 
  PlatformOAuthStrategy, 
  PlatformWebSocketStrategy, 
  PlatformRestStrategy 
} from '../interfaces';
import type { TwitchOAuth } from './TwitchOAuth';
import type { TokenSet } from '../types';
import { EventSubClient } from './eventsub/EventSubClient';
import { EventSubSubscriptionManager } from './eventsub/EventSubSubscription';
import { EventSubHandler, createEventHandlers } from './eventsub/EventSubHandler';
import { EventType } from './eventsub/types';
import { IrcClient } from './irc/IrcClient';
import { RestClient } from './rest/RestClient';
import { getUser, getUsersById } from './rest/getUser';
import { OAuthCredentialsRepository } from '../../infrastructure/database/OAuthCredentialsRepository';

export type ConnectionState = 'connecting' | 'connected' | 'disconnecting' | 'disconnected' | 'error';

interface TwitchStrategyConfig {
  clientId: string;
  eventSubUrl?: string;
  ircUrl?: string;
}

export interface TwitchHealthStatus {
  platform: string;
  state: ConnectionState;
  eventsub: {
    connected: boolean;
    sessionId: string | null;
  };
  irc: {
    connected: boolean;
    nick: string | null;
  };
  rest: {
    clientId: string;
  };
}

export class TwitchStrategy extends EventEmitter 
  implements PlatformOAuthStrategy, PlatformWebSocketStrategy, PlatformRestStrategy {
  
  readonly platform = 'twitch';
  
  private connectionState: ConnectionState = 'disconnected';
  
  private eventSubClient: EventSubClient | null = null;
  private eventSubSubscription: EventSubSubscriptionManager | null = null;
  private eventSubHandler: EventSubHandler | null = null;
  
  private ircClient: IrcClient | null = null;
  private restClient: RestClient | null = null;
  
  constructor(
    private logger: Logger,
    private oauth: TwitchOAuth,
    private oauthRepo: OAuthCredentialsRepository,
    private config: TwitchStrategyConfig
  ) {
    super();
    this.setMaxListeners(100);
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  getHealthStatus(): TwitchHealthStatus {
    return {
      platform: this.platform,
      state: this.connectionState,
      eventsub: {
        connected: this.eventSubClient ? true : false,
        sessionId: this.eventSubClient?.getSessionId() ?? null,
      },
      irc: {
        connected: this.ircClient?.isConnected() ?? false,
        nick: null,
      },
      rest: {
        clientId: this.config.clientId,
      },
    };
  }

  private setConnectionState(state: ConnectionState) {
    const oldState = this.connectionState;
    this.connectionState = state;
    this.emit('connectionStateChanged', { oldState, newState: state });
    this.logger.debug(`TwitchStrategy connection state: ${oldState} -> ${state}`);
  }

  private async getSystemAccessToken(): Promise<string> {
    const tokens = await this.oauth.getAccessToken('system');
    return tokens.access_token;
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

  async refreshToken(refreshToken: string): Promise<TokenSet> {
    return this.oauth.refreshToken(refreshToken);
  }

  /**
   * PlatformWebSocketStrategy implementation
   */
  async connect(): Promise<void> {
    this.setConnectionState('connecting');
    
    try {
      const accessToken = await this.getSystemAccessToken();
      const credential = this.oauthRepo.getCredential('twitch');
      if (!credential) {
        throw new Error('Twitch OAuth client credentials not configured');
      }

      this.eventSubClient = new EventSubClient(this.logger, { url: this.config.eventSubUrl });
      this.eventSubSubscription = new EventSubSubscriptionManager(this.logger, {
        clientId: this.config.clientId,
        accessToken,
      });
      this.eventSubHandler = new EventSubHandler();
      
      const handlers = createEventHandlers(this.logger);
      for (const [eventType, handler] of handlers.entries()) {
        this.eventSubHandler.register(eventType, handler);
      }

      this.eventSubClient.on('notification', (message) => {
        this.eventSubHandler?.handle(message);
      });

      await this.eventSubClient.connect();

      this.ircClient = new IrcClient(this.logger);
      this.ircClient.on('chat', (chatData) => {
        this.emit('chat', chatData);
      });

      this.restClient = new RestClient(this.logger, {
        clientId: this.config.clientId,
        getAccessToken: () => this.getSystemAccessToken(),
      });

      this.setConnectionState('connected');
      this.logger.info('TwitchStrategy connected');
    } catch (error) {
      this.setConnectionState('error');
      this.logger.error('Failed to connect TwitchStrategy:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.setConnectionState('disconnecting');

    try {
      this.eventSubClient?.disconnect();
      this.eventSubClient = null;
      this.eventSubSubscription = null;
      this.eventSubHandler = null;
      
      this.ircClient?.disconnect();
      this.ircClient = null;
      
      this.restClient = null;

      this.setConnectionState('disconnected');
      this.logger.info('TwitchStrategy disconnected');
    } catch (error) {
      this.logger.error('Error disconnecting TwitchStrategy:', error);
      this.setConnectionState('error');
    }
  }

  async subscribeToChannel(channelId: string, username?: string): Promise<void> {
    this.logger.debug(`subscribeToChannel: channelId=${channelId}, username=${username}`);
    
    if (!this.eventSubClient || !this.eventSubSubscription || !this.ircClient) {
      throw new Error('Not connected. Call connect() first.');
    }

    if (!username) {
      throw new Error('Username is required to subscribe to channel');
    }

    try {
      const sessionId = this.eventSubClient.getSessionId();
      if (!sessionId) {
        throw new Error('EventSub not ready (no session ID)');
      }

      const token = await this.getSystemAccessToken();
      
      const user = await getUser(this.restClient!, username);
      if (!user) {
        throw new Error(`User ${username} not found`);
      }

      // Re-create subscription with fresh token
      this.eventSubSubscription = new EventSubSubscriptionManager(this.logger, {
        clientId: this.config.clientId,
        accessToken: token,
      });
      
      await Promise.all([
        this.eventSubSubscription.create(EventType.StreamOnline, '1', { broadcaster_user_id: user.id }, sessionId),
        this.eventSubSubscription.create(EventType.StreamOffline, '1', { broadcaster_user_id: user.id }, sessionId),
        this.eventSubSubscription.create(EventType.ChannelUpdate, '1', { broadcaster_user_id: user.id }, sessionId),
        this.eventSubSubscription.create(EventType.ChatMessage, '1', { broadcaster_user_id: user.id, user_id: user.id }, sessionId),
        this.eventSubSubscription.create(EventType.Subscribe, '1', { broadcaster_user_id: user.id }, sessionId),
        this.eventSubSubscription.create(EventType.SubscriptionGift, '1', { broadcaster_user_id: user.id }, sessionId),
        this.eventSubSubscription.create(EventType.RewardRedemption, '2', { broadcaster_user_id: user.id }, sessionId),
        this.eventSubSubscription.create(EventType.Follow, '2', { broadcaster_user_id: user.id, moderator_user_id: user.id }, sessionId),
      ]);

      this.ircClient.connect(user.login, token);
      this.ircClient.join(user.login);

      this.logger.info(`Subscribed to channel: ${username} (${user.id})`);
    } catch (error) {
      this.logger.error('Failed to subscribe to channel:', error);
      throw error;
    }
  }

  async subscribeToChat(channelId: string): Promise<void> {
    this.logger.debug(`subscribeToChat: channelId=${channelId}`);
    
    if (!this.eventSubClient || !this.eventSubSubscription || !this.ircClient) {
      throw new Error('Not connected. Call connect() first.');
    }

    try {
      const users = await getUsersById(this.restClient!, [channelId]);
      if (users.length === 0) {
        throw new Error(`Channel ${channelId} not found`);
      }

      const user = users[0];
      const sessionId = this.eventSubClient.getSessionId();
      if (!sessionId) {
        throw new Error('EventSub not ready (no session ID)');
      }

      const token = await this.getSystemAccessToken();

      // Re-create subscription with fresh token
      this.eventSubSubscription = new EventSubSubscriptionManager(this.logger, {
        clientId: this.config.clientId,
        accessToken: token,
      });

      await this.eventSubSubscription.create(
        EventType.ChatMessage,
        '1',
        { broadcaster_user_id: user.id, user_id: user.id },
        sessionId
      );

      this.ircClient.connect(user.login, token);
      this.ircClient.join(user.login);

      this.logger.info(`Subscribed to chat: ${user.login} (${channelId})`);
    } catch (error) {
      this.logger.error('Failed to subscribe to chat:', error);
      throw error;
    }
  }

  async unsubscribeFromChannel(channelId: string): Promise<void> {
    this.logger.debug(`unsubscribeFromChannel: channelId=${channelId}`);
    
    try {
      const users = await getUsersById(this.restClient!, [channelId]);
      if (users.length > 0) {
        this.ircClient?.leave(users[0].login);
      }
      
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
}
