import { EventEmitter } from 'events';
import { Logger } from 'winston';
import type { 
  PlatformOAuthStrategy, 
  PlatformWebSocketStrategy, 
  PlatformRestStrategy 
} from '../interfaces';
import type { TwitchOAuth } from '../Twitch/TwitchOAuth';
import type { TokenSet } from '../types';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * TwitchStrategy - Main facade for Twitch platform integration
 * 
 * Implements all three platform strategy interfaces:
 * - PlatformOAuthStrategy: Delegates to TwitchOAuth
 * - PlatformWebSocketStrategy: Manages EventSub and IRC connections
 * - PlatformRestStrategy: Manages REST API calls
 */
export class TwitchStrategy extends EventEmitter 
  implements PlatformOAuthStrategy, PlatformWebSocketStrategy, PlatformRestStrategy {
  
  readonly platform = 'twitch';
  
  private connectionState: ConnectionState = 'disconnected';
  
  constructor(
    private logger: Logger,
    private oauth: TwitchOAuth,
    private config: any
  ) {
    super();
    this.setMaxListeners(100);
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  private setConnectionState(state: ConnectionState) {
    const oldState = this.connectionState;
    this.connectionState = state;
    this.emit('connectionStateChanged', { oldState, newState: state });
    this.logger.debug(`TwitchStrategy connection state: ${oldState} -> ${state}`);
  }

  /**
   * PlatformOAuthStrategy implementation - delegates to TwitchOAuth
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
   * TODO: Implement in later phases
   */
  async connect(): Promise<void> {
    this.setConnectionState('connecting');
    // EventSub and IRC clients will be initialized here
    this.setConnectionState('connected');
  }

  async disconnect(): Promise<void> {
    // EventSub and IRC clients will be disconnected here
    this.setConnectionState('disconnected');
  }

  async subscribeToChannel(channelId: string, username?: string): Promise<void> {
    this.logger.debug(`subscribeToChannel called: channelId=${channelId}, username=${username}`);
    // TODO: Implement in later phases
  }

  async subscribeToChat(channelId: string): Promise<void> {
    this.logger.debug(`subscribeToChat called: channelId=${channelId}`);
    // TODO: Implement in later phases
  }

  async unsubscribeFromChannel(channelId: string): Promise<void> {
    this.logger.debug(`unsubscribeFromChannel called: channelId=${channelId}`);
    // TODO: Implement in later phases
  }

  /**
   * PlatformRestStrategy implementation
   * TODO: Implement in later phases
   */
  async get(endpoint: string, params?: Record<string, string | number | boolean>): Promise<unknown> {
    this.logger.debug(`REST GET: ${endpoint}`, params);
    // TODO: Implement in later phases
    return {};
  }

  async post(endpoint: string, data?: unknown): Promise<unknown> {
    this.logger.debug(`REST POST: ${endpoint}`, data);
    // TODO: Implement in later phases
    return {};
  }

  async put(endpoint: string, data?: unknown): Promise<unknown> {
    this.logger.debug(`REST PUT: ${endpoint}`, data);
    // TODO: Implement in later phases
    return {};
  }

  async delete(endpoint: string): Promise<unknown> {
    this.logger.debug(`REST DELETE: ${endpoint}`);
    // TODO: Implement in later phases
    return {};
  }
}
