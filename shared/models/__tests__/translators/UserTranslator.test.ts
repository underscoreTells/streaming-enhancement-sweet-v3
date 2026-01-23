import { describe, it, expect } from 'vitest';
import { createUserAdapter, createUserAdapterFromRaw } from '../../src/translators/UserTranslator';
import { TwitchUserAdapter, KickUserAdapter, YouTubeUserAdapter } from '../../src/adapters';

describe('UserTranslator', () => {
  describe('createUserAdapter', () => {
    it('should create TwitchUserAdapter for Twitch user', () => {
      const twitchUser = {
        platform: 'twitch' as const,
        twitchId: '123456',
        username: 'testuser',
        displayName: 'TestUser',
        profileImageUrl: 'https://example.com/avatar.jpg',
        bio: 'Test bio',
        createdAt: new Date('2023-01-01')
      };

      const adapter = createUserAdapter(twitchUser);

      expect(adapter).toBeInstanceOf(TwitchUserAdapter);
      expect(adapter.getPlatform()).toBe('twitch');
      expect(adapter.getId()).toBe('123456');
      expect(adapter.getUsername()).toBe('testuser');
      expect(adapter.getDisplayName()).toBe('TestUser');
    });

    it('should create KickUserAdapter for Kick user', () => {
      const kickUser = {
        platform: 'kick' as const,
        kickId: '789012',
        username: 'kickuser',
        displayName: 'KickUser',
        avatarUrl: 'https://example.com/kick-avatar.jpg',
        bio: 'Kick bio',
        isVerified: true,
        createdAt: new Date('2023-01-01')
      };

      const adapter = createUserAdapter(kickUser);

      expect(adapter).toBeInstanceOf(KickUserAdapter);
      expect(adapter.getPlatform()).toBe('kick');
      expect(adapter.getId()).toBe('789012');
      expect(adapter.getUsername()).toBe('kickuser');
      expect(adapter.getDisplayName()).toBe('KickUser');
    });

    it('should create YouTubeUserAdapter for YouTube user', () => {
      const youtubeUser = {
        platform: 'youtube' as const,
        channelId: 'UC1234567890',
        channelTitle: 'Test Channel',
        customUrl: 'TestChannel',
        thumbnailUrl: 'https://example.com/yt-avatar.jpg',
        description: 'YouTube channel',
        subscriberCount: 100000,
        hiddenSubscriberCount: false,
        videoCount: 500,
        viewCount: 1000000,
        createdAt: new Date('2023-01-01')
      };

      const adapter = createUserAdapter(youtubeUser);

      expect(adapter).toBeInstanceOf(YouTubeUserAdapter);
      expect(adapter.getPlatform()).toBe('youtube');
      expect(adapter.getId()).toBe('UC1234567890');
      expect(adapter.getUsername()).toBe('TestChannel');
      expect(adapter.getDisplayName()).toBe('Test Channel');
    });

    it('should handle null optional fields', () => {
      const twitchUser = {
        platform: 'twitch' as const,
        twitchId: '123456',
        username: 'testuser',
        displayName: 'TestUser',
        profileImageUrl: null,
        bio: null,
        createdAt: null
      };

      const adapter = createUserAdapter(twitchUser);

      expect(adapter).toBeInstanceOf(TwitchUserAdapter);
      expect(adapter.getAvatar()).toBeNull();
      expect(adapter.getBio()).toBeNull();
      expect(adapter.getCreatedAt()).toBeNull();
    });
  });

  describe('createUserAdapterFromRaw', () => {
    it('should convert Twitch API response and create adapter', () => {
      const twitchApiResponse = {
        data: [
          {
            id: 'user-123',
            login: 'twitchuser',
            display_name: 'TwitchUser',
            profile_image_url: 'https://example.com/avatar.jpg',
            description: 'Cool streamer',
            created_at: '2023-01-01T00:00:00Z'
          }
        ]
      };

      const adapter = createUserAdapterFromRaw(twitchApiResponse, 'twitch');

      expect(adapter).toBeInstanceOf(TwitchUserAdapter);
      expect(adapter.getPlatform()).toBe('twitch');
      expect(adapter.getId()).toBe('user-123');
      expect(adapter.getUsername()).toBe('twitchuser');
    });

    it('should convert Kick API response and create adapter', () => {
      const kickApiResponse = {
        id: 'kick-789',
        username: 'kickuser',
        profile_picture: 'https://example.com/kick-avatar.jpg',
        bio: 'Kick bio',
        verified: true,
        created_at: '2023-01-01T00:00:00Z'
      };

      const adapter = createUserAdapterFromRaw(kickApiResponse, 'kick');

      expect(adapter).toBeInstanceOf(KickUserAdapter);
      expect(adapter.getPlatform()).toBe('kick');
      expect(adapter.getId()).toBe('kick-789');
      expect(adapter.getUsername()).toBe('kickuser');
    });

    it('should convert YouTube API response and create adapter', () => {
      const youtubeApiResponse = {
        items: [{
          id: 'UC1234567890',
          snippet: {
            title: 'Test Channel',
            description: 'YouTube channel description',
            customUrl: 'testchannel',
            thumbnails: {
              default: { url: 'https://example.com/yt-avatar.jpg' }
            },
            publishedAt: '2023-01-01T00:00:00Z'
          },
          statistics: {
            subscriberCount: '100000',
            hiddenSubscriberCount: false,
            videoCount: '500',
            viewCount: '1000000'
          }
        }]
      };

      const adapter = createUserAdapterFromRaw(youtubeApiResponse, 'youtube');

      expect(adapter).toBeInstanceOf(YouTubeUserAdapter);
      expect(adapter.getPlatform()).toBe('youtube');
      expect(adapter.getId()).toBe('UC1234567890');
      expect(adapter.getUsername()).toBe('testchannel');
    });

    it('should throw error for unsupported platform', () => {
      expect(() => {
        createUserAdapterFromRaw({}, 'facebook' as any);
      }).toThrow('Unsupported platform: facebook');
    });
  });

  describe('Type safety', () => {
    it('should correctly narrow types based on platform', () => {
      const twitchUser = {
        platform: 'twitch' as const,
        twitchId: '123',
        username: 'user',
        displayName: 'User',
        profileImageUrl: null,
        bio: null,
        createdAt: null
      };

      const adapter = createUserAdapter(twitchUser);

      if (adapter.getPlatform() === 'twitch') {
        expect(adapter).toBeInstanceOf(TwitchUserAdapter);
      }
    });
  });
});
