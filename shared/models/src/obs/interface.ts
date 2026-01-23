import type { ObsStreamStatus, ObsStreamStateChangedEvent, ObsRequestMessage, ObsResponseMessage, ObsMessage } from './types';
import type { Stream } from '../stream';

export interface ObsWebSocketClient {
  connect(password?: string): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  on(event: 'connected', handler: () => void): void;
  on(event: 'disconnected', handler: () => void): void;
  on(event: 'error', handler: (error: Error) => void): void;
  on(event: 'StreamStateChanged', handler: (event: ObsStreamStateChangedEvent) => void): void;
  on(event: 'message', handler: (message: ObsMessage) => void): void;

  send(request: ObsRequestMessage): Promise<ObsResponseMessage>;
  getStreamStatus(): Promise<ObsStreamStatus>;
}

export type StreamState = 'offline' | 'starting' | 'live' | 'stopping' | 'reconnecting';

export interface StreamDetectorCallbacks {
  onStreamStart?: (stream: Stream) => void;
  onStreamStop?: (stream: Stream, endTime: Date) => void;
  onStreamReconnecting?: () => void;
  onStreamReconnected?: () => void;
  onStreamStarting?: () => void;
  onStreamStopping?: () => void;
}

export type ObsWebSocketEvent =
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'StreamStateChanged'
  | 'message';
