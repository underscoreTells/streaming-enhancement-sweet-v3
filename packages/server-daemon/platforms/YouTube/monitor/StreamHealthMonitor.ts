import { EventEmitter } from 'events';
import { Logger } from 'winston';
import type { RestClient } from '../rest/RestClient';
import type { YouTubeLiveStream } from '../rest/types';

export interface StreamHealthMonitorConfig {
  streamId?: string;
  channelId?: string;
  pollIntervalMs?: number;
}

export interface HealthStatusChange {
  previousHealthStatus?: string;
  newHealthStatus: string;
  configurationIssues?: string[];
  timestamp: Date;
}

export class StreamHealthMonitor extends EventEmitter {
  private pollTimer: NodeJS.Timeout | null = null;
  private previousHealthStatus: string | null = null;
  private previousStreamStatus: string | null = null;
  private isMonitoring = false;

  constructor(
    private logger: Logger,
    private restClient: RestClient,
    private config: StreamHealthMonitorConfig
  ) {
    super();
    this.setMaxListeners(100);
  }

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      this.logger.debug('Stream health monitor is already running');
      return;
    }

    this.isMonitoring = true;
    this.logger.debug('Starting stream health monitor');

    try {
      await this.checkStreamHealth();
      this.scheduleNextPoll();
      this.logger.info('Stream health monitor started');
    } catch (error) {
      this.logger.error('Failed to start stream health monitor:', error);
      this.isMonitoring = false;
      throw error;
    }
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) {
      this.logger.debug('Stream health monitor is not running');
      return;
    }

    this.clearPollTimer();
    this.isMonitoring = false;
    this.previousHealthStatus = null;
    this.previousStreamStatus = null;
    this.logger.info('Stream health monitor stopped');
  }

  isRunning(): boolean {
    return this.isMonitoring;
  }

  hasStreamHealthMonitor(): boolean {
    return this.isMonitoring;
  }

  private async checkStreamHealth(): Promise<void> {
    try {
      const stream = await this.getStreamInfo();

      if (!stream) {
        const statusChange: HealthStatusChange = {
          previousHealthStatus: this.previousHealthStatus || undefined,
          newHealthStatus: 'noData',
          timestamp: new Date(),
        };

        if (this.previousHealthStatus !== 'noData') {
          this.emit('healthStatusChanged', statusChange);
          this.logger.debug('No stream data available');
        }

        this.previousHealthStatus = 'noData';
        this.previousStreamStatus = null;
        return;
      }

      const currentStreamStatus = stream.status.streamStatus;
      const currentHealthStatus = stream.status.healthStatus.status;

      if (this.previousHealthStatus !== currentHealthStatus || this.previousStreamStatus !== currentStreamStatus) {
        const statusChange: HealthStatusChange = {
          previousHealthStatus: this.previousHealthStatus || undefined,
          newHealthStatus: currentHealthStatus,
          configurationIssues: stream.status.healthStatus.configurationIssues,
          timestamp: new Date(),
        };

        this.emit('healthStatusChanged', statusChange);
        this.logger.debug(
          `Stream health status changed: ${this.previousHealthStatus} -> ${currentHealthStatus}, stream status: ${currentStreamStatus}`
        );

        if ((currentHealthStatus === 'bad' || currentHealthStatus === 'noData') && this.previousHealthStatus !== 'bad' && this.previousHealthStatus !== 'noData') {
          this.emit('healthWarning', { currentHealthStatus, configurationIssues: stream.status.healthStatus.configurationIssues, timestamp: new Date() });
          this.logger.warn(`Stream health degraded to: ${currentHealthStatus}`);
        }

        if ((currentHealthStatus === 'good' || currentHealthStatus === 'ok') && (this.previousHealthStatus === 'bad' || this.previousHealthStatus === 'noData')) {
          this.emit('healthRecovered', { currentHealthStatus, timestamp: new Date() });
          this.logger.info(`Stream health recovered to: ${currentHealthStatus}`);
        }

        this.previousHealthStatus = currentHealthStatus;
        this.previousStreamStatus = currentStreamStatus;
      }
    } catch (error) {
      this.logger.error('Error checking stream health:', error);
    }
  }

  private async getStreamInfo(): Promise<YouTubeLiveStream | null> {
    try {
      const params: Record<string, string> = {
        part: 'snippet,status,cdn',
      };

      // Validate that a required filter is present
      if (this.config.streamId) {
        params.id = this.config.streamId;
      } else {
        // For fetching the authenticated user's streams, use mine=true
        // This requires the restClient to be authenticated
        params.mine = 'true';
      }

      const response = await this.restClient.get('/liveStreams', params) as any;

      if (!response.items || response.items.length === 0) {
        return null;
      }

      return response.items[0] as YouTubeLiveStream;
    } catch (error) {
      this.logger.error('Failed to fetch stream info:', error);
      return null;
    }
  }

  private scheduleNextPoll(): void {
    this.clearPollTimer();

    if (!this.isMonitoring) {
      return;
    }

    const pollInterval = this.config.pollIntervalMs || 30000;

    this.pollTimer = setTimeout(async () => {
      try {
        await this.checkStreamHealth();
        this.scheduleNextPoll();
      } catch (error) {
        this.logger.error('Error in stream health check:', error);
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

  getHealthStatus(): { streamStatus: string | null; healthStatus: string | null } {
    return {
      streamStatus: this.previousStreamStatus,
      healthStatus: this.previousHealthStatus,
    };
  }
}
