import { describe, it, expect, vi } from 'vitest';
import { createStreamAdapter, createStreamAdapterFromRaw, createPlatformStreamRecord } from '../../src/translators/StreamTranslator';
import type { CategoryCache } from '../../src/cache/CategoryCache';
import { TwitchStreamAdapter, KickStreamAdapter, YouTubeStreamAdapter } from '../../src/adapters';

describe('StreamTranslator', () => {
  describe('createStreamAdapter', () => {
    const mockCache: CategoryCache = {
      getCategory: vi.fn(async (id: string) => `Category ${id}`),
      clear: vi.fn()
    };

    it('should create TwitchStreamAdapter for Twitch stream', () => {
      const twitchStream = {
        platform: 'twitch' as const,
        twitchId: '123456',
        username: 'testuser',
        title: 'Test Stream',
        categoryId: 'game-123',
        tags: ['gaming', 'chatting'],
        isMature: false,
        language: 'en',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        channelPoints: 1000
      };

      const adapter = createStreamAdapter(twitchStream, mockCache);

      expect(adapter).toBeInstanceOf(TwitchStreamAdapter);
      expect(adapter.getPlatform()).toBe('twitch');
      expect(adapter.getId()).toBe('123456');
      expect(adapter.getTitle()).toBe('Test Stream');
    });

    it('should create KickStreamAdapter for Kick stream', () => {
      const kickStream = {
        platform: 'kick' as const,
        kickId: '789012',
        username: 'kickuser',
        title: 'Kick Stream',
        categorySlug: 'just-chatting',
        tags: ['irl', 'variety'],
        language: 'en',
        thumbnailUrl: 'https://example.com/kick-thumb.jpg',
        totalTipsUsd: 50.5
      };

      const adapter = createStreamAdapter(kickStream, mockCache);

      expect(adapter).toBeInstanceOf(KickStreamAdapter);
      expect(adapter.getPlatform()).toBe('kick');
      expect(adapter.getId()).toBe('789012');
      expect(adapter.getTitle()).toBe('Kick Stream');
    });

    it('should create YouTubeStreamAdapter for YouTube stream', () => {
      const youtubeStream = {
        platform: 'youtube' as const,
        videoId: 'abc123',
        channelTitle: 'Test Channel',
        title: 'YouTube Stream',
        categoryId: '20',
        tags: ['gaming'],
        privacyStatus: 'public',
        thumbnailUrl: 'https://example.com/yt-thumb.jpg',
        subscriberCount: 100000,
        superChatTotal: 25.0
      };

      const adapter = createStreamAdapter(youtubeStream, mockCache);

      expect(adapter).toBeInstanceOf(YouTubeStreamAdapter);
      expect(adapter.getPlatform()).toBe('youtube');
      expect(adapter.getId()).toBe('abc123');
      expect(adapter.getTitle()).toBe('YouTube Stream');
    });

    it('should pass cache parameter to adapters', () => {
      const twitchStream = {
        platform: 'twitch' as const,
        twitchId: 'test-id',
        username: 'testuser',
        title: 'Test',
        categoryId: 'cat-1',
        tags: [],
        isMature: false,
        language: 'en',
        thumbnailUrl: null,
        channelPoints: 0
      };

      const adapter = createStreamAdapter(twitchStream, mockCache);

      expect(adapter).toBeInstanceOf(TwitchStreamAdapter);
      expect(adapter.getTitle()).toBe('Test');
    });

    it('should work without cache parameter', () => {
      const twitchStream = {
        platform: 'twitch' as const,
        twitchId: 'test-id',
        username: 'testuser',
        title: 'Test',
        categoryId: 'cat-1',
        tags: [],
        isMature: false,
        language: 'en',
        thumbnailUrl: null,
        channelPoints: 0
      };

      const adapter = createStreamAdapter(twitchStream);

      expect(adapter).toBeInstanceOf(TwitchStreamAdapter);
      expect(adapter.getTitle()).toBe('Test');
    });
  });

  describe('createStreamAdapterFromRaw', () => {
    it('should convert Twitch API response and create adapter', () => {
      const twitchApiResponse = {
        data: [
          {
            id: 'stream-123',
            user_login: 'twitchuser',
            title: 'Live Stream',
            game_id: 'game-456',
            tags: ['gaming'],
            is_mature: false,
            language: 'en',
            thumbnail_url: 'https://example.com/thumb.jpg'
          }
        ]
      };

      const adapter = createStreamAdapterFromRaw(twitchApiResponse, 'twitch');

      expect(adapter).toBeInstanceOf(TwitchStreamAdapter);
      expect(adapter.getPlatform()).toBe('twitch');
      expect(adapter.getId()).toBe('stream-123');
      expect(adapter.getTitle()).toBe('Live Stream');
    });

    it('should convert Kick API response and create adapter', () => {
      const kickApiResponse = {
        id: 'kick-789',
        user_name: 'kickuser',
        title: 'Kick Live',
        category_id: 'just-chatting',
        tags: ['irl'],
        language: 'en',
        thumbnail: 'https://example.com/kick.jpg'
      };

      const adapter = createStreamAdapterFromRaw(kickApiResponse, 'kick');

      expect(adapter).toBeInstanceOf(KickStreamAdapter);
      expect(adapter.getPlatform()).toBe('kick');
      expect(adapter.getId()).toBe('kick-789');
      expect(adapter.getTitle()).toBe('Kick Live');
    });

    it('should convert YouTube API response and create adapter', () => {
      const youtubeApiResponse = {
        items: [{
          id: 'yt-video-abc',
          snippet: {
            title: 'YouTube Live',
            categoryId: '20',
            tags: ['gaming'],
            liveBroadcastContent: 'live',
            channelTitle: 'Test Channel'
          },
          status: {
            privacyStatus: 'public'
          }
        }]
      };

      const adapter = createStreamAdapterFromRaw(youtubeApiResponse, 'youtube');

      expect(adapter).toBeInstanceOf(YouTubeStreamAdapter);
      expect(adapter.getPlatform()).toBe('youtube');
      expect(adapter.getId()).toBe('yt-video-abc');
      expect(adapter.getTitle()).toBe('YouTube Live');
    });

    it('should throw error for unsupported platform', () => {
      expect(() => {
        createStreamAdapterFromRaw({}, 'facebook' as any);
      }).toThrow('Unsupported platform: facebook');
    });
  });

  describe('createPlatformStreamRecord', () => {
    it('should create PlatformStreamRecord with all required fields', () => {
      const platformStream = {
        platform: 'twitch' as const,
        twitchId: '123456',
        username: 'testuser',
        title: 'Test Stream',
        categoryId: 'game-123',
        tags: ['gaming'],
        isMature: false,
        language: 'en',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        channelPoints: 1000
      };

      const record = createPlatformStreamRecord('common-123', platformStream);

      expect(record).toHaveProperty('id');
      expect(record).toHaveProperty('commonId', 'common-123');
      expect(record).toHaveProperty('platform', 'twitch');
      expect(record).toHaveProperty('data', platformStream);
      expect(record).toHaveProperty('createdAt');
      expect(record.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(record.createdAt).toBeInstanceOf(Date);
    });

    it('should create records for all platforms', () => {
      const twitchStream = {
        platform: 'twitch' as const,
        twitchId: '1',
        username: 'a',
        title: 'A',
        categoryId: 'cat',
        tags: [],
        isMature: false,
        language: 'en',
        thumbnailUrl: null,
        channelPoints: 0
      };

      const kickStream = {
        platform: 'kick' as const,
        kickId: '2',
        username: 'b',
        title: 'B',
        categorySlug: 'slug',
        tags: [],
        language: 'en',
        thumbnailUrl: null,
        totalTipsUsd: 0
      };

      const youtubeStream = {
        platform: 'youtube' as const,
        videoId: '3',
        channelTitle: 'C',
        title: 'D',
        categoryId: 'cat',
        tags: [],
        privacyStatus: 'public',
        thumbnailUrl: null,
        subscriberCount: 0,
        superChatTotal: 0
      };

      const twitchRecord = createPlatformStreamRecord('common-1', twitchStream);
      const kickRecord = createPlatformStreamRecord('common-2', kickStream);
      const youtubeRecord = createPlatformStreamRecord('common-3', youtubeStream);

      expect(twitchRecord.platform).toBe('twitch');
      expect(kickRecord.platform).toBe('kick');
      expect(youtubeRecord.platform).toBe('youtube');

      expect(twitchRecord.commonId).toBe('common-1');
      expect(kickRecord.commonId).toBe('common-2');
      expect(youtubeRecord.commonId).toBe('common-3');
    });

    it('should generate unique IDs for each record', () => {
      const platformStream = {
        platform: 'twitch' as const,
        twitchId: '1',
        username: 'a',
        title: 'A',
        categoryId: 'cat',
        tags: [],
        isMature: false,
        language: 'en',
        thumbnailUrl: null,
        channelPoints: 0
      };

      const record1 = createPlatformStreamRecord('common-1', platformStream);
      const record2 = createPlatformStreamRecord('common-2', platformStream);

      expect(record1.id).not.toBe(record2.id);
    });
  });

  describe('Type safety', () => {
    it('should correctly narrow types based on platform', () => {
      const twitchStream = {
        platform: 'twitch' as const,
        twitchId: '123',
        username: 'user',
        title: 'Title',
        categoryId: 'cat',
        tags: [],
        isMature: false,
        language: 'en',
        thumbnailUrl: null,
        channelPoints: 0
      };

      const adapter = createStreamAdapter(twitchStream);

      if (adapter.getPlatform() === 'twitch') {
        expect(adapter).toBeInstanceOf(TwitchStreamAdapter);
      }
    });
  });
});
