import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TwitchConverter, KickConverter, YouTubeConverter } from '../../src/converters';
import { createStreamMatcher } from '../../src/matchers/StreamMatcher';
import type { StreamService } from '../../src/stream/StreamService';
import type { TwitchStream, KickStream, YouTubeStream } from '../../src/Stream';

describe('Integration: Stream Matcher', () => {
  let mockStreamService: StreamService;
  const createdStreams: Map<string, any> = new Map();
  const createdPlatformRecords: any[] = [];

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
        const stream = createdStreams.get(commonId);
        if (stream) {
          vi.spyOn(stream, 'getObsEndTime').mockResolvedValue(endTime);
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

  describe('Historical stream reconstruction', () => {
    it('should reconstruct multi-platform streaming session from historical data', async () => {
      const matcher = createStreamMatcher(0.85);

      const twitch1 = TwitchConverter.convertStream({
        data: [{
          id: 'twitch1',
          user_login: 'streamer',
          title: 'Multi-platform Stream',
          game_id: '509658',
          tags: [],
          language: 'en',
          thumbnail_url: null,
          started_at: '2024-01-01T14:00:00Z'
        }]
      });
      (twitch1 as any).endTime = new Date('2024-01-01T16:00:00Z');

      const twitch2 = TwitchConverter.convertStream({
        data: [{
          id: 'twitch2',
          user_login: 'streamer',
          title: 'Solo Stream Round 2',
          game_id: '509658',
          tags: [],
          language: 'en',
          thumbnail_url: null,
          started_at: '2024-01-02T14:00:00Z'
        }]
      });
      (twitch2 as any).endTime = new Date('2024-01-02T16:00:00Z');

      const kick1 = KickConverter.convertStream({
        id: 'kick1',
        channel_id: '123',
        user: { username: 'streamer' },
        category_name: 'Just Chatting',
        title: 'Multi-platform Stream',
        thumbnail: null,
        is_live: false,
        viewer_count: 0,
        created_at: '2024-01-01T13:55:00Z',
        language: 'en',
        tags: []
      });
      (kick1 as any).endTime = new Date('2024-01-01T16:05:00Z');

      const yt1 = YouTubeConverter.convertStream({
        kind: 'youtube#videoListResponse',
        items: [{
          kind: 'youtube#video',
          id: 'yt1',
          snippet: {
            publishedAt: '2024-01-01T13:50:00Z',
            channelId: 'channel123',
            title: 'Multi-platform Stream',
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
      (yt1 as any).endTime = new Date('2024-01-01T15:55:00Z');

      const sessions = await matcher.matchAllPlatformStreams(
        mockStreamService,
        [twitch1, twitch2],
        [kick1],
        [yt1]
      );

      expect(sessions.length).toBeGreaterThanOrEqual(1);
    });

    it('should create separate streams for non-overlapping periods', async () => {
      const matcher = createStreamMatcher(0.85);

      const twitchStream = TwitchConverter.convertStream({
        data: [{
          id: 'twitch1',
          user_login: 'streamer',
          title: 'Morning Stream',
          game_id: '509658',
          tags: [],
          language: 'en',
          thumbnail_url: null,
          started_at: '2024-01-01T10:00:00Z'
        }]
      });
      (twitchStream as any).endTime = new Date('2024-01-01T12:00:00Z');

      const kickStream = KickConverter.convertStream({
        id: 'kick1',
        channel_id: '123',
        user: { username: 'streamer' },
        category_name: 'Just Chatting',
        title: 'Evening Stream',
        thumbnail: null,
        is_live: false,
        viewer_count: 0,
        created_at: '2024-01-01T18:00:00Z',
        language: 'en',
        tags: []
      });
      (kickStream as any).endTime = new Date('2024-01-01T20:00:00Z');

      const sessions = await matcher.matchAllPlatformStreams(
        mockStreamService,
        [twitchStream],
        [kickStream],
        []
      );

      expect(sessions.length).toBe(2);
      expect(createdPlatformRecords.length).toBe(2);
    });

    it('should group streams with high overlap into single session', async () => {
      const matcher = createStreamMatcher(0.85);

      const twitchStream = TwitchConverter.convertStream({
        data: [{
          id: 'twitch1',
          user_login: 'streamer',
          title: 'Multi-platform',
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
        title: 'Multi-platform',
        thumbnail: null,
        is_live: false,
        viewer_count: 0,
        created_at: '2024-01-01T14:05:00Z',
        language: 'en',
        tags: []
      }) as KickStream;
      (kickStream as any).endTime = new Date('2024-01-01T16:00:00Z');
      (twitchStream as TwitchStream).endTime = new Date('2024-01-01T15:50:00Z');

      const sessions = await matcher.matchAllPlatformStreams(
        mockStreamService,
        [twitchStream],
        [kickStream],
        []
      );

      expect(sessions.length).toBe(1);
      expect(createdPlatformRecords.length).toBe(2);
      expect(createdPlatformRecords[0].commonId).toBe(createdPlatformRecords[1].commonId);
    });
  });

  describe('New platform addition to existing streams', () => {
    it('should add new platform to matching existing stream', async () => {
      const matcher = createStreamMatcher(0.85);

      const existingStream = createMockStream('existing1', new Date('2024-01-01T14:00:00Z'));
      vi.spyOn(existingStream, 'getObsEndTime').mockResolvedValue(new Date('2024-01-01T16:00:00Z'));

      const newKickStream = KickConverter.convertStream({
        id: 'kick1',
        channel_id: '123',
        user: { username: 'streamer' },
        category_name: 'Just Chatting',
        title: 'Stream',
        thumbnail: null,
        is_live: false,
        viewer_count: 0,
        created_at: '2024-01-01T14:06:00Z',
        language: 'en',
        tags: []
      }) as KickStream;
      (newKickStream as any).endTime = new Date('2024-01-01T15:54:00Z');

      const results = await matcher.matchNewPlatformStreams(
        mockStreamService,
        [existingStream],
        [newKickStream]
      );

      expect(results.newStreams.length).toBe(0);
      expect(results.addedToExisting.size).toBe(1);
      expect(createdPlatformRecords.length).toBe(1);
    });

    it('should create new stream when no good match found', async () => {
      const matcher = createStreamMatcher(0.85);

      const existingStream = createMockStream('existing1', new Date('2024-01-01T14:00:00Z'));
      vi.spyOn(existingStream, 'getObsEndTime').mockResolvedValue(new Date('2024-01-01T16:00:00Z'));

      const newKickStream = KickConverter.convertStream({
        id: 'kick1',
        channel_id: '123',
        user: { username: 'streamer' },
        category_name: 'Just Chatting',
        title: 'Different Stream',
        thumbnail: null,
        is_live: false,
        viewer_count: 0,
        created_at: '2024-01-01T18:00:00Z',
        language: 'en',
        tags: []
      }) as KickStream;
      (newKickStream as any).endTime = new Date('2024-01-01T20:00:00Z');

      const results = await matcher.matchNewPlatformStreams(
        mockStreamService,
        [existingStream],
        [newKickStream]
      );

      expect(results.newStreams.length).toBe(1);
      expect(results.addedToExisting.size).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty historical data', async () => {
      const matcher = createStreamMatcher();

      const sessions = await matcher.matchAllPlatformStreams(
        mockStreamService,
        [],
        [],
        []
      );

      expect(sessions.length).toBe(0);
    });

    it('should handle single platform historical data', async () => {
      const matcher = createStreamMatcher();

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
      expect(createdPlatformRecords.length).toBe(1);
    });

    it('should handle three-platform simultaneous streaming', async () => {
      const matcher = createStreamMatcher(0.85);

      const twitchStream: TwitchStream = {
        platform: 'twitch',
        twitchId: 't1',
        username: 'streamer',
        title: 'Triple Stream',
        categoryId: '509658',
        tags: [],
        isMature: false,
        language: 'en',
        thumbnailUrl: null,
        channelPoints: 0,
        startTime: new Date('2024-01-01T14:00:00Z'),
        endTime: new Date('2024-01-01T16:00:00Z')
      };

      const kickStream: KickStream = {
        platform: 'kick',
        kickId: 'k1',
        username: 'streamer',
        title: 'Triple Stream',
        categorySlug: 'just-chatting',
        tags: [],
        language: 'en',
        thumbnailUrl: null,
        totalTipsUsd: 0,
        startTime: new Date('2024-01-01T14:05:00Z'),
        endTime: new Date('2024-01-01T16:05:00Z')
      };

      const youtubeStream: YouTubeStream = {
        platform: 'youtube',
        videoId: 'y1',
        channelTitle: 'streamer',
        title: 'Triple Stream',
        categoryId: '0',
        tags: [],
        privacyStatus: 'public',
        thumbnailUrl: null,
        subscriberCount: 0,
        superChatTotal: 0,
        startTime: new Date('2024-01-01T13:55:00Z'),
        endTime: new Date('2024-01-01T15:55:00Z')
      };

      const sessions = await matcher.matchAllPlatformStreams(
        mockStreamService,
        [twitchStream],
        [kickStream],
        [youtubeStream]
      );

      expect(sessions.length).toBe(1);
      expect(createdPlatformRecords.length).toBe(3);
    });
  });
});
