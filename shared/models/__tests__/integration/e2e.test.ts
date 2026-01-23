import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TwitchConverter, KickConverter, YouTubeConverter } from '../../src/converters';
import { createStreamMatcher } from '../../src/matchers/StreamMatcher';
import { ObsStreamDetector } from '../../src/obs/ObsStreamDetector';
import type { StreamService } from '../../src/stream/StreamService';
import { createStreamAdapter } from '../../src/translators';

describe('Integration: E2E Flows', () => {
  let mockStreamService: StreamService;
  const createdStreams: Map<string, any> = new Map();
  const createdPlatformRecords: any[] = [];
  const streamStartTimes: Date[] = [];
  const streamEndTimes: Date[] = [];

  function createMockStream(commonId: string, startTime: Date): any {
    const stream = {
      getCommonId: () => commonId,
      getObsStartTime: () => startTime,
      getObsEndTime: vi.fn().mockResolvedValue(null),
      getPlatforms: vi.fn().mockResolvedValue(new Map()),
      toStorage: vi.fn()
    };
    return stream;
  }

  beforeEach(() => {
    createdStreams.clear();
    createdPlatformRecords.length = 0;
    streamStartTimes.length = 0;
    streamEndTimes.length = 0;

    mockStreamService = {
      createStream: vi.fn(async (commonId: string, obsStartTime: Date) => {
        streamStartTimes.push(obsStartTime);
        const stream = createMockStream(commonId, obsStartTime);
        createdStreams.set(commonId, stream);
      }),
      getStream: vi.fn(async (commonId: string) => {
        return createdStreams.get(commonId) || null;
      }),
      getOrCreateStream: vi.fn(async (commonId: String, obsStartTime: Date) => {
        const existing = createdStreams.get(commonId);
        if (existing) return existing;
        const stream = createMockStream(commonId, obsStartTime);
        createdStreams.set(commonId, stream);
        return stream;
      }),
      updateStreamEnd: vi.fn(async (commonId: string, obsEndTime: Date) => {
        streamEndTimes.push(obsEndTime);
        const stream = createdStreams.get(commonId);
        if (stream) {
          vi.spyOn(stream, 'getObsEndTime').mockResolvedValue(obsEndTime);
        }
      }),
      deleteStream: vi.fn(async (commonId: string) => {
        createdStreams.delete(commonId);
      }),
      createPlatformStream: vi.fn(async (commonId: string, platformStream: any) => {
        createdPlatformRecords.push({ commonId, platform: platformStream.platform, data: platformStream });
        return {
          id: crypto.randomUUID(),
          commonId,
          platform: platformStream.platform,
          data: platformStream,
          createdAt: new Date()
        };
      }),
      getPlatformStreams: vi.fn(async (commonId: string) => {
        return createdPlatformRecords
          .filter(r => r.commonId === commonId)
          .map(r => ({
            id: crypto.randomUUID(),
            commonId,
            platform: r.platform,
            data: r.data,
            createdAt: new Date()
          }));
      }),
      removePlatformFromStream: vi.fn(async (commonId: string, platform: string) => {}),
      getStreamWithPlatforms: vi.fn(async (commonId: string) => {
        return createdStreams.get(commonId);
      })
    } as any;
  });

  describe('API → Converter → Matcher flow', () => {
    it('should process complete flow from API to stream matching', async () => {
      const apiResponse = {
        data: [{
          id: '123456789',
          user_login: 'streamer',
          title: 'Test Stream',
          game_id: '509658',
          tags: ['tag1', 'tag2'],
          language: 'en',
          thumbnail_url: 'https://example.com/thumb.jpg',
          started_at: '2024-01-01T14:00:00Z'
        }]
      };

      const twitchStream = TwitchConverter.convertStream(apiResponse);
      const matcher = createStreamMatcher(0.85);

      const sessions = await matcher.matchAllPlatformStreams(
        mockStreamService,
        [twitchStream],
        [],
        []
      );

      expect(twitchStream.platform).toBe('twitch');
      expect(twitchStream.twitchId).toBe('123456789');
      expect(sessions.length).toBe(1);
      expect(createdStreams.size).toBe(1);
    });

    it('should handle multi-platform API responses through converters', async () => {
      const twitchApiData = {
        data: [{
          id: 'twitch1',
          user_login: 'streamer',
          title: 'Multi Stream',
          game_id: '509658',
          tags: [],
          language: 'en',
          thumbnail_url: null,
          started_at: '2024-01-01T14:00:00Z'
        }]
      };

      const kickApiData = {
        id: 'kick1',
        channel_id: '123',
        user: { username: 'streamer' },
        category_name: 'Just Chatting',
        title: 'Multi Stream',
        thumbnail: null,
        is_live: false,
        viewer_count: 0,
        created_at: '2024-01-01T14:05:00Z',
        language: 'en',
        tags: []
      };

      const youtubeApiData = {
        kind: 'youtube#videoListResponse',
        items: [{
          kind: 'youtube#video',
          id: 'yt1',
          snippet: {
            publishedAt: '2024-01-01T13:55:00Z',
            channelId: 'channel123',
            title: 'Multi Stream',
            description: '',
            thumbnails: { default: null },
            channelTitle: 'streamer',
            categoryId: '0',
            liveBroadcastContent: 'none',
            tags: []
          },
          status: { privacyStatus: 'public', publicStatsViewable: true },
          statistics: { viewCount: '0', likeCount: '0' }
        }]
      };

      const twitchStream = TwitchConverter.convertStream(twitchApiData);
      const kickStream = KickConverter.convertStream(kickApiData);
      const youtubeStream = YouTubeConverter.convertStream(youtubeApiData);

      const matcher = createStreamMatcher(0.85);

      const sessions = await matcher.matchAllPlatformStreams(
        mockStreamService,
        [twitchStream],
        [kickStream],
        [youtubeStream]
      );

      expect(sessions.length).toBeGreaterThan(0);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle incomplete API responses gracefully', () => {
      const incompleteData = {};

      expect(() => {
        TwitchConverter.convertStream(incompleteData);
      }).toThrow();
    });

    it('should handle empty platform lists in matcher', async () => {
      const matcher = createStreamMatcher(0.85);

      const sessions = await matcher.matchAllPlatformStreams(
        mockStreamService,
        [],
        [],
        []
      );

      expect(sessions.length).toBe(0);
    });

    it('should handle single platform stream matching', async () => {
      const matcher = createStreamMatcher(0.85);

      const twitchStream = TwitchConverter.convertStream({
        data: [{
          id: 'twitch1',
          user_login: 'streamer',
          title: 'Solo Stream',
          game_id: '509658',
          tags: [],
          language: 'en',
          thumbnail_url: null,
          started_at: '2024-01-01T14:00:00Z'
        }]
      });

      const sessions = await matcher.matchAllPlatformStreams(
        mockStreamService,
        [twitchStream],
        [],
        []
      );

      expect(sessions.length).toBe(1);
    });

    it('should handle null/undefined optional fields', () => {
      const twitchStream = TwitchConverter.convertStream({
        data: [{
          id: 'twitch1',
          user_login: 'streamer',
          title: 'Stream',
          game_id: '509658',
          tags: null,
          language: 'en',
          thumbnail_url: null,
          started_at: '2024-01-01T14:00:00Z'
        }]
      });

      expect(twitchStream.tags).toEqual([]);
      expect(twitchStream.thumbnailUrl).toBeNull();
    });
  });

  describe('Adapter consistency across platforms', () => {
    it('should provide consistent interface across all platforms', () => {
      const twitchStream = TwitchConverter.convertStream({
        data: [{
          id: 'twitch1',
          user_login: 'streamer',
          title: 'Test',
          game_id: '509658',
          tags: [],
          language: 'en',
          thumbnail_url: null,
          started_at: '2024-01-01T14:00:00Z'
        }]
      });

      const kickStream = KickConverter.convertStream({
        id: 'kick1',
        channel_id: '123',
        user: { username: 'streamer' },
        category_name: 'Just Chatting',
        title: 'Test',
        thumbnail: null,
        is_live: false,
        viewer_count: 0,
        created_at: '2024-01-01T14:00:00Z',
        language: 'en',
        tags: []
      });

      const youtubeStream = YouTubeConverter.convertStream({
        kind: 'youtube#videoListResponse',
        items: [{
          kind: 'youtube#video',
          id: 'yt1',
          snippet: {
            publishedAt: '2024-01-01T14:00:00Z',
            channelId: 'channel123',
            title: 'Test',
            description: '',
            thumbnails: { default: null },
            channelTitle: 'streamer',
            categoryId: '0',
            liveBroadcastContent: 'none',
            tags: []
          },
          status: { privacyStatus: 'public', publicStatsViewable: true },
          statistics: { viewCount: '0', likeCount: '0' }
        }]
      });

      const categoryCache = {
        getCategory: vi.fn().mockResolvedValue('Test Category')
      };

      const twitchAdapter = createStreamAdapter(twitchStream, categoryCache);
      const kickAdapter = createStreamAdapter(kickStream, categoryCache);
      const youtubeAdapter = createStreamAdapter(youtubeStream, categoryCache);

      expect(twitchAdapter.getPlatform()).toBe('twitch');
      expect(kickAdapter.getPlatform()).toBe('kick');
      expect(youtubeAdapter.getPlatform()).toBe('youtube');

      expect(twitchAdapter.getTitle()).toBe('Test');
      expect(kickAdapter.getTitle()).toBe('Test');
      expect(youtubeAdapter.getTitle()).toBe('Test');

      expect(twitchAdapter.getTags()).toEqual([]);
      expect(kickAdapter.getTags()).toEqual([]);
      expect(youtubeAdapter.getTags()).toEqual([]);
    });
  });

  describe('StreamService and Detector integration', () => {
    it('should integrate detector with StreamService', () => {
      const mockClient = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isConnected: vi.fn().mockReturnValue(false),
        on: vi.fn(),
        send: vi.fn(),
        getStreamStatus: vi.fn()
      };

      const detector = new ObsStreamDetector(mockClient, mockStreamService);

      expect(detector).toBeDefined();
      expect(typeof detector.connect).toBe('function');
      expect(typeof detector.disconnect).toBe('function');
    });

    it('should support StreamService interface methods', async () => {
      const matcher = createStreamMatcher(0.85);

      const twitchStream = TwitchConverter.convertStream({
        data: [{
          id: 'twitch1',
          user_login: 'streamer',
          title: 'Test',
          game_id: '509658',
          tags: [],
          language: 'en',
          thumbnail_url: null,
          started_at: '2024-01-01T14:00:00Z'
        }]
      });

      const sessions = await matcher.matchAllPlatformStreams(
        mockStreamService,
        [twitchStream],
        [],
        []
      );

      expect(mockStreamService.createStream).toHaveBeenCalled();
      expect(mockStreamService.createPlatformStream).toHaveBeenCalled();
    });
  });
});
