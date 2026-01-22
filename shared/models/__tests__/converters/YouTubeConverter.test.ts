import { describe, it, expect } from 'vitest';
import { YouTubeConverter } from '../../src/converters/YouTubeConverter';

describe('YouTubeConverter', () => {
  describe('convertStream', () => {
    it('converts valid stream API response', () => {
      const apiResponse = {
        kind: 'youtube#videoListResponse',
        etag: '...',
        items: [{
          kind: 'youtube#video',
          etag: '...',
          id: 'video-id',
          snippet: {
            publishedAt: '2024-01-15T10:00:00Z',
            channelId: 'channel-id',
            title: 'Stream Title',
            description: 'Stream description',
            thumbnails: {
              default: {
                url: 'https://.../default.jpg',
                width: 120,
                height: 90
              }
            },
            channelTitle: 'Channel Name',
            categoryId: '20',
            liveBroadcastContent: 'live',
            tags: ['gaming', 'fortnite']
          },
          status: {
            privacyStatus: 'public',
            publicStatsViewable: true
          },
          statistics: {
            viewCount: '10000',
            likeCount: '500'
          }
        }]
      };

      const stream = YouTubeConverter.convertStream(apiResponse);

      expect(stream.platform).toBe('youtube');
      expect(stream.videoId).toBe('video-id');
      expect(stream.channelTitle).toBe('Channel Name');
      expect(stream.title).toBe('Stream Title');
      expect(stream.categoryId).toBe('20');
      expect(stream.tags).toEqual(['gaming', 'fortnite']);
      expect(stream.privacyStatus).toBe('public');
      expect(stream.thumbnailUrl).toBe('https://.../default.jpg');
      expect(stream.subscriberCount).toBe(0);
      expect(stream.superChatTotal).toBe(0);
    });

    it('handles missing optional fields', () => {
      const apiResponse = {
        kind: 'youtube#videoListResponse',
        etag: '...',
        items: [{
          kind: 'youtube#video',
          etag: '...',
          id: 'video-id',
          snippet: {
            publishedAt: '2024-01-15T10:00:00Z',
            channelId: 'channel-id',
            channelTitle: 'Channel Name',
            title: 'Stream Title',
            categoryId: '0',
            liveBroadcastContent: 'live'
          },
          status: {
            privacyStatus: 'public'
          },
          statistics: {
            viewCount: '10000'
          }
        }]
      };

      const stream = YouTubeConverter.convertStream(apiResponse);

      expect(stream.tags).toEqual([]);
      expect(stream.thumbnailUrl).toBeNull();
    });

    it('throws error for empty items', () => {
      const apiResponse = {
        kind: 'youtube#videoListResponse',
        items: []
      };

      expect(() => YouTubeConverter.convertStream(apiResponse)).toThrow('Invalid YouTube stream API response');
    });

    it('throws error for missing video ID', () => {
      const apiResponse = {
        kind: 'youtube#videoListResponse',
        items: [{
          kind: 'youtube#video',
          snippet: {
            channelTitle: 'Test',
            title: 'Test'
          }
        }]
      };

      expect(() => YouTubeConverter.convertStream(apiResponse)).toThrow('Invalid YouTube stream API response');
    });
  });

  describe('convertUser', () => {
    it('converts valid user API response', () => {
      const apiResponse = {
        kind: 'youtube#channelListResponse',
        etag: '...',
        items: [{
          kind: 'youtube#channel',
          etag: '...',
          id: 'channel-id',
          snippet: {
            title: 'Channel Name',
            description: 'Channel description',
            customUrl: '@handle',
            publishedAt: '2020-01-15T10:30:00Z',
            thumbnails: {
              default: {
                url: 'https://.../default.jpg'
              }
            }
          },
          statistics: {
            viewCount: '1000000',
            subscriberCount: '100000',
            hiddenSubscriberCount: false,
            videoCount: '500'
          }
        }]
      };

      const user = YouTubeConverter.convertUser(apiResponse);

      expect(user.platform).toBe('youtube');
      expect(user.channelId).toBe('channel-id');
      expect(user.channelTitle).toBe('Channel Name');
      expect(user.customUrl).toBe('@handle');
      expect(user.thumbnailUrl).toBe('https://.../default.jpg');
      expect(user.description).toBe('Channel description');
      expect(user.subscriberCount).toBe(100000);
      expect(user.videoCount).toBe(500);
      expect(user.viewCount).toBe(1000000);
    });

    it('handles missing optional fields', () => {
      const apiResponse = {
        kind: 'youtube#channelListResponse',
        etag: '...',
        items: [{
          kind: 'youtube#channel',
          id: 'channel-id',
          snippet: {
            title: 'Channel Name',
            description: '',
            customUrl: undefined,
            publishedAt: '2020-01-15T10:30:00Z'
          },
          statistics: {
            viewCount: '1000000',
            subscriberCount: '100000',
            videoCount: '500'
          }
        }]
      };

      const user = YouTubeConverter.convertUser(apiResponse);

      expect(user.customUrl).toBeNull();
      expect(user.thumbnailUrl).toBeNull();
      expect(user.description).toBeNull();
    });

    it('parses YouTube numbers correctly', () => {
      const apiResponse = {
        kind: 'youtube#channelListResponse',
        items: [{
          kind: 'youtube#channel',
          id: 'channel-id',
          snippet: {
            title: 'Channel',
            description: '',
            customUrl: '',
            publishedAt: '2020-01-15T10:30:00Z'
          },
          statistics: {
            viewCount: '1234567',
            subscriberCount: '98765',
            videoCount: '543'
          }
        }]
      };

      const user = YouTubeConverter.convertUser(apiResponse);

      expect(user.subscriberCount).toBe(98765);
      expect(user.videoCount).toBe(543);
      expect(user.viewCount).toBe(1234567);
    });

    it('handles invalid date', () => {
      const apiResponse = {
        kind: 'youtube#channelListResponse',
        items: [{
          kind: 'youtube#channel',
          id: 'channel-id',
          snippet: {
            title: 'Channel',
            description: '',
            customUrl: '',
            publishedAt: 'invalid-date'
          },
          statistics: {
            viewCount: '1000000',
            subscriberCount: '100000',
            videoCount: '500'
          }
        }]
      };

      const user = YouTubeConverter.convertUser(apiResponse);

      expect(user.createdAt).toBeNull();
    });

    it('throws error for empty items', () => {
      const apiResponse = {
        kind: 'youtube#channelListResponse',
        items: []
      };

      expect(() => YouTubeConverter.convertUser(apiResponse)).toThrow('Invalid YouTube user API response');
    });
  });
});
