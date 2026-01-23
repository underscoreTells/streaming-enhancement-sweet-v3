import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createStreamMatcher } from '../../src/matchers/StreamMatcher';
import type { StreamService } from '../../src/stream/StreamService';
import { Stream } from '../../src/stream/Stream';
import type { TwitchStream, KickStream, YouTubeStream } from '../../src/Stream';
import type { Platform } from '../../src/Platform';

describe('StreamMatcher', () => {
  let mockStreamService: StreamService;
  let createdStreams: Map<string, Stream>;
  let createdPlatformRecords: Array<{ commonId: string; stream: any; platform: Platform }>;
  let deletedStreams: Set<string>;
  let removedPlatforms: Array<{ commonId: string; platform: Platform }>;
  let updatedStreamEnds: Array<{ commonId: string; endTime: Date }>;

  function createMockStream(commonId: string, startTime: Date): Stream {
    let platformMap = new Map();
    const stream = {
      getCommonId: () => commonId,
      getObsStartTime: () => startTime,
      getObsEndTime: () => null,
      getPlatforms: vi.fn().mockImplementation(() => Promise.resolve(platformMap)),
      setPlatformMap: (map: Map<Platform, any>) => { platformMap = map; },
      setObsEndTime: vi.fn(),
      invalidateCache: vi.fn(),
      toStorage: vi.fn()
    } as any;
    return stream;
  }

  beforeEach(() => {
    createdStreams = new Map();
    createdPlatformRecords = [];
    deletedStreams = new Set();
    removedPlatforms = [];
    updatedStreamEnds = [];

    mockStreamService = {
      createStream: vi.fn(async (commonId: string, startTime: Date) => {
        const stream = createMockStream(commonId, startTime);
        createdStreams.set(commonId, stream);
      }),
      getStream: vi.fn(async (commonId: string) => {
        return createdStreams.get(commonId) || null;
      }),
      getOrCreateStream: vi.fn(async (commonId: string, startTime: Date) => {
        const existing = createdStreams.get(commonId);
        if (existing) return existing;
        const stream = createMockStream(commonId, startTime);
        createdStreams.set(commonId, stream);
        return stream;
      }),
      updateStreamEnd: vi.fn(async (commonId: string, endTime: Date) => {
        updatedStreamEnds.push({ commonId, endTime });
        const stream = createdStreams.get(commonId);
        if (stream) {
          (stream as any).getObsEndTime = () => endTime;
        }
      }),
      deleteStream: vi.fn(async (commonId: string) => {
        deletedStreams.add(commonId);
        createdStreams.delete(commonId);
      }),
      createPlatformStream: vi.fn(async (commonId: string, platformStream: any) => {
        const record = { commonId, stream: platformStream, platform: platformStream.platform };
        createdPlatformRecords.push(record);
        return { id: crypto.randomUUID(), commonId, platform: platformStream.platform, data: platformStream, createdAt: new Date() };
      }),
      getPlatformStreams: vi.fn(async (commonId: string) => {
        return createdPlatformRecords
          .filter(r => r.commonId === commonId)
          .map(r => ({ id: crypto.randomUUID(), commonId, platform: r.platform, data: r.stream, createdAt: new Date() }));
      }),
      removePlatformFromStream: vi.fn(async (commonId: string, platform: Platform) => {
        removedPlatforms.push({ commonId, platform });
        const idx = createdPlatformRecords.findIndex(r => r.commonId === commonId && r.platform === platform);
        if (idx >= 0) {
          createdPlatformRecords.splice(idx, 1);
        }
      }),
      getStreamWithPlatforms: vi.fn(async (commonId: string) => {
        const stream = createdStreams.get(commonId);
        if (!stream) throw new Error('Stream not found');
        return stream;
      })
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('calculateOverlapPercent', () => {
    it('should calculate 100% overlap for identical streams', () => {
      const matcher = createStreamMatcher();
      const streamA = { startTime: new Date('2024-01-01T14:00:00Z'), endTime: new Date('2024-01-01T16:00:00Z') };
      const streamB = { startTime: new Date('2024-01-01T14:00:00Z'), endTime: new Date('2024-01-01T16:00:00Z') };

      const overlap = matcher.calculateOverlapPercent(streamA, streamB);
      expect(overlap).toBe(1.0);
    });

    it('should calculate ~90% overlap for 2-hour and 1.9-hour streams aligned', () => {
      const matcher = createStreamMatcher();
      const streamA = { startTime: new Date('2024-01-01T14:00:00Z'), endTime: new Date('2024-01-01T16:00:00Z') };
      const streamB = { startTime: new Date('2024-01-01T14:06:00Z'), endTime: new Date('2024-01-01T15:54:00Z') };

      const overlap = matcher.calculateOverlapPercent(streamA, streamB);
      expect(overlap).toBeCloseTo(1.0, 1);
    });

    it('should calculate 100% overlap for 2-hour stream with 1.5-hour stream fully inside', () => {
      const matcher = createStreamMatcher();
      const streamA = { startTime: new Date('2024-01-01T14:00:00Z'), endTime: new Date('2024-01-01T16:00:00Z') };
      const streamB = { startTime: new Date('2024-01-01T14:00:00Z'), endTime: new Date('2024-01-01T15:30:00Z') };

      const overlap = matcher.calculateOverlapPercent(streamA, streamB);
      expect(overlap).toBe(1.0);
    });

    it('should calculate 25% overlap for 2-hour stream with 30-min overlap', () => {
      const matcher = createStreamMatcher();
      const streamA = { startTime: new Date('2024-01-01T14:00:00Z'), endTime: new Date('2024-01-01T16:00:00Z') };
      const streamB = { startTime: new Date('2024-01-01T15:30:00Z'), endTime: new Date('2024-01-01T18:00:00Z') };

      const overlap = matcher.calculateOverlapPercent(streamA, streamB);
      expect(overlap).toBeCloseTo(0.25, 1);
    });

    it('should return 0 for non-overlapping streams', () => {
      const matcher = createStreamMatcher();
      const streamA = { startTime: new Date('2024-01-01T14:00:00Z'), endTime: new Date('2024-01-01T16:00:00Z') };
      const streamB = { startTime: new Date('2024-01-01T18:00:00Z'), endTime: new Date('2024-01-01T20:00:00Z') };

      const overlap = matcher.calculateOverlapPercent(streamA, streamB);
      expect(overlap).toBe(0);
    });

    it('should handle edge case where one stream ends when other starts', () => {
      const matcher = createStreamMatcher();
      const streamA = { startTime: new Date('2024-01-01T14:00:00Z'), endTime: new Date('2024-01-01T16:00:00Z') };
      const streamB = { startTime: new Date('2024-01-01T16:00:00Z'), endTime: new Date('2024-01-01T18:00:00Z') };

      const overlap = matcher.calculateOverlapPercent(streamA, streamB);
      expect(overlap).toBe(0);
    });
  });

  describe('matchAllPlatformStreams', () => {
    it('should match overlapping streams (85% threshold)', async () => {
      const matcher = createStreamMatcher(0.85);

      const twitchStreams: TwitchStream[] = [{
        platform: 'twitch',
        twitchId: '123',
        username: 'testuser',
        title: 'Test Stream',
        categoryId: '509658',
        tags: [],
        isMature: false,
        language: 'en',
        thumbnailUrl: null,
        channelPoints: 0,
        startTime: new Date('2024-01-01T14:00:00Z'),
        endTime: new Date('2024-01-01T16:00:00Z')
      }];

      const kickStreams: KickStream[] = [{
        platform: 'kick',
        kickId: '456',
        username: 'testuser',
        title: 'Test Stream',
        categorySlug: 'just-chatting',
        tags: [],
        language: 'en',
        thumbnailUrl: null,
        totalTipsUsd: 0,
        startTime: new Date('2024-01-01T14:06:00Z'),
        endTime: new Date('2024-01-01T15:54:00Z')
      }];

      const results = await matcher.matchAllPlatformStreams(mockStreamService, twitchStreams, kickStreams, []);

      expect(results.length).toBe(1);
      expect(createdPlatformRecords.length).toBe(2);
    });

    it('should create separate streams for <85% overlap', async () => {
      const matcher = createStreamMatcher(0.85);

      const twitchStreams: TwitchStream[] = [{
        platform: 'twitch',
        twitchId: '123',
        username: 'testuser',
        title: 'Test Stream',
        categoryId: '509658',
        tags: [],
        isMature: false,
        language: 'en',
        thumbnailUrl: null,
        channelPoints: 0,
        startTime: new Date('2024-01-01T14:00:00Z'),
        endTime: new Date('2024-01-01T16:00:00Z')
      }];

      const kickStreams: KickStream[] = [{
        platform: 'kick',
        kickId: '456',
        username: 'testuser',
        title: 'Test Stream',
        categorySlug: 'just-chatting',
        tags: [],
        language: 'en',
        thumbnailUrl: null,
        totalTipsUsd: 0,
        startTime: new Date('2024-01-01T15:00:00Z'),
        endTime: new Date('2024-01-01T18:00:00Z')
      }];

      const results = await matcher.matchAllPlatformStreams(mockStreamService, twitchStreams, kickStreams, []);

      expect(results.length).toBe(2);
      expect(createdPlatformRecords.length).toBe(2);
    });

    it('should handle single stream only', async () => {
      const matcher = createStreamMatcher();

      const twitchStreams: TwitchStream[] = [{
        platform: 'twitch',
        twitchId: '123',
        username: 'testuser',
        title: 'Test Stream',
        categoryId: '509658',
        tags: [],
        isMature: false,
        language: 'en',
        thumbnailUrl: null,
        channelPoints: 0,
        startTime: new Date('2024-01-01T14:00:00Z'),
        endTime: new Date('2024-01-01T16:00:00Z')
      }];

      const results = await matcher.matchAllPlatformStreams(mockStreamService, twitchStreams, [], []);

      expect(results.length).toBe(1);
      expect(createdPlatformRecords.length).toBe(1);
    });

    it('should handle empty input', async () => {
      const matcher = createStreamMatcher();

      const results = await matcher.matchAllPlatformStreams(mockStreamService, [], [], []);

      expect(results.length).toBe(0);
      expect(createdPlatformRecords.length).toBe(0);
    });

    it('should match three platforms with high overlap', async () => {
      const matcher = createStreamMatcher(0.85);

      const twitchStreams: TwitchStream[] = [{
        platform: 'twitch',
        twitchId: '123',
        username: 'testuser',
        title: 'Test Stream',
        categoryId: '509658',
        tags: [],
        isMature: false,
        language: 'en',
        thumbnailUrl: null,
        channelPoints: 0,
        startTime: new Date('2024-01-01T14:00:00Z'),
        endTime: new Date('2024-01-01T16:00:00Z')
      }];

      const kickStreams: KickStream[] = [{
        platform: 'kick',
        kickId: '456',
        username: 'testuser',
        title: 'Test Stream',
        categorySlug: 'just-chatting',
        tags: [],
        language: 'en',
        thumbnailUrl: null,
        totalTipsUsd: 0,
        startTime: new Date('2024-01-01T14:05:00Z'),
        endTime: new Date('2024-01-01T16:05:00Z')
      }];

      const youtubeStreams: YouTubeStream[] = [{
        platform: 'youtube',
        videoId: '789',
        channelTitle: 'testuser',
        title: 'Test Stream',
        categoryId: '0',
        tags: [],
        privacyStatus: 'public',
        thumbnailUrl: null,
        subscriberCount: 0,
        superChatTotal: 0,
        startTime: new Date('2024-01-01T13:55:00Z'),
        endTime: new Date('2024-01-01T15:55:00Z')
      }];

      const results = await matcher.matchAllPlatformStreams(mockStreamService, twitchStreams, kickStreams, youtubeStreams);

      expect(results.length).toBe(1);
      expect(createdPlatformRecords.length).toBe(3);
    });
  });

  describe('matchNewPlatformStreams', () => {
    it('should add new platform to existing stream with 85% overlap', async () => {
      const matcher = createStreamMatcher(0.85);

      const existingStream = createMockStream('stream1', new Date('2024-01-01T14:00:00Z'));
      const obsEndTime = new Date('2024-01-01T16:00:00Z');
      const getObsEndTimeSpy = vi.spyOn(existingStream, 'getObsEndTime').mockReturnValue(Promise.resolve(obsEndTime));

      const newPlatformStream: KickStream = {
        platform: 'kick',
        kickId: '456',
        username: 'testuser',
        title: 'Test Stream',
        categorySlug: 'just-chatting',
        tags: [],
        language: 'en',
        thumbnailUrl: null,
        totalTipsUsd: 0,
        startTime: new Date('2024-01-01T14:06:00Z'),
        endTime: new Date('2024-01-01T15:54:00Z')
      };

      const results = await matcher.matchNewPlatformStreams(mockStreamService, [existingStream], [newPlatformStream]);

      expect(results.newStreams.length).toBe(0);
      expect(results.addedToExisting.size).toBe(1);
      expect(createdPlatformRecords.length).toBe(1);
      getObsEndTimeSpy.mockRestore();
    });

    it('should create new stream for <85% overlap', async () => {
      const matcher = createStreamMatcher(0.85);

      const existingStream = createMockStream('stream1', new Date('2024-01-01T14:00:00Z'));
      const obsEndTime = new Date('2024-01-01T16:00:00Z');
      const getObsEndTimeSpy = vi.spyOn(existingStream, 'getObsEndTime').mockReturnValue(Promise.resolve(obsEndTime));

      const newPlatformStream: KickStream = {
        platform: 'kick',
        kickId: '456',
        username: 'testuser',
        title: 'Test Stream',
        categorySlug: 'just-chatting',
        tags: [],
        language: 'en',
        thumbnailUrl: null,
        totalTipsUsd: 0,
        startTime: new Date('2024-01-01T18:00:00Z'),
        endTime: new Date('2024-01-01T20:00:00Z')
      };

      const results = await matcher.matchNewPlatformStreams(mockStreamService, [existingStream], [newPlatformStream]);

      expect(results.newStreams.length).toBe(1);
      expect(results.addedToExisting.size).toBe(0);
      expect(createdPlatformRecords.length).toBe(1);
      getObsEndTimeSpy.mockRestore();
    });

    it('should handle empty existing streams', async () => {
      const matcher = createStreamMatcher();

      const newPlatformStream: KickStream = {
        platform: 'kick',
        kickId: '456',
        username: 'testuser',
        title: 'Test Stream',
        categorySlug: 'just-chatting',
        tags: [],
        language: 'en',
        thumbnailUrl: null,
        totalTipsUsd: 0,
        startTime: new Date('2024-01-01T14:00:00Z'),
        endTime: new Date('2024-01-01T16:00:00Z')
      };

      const results = await matcher.matchNewPlatformStreams(mockStreamService, [], [newPlatformStream]);

      expect(results.newStreams.length).toBe(1);
      expect(results.addedToExisting.size).toBe(0);
    });

    it('should handle empty new platform streams', async () => {
      const matcher = createStreamMatcher();

      const existingStream = createMockStream('stream1', new Date('2024-01-01T14:00:00Z'));

      const results = await matcher.matchNewPlatformStreams(mockStreamService, [existingStream], []);

      expect(results.newStreams.length).toBe(0);
      expect(results.addedToExisting.size).toBe(0);
    });
  });

  describe('splitStream', () => {
    it('should not split stream when all platforms match', async () => {
      const matcher = createStreamMatcher(0.85);

      const stream = createMockStream('stream1', new Date('2024-01-01T14:00:00Z'));
      const obsEndTime = new Date('2024-01-01T16:00:00Z');
      const getObsEndTimeSpy = vi.spyOn(stream, 'getObsEndTime').mockReturnValue(Promise.resolve(obsEndTime));

      const mockAdapter = {
        getPlatform: () => 'twitch' as Platform,
        toStorage: () => ({
          platform: 'twitch',
          twitchId: '123',
          username: 'testuser',
          title: 'Test',
          categoryId: '509658',
          tags: [],
          isMature: false,
          language: 'en',
          thumbnailUrl: null,
          channelPoints: 0,
          startTime: new Date('2024-01-01T14:05:00Z'),
          endTime: new Date('2024-01-01T15:55:00Z')
        })
      };

      const platforms = new Map<Platform, any>();
      platforms.set('twitch', mockAdapter);
      vi.spyOn(stream, 'getPlatforms').mockResolvedValue(platforms);

      const results = await matcher.splitStream(mockStreamService, stream);

      expect(results.length).toBe(1);
      expect(results[0]).toBe(stream);
      expect(removedPlatforms.length).toBe(0);
      getObsEndTimeSpy.mockRestore();
    });

    it('should split stream when platform has <85% overlap', async () => {
      const matcher = createStreamMatcher(0.85);

      const stream = createMockStream('stream1', new Date('2024-01-01T14:00:00Z'));
      const obsEndTime = new Date('2024-01-01T16:00:00Z');
      const getObsEndTimeSpy = vi.spyOn(stream, 'getObsEndTime').mockReturnValue(Promise.resolve(obsEndTime));

      const mockTwitchAdapter = {
        getPlatform: () => 'twitch' as Platform,
        toStorage: () => ({
          platform: 'twitch',
          twitchId: '123',
          username: 'testuser',
          title: 'Test',
          categoryId: '509658',
          tags: [],
          isMature: false,
          language: 'en',
          thumbnailUrl: null,
          channelPoints: 0,
          startTime: new Date('2024-01-01T14:00:00Z'),
          endTime: new Date('2024-01-01T16:00:00Z')
        })
      };

      const mockKickAdapter = {
        getPlatform: () => 'kick' as Platform,
        toStorage: () => ({
          platform: 'kick',
          kickId: '456',
          username: 'testuser',
          title: 'Test',
          categorySlug: 'just-chatting',
          tags: [],
          language: 'en',
          thumbnailUrl: null,
          totalTipsUsd: 0,
          startTime: new Date('2024-01-01T15:00:00Z'),
          endTime: new Date('2024-01-01T18:00:00Z')
        })
      };

      const platforms = new Map<Platform, any>();
      platforms.set('twitch', mockTwitchAdapter);
      platforms.set('kick', mockKickAdapter);
      (stream as any).setPlatformMap(platforms);

      const remainingPlatforms = new Map<Platform, any>();
      remainingPlatforms.set('twitch', mockTwitchAdapter);

      let callCount = 0;
      vi.spyOn(stream, 'getPlatforms').mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(platforms);
        if (callCount === 2) return Promise.resolve(remainingPlatforms);
        return Promise.resolve(new Map());
      });

      const results = await matcher.splitStream(mockStreamService, stream);

      expect(results.length).toBe(2);
      expect(removedPlatforms.length).toBe(1);
      expect(removedPlatforms[0].platform).toBe('kick');
      getObsEndTimeSpy.mockRestore();
    });

    it('should delete original stream when all platforms removed', async () => {
      const matcher = createStreamMatcher(0.85);

      const stream = createMockStream('stream1', new Date('2024-01-01T14:00:00Z'));
      const obsEndTime = new Date('2024-01-01T16:00:00Z');
      const getObsEndTimeSpy = vi.spyOn(stream, 'getObsEndTime').mockReturnValue(Promise.resolve(obsEndTime));

      const mockKickAdapter = {
        getPlatform: () => 'kick' as Platform,
        toStorage: () => ({
          platform: 'kick',
          kickId: '456',
          username: 'testuser',
          title: 'Test',
          categorySlug: 'just-chatting',
          tags: [],
          language: 'en',
          thumbnailUrl: null,
          totalTipsUsd: 0,
          startTime: new Date('2024-01-01T15:00:00Z'),
          endTime: new Date('2024-01-01T18:00:00Z')
        })
      };

      const platforms = new Map<Platform, any>();
      platforms.set('kick', mockKickAdapter);
      vi.spyOn(stream, 'getPlatforms')
        .mockResolvedValueOnce(platforms)
        .mockResolvedValueOnce(new Map());

      const results = await matcher.splitStream(mockStreamService, stream);

      expect(results.length).toBe(1);
      expect(deletedStreams.has('stream1')).toBe(true);
      getObsEndTimeSpy.mockRestore();
    });
  });

  describe('custom threshold', () => {
    it('should use custom threshold from factory', async () => {
      const matcher = createStreamMatcher(0.9);

      const twitchStreams: TwitchStream[] = [{
        platform: 'twitch',
        twitchId: '123',
        username: 'testuser',
        title: 'Test Stream',
        categoryId: '509658',
        tags: [],
        isMature: false,
        language: 'en',
        thumbnailUrl: null,
        channelPoints: 0,
        startTime: new Date('2024-01-01T14:00:00Z'),
        endTime: new Date('2024-01-01T16:00:00Z')
      }];

      const kickStreams: KickStream[] = [{
        platform: 'kick',
        kickId: '456',
        username: 'testuser',
        title: 'Test Stream',
        categorySlug: 'just-chatting',
        tags: [],
        language: 'en',
        thumbnailUrl: null,
        totalTipsUsd: 0,
        startTime: new Date('2024-01-01T15:00:00Z'),
        endTime: new Date('2024-01-01T17:00:00Z')
      }];

      const results = await matcher.matchAllPlatformStreams(mockStreamService, twitchStreams, kickStreams, []);

      expect(results.length).toBe(2);
    });
  });
});
