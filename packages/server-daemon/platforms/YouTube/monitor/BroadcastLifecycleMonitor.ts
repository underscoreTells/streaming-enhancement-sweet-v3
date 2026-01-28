import { EventEmitter } from 'events';
import { Logger } from 'winston';
import type { RestClient } from '../rest/RestClient';
import type { YouTubeLiveBroadcast } from '../rest/types';

export interface BroadcastLifecycleMonitorConfig {
  channelId: string;
  pollIntervalMs?: number;
}

export interface LifecycleStateChange {
  previousState?: string;
  newState: string;
  broadcastId: string;
  timestamp: Date;
}

export class BroadcastLifecycleMonitor extends EventEmitter {
  private pollTimer: NodeJS.Timeout | null = null;
  private previousLifecycleState: string | null = null;
  private broadcastId: string | null = null;
  private isMonitoring = false;

  constructor(
    private logger: Logger,
    private restClient: RestClient,
    private config: BroadcastLifecycleMonitorConfig
  ) {
    super();
    this.setMaxListeners(100);
  }

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      this.logger.debug('Broadcast lifecycle monitor is already running');
      return;
    }

    this.isMonitoring = true;
    this.logger.debug(`Starting broadcast lifecycle monitor for channel ${this.config.channelId}`);

    try {
      await this.checkBroadcastState();
      this.scheduleNextPoll();
      this.logger.info('Broadcast lifecycle monitor started');
    } catch (error) {
      this.logger.error('Failed to start broadcast lifecycle monitor:', error);
      this.isMonitoring = false;
      throw error;
    }
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) {
      this.logger.debug('Broadcast lifecycle monitor is not running');
      return;
    }

    this.clearPollTimer();
    this.isMonitoring = false;
    this.previousLifecycleState = null;
    this.broadcastId = null;
    this.logger.info('Broadcast lifecycle monitor stopped');
  }

  isRunning(): boolean {
    return this.isMonitoring;
  }

  hasBroadcastLifecycleMonitor(): boolean {
    return this.isMonitoring;
  }

  private async checkBroadcastState(): Promise<void> {
    try {
      const broadcast = await this.getActiveBroadcast();

      if (!broadcast) {
        if (this.previousLifecycleState !== null) {
          const stateChange: LifecycleStateChange = {
            previousState: this.previousLifecycleState,
            newState: 'none',
            broadcastId: this.broadcastId || 'unknown',
            timestamp: new Date(),
          };

          this.emit('lifecycleStateChanged', stateChange);

          if (this.previousLifecycleState === 'live') {
            this.emit('streamOffline', { timestamp: new Date() });
          }

          this.previousLifecycleState = 'none';
          this.broadcastId = null;
          this.logger.debug('No active broadcast found');
        }
        return;
      }

      const currentState = broadcast.status.lifeCycleStatus;

      if (this.broadcastId !== broadcast.id) {
        this.broadcastId = broadcast.id;
        this.logger.debug(`Found broadcast ${broadcast.id} with state ${currentState}`);
      }

      if (this.previousLifecycleState !== currentState) {
        const stateChange: LifecycleStateChange = {
          previousState: this.previousLifecycleState || undefined,
          newState: currentState,
          broadcastId: broadcast.id,
          timestamp: new Date(),
        };

        this.emit('lifecycleStateChanged', stateChange);
        this.logger.debug(`Broadcast lifecycle state changed: ${this.previousLifecycleState} -> ${currentState}`);

        if (currentState === 'live' && this.previousLifecycleState !== 'live') {
          this.emit('streamOnline', { broadcastId: broadcast.id, timestamp: new Date() });
          this.logger.info(`Stream online for broadcast ${broadcast.id}`);
        }

        if (currentState === 'complete' && this.previousLifecycleState === 'live') {
          this.emit('streamOffline', { broadcastId: broadcast.id, timestamp: new Date() });
          this.logger.info(`Stream offline for broadcast ${broadcast.id}`);
        }

        this.previousLifecycleState = currentState;
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        this.logger.debug('Broadcast not found (404), stream may not be active');
      } else {
        this.logger.error('Error checking broadcast state:', error);
      }
    }
  }

  private async getActiveBroadcast(): Promise<YouTubeLiveBroadcast | null> {
    try {
      const response = await this.restClient.get('/liveBroadcasts', {
        channelId: this.config.channelId,
        part: 'snippet,status',
        broadcastStatus: 'live',
      }) as any;

      if (!response.items || response.items.length === 0) {
        return null;
      }

      return response.items[0] as YouTubeLiveBroadcast;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        throw error;
      }
      this.logger.error('Failed to fetch active broadcast:', error);
      return null;
    }
  }

  private scheduleNextPoll(): void {
    this.clearPollTimer();

    if (!this.isMonitoring) {
      return;
    }

    const pollInterval = this.config.pollIntervalMs || 15000;

    this.pollTimer = setTimeout(async () => {
      try {
        await this.checkBroadcastState();
        this.scheduleNextPoll();
      } catch (error) {
        this.logger.error('Error in broadcast lifecycle check:', error);
        this.scheduleNextPoll();
      }
    }, pollInterval);
  }

  private clearPollTimer(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  getCurrentState(): string | null {
    return this.previousLifecycleState;
  }

  getBroadcastId(): string | null {
    return this.broadcastId;
  }
}
