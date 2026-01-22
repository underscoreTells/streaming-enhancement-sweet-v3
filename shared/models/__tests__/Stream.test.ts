import { describe, it, expect } from 'vitest';
import type { TwitchStream, KickStream, YouTubeStream, PlatformStream } from '../src/Stream';

describe('PlatformStream types', () => {
  describe('TwitchStream', () => {
    it('accepts valid Twitch stream data', () => {
      const stream: TwitchStream = {
        platform: 'twitch',
        twitchId: '1234567890',
        username: 'ninja',
        title: 'SOLO Q TO CONQUER! !prime',
        categoryId: '493057',
        tags: ['English', 'Fortnite'],
        isMature: false,
        language: 'en',
        thumbnailUrl: 'https://static-cdn.jtvnw.net/previews-ttv/live_user_ninja-{width}x{height}.jpg',
        channelPoints: 1000
      };

      expect(stream.platform).toBe('twitch');
      expect(stream.twitchId).toBe('1234567890');
      expect(stream.tags).toEqual(['English', 'Fortnite']);
    });

    it('accepts null thumbnailUrl and empty categoryId', () => {
      const stream: TwitchStream = {
        platform: 'twitch',
        twitchId: '1234567890',
        username: 'test_streamer',
        title: 'Stream title',
        categoryId: '',
        tags: [],
        isMature: false,
        language: 'en',
        thumbnailUrl: null,
        channelPoints: 0
      };

      expect(stream.thumbnailUrl).toBeNull();
      expect(stream.categoryId).toBe('');
      expect(stream.tags).toEqual([]);
    });
  });

  describe('KickStream', () => {
    it('accepts valid Kick stream data', () => {
      const stream: KickStream = {
        platform: 'kick',
        kickId: '123456',
        username: 'streamer',
        title: 'Playing some Fortnite!',
        categorySlug: 'fortnite',
        tags: ['gaming', 'fortnite'],
        language: 'en',
        thumbnailUrl: 'https://.../thumbnail.jpg',
        totalTipsUsd: 100.50
      };

      expect(stream.platform).toBe('kick');
      expect(stream.kickId).toBe('123456');
      expect(stream.totalTipsUsd).toBe(100.50);
    });

    it('accepts null thumbnailUrl and empty categorySlug', () => {
      const stream: KickStream = {
        platform: 'kick',
        kickId: '123456',
        username: 'test',
        title: 'Test stream',
        categorySlug: '',
        tags: [],
        language: 'en',
        thumbnailUrl: null,
        totalTipsUsd: 0
      };

      expect(stream.thumbnailUrl).toBeNull();
      expect(stream.categorySlug).toBe('');
      expect(stream.tags).toEqual([]);
    });
  });

  describe('YouTubeStream', () => {
    it('accepts valid YouTube stream data', () => {
      const stream: YouTubeStream = {
        platform: 'youtube',
        videoId: 'video-id',
        channelTitle: 'Channel Name',
        title: 'Stream Title',
        categoryId: '20',
        tags: ['gaming', 'fortnite'],
        privacyStatus: 'public',
        thumbnailUrl: 'https://.../default.jpg',
        subscriberCount: 100000,
        superChatTotal: 500.00
      };

      expect(stream.platform).toBe('youtube');
      expect(stream.videoId).toBe('video-id');
      expect(stream.subscriberCount).toBe(100000);
    });

    it('accepts null thumbnailUrl and default privacyStatus', () => {
      const stream: YouTubeStream = {
        platform: 'youtube',
        videoId: 'video-id',
        channelTitle: 'Channel Name',
        title: 'Stream Title',
        categoryId: '0',
        tags: [],
        privacyStatus: 'public',
        thumbnailUrl: null,
        subscriberCount: 0,
        superChatTotal: 0
      };

      expect(stream.thumbnailUrl).toBeNull();
      expect(stream.tags).toEqual([]);
    });
  });

  describe('PlatformStream union', () => {
    it('can hold any platform stream type', () => {
      const twitch: PlatformStream = {
        platform: 'twitch',
        twitchId: '123',
        username: 'test',
        title: 'Test',
        categoryId: '1',
        tags: [],
        isMature: false,
        language: 'en',
        thumbnailUrl: null,
        channelPoints: 0
      };

      const kick: PlatformStream = {
        platform: 'kick',
        kickId: '456',
        username: 'test',
        title: 'Test',
        categorySlug: '',
        tags: [],
        language: 'en',
        thumbnailUrl: null,
        totalTipsUsd: 0
      };

      const youtube: PlatformStream = {
        platform: 'youtube',
        videoId: 'abc',
        channelTitle: 'Test',
        title: 'Test',
        categoryId: '0',
        tags: [],
        privacyStatus: 'public',
        thumbnailUrl: null,
        subscriberCount: 0,
        superChatTotal: 0
      };

      expect(twitch.platform).toBe('twitch');
      expect(kick.platform).toBe('kick');
      expect(youtube.platform).toBe('youtube');
    });
  });
});
