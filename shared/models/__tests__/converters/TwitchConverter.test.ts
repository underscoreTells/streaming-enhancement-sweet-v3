import { describe, it, expect } from 'vitest';
import { TwitchConverter } from '../../src/converters/TwitchConverter';

describe('TwitchConverter', () => {
  describe('convertStream', () => {
    it('converts valid stream API response', () => {
      const apiResponse = {
        data: [{
          id: '1234567890',
          user_login: 'ninja',
          user_name: 'Ninja',
          game_id: '493057',
          game_name: 'Fortnite',
          type: 'live',
          title: 'SOLO Q TO CONQUER! !prime',
          viewer_count: 14250,
          started_at: '2021-03-10T15:04:21Z',
          language: 'en',
          thumbnail_url: 'https://static-cdn.jtvnw.net/previews-ttv/live_user_ninja-{width}x{height}.jpg',
          tag_ids: ['6ea6bca4-b471-4ab6-a371-4360a4c7dd11'],
          tags: ['English', 'Fortnite'],
          is_mature: false
        }]
      };

      const stream = TwitchConverter.convertStream(apiResponse);

      expect(stream.platform).toBe('twitch');
      expect(stream.twitchId).toBe('1234567890');
      expect(stream.username).toBe('ninja');
      expect(stream.title).toBe('SOLO Q TO CONQUER! !prime');
      expect(stream.categoryId).toBe('493057');
      expect(stream.tags).toEqual(['English', 'Fortnite']);
      expect(stream.isMature).toBe(false);
      expect(stream.language).toBe('en');
      expect(stream.thumbnailUrl).toBe('https://static-cdn.jtvnw.net/previews-ttv/live_user_ninja-{width}x{height}.jpg');
      expect(stream.channelPoints).toBe(0);
    });

    it('handles missing optional fields', () => {
      const apiResponse = {
        data: [{
          id: '1234567890',
          user_login: 'test_streamer',
          title: 'Stream title',
          game_id: '',
          language: 'en'
        }]
      };

      const stream = TwitchConverter.convertStream(apiResponse);

      expect(stream.tags).toEqual([]);
      expect(stream.isMature).toBe(false);
      expect(stream.thumbnailUrl).toBeNull();
    });

    it('handles empty categoryId', () => {
      const apiResponse = {
        data: [{
          id: '1234567890',
          user_login: 'test',
          title: 'Test stream',
          game_id: '',
          language: 'en'
        }]
      };

      const stream = TwitchConverter.convertStream(apiResponse);

      expect(stream.categoryId).toBe('');
    });

    it('throws error for invalid response', () => {
      expect(() => TwitchConverter.convertStream({})).toThrow('Invalid Twitch stream API response');
      expect(() => TwitchConverter.convertStream({ data: [] })).toThrow('Invalid Twitch stream API response');
    });

    it('throws error for missing required fields', () => {
      expect(() => {
        TwitchConverter.convertStream({ data: [{ user_login: 'test', title: 'x', language: 'en' }] });
      }).toThrow('Invalid Twitch stream API response');
    });
  });

  describe('convertUser', () => {
    it('converts valid user API response', () => {
      const apiResponse = {
        data: [{
          id: '123456',
          login: 'ninja',
          display_name: 'Ninja',
          type: '',
          broadcaster_type: 'partner',
          description: 'Professional gamer, streamer, and entertainer.',
          profile_image_url: 'https://static-cdn.jtvnw.net/jtv_user_pictures/ninja-profile_image-0d31d9d4a2a3f03e-300x300.png',
          offline_image_url: 'https://static-cdn.jtvnw.net/jtv_user_pictures/ninja-channel_offline_image-0d31d9d4a2a3f03e-1920x1080.png',
          view_count: 2345678,
          email: 'ninja@example.com',
          created_at: '2016-01-01T00:00:00Z'
        }]
      };

      const user = TwitchConverter.convertUser(apiResponse);

      expect(user.platform).toBe('twitch');
      expect(user.twitchId).toBe('123456');
      expect(user.username).toBe('ninja');
      expect(user.displayName).toBe('Ninja');
      expect(user.profileImageUrl).toBe('https://static-cdn.jtvnw.net/jtv_user_pictures/ninja-profile_image-0d31d9d4a2a3f03e-300x300.png');
      expect(user.bio).toBe('Professional gamer, streamer, and entertainer.');
      expect(user.createdAt).toEqual(new Date('2016-01-01T00:00:00Z'));
    });

    it('handles missing optional fields', () => {
      const apiResponse = {
        data: [{
          id: '123456',
          login: 'test',
          display_name: 'Test User',
          description: '',
          created_at: '2020-01-15T10:30:00Z'
        }]
      };

      const user = TwitchConverter.convertUser(apiResponse);

      expect(user.profileImageUrl).toBeNull();
      expect(user.bio).toBeNull();
    });

    it('handles invalid date', () => {
      const apiResponse = {
        data: [{
          id: '123456',
          login: 'test',
          display_name: 'Test User',
          description: '',
          created_at: 'invalid-date'
        }]
      };

      const user = TwitchConverter.convertUser(apiResponse);

      expect(user.createdAt).toBeNull();
    });

    it('throws error for invalid response', () => {
      expect(() => TwitchConverter.convertUser({})).toThrow('Invalid Twitch user API response');
    });
  });
});
