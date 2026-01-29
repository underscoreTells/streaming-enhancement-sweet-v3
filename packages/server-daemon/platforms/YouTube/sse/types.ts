export interface YouTubeSSEMessage {
  id: string;
  event: string;
  data: string;
}

export interface YouTubeSSEConfig {
  liveChatId: string;
  accessToken: string;
  pollingFallback?: boolean;
  maxRetries?: number;
  reconnectDelay?: number;
}

export interface YouTubePollingConfig {
  liveChatId: string;
  accessToken: string;
  initialPollInterval?: number;
}

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error' | 'polling';
