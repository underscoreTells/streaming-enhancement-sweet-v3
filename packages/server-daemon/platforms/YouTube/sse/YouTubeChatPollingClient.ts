import { EventEmitter } from 'events';
import { Logger } from 'winston';
import type { YouTubePollingConfig, ConnectionState } from './types';
import type { YouTubeLiveChatMessage, YouTubeLiveChatResponse } from '../rest/types';

export class YouTubeChatPollingClient extends EventEmitter {
  private state: ConnectionState = 'disconnected';
  private pollTimer: NodeJS.Timeout | null = null;
  private currentPageToken: string | null = null;
  private pollInterval = 5000;

  constructor(
    private logger: Logger,
    private config: YouTubePollingConfig
  ) {
    super();
    this.setMaxListeners(100);
  }

  async connect(): Promise<void> {
    if (this.state === 'connected' || this.state === 'polling') {
      return;
    }

    this.setState('polling');
    this.logger.debug(`Starting HTTP polling for liveChat ${this.config.liveChatId}`);

    try {
      await this.poll();
      this.scheduleNextPoll();
      this.logger.info(`Connected to YouTube HTTP polling for liveChat ${this.config.liveChatId}`);
    } catch (error) {
      this.handlePollError(error);
    }
  }

  async disconnect(): Promise<void> {
    this.stopPolling();

    if (this.state !== 'disconnected') {
      this.setState('disconnected');
      this.logger.debug('Disconnected from YouTube HTTP polling');
    }

    this.removeAllListeners();
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
    return this.state === 'polling';
  }

  getCurrentPageToken(): string | null {
    return this.currentPageToken;
  }

  getCurrentPollInterval(): number {
    return this.pollInterval;
  }

  private async poll(): Promise<void> {
    try {
      const url = this.buildPollUrl();
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'User-Agent': 'streaming-daemon/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`Polling request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as YouTubeLiveChatResponse;

      if (data.nextPageToken) {
        this.currentPageToken = data.nextPageToken;
      }

      if (data.pollingIntervalMillis) {
        this.pollInterval = data.pollingIntervalMillis;
      }

      for (const item of data.items) {
        this.emit('message', item);
      }

      if (data.items.length > 0) {
        this.logger.debug(`Polled ${data.items.length} messages`);
      }

    } catch (error) {
      throw error;
    }
  }

  private scheduleNextPoll(): void {
    this.stopPolling();

    if (this.state !== 'polling' && this.state !== 'connected') {
      return;
    }

    this.pollTimer = setTimeout(async () => {
      try {
        await this.poll();
        this.scheduleNextPoll();
      } catch (error) {
        this.handlePollError(error);
      }
    }, this.pollInterval);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private handlePollError(error: unknown): void {
    this.logger.error('Polling error:', error);
    this.setState('error');
    this.emit('error', error);
    
    this.scheduleNextPoll();
  }

  private buildPollUrl(): string {
    const params = new URLSearchParams({
      part: 'snippet,authorDetails',
      liveChatId: this.config.liveChatId,
    });

    if (this.currentPageToken) {
      params.append('pageToken', this.currentPageToken);
    }

    return `https://www.googleapis.com/youtube/v3/liveChat/messages?${params.toString()}`;
  }
}
