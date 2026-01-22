import { describe, it, expect } from 'vitest';
import { KickConverter } from '../../src/converters/KickConverter';

describe('KickConverter', () => {
  describe('convertStream', () => {
    it('converts valid stream API response', () => {
      const apiResponse = {
        id: '123456',
        channel_id: '789',
        category_id: 'fortnite',
        category_name: 'Fortnite',
        title: 'Playing some Fortnite!',
        thumbnail: 'https://.../thumbnail.jpg',
        is_live: true,
        viewer_count: 5420,
        created_at: '2024-01-15T10:30:00Z',
        language: 'en',
        tags: ['gaming', 'fortnite'],
        user: {
          username: 'streamer'
        }
      };

      const stream = KickConverter.convertStream(apiResponse);

      expect(stream.platform).toBe('kick');
      expect(stream.kickId).toBe('123456');
      expect(stream.username).toBe('streamer');
      expect(stream.title).toBe('Playing some Fortnite!');
      expect(stream.categorySlug).toBe('fortnite');
      expect(stream.tags).toEqual(['gaming', 'fortnite']);
      expect(stream.thumbnailUrl).toBe('https://.../thumbnail.jpg');
      expect(stream.totalTipsUsd).toBe(0);
    });

    it('handles missing optional fields', () => {
      const apiResponse = {
        id: '123456',
        channel_id: '789',
        category_id: '',
        title: 'Test stream',
        thumbnail: '',
        is_live: true,
        viewer_count: 100,
        language: 'en',
        tags: []
      };

      const stream = KickConverter.convertStream(apiResponse);

      expect(stream.categorySlug).toBe('');
      expect(stream.tags).toEqual([]);
      expect(stream.thumbnailUrl).toBeNull();
    });

    it('throws error for empty response', () => {
      expect(() => KickConverter.convertStream(null)).toThrow('Invalid Kick stream API response');
    });

    it('throws error for missing ID', () => {
      const apiResponse = {
        channel_id: '789',
        title: 'Test'
      } as any;

      expect(() => KickConverter.convertStream(apiResponse)).toThrow('Invalid Kick stream API response');
    });
  });

  describe('convertUser', () => {
    it('converts valid user API response', () => {
      const apiResponse = {
        id: 'channel-id',
        user_id: 'user-id',
        username: 'streamer',
        display_name: 'Streamer Name',
        bio: 'Bio description',
        avatar_url: 'https://.../avatar.jpg',
        banner_url: 'https://.../banner.jpg',
        followers_count: 10000,
        following_count: 500,
        subscriber_count: 5000,
        is_verified: true,
        is_banned: false,
        created_at: '2023-01-15T10:30:00Z'
      };

      const user = KickConverter.convertUser(apiResponse);

      expect(user.platform).toBe('kick');
      expect(user.kickId).toBe('channel-id');
      expect(user.username).toBe('streamer');
      expect(user.displayName).toBe('Streamer Name');
      expect(user.avatarUrl).toBe('https://.../avatar.jpg');
      expect(user.bio).toBe('Bio description');
      expect(user.isVerified).toBe(true);
      expect(user.createdAt).toEqual(new Date('2023-01-15T10:30:00Z'));
    });

    it('handles missing optional fields', () => {
      const apiResponse = {
        id: 'channel-id',
        username: 'streamer',
        display_name: '',
        bio: '',
        avatar_url: '',
        is_verified: false,
        created_at: '2023-01-15T10:30:00Z'
      };

      const user = KickConverter.convertUser(apiResponse);

      expect(user.displayName).toBeNull();
      expect(user.avatarUrl).toBeNull();
      expect(user.bio).toBeNull();
      expect(user.isVerified).toBe(false);
    });

    it('handles invalid date', () => {
      const apiResponse = {
        id: 'channel-id',
        username: 'streamer',
        display_name: 'Streamer',
        bio: 'Bio',
        avatar_url: '',
        is_verified: false,
        created_at: 'invalid-date'
      };

      const user = KickConverter.convertUser(apiResponse);

      expect(user.createdAt).toBeNull();
    });

    it('throws error for empty response', () => {
      expect(() => KickConverter.convertUser(null)).toThrow('Invalid Kick user API response');
    });

    it('throws error for missing ID', () => {
      const apiResponse = {
        username: 'streamer'
      } as any;

      expect(() => KickConverter.convertUser(apiResponse)).toThrow('Invalid Kick user API response');
    });
  });
});
