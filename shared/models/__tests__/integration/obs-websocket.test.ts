import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObsStreamDetector } from '../../src/obs/ObsStreamDetector';
import type { StreamService } from '../../src/stream/StreamService';
import type { ObsWebSocketClient } from '../../src/obs/ObsWebSocketClient';

describe('Integration: OBS WebSocket', () => {
  let mockStreamService: StreamService;
  let mockObsClient: ObsWebSocketClient;

  beforeEach(() => {
    mockStreamService = {
      createStream: vi.fn().mockResolvedValue(undefined),
      getStream: vi.fn().mockResolvedValue(null),
      getOrCreateStream: vi.fn().mockResolvedValue({
        getCommonId: () => 'test-id',
        getObsStartTime: () => new Date(),
        getObsEndTime: vi.fn().mockResolvedValue(null),
        getPlatforms: vi.fn().mockResolvedValue(new Map()),
        toStorage: vi.fn()
      }),
      updateStreamEnd: vi.fn().mockResolvedValue(undefined),
      deleteStream: vi.fn().mockResolvedValue(undefined),
      createPlatformStream: vi.fn().mockResolvedValue({
        id: 'test-id',
        commonId: 'test-id',
        platform: 'twitch',
        data: {},
        createdAt: new Date()
      }),
      getPlatformStreams: vi.fn().mockResolvedValue([]),
      removePlatformFromStream: vi.fn().mockResolvedValue(undefined),
      getStreamWithPlatforms: vi.fn().mockResolvedValue({
        getCommonId: () => 'test-id',
        getObsStartTime: () => new Date(),
        getObsEndTime: vi.fn().mockResolvedValue(null),
        getPlatforms: vi.fn().mockResolvedValue(new Map()),
        toStorage: vi.fn()
      })
    } as any;

    mockObsClient = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      isConnected: vi.fn().mockReturnValue(true),
      on: vi.fn(),
      send: vi.fn(),
      getStreamStatus: vi.fn().mockResolvedValue({
        outputActive: false,
        outputState: 'OBS_WEBSOCKET_OUTPUT_STOPPED',
        outputTimecode: '00:00:00.000'
      })
    } as any;
  });

  describe('Interface compatibility', () => {
    it('should create detector with ObsWebSocketClient and StreamService', () => {
      const detector = new ObsStreamDetector(mockObsClient, mockStreamService);

      expect(detector).toBeDefined();
    });

    it('should accept callbacks configuration', () => {
      const streamStartCallback = vi.fn();
      const streamStopCallback = vi.fn();

      const detector = new ObsStreamDetector(mockObsClient, mockStreamService, {
        onStreamStart: streamStartCallback,
        onStreamStop: streamStopCallback
      });

      expect(detector).toBeDefined();
    });

    it('should have getStatus method', () => {
      const detector = new ObsStreamDetector(mockObsClient, mockStreamService);

      expect(typeof detector.getStatus).toBe('function');
    });

    it('should have connect method on detector', () => {
      const detector = new ObsStreamDetector(mockObsClient, mockStreamService);

      expect(typeof detector.connect).toBe('function');
    });

    it('should have disconnect method on detector', () => {
      const detector = new ObsStreamDetector(mockObsClient, mockStreamService);

      expect(typeof detector.disconnect).toBe('function');
    });
  });

  describe('StreamService integration', () => {
    it('should accept StreamService with correct interface', () => {
      const detector = new ObsStreamDetector(mockObsClient, mockStreamService);

      expect(detector).toBeDefined();
    });

    it('should not call StreamService during initial creation', () => {
      const detector = new ObsStreamDetector(mockObsClient, mockStreamService);

      expect(mockStreamService.createStream).not.toHaveBeenCalled();
      expect(mockStreamService.updateStreamEnd).not.toHaveBeenCalled();
    });
  });

  describe('ObsWebSocketClient integration', () => {
    it('should accept ObsWebSocketClient interface', () => {
      const detector = new ObsStreamDetector(mockObsClient, mockStreamService);

      expect(detector).toBeDefined();
    });

    it('should work with ObsWebSocketClient mock', () => {
      const detector = new ObsStreamDetector(mockObsClient, mockStreamService);

      expect(typeof detector.connect).toBe('function');
      expect(typeof detector.disconnect).toBe('function');
    });
  });

  describe('Type safety', () => {
    it('should maintain TypeScript type safety', () => {
      const detector: ObsStreamDetector = new ObsStreamDetector(mockObsClient, mockStreamService);

      expect(detector).toBeInstanceOf(ObsStreamDetector);
    });
  });
});
