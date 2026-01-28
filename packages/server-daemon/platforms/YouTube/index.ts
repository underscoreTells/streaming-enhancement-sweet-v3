export { YouTubeStrategy, YouTubeStrategyConfig, YouTubeHealthStatus, ConnectionState } from './YouTubeStrategy';
export { YouTubeOAuth } from './YouTubeOAuth';
export { createYouTubeOAuth, createYouTubeStrategy } from './factory';

export { RestClient } from './rest/RestClient';
export type { RestClientConfig } from './rest/RestClient';
export { getChannel } from './rest/getChannel';
export { getLiveStream, getLiveStreamByChannel } from './rest/getLiveStream';
export { getLiveBroadcast, getLiveBroadcastByChannel } from './rest/getLiveBroadcast';
export { getVideo, getVideoByChannel } from './rest/getVideo';
export type {
  YouTubeApiResponse,
  YouTubeError,
  YouTubeChannel,
  YouTubeLiveStream,
  YouTubeLiveBroadcast,
  YouTubeVideo,
  YouTubeLiveChatMessage,
  YouTubeLiveChatResponse,
} from './rest/types';

export { YouTubeLiveChatSSEClient, YouTubeChatPollingClient } from './sse';
export type {
  YouTubeSSEConfig,
  YouTubePollingConfig,
  YouTubeSSEMessage,
  ConnectionState as SSEConnectionState,
} from './sse/types';

export { YouTubeEventHandler, createEventHandlers } from './event';
export { YouTubeMessageType, EventHandler } from './event/types';

export { BroadcastLifecycleMonitor } from './monitor';
export { StreamHealthMonitor } from './monitor';
export type {
  BroadcastLifecycleMonitorConfig,
  LifecycleStateChange,
  StreamHealthMonitorConfig,
  HealthStatusChange,
} from './monitor';
