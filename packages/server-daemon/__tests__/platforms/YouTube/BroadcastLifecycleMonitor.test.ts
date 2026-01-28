import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BroadcastLifecycleMonitor } from '../../../platforms/YouTube/monitor';
import { RestClient } from '../../../platforms/YouTube/rest';
import type { YouTubeLiveBroadcast } from '../../../platforms/YouTube/rest/types';
import { Logger } from 'winston';

describe('BroadcastLifecycleMonitor', () => {
  let logger: Logger;
  let restClient: RestClient;
  let mockGet: ReturnType<typeof vi.fn>;
  let monitor: BroadcastLifecycleMonitor;

  beforeEach(() => {
    logger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    restClient = new RestClient(logger) as any;
    mockGet = vi.spyOn(restClient, 'get').mockResolvedValue({});

    monitor = new BroadcastLifecycleMonitor(logger, restClient, {
      channelId: 'test-channel-id',
      pollIntervalMs: 1000,
    });

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with correct config', () => {
      expect(monitor).toBeDefined();
      expect(monitor.isRunning()).toBe(false);
    });

    it('should report hasBroadcastLifecycleMonitor correctly', () => {
      expect(monitor.hasBroadcastLifecycleMonitor()).toBe(false);
    });
  });

  describe('monitoring lifecycle', () => {
    it('should start monitoring', async () => {
      mockGet.mockResolvedValue({ items: [] });

      await monitor.startMonitoring();

      expect(monitor.isRunning()).toBe(true);
      expect(monitor.hasBroadcastLifecycleMonitor()).toBe(true);
    });

    it('should not start monitoring if already running', async () => {
      mockGet.mockResolvedValue({ items: [] });

      await monitor.startMonitoring();
      await monitor.startMonitoring();

      expect(logger.debug).toHaveBeenCalledWith(
        'Broadcast lifecycle monitor is already running'
      );
    });

    it('should stop monitoring', async () => {
      mockGet.mockResolvedValue({ items: [] });

      await monitor.startMonitoring();
      monitor.stopMonitoring();

      expect(monitor.isRunning()).toBe(false);
      expect(monitor.hasBroadcastLifecycleMonitor()).toBe(false);
    });

    it('should handle stopping when not running', () => {
      monitor.stopMonitoring();

      expect(logger.debug).toHaveBeenCalledWith(
        'Broadcast lifecycle monitor is not running'
      );
    });
  });

  describe('broadcast state detection', () => {
    it('should detect no active broadcast', async () => {
      mockGet.mockResolvedValue({ items: [] });

      await monitor.startMonitoring();
      expect(mockGet).toHaveBeenCalledWith('/liveBroadcasts', {
        channelId: 'test-channel-id',
        part: 'snippet,status',
        broadcastStatus: 'live',
      });
    });

    it('should detect stream online when state becomes live', async () => {
      const mockBroadcast: YouTubeLiveBroadcast = {
        kind: 'youtube#liveBroadcast',
        etag: '"test-etag"',
        id: 'broadcast-1',
        snippet: {
          publishedAt: '2024-01-01T00:00:00Z',
          channelId: 'test-channel-id',
          title: 'Test Stream',
          description: 'Test Description',
          scheduledStartTime: '2024-01-01T00:00:00Z',
          isDefaultBroadcast: false,
          liveChatId: 'chat-1',
        },
        status: {
          lifeCycleStatus: 'live',
          privacyStatus: 'public',
          recordingStatus: 'recording',
          selfDeclaredMadeForKids: false,
        },
        contentDetails: {
          enableEmbed: true,
          enableDvr: true,
          enableContentEncryption: false,
          startWithSlate: false,
          recordFromStart: true,
          closedCaptionsType: 'closedCaptionsEmbedded',
          enableLowLatency: false,
          latencyPreference: 'normal',
          projection: 'rectangular',
        },
        statistics: {
          viewCount: '100',
          likeCount: '10',
          dislikeCount: '0',
          commentCount: '5',
          concurrentViewers: '50',
        },
      };

      mockGet.mockResolvedValue({ items: [mockBroadcast] });

      const streamOnlineSpy = vi.fn();
      monitor.on('streamOnline', streamOnlineSpy);

      await monitor.startMonitoring();

      expect(streamOnlineSpy).toHaveBeenCalledWith({
        broadcastId: 'broadcast-1',
        timestamp: expect.any(Date),
      });
      expect(monitor.getCurrentState()).toBe('live');
      expect(monitor.getBroadcastId()).toBe('broadcast-1');
    });

    it('should detect stream offline when state becomes complete', async () => {
      const liveBroadcast: YouTubeLiveBroadcast = {
        ...({
          kind: 'youtube#liveBroadcast',
          etag: '"test-etag"',
          id: 'broadcast-1',
          snippet: {
            publishedAt: '2024-01-01T00:00:00Z',
            channelId: 'test-channel-id',
            title: 'Test Stream',
            description: 'Test Description',
            scheduledStartTime: '2024-01-01T00:00:00Z',
            actualStartTime: '2024-01-01T00:00:00Z',
            isDefaultBroadcast: false,
          },
          status: {
            lifeCycleStatus: 'live',
            privacyStatus: 'public',
            recordingStatus: 'recording',
            selfDeclaredMadeForKids: false,
          },
          contentDetails: {
            enableEmbed: true,
            enableDvr: true,
            enableContentEncryption: false,
            startWithSlate: false,
            recordFromStart: true,
            closedCaptionsType: 'closedCaptionsEmbedded',
            enableLowLatency: false,
            latencyPreference: 'normal',
            projection: 'rectangular',
          },
          statistics: {
            viewCount: '100',
            likeCount: '10',
            dislikeCount: '0',
            commentCount: '5',
            concurrentViewers: '50',
          },
        }) as YouTubeLiveBroadcast
      };

      const completeBroadcast: YouTubeLiveBroadcast = {
        ...liveBroadcast,
        status: {
          ...liveBroadcast.status,
          lifeCycleStatus: 'complete',
          recordingStatus: 'finished',
        },
        snippet: {
          ...liveBroadcast.snippet!,
          actualEndTime: '2024-01-01T01:00:00Z',
        },
      };

      mockGet.mockResolvedValueOnce({ items: [liveBroadcast] });
      mockGet.mockResolvedValueOnce({ items: [completeBroadcast] });

      const streamOfflineSpy = vi.fn();
      monitor.on('streamOffline', streamOfflineSpy);

      await monitor.startMonitoring();

      expect(monitor.getCurrentState()).toBe('live');

      await vi.advanceTimersByTimeAsync(1100);

      expect(streamOfflineSpy).toHaveBeenCalled();
      expect(monitor.getCurrentState()).toBe('complete');
      monitor.stopMonitoring();
    });

    it('should emit lifecycleStateChanged events', async () => {
      const mockBroadcast: YouTubeLiveBroadcast = {
        kind: 'youtube#liveBroadcast',
        etag: '"test-etag"',
        id: 'broadcast-1',
        snippet: {
          publishedAt: '2024-01-01T00:00:00Z',
          channelId: 'test-channel-id',
          title: 'Test Stream',
          description: 'Test Description',
          scheduledStartTime: '2024-01-01T00:00:00Z',
          isDefaultBroadcast: false,
        },
        status: {
          lifeCycleStatus: 'testing',
          privacyStatus: 'public',
          recordingStatus: 'notStarted',
          selfDeclaredMadeForKids: false,
        },
        contentDetails: {
          enableEmbed: true,
          enableDvr: true,
          enableContentEncryption: false,
          startWithSlate: false,
          recordFromStart: true,
          closedCaptionsType: 'closedCaptionsEmbedded',
          enableLowLatency: false,
          latencyPreference: 'normal',
          projection: 'rectangular',
        },
        statistics: {
          viewCount: '0',
          likeCount: '0',
          dislikeCount: '0',
          commentCount: '0',
        },
      };

      mockGet.mockResolvedValue({ items: [mockBroadcast] });

      const stateChangeSpy = vi.fn();
      monitor.on('lifecycleStateChanged', stateChangeSpy);

      await monitor.startMonitoring();

      expect(stateChangeSpy).toHaveBeenCalledWith({
        previousState: undefined,
        newState: 'testing',
        broadcastId: 'broadcast-1',
        timestamp: expect.any(Date),
      });
    });
  });

  describe('error handling', () => {
    it('should handle 404 errors gracefully', async () => {
      mockGet.mockRejectedValue(new Error('Request failed: 404 - Not Found'));

      await monitor.startMonitoring();

      expect(logger.debug).toHaveBeenCalledWith(
        'Broadcast not found (404), stream may not be active'
      );
      expect(monitor.isRunning()).toBe(true);
      monitor.stopMonitoring();
    });

    it('should handle other errors gracefully', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));

      await monitor.startMonitoring();

      expect(monitor.isRunning()).toBe(true);
      monitor.stopMonitoring();
    });

    it('should continue monitoring despite errors during start', async () => {
      mockGet.mockRejectedValue(new Error('Start error'));

      await monitor.startMonitoring();

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
      const monitorWithDefaultInterval = new BroadcastLifecycleMonitor(
        logger,
        restClient,
        { channelId: 'test-channel-id' }
      );

      mockGet.mockResolvedValue({ items: [] });

      await monitorWithDefaultInterval.startMonitoring();
      await vi.advanceTimersByTimeAsync(15100);

      expect(mockGet).toHaveBeenCalled();

      monitorWithDefaultInterval.stopMonitoring();
    });
  });
});
