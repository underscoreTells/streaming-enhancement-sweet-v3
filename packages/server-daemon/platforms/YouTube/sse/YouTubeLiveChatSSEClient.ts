import { EventEmitter } from 'events';
import { Logger } from 'winston';
import type { YouTubeSSEConfig, ConnectionState } from './types';
import type { YouTubeLiveChatMessage } from '../rest/types';
import { YouTubeChatPollingClient } from './YouTubeChatPollingClient';

/**
 * YouTubeLiveChatSSEClient
 *
 * NOTE: YouTube's liveChat/messages endpoint returns JSON, not SSE.
 * This class delegates to YouTubeChatPollingClient for proper JSON-based
 * HTTP polling, while maintaining the same interface for backward compatibility.
 */
export class YouTubeLiveChatSSEClient extends EventEmitter {
  private state: ConnectionState = 'disconnected';
  private pollingClient: YouTubeChatPollingClient | null = null;
  private internalListeners: Array<{ event: string; handler: (...args: any[]) => void }> = [];

  constructor(
    private logger: Logger,
    private config: YouTubeSSEConfig
  ) {
    super();
    this.setMaxListeners(100);
  }

  async connect(): Promise<void> {
    if (this.state === 'connected' || this.state === 'connecting') {
      return;
    }

    this.setState('connecting');
    this.logger.debug(`Connecting to YouTube LiveChat for ${this.config.liveChatId}`);

    try {
      // Create polling client with SSE config converted to polling config
      this.pollingClient = new YouTubeChatPollingClient(this.logger, {
        liveChatId: this.config.liveChatId,
        accessToken: this.config.accessToken,
        initialPollInterval: this.config.reconnectDelay || 5000,
      });

      // Set up internal event listeners
      this.registerInternalListener('stateChanged', (data: { oldState: ConnectionState; newState: ConnectionState }) => {
        if (data.newState === 'connected' || data.newState === 'polling') {
          this.setState('connected');
        } else if (data.newState === 'error') {
          this.setState('error');
        }
      });

      this.registerInternalListener('message', (message: YouTubeLiveChatMessage) => {
        this.emit('message', message);
      });

      this.registerInternalListener('error', (error: unknown) => {
        this.handleConnectionError(error);
      });

      // Attach internal listeners to polling client
      this.attachInternalListeners();

      // Start polling
      await this.pollingClient.connect();
      this.setState('connected');
      this.logger.info(`Connected to YouTube LiveChat for ${this.config.liveChatId}`);
    } catch (error) {
      this.clearInternalListeners();
      this.handleConnectionError(error);
    }
  }

  async disconnect(): Promise<void> {
    this.logger.debug('Disconnecting from YouTube LiveChat');

    // Stop polling client
    if (this.pollingClient) {
      await this.pollingClient.disconnect();
      this.pollingClient = null;
    }

    // Remove only internal listeners (preserve consumer listeners)
    this.clearInternalListeners();

    if (this.state !== 'disconnected') {
      this.setState('disconnected');
      this.logger.debug('Disconnected from YouTube LiveChat');
    }
  }

  setState(state: ConnectionState): void {
    const oldState = this.state;
    this.state = state;
    this.emit('stateChanged', { oldState, newState: state });
  }

  getState(): ConnectionState {
    return this.state;
  }

  isConnected(): boolean {
    return this.state === 'connected' || this.state === 'polling';
  }

  getCurrentPageToken(): string | null {
    return this.pollingClient?.getCurrentPageToken() ?? null;
  }

  private registerInternalListener(event: string, handler: (...args: any[]) => void): void {
    this.internalListeners.push({ event, handler });
  }

  private attachInternalListeners(): void {
    if (!this.pollingClient) return;

    for (const { event, handler } of this.internalListeners) {
      this.pollingClient.on(event, handler);
    }
  }

  private clearInternalListeners(): void {
    if (!this.pollingClient) return;

    for (const { event, handler } of this.internalListeners) {
      this.pollingClient.off(event, handler);
    }
    this.internalListeners = [];
  }

  private handleConnectionError(error: unknown): void {
    this.logger.error('LiveChat connection error:', error);

    if (this.config.pollingFallback) {
      this.logger.info('Falling back to HTTP polling');
      this.setState('polling');
      this.emit('fallback');
      return;
    }

    this.setState('error');
    this.emit('error', error);
  }
}
