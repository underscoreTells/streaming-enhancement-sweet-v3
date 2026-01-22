import { describe, it, expect } from 'vitest';
import type { TwitchUser, KickUser, YouTubeUser, PlatformUser } from '../src/User';

describe('PlatformUser types', () => {
  describe('TwitchUser', () => {
    it('accepts valid Twitch user data', () => {
      const user: TwitchUser = {
        platform: 'twitch',
        twitchId: '123456',
        username: 'ninja',
        displayName: 'Ninja',
        profileImageUrl: 'https://static-cdn.jtvnw.net/jtv_user_pictures/ninja-profile_image-0d31d9d4a2a3f03e-300x300.png',
        bio: 'Professional gamer, streamer, and entertainer.',
        createdAt: new Date('2016-01-01T00:00:00Z')
      };

      expect(user.platform).toBe('twitch');
      expect(user.twitchId).toBe('123456');
      expect(user.displayName).toBe('Ninja');
    });

    it('accepts null profileImageUrl, bio, and createdAt', () => {
      const user: TwitchUser = {
        platform: 'twitch',
        twitchId: '123456',
        username: 'test_user',
        displayName: 'Test User',
        profileImageUrl: null,
        bio: null,
        createdAt: null
      };

      expect(user.profileImageUrl).toBeNull();
      expect(user.bio).toBeNull();
      expect(user.createdAt).toBeNull();
    });
  });

  describe('KickUser', () => {
    it('accepts valid Kick user data', () => {
      const user: KickUser = {
        platform: 'kick',
        kickId: 'channel-id',
        username: 'streamer',
        displayName: 'Streamer Name',
        avatarUrl: 'https://.../avatar.jpg',
        bio: 'Bio description',
        isVerified: true,
        createdAt: new Date('2023-01-15T10:30:00Z')
      };

      expect(user.platform).toBe('kick');
      expect(user.kickId).toBe('channel-id');
      expect(user.isVerified).toBe(true);
    });

    it('accepts null displayName, avatarUrl, bio, and createdAt', () => {
      const user: KickUser = {
        platform: 'kick',
        kickId: 'channel-id',
        username: 'streamer',
        displayName: null,
        avatarUrl: null,
        bio: null,
        isVerified: false,
        createdAt: null
      };

      expect(user.displayName).toBeNull();
      expect(user.avatarUrl).toBeNull();
      expect(user.bio).toBeNull();
      expect(user.createdAt).toBeNull();
      expect(user.isVerified).toBe(false);
    });
  });

  describe('YouTubeUser', () => {
    it('accepts valid YouTube user data', () => {
      const user: YouTubeUser = {
        platform: 'youtube',
        channelId: 'channel-id',
        channelTitle: 'Channel Name',
        customUrl: '@handle',
        thumbnailUrl: 'https://.../default.jpg',
        description: 'Channel description',
        subscriberCount: 100000,
        videoCount: 500,
        viewCount: 1000000,
        createdAt: new Date('2020-01-15T10:30:00Z')
      };

      expect(user.platform).toBe('youtube');
      expect(user.channelId).toBe('channel-id');
      expect(user.subscriberCount).toBe(100000);
    });

    it('accepts null customUrl, thumbnailUrl, description, and createdAt', () => {
      const user: YouTubeUser = {
        platform: 'youtube',
        channelId: 'channel-id',
        channelTitle: 'Channel Name',
        customUrl: null,
        thumbnailUrl: null,
        description: null,
        subscriberCount: 0,
        videoCount: 0,
        viewCount: 0,
        createdAt: null
      };

      expect(user.customUrl).toBeNull();
      expect(user.thumbnailUrl).toBeNull();
      expect(user.description).toBeNull();
      expect(user.createdAt).toBeNull();
    });
  });

  describe('PlatformUser union', () => {
    it('can hold any platform user type', () => {
      const twitch: PlatformUser = {
        platform: 'twitch',
        twitchId: '123',
        username: 'test',
        displayName: 'Test',
        profileImageUrl: null,
        bio: null,
        createdAt: null
      };

      const kick: PlatformUser = {
        platform: 'kick',
        kickId: '456',
        username: 'test',
        displayName: null,
        avatarUrl: null,
        bio: null,
        isVerified: false,
        createdAt: null
      };

      const youtube: PlatformUser = {
        platform: 'youtube',
        channelId: 'abc',
        channelTitle: 'Test',
        customUrl: null,
        thumbnailUrl: null,
        description: null,
        subscriberCount: 0,
        videoCount: 0,
        viewCount: 0,
        createdAt: null
      };

      expect(twitch.platform).toBe('twitch');
      expect(kick.platform).toBe('kick');
      expect(youtube.platform).toBe('youtube');
    });
  });
});
