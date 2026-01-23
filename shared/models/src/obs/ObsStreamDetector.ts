import { Stream } from '../stream';
import type { StreamService } from '../stream';
import type { ObsWebSocketClient } from './interface';
import type {
  StreamDetectorCallbacks,
  StreamState
} from './interface';
import {
  ObsOutputState,
  ObsStreamStatus,
  ObsStreamStateChangedEvent
} from './types';

export class ObsStreamDetector {
  private state: StreamState = 'offline';
  private client: ObsWebSocketClient;
  private streamService: StreamService;
  private currentStream: Stream | null = null;
  private callbacks: StreamDetectorCallbacks;

  constructor(
    client: ObsWebSocketClient,
    streamService: StreamService,
    callbacks: StreamDetectorCallbacks = {}
  ) {
    this.client = client;
    this.streamService = streamService;
    this.callbacks = callbacks;
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connected', async () => {
      try {
        const status = await this.client.getStreamStatus();
        this.updateStateFromStatus(status);
      } catch (error) {
        console.error('Failed to get initial stream status:', error);
      }
    });

    this.client.on('StreamStateChanged', (event: ObsStreamStateChangedEvent) => {
      this.handleStreamStateChanged(event);
    });

    this.client.on('error', (error: Error) => {
      console.error('OBS WebSocket error:', error);
    });

    this.client.on('disconnected', () => {
      this.state = 'offline';
      this.currentStream = null;
    });
  }

  private async handleStreamStateChanged(event: ObsStreamStateChangedEvent): Promise<void> {
    const { outputActive, outputState } = event;
    let newState: StreamState;

    switch (outputState) {
      case ObsOutputState.Starting:
        newState = 'starting';
        this.callbacks.onStreamStarting?.();
        break;

      case ObsOutputState.Started:
      case ObsOutputState.Reconnected:
        newState = 'live';
        if (this.state !== 'live') {
          const startTime = new Date();
          const commonId = crypto.randomUUID();
          this.currentStream = new Stream(commonId, startTime, this.streamService);
          await this.streamService.createStream(commonId, startTime);
          this.callbacks.onStreamStart?.(this.currentStream);

          if (this.state === 'reconnecting') {
            this.callbacks.onStreamReconnected?.();
          }
        }
        break;

      case ObsOutputState.Stopping:
        newState = 'stopping';
        this.callbacks.onStreamStopping?.();
        break;

      case ObsOutputState.Stopped:
        newState = 'offline';
        if (this.currentStream) {
          const endTime = new Date();
          this.currentStream.setObsEndTime(endTime);
          await this.streamService.updateStreamEnd(this.currentStream.getCommonId(), endTime);
          this.callbacks.onStreamStop?.(this.currentStream, endTime);
          this.currentStream = null;
        }
        break;

      case ObsOutputState.Reconnecting:
        newState = 'reconnecting';
        this.callbacks.onStreamReconnecting?.();
        break;

      default:
        newState = this.state;
    }

    this.state = newState;
  }

  private updateStateFromStatus(status: ObsStreamStatus): void {
    if (status.outputActive) {
      if (status.outputReconnecting) {
        this.state = 'reconnecting';
      } else {
        this.state = 'live';
        if (!this.currentStream) {
          const estimatedStart = new Date(Date.now() - status.outputDuration);
          const commonId = crypto.randomUUID();
          this.currentStream = new Stream(commonId, estimatedStart, this.streamService);
          this.streamService.createStream(commonId, estimatedStart).then(() => {
            this.callbacks.onStreamStart?.(this.currentStream!);
          }).catch((error) => {
            console.error('Failed to create stream from status:', error);
          });
        }
      }
    } else {
      this.state = 'offline';
      this.currentStream = null;
    }
  }

  async connect(url: string, password?: string): Promise<void> {
    await this.client.connect(url, password);
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }

  getStatus(): {
    isStreaming: boolean;
    state: StreamState;
    currentStream: Stream | null;
  } {
    return {
      isStreaming: this.state === 'live',
      state: this.state,
      currentStream: this.currentStream
    };
  }
}
