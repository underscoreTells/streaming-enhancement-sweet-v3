import { EventEmitter } from 'events';
import { Logger } from 'winston';
import type { YouTubeSSEConfig, ConnectionState, YouTubeSSEMessage } from './types';
import type { YouTubeLiveChatMessage, YouTubeLiveChatResponse } from '../rest/types';

export class YouTubeLiveChatSSEClient extends EventEmitter {
  private state: ConnectionState = 'disconnected';
  private abortController: AbortController | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private retryCount = 0;
  private currentPageToken: string | null = null;

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
    this.logger.debug(`Connecting to YouTube SSE for liveChat ${this.config.liveChatId}`);

    try {
      await this.startSSE();
      this.setState('connected');
      this.retryCount = 0;
      this.logger.info(`Connected to YouTube SSE for liveChat ${this.config.liveChatId}`);
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  async disconnect(): Promise<void> {
    this.clearReconnectTimer();
    
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    if (this.state !== 'disconnected') {
      this.setState('disconnected');
      this.logger.debug('Disconnected from YouTube SSE');
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
    return this.state === 'connected';
  }

  getCurrentPageToken(): string | null {
    return this.currentPageToken;
  }

  private async startSSE(): Promise<void> {
    const url = this.buildSSEUrl();
    
    this.abortController = new AbortController();
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'text/event-stream',
        'Authorization': `Bearer ${this.config.accessToken}`,
        'User-Agent': 'streaming-daemon/1.0',
      },
      signal: this.abortController.signal,
    });

    if (!response.ok) {
      throw new Error(`SSE connection failed: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    await this.readStream(reader);
  }

  private async readStream(reader: ReadableStreamDefaultReader): Promise<void> {
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          this.logger.debug('SSE stream ended');
          this.triggerReconnect();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '' || line.startsWith(':')) {
            continue;
          }

          const message = this.parseSSELine(line);
          if (message) {
            this.handleSSEMessage(message);
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.debug('SSE connection aborted');
        return;
      }
      throw error;
    }
  }

  private parseSSELine(line: string): YouTubeSSEMessage | null {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      return null;
    }

    const field = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();

    return {
      id: Date.now().toString(),
      event: field,
      data: value,
    };
  }

  private async handleSSEMessage(message: YouTubeSSEMessage): Promise<void> {
    try {
      if (message.event === 'data') {
        const data = JSON.parse(message.data) as YouTubeLiveChatResponse;
        
        if (data.nextPageToken) {
          this.currentPageToken = data.nextPageToken;
        }

        for (const item of data.items) {
          this.emit('message', item);
        }

        const pollingInterval = data.pollingIntervalMillis || 5000;
        this.logger.debug(`Received ${data.items.length} messages, next poll in ${pollingInterval}ms`);
      }
    } catch (error) {
      this.logger.error('Failed to parse SSE message:', error);
    }
  }

  private handleConnectionError(error: unknown): void {
    this.logger.error('SSE connection error:', error);
    
    if (this.config.pollingFallback) {
      this.logger.info('Falling back to HTTP polling');
      this.setState('polling');
      this.emit('fallback');
      return;
    }

    this.triggerReconnect();
  }

  private triggerReconnect(): void {
    if (this.state === 'disconnected' || this.state === 'error') {
      return;
    }

    const maxRetries = this.config.maxRetries || 5;
    if (this.retryCount >= maxRetries) {
      this.logger.error(`Max reconnect attempts (${maxRetries}) reached`);
      this.setState('error');
      this.emit('error', new Error('Max reconnect attempts reached'));
      return;
    }

    const baseDelay = this.config.reconnectDelay || 5000;
    const delay = baseDelay * Math.pow(1.5, this.retryCount);
    const cappedDelay = Math.min(delay, 60000);

    this.retryCount++;
    this.logger.warn(`Reconnecting in ${cappedDelay}ms (attempt ${this.retryCount}/${maxRetries})`);

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        this.handleConnectionError(error);
      }
    }, cappedDelay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private buildSSEUrl(): string {
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
