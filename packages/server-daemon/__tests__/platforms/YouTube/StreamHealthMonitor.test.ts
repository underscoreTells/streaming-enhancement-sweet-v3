import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StreamHealthMonitor } from '../../../platforms/YouTube/monitor';
import { RestClient } from '../../../platforms/YouTube/rest';
import type { YouTubeLiveStream } from '../../../platforms/YouTube/rest/types';
import { Logger } from 'winston';

describe('StreamHealthMonitor', () => {
  let logger: Logger;
  let restClient: RestClient;
  let mockGet: ReturnType<typeof vi.fn>;
  let monitor: StreamHealthMonitor;

  beforeEach(() => {
    logger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    restClient = new RestClient(logger) as any;
    mockGet = vi.spyOn(restClient, 'get').mockResolvedValue({});

    monitor = new StreamHealthMonitor(logger, restClient, {
      streamId: 'test-stream-id',
      pollIntervalMs: 1000,
    });

    vi.useFakeTimers();
  });

  afterEach(() => {
    if (monitor) {
      monitor.stopMonitoring();
    }
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with correct config', () => {
      expect(monitor).toBeDefined();
      expect(monitor.isRunning()).toBe(false);
    });

    it('should report hasStreamHealthMonitor correctly', () => {
      expect(monitor.hasStreamHealthMonitor()).toBe(false);
    });
  });

  describe('monitoring lifecycle', () => {
    it('should start monitoring', async () => {
      mockGet.mockResolvedValue({ items: [] });

      await monitor.startMonitoring();

      expect(monitor.isRunning()).toBe(true);
      expect(monitor.hasStreamHealthMonitor()).toBe(true);
      monitor.stopMonitoring();
    });

    it('should not start monitoring if already running', async () => {
      mockGet.mockResolvedValue({ items: [] });

      await monitor.startMonitoring();
      await monitor.startMonitoring();

      expect(logger.debug).toHaveBeenCalledWith(
        'Stream health monitor is already running'
      );
      monitor.stopMonitoring();
    });

    it('should stop monitoring', async () => {
      mockGet.mockResolvedValue({ items: [] });

      await monitor.startMonitoring();
      monitor.stopMonitoring();

      expect(monitor.isRunning()).toBe(false);
      expect(monitor.hasStreamHealthMonitor()).toBe(false);
    });

    it('should handle stopping when not running', () => {
      monitor.stopMonitoring();

      expect(logger.debug).toHaveBeenCalledWith(
        'Stream health monitor is not running'
      );
    });
  });

  describe('health status detection', () => {
    it('should detect health status as good', async () => {
      const mockStream: YouTubeLiveStream = {
        kind: 'youtube#liveStream',
        etag: '"test-etag"',
        id: 'stream-1',
        snippet: {
          publishedAt: '2024-01-01T00:00:00Z',
          channelId: 'test-channel-id',
          title: 'Test Stream',
          description: 'Test Description',
          isDefaultStream: false,
        },
        cdn: {
          format: '1080p',
          ingestionType: 'rtmp',
          ingestionInfo: {
            streamName: 'test-stream',
            ingestionAddress: 'rtmp://example.com/stream',
            backupIngestionAddress: 'rtmp://example.com/stream-backup',
          },
          resolution: '1920x1080',
          frameRate: '60fps',
        },
        status: {
          streamStatus: 'active',
          healthStatus: {
            status: 'good',
            lastUpdateTimeS: '1704067200',
          },
        },
        contentDetails: {
          isReusable: true,
          closedCaptionsIngestionUrl: 'https://example.com/captions',
        },
      };

      mockGet.mockResolvedValue({ items: [mockStream] });

      await monitor.startMonitoring();

      const healthStatus = monitor.getHealthStatus();
      expect(healthStatus.streamStatus).toBe('active');
      expect(healthStatus.healthStatus).toBe('good');
      monitor.stopMonitoring();
    });

    it('should emit healthWarning when status degrades to bad', async () => {
      const goodStream: YouTubeLiveStream = {
        kind: 'youtube#liveStream',
        etag: '"test-etag"',
        id: 'stream-1',
        snippet: {
          publishedAt: '2024-01-01T00:00:00Z',
          channelId: 'test-channel-id',
          title: 'Test Stream',
          description: 'Test Description',
          isDefaultStream: false,
        },
        cdn: {
          format: '1080p',
          ingestionType: 'rtmp',
          ingestionInfo: {
            streamName: 'test-stream',
            ingestionAddress: 'rtmp://example.com/stream',
            backupIngestionAddress: 'rtmp://example.com/stream-backup',
          },
          resolution: '1920x1080',
          frameRate: '60fps',
        },
        status: {
          streamStatus: 'active',
          healthStatus: {
            status: 'good',
            lastUpdateTimeS: '1704067200',
          },
        },
        contentDetails: {
          isReusable: true,
          closedCaptionsIngestionUrl: 'https://example.com/captions',
        },
      } as YouTubeLiveStream;

      const badStream: YouTubeLiveStream = {
        ...goodStream,
        status: {
          streamStatus: 'active',
          healthStatus: {
            status: 'bad',
            lastUpdateTimeS: '1704067260',
            configurationIssues: ['High bitrate'],
          },
        },
      };

      mockGet.mockResolvedValueOnce({ items: [goodStream] });
      mockGet.mockResolvedValueOnce({ items: [badStream] });

      const healthWarningSpy = vi.fn();
      monitor.on('healthWarning', healthWarningSpy);

      await monitor.startMonitoring();
      await vi.advanceTimersByTimeAsync(1100);

      expect(healthWarningSpy).toHaveBeenCalledWith({
        currentHealthStatus: 'bad',
        configurationIssues: ['High bitrate'],
        timestamp: expect.any(Date),
      });
      expect(logger.warn).toHaveBeenCalledWith('Stream health degraded to: bad');
      monitor.stopMonitoring();
    });

    it('should emit healthRecovered when status improves', async () => {
      const badStream: YouTubeLiveStream = {
        kind: 'youtube#liveStream',
        etag: '"test-etag"',
        id: 'stream-1',
        snippet: {
          publishedAt: '2024-01-01T00:00:00Z',
          channelId: 'test-channel-id',
          title: 'Test Stream',
          description: 'Test Description',
          isDefaultStream: false,
        },
        cdn: {
          format: '1080p',
          ingestionType: 'rtmp',
          ingestionInfo: {
            streamName: 'test-stream',
            ingestionAddress: 'rtmp://example.com/stream',
            backupIngestionAddress: 'rtmp://example.com/stream-backup',
          },
          resolution: '1920x1080',
          frameRate: '60fps',
        },
        status: {
          streamStatus: 'active',
          healthStatus: {
            status: 'bad',
            lastUpdateTimeS: '1704067200',
            configurationIssues: ['High bitrate'],
          },
        },
        contentDetails: {
          isReusable: true,
          closedCaptionsIngestionUrl: 'https://example.com/captions',
        },
      } as YouTubeLiveStream;

      const goodStream: YouTubeLiveStream = {
        ...badStream,
        status: {
          streamStatus: 'active',
          healthStatus: {
            status: 'good',
            lastUpdateTimeS: '1704067260',
          },
        },
      };

      mockGet.mockResolvedValueOnce({ items: [badStream] });
      mockGet.mockResolvedValueOnce({ items: [goodStream] });

      const healthRecoveredSpy = vi.fn();
      monitor.on('healthRecovered', healthRecoveredSpy);

      await monitor.startMonitoring();
      await vi.advanceTimersByTimeAsync(1100);

      expect(healthRecoveredSpy).toHaveBeenCalledWith({
        currentHealthStatus: 'good',
        timestamp: expect.any(Date),
      });
      expect(logger.info).toHaveBeenCalledWith('Stream health recovered to: good');
      monitor.stopMonitoring();
    });

    it('should emit healthStatusChanged events', async () => {
      const mockStream: YouTubeLiveStream = {
        kind: 'youtube#liveStream',
        etag: '"test-etag"',
        id: 'stream-1',
        snippet: {
          publishedAt: '2024-01-01T00:00:00Z',
          channelId: 'test-channel-id',
          title: 'Test Stream',
          description: 'Test Description',
          isDefaultStream: false,
        },
        cdn: {
          format: '1080p',
          ingestionType: 'rtmp',
          ingestionInfo: {
            streamName: 'test-stream',
            ingestionAddress: 'rtmp://example.com/stream',
            backupIngestionAddress: 'rtmp://example.com/stream-backup',
          },
          resolution: '1920x1080',
          frameRate: '60fps',
        },
        status: {
          streamStatus: 'active',
          healthStatus: {
            status: 'ok',
            lastUpdateTimeS: '1704067200',
          },
        },
        contentDetails: {
          isReusable: true,
          closedCaptionsIngestionUrl: 'https://example.com/captions',
        },
      };

      mockGet.mockResolvedValue({ items: [mockStream] });

      const statusChangeSpy = vi.fn();
      monitor.on('healthStatusChanged', statusChangeSpy);

      await monitor.startMonitoring();

      expect(statusChangeSpy).toHaveBeenCalledWith({
        previousHealthStatus: undefined,
        newHealthStatus: 'ok',
        configurationIssues: undefined,
        timestamp: expect.any(Date),
      });
      monitor.stopMonitoring();
    });

    it('should handle no stream data', async () => {
      mockGet.mockResolvedValue({ items: [] });

      await monitor.startMonitoring();

      const healthStatus = monitor.getHealthStatus();
      expect(healthStatus.streamStatus).toBe(null);
      expect(healthStatus.healthStatus).toBe('noData');
      monitor.stopMonitoring();
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      mockGet.mockRejectedValue(new Error('API error'));

      await monitor.startMonitoring();

      expect(monitor.isRunning()).toBe(true);
      monitor.stopMonitoring();
    });

    it('should handle monitoring errors gracefully', async () => {
      mockGet.mockResolvedValueOnce({ items: [] });
      mockGet.mockRejectedValueOnce(new Error('Network error'));

      await monitor.startMonitoring();
      await vi.advanceTimersByTimeAsync(1100);

      expect(monitor.isRunning()).toBe(true);
      monitor.stopMonitoring();
    });
  });

  describe('polling behavior', () => {
    it('should poll at configured interval', async () => {
      mockGet.mockResolvedValue({ items: [] });

      await monitor.startMonitoring();

      await vi.advanceTimersByTimeAsync(1100);
      expect(mockGet).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(1100);
      expect(mockGet).toHaveBeenCalledTimes(3);

      monitor.stopMonitoring();
    });

    it('should use default poll interval when not specified', async () => {
      const monitorWithDefaultInterval = new StreamHealthMonitor(
        logger,
        restClient,
        { streamId: 'test-stream-id' }
      );

      mockGet.mockResolvedValue({ items: [] });

      await monitorWithDefaultInterval.startMonitoring();
      await vi.advanceTimersByTimeAsync(30100);

      expect(mockGet).toHaveBeenCalled();

      monitorWithDefaultInterval.stopMonitoring();
    });
  });
});
