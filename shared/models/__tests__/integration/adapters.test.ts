import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TwitchConverter, KickConverter, YouTubeConverter } from '../../src/converters';
import { createStreamAdapter, createUserAdapter, createChatMessageAdapter, createEventAdapter } from '../../src/translators';
import { CategoryCache } from '../../src/cache/CategoryCache';

describe('Integration: Adapters', () => {
  let categoryCache: CategoryCache;

  beforeEach(() => {
    categoryCache = {
      getCategory: vi.fn().mockResolvedValue('Test Category')
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Platform adapter creation chain', () => {
    it('should create Twitch adapter from API response', async () => {
      const twitchApiData = {
        data: [{
          id: '123456789',
          user_login: 'testuser',
          title: 'Test Stream',
          game_id: '509658',
          tags: ['tag1', 'tag2'],
          is_mature: false,
          language: 'en',
          thumbnail_url: 'https://example.com/thumb.jpg',
          started_at: '2024-01-01T14:00:00Z'
        }]
      };

      const twitchStream = TwitchConverter.convertStream(twitchApiData);
      const adapter = createStreamAdapter(twitchStream, categoryCache);

      expect(adapter.getPlatform()).toBe('twitch');
      expect(adapter.getId()).toBe('123456789');
      expect(adapter.getTitle()).toBe('Test Stream');
      expect(await adapter.getCategory()).toBe('Test Category');
      expect(adapter.getTags()).toEqual(['tag1', 'tag2']);
    });

    it('should create Kick adapter from API response', async () => {
      const kickApiData = {
        id: '987654321',
        channel_id: '123',
        channel_name: 'testuser',
        user: { username: 'testuser' },
        category_name: 'Just Chatting',
        title: 'Test Stream',
        thumbnail: 'https://example.com/thumb.jpg',
        is_live: true,
        viewer_count: 1000,
        created_at: '2024-01-01T14:00:00Z',
        language: 'en',
        tags: ['tag1', 'tag2']
      };

      const kickStream = KickConverter.convertStream(kickApiData);
      const adapter = createStreamAdapter(kickStream, categoryCache);

      expect(adapter.getPlatform()).toBe('kick');
      expect(adapter.getId()).toBe('987654321');
      expect(adapter.getTitle()).toBe('Test Stream');
      expect(adapter.getTags()).toEqual(['tag1', 'tag2']);
    });

    it('should create YouTube adapter from API response', async () => {
      const youtubeApiData = {
        kind: 'youtube#videoListResponse',
        items: [{
          kind: 'youtube#video',
          id: 'abc123xyz',
          snippet: {
            publishedAt: '2024-01-01T14:00:00Z',
            channelId: 'channel123',
            title: 'Test Stream',
            description: 'Test description',
            thumbnails: {
              default: { url: 'https://example.com/thumb.jpg', width: 120, height: 90 }
            },
            channelTitle: 'testuser',
            categoryId: '0',
            liveBroadcastContent: 'live',
            tags: ['tag1', 'tag2']
          },
          status: {
            privacyStatus: 'public',
            publicStatsViewable: true
          },
          statistics: {
            viewCount: '1000',
            likeCount: '100'
          }
        }]
      };

      const youtubeStream = YouTubeConverter.convertStream(youtubeApiData);
      const adapter = createStreamAdapter(youtubeStream, categoryCache);

      expect(adapter.getPlatform()).toBe('youtube');
      expect(adapter.getId()).toBe('abc123xyz');
      expect(adapter.getTitle()).toBe('Test Stream');
      expect(adapter.getTags()).toEqual(['tag1', 'tag2']);
    });
  });

  describe('Dynamic feature access', () => {
    it('should access Twitch channel points feature', () => {
      const twitchStream = {
        platform: 'twitch' as const,
        twitchId: '123',
        username: 'testuser',
        title: 'Test',
        categoryId: '509658',
        tags: [],
        isMature: false,
        language: 'en',
        thumbnailUrl: null,
        channelPoints: 500,
        startTime: new Date(),
        endTime: null
      };

      const adapter = createStreamAdapter(twitchStream, categoryCache);
      const points = adapter.getFeature('twitchChannelPoints');

      expect(points).not.toBeNull();
      expect(points?.current).toBe(500);
    });

    it('should access Kick tips feature', () => {
      const kickStream = {
        platform: 'kick' as const,
        kickId: '123',
        username: 'testuser',
        title: 'Test',
        categorySlug: 'just-chatting',
        tags: [],
        language: 'en',
        thumbnailUrl: null,
        totalTipsUsd: 100.5,
        startTime: new Date(),
        endTime: null
      };

      const adapter = createStreamAdapter(kickStream, categoryCache);
      const tips = adapter.getFeature('kickTips');

      expect(tips).not.toBeNull();
      expect(tips?.value).toBe(100.5);
    });

    it('should return null for non-existent feature', () => {
      const twitchStream = {
        platform: 'twitch' as const,
        twitchId: '123',
        username: 'testuser',
        title: 'Test',
        categoryId: '509658',
        tags: [],
        isMature: false,
        language: 'en',
        thumbnailUrl: null,
        channelPoints: 500,
        startTime: new Date(),
        endTime: null
      };

      const adapter = createStreamAdapter(twitchStream, categoryCache);
      const tips = adapter.getFeature('kickTips');

      expect(tips).toBeNull();
    });
  });

  describe('Badge and Emote normalization', () => {
    it('should normalize Twitch badges', () => {
      const twitchChat = {
        platform: 'twitch' as const,
        messageId: 'msg123',
        userId: 'user123',
        username: 'testuser',
        displayName: 'Test User',
        color: '#FF0000',
        message: 'Hello world',
        timestamp: new Date(),
        roomId: 'room123',
        badges: [{ _id: 'broadcaster', _version: '1' }],
        emotes: [{ _id: '123', _name: 'Kappa', positions: [[0, 4]] }]
      };

      const adapter = createChatMessageAdapter(twitchChat);
      const badges = adapter.getBadges();

      expect(badges.length).toBe(1);
      expect(badges[0].id).toBe('Broadcaster');
      expect(badges[0].name).toBe('Broadcaster');
      expect(badges[0].type).toBe('owner');
    });

    it('should normalize Twitch emotes', () => {
      const twitchChat = {
        platform: 'twitch' as const,
        messageId: 'msg123',
        userId: 'user123',
        username: 'testuser',
        displayName: 'Test User',
        color: null,
        message: 'KappaPride',
        timestamp: new Date(),
        roomId: 'room123',
        badges: [],
        emotes: [{ _id: '123', _name: 'KappaPride', positions: [[0, 9]] }]
      };

      const adapter = createChatMessageAdapter(twitchChat);
      const emotes = adapter.getEmotes();

      expect(emotes.length).toBe(1);
      expect(emotes[0].id).toBe('123');
      expect(emotes[0].name).toBe('KappaPride');
      expect(emotes[0].type).toBe('twitch');
      expect(emotes[0].positions).toEqual([[0, 9]]);
    });

    it('should normalize Kick badges', () => {
      const kickChat = {
        platform: 'kick' as const,
        messageId: 'msg123',
        userId: 'user123',
        username: 'testuser',
        displayName: 'Test User',
        color: '#FF0000',
        message: 'Hello world',
        timestamp: new Date(),
        roomId: 'room123',
        badges: [{ type: 'moderator' }],
        emotes: []
      };

      const adapter = createChatMessageAdapter(kickChat);
      const badges = adapter.getBadges();

      expect(badges.length).toBe(1);
      expect(badges[0].type).toBe('moderator');
    });
  });

  describe('User adapter creation', () => {
    it('should create Twitch user adapter from API response', () => {
      const twitchApiData = {
        data: [{
          id: '123456',
          login: 'testuser',
          display_name: 'Test User',
          profile_image_url: 'https://example.com/avatar.jpg',
          description: 'Test bio',
          created_at: '2024-01-01T00:00:00Z'
        }]
      };

      const twitchUser = TwitchConverter.convertUser(twitchApiData);
      const adapter = createUserAdapter(twitchUser);

      expect(adapter.getPlatform()).toBe('twitch');
      expect(adapter.getId()).toBe('123456');
      expect(adapter.getUsername()).toBe('testuser');
      expect(adapter.getDisplayName()).toBe('Test User');
    });

    it('should create Kick user adapter from API response', () => {
      const kickApiData = {
        id: '123456',
        user_id: '123456',
        username: 'testuser',
        display_name: 'Test User',
        bio: 'Test bio',
        avatar_url: 'https://example.com/avatar.jpg',
        banner_url: 'https://example.com/banner.jpg',
        followers_count: 1000,
        following_count: 500,
        subscriber_count: 200,
        is_verified: true,
        is_banned: false,
        created_at: '2024-01-01T00:00:00Z'
      };

      const kickUser = KickConverter.convertUser(kickApiData);
      const adapter = createUserAdapter(kickUser);

      expect(adapter.getPlatform()).toBe('kick');
      expect(adapter.getId()).toBe('123456');
      expect(adapter.getUsername()).toBe('testuser');
      expect(adapter.getDisplayName()).toBe('Test User');
    });
  });

  describe('Event type mapping', () => {
    it('should map Twitch EventSub events to unified types', () => {
      const twitchEvent = {
        id: 'event123',
        subscription: { type: 'channel.follow' },
        timestamp: '2024-01-01T00:00:00Z',
        user_id: 'user123',
        user_name: 'follower',
        data: {
          user_id: 'user123',
          user_login: 'follower',
          user_name: 'Follower'
        }
      };

      const event = TwitchConverter.convertEvent(twitchEvent);
      const adapter = createEventAdapter(event);

      expect(adapter.getPlatform()).toBe('twitch');
      expect(adapter.getType()).toBe('follow');
    });

    it('should map Kick webhooks to unified types', () => {
      const kickEvent = {
        id: 'event123',
        type: 'followed',
        timestamp: '2024-01-01T00:00:00Z',
        user_id: 'user123',
        username: 'testuser',
        display_name: 'Test User',
        channel_id: 'channel123'
      };

      const event = KickConverter.convertEvent(kickEvent);
      const adapter = createEventAdapter(event);

      expect(adapter.getPlatform()).toBe('kick');
      expect(adapter.getType()).toBe('follow');
    });
  });

  describe('Adapter to storage conversion', () => {
    it('should convert Twitch adapter back to stream', () => {
      const twitchStream = {
        platform: 'twitch' as const,
        twitchId: '123',
        username: 'testuser',
        title: 'Test',
        categoryId: '509658',
        tags: ['tag1'],
        isMature: false,
        language: 'en',
        thumbnailUrl: null,
        channelPoints: 500,
        startTime: new Date('2024-01-01T14:00:00Z'),
        endTime: new Date('2024-01-01T16:00:00Z')
      };

      const adapter = createStreamAdapter(twitchStream, categoryCache);
      const stored = adapter.toStorage();

      expect(stored).toEqual(twitchStream);
    });

    it('should convert Kick adapter back to stream', () => {
      const kickStream = {
        platform: 'kick' as const,
        kickId: '123',
        username: 'testuser',
        title: 'Test',
        categorySlug: 'just-chatting',
        tags: [],
        language: 'en',
        thumbnailUrl: null,
        totalTipsUsd: 100.5,
        startTime: new Date('2024-01-01T14:00:00Z'),
        endTime: null
      };

      const adapter = createStreamAdapter(kickStream, categoryCache);
      const stored = adapter.toStorage();

      expect(stored).toEqual(kickStream);
    });
  });
});
