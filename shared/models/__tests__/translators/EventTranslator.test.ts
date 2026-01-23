import { describe, it, expect } from 'vitest';
import { createEventAdapter, createEventAdapterFromRaw } from '../../src/translators/EventTranslator';
import { TwitchEventAdapter, KickEventAdapter, YouTubeEventAdapter } from '../../src/adapters';

describe('EventTranslator', () => {
  describe('createEventAdapter', () => {
    it('should create TwitchEventAdapter for Twitch follow event', () => {
      const twitchEvent = {
        platform: 'twitch' as const,
        eventId: 'evt-123',
        type: 'channel.follow' as const,
        timestamp: new Date('2023-01-01T12:00:00Z'),
        userId: 'user-456',
        username: 'testuser',
        displayName: 'TestUser',
        channelId: 'channel-789',
        data: { followedAt: '2023-01-01T12:00:00Z' }
      };

      const adapter = createEventAdapter(twitchEvent);

      expect(adapter).toBeInstanceOf(TwitchEventAdapter);
      expect(adapter.getPlatform()).toBe('twitch');
      expect(adapter.getId()).toBe('evt-123');
      expect(adapter.getType()).toBe('follow');
      expect(adapter.getUserId()).toBe('user-456');
      expect(adapter.getUsername()).toBe('testuser');
    });

    it('should create TwitchEventAdapter for Twitch subscription event', () => {
      const twitchEvent = {
        platform: 'twitch' as const,
        eventId: 'evt-124',
        type: 'channel.subscribe' as const,
        timestamp: new Date('2023-01-01T12:00:00Z'),
        userId: 'user-456',
        username: 'testuser',
        displayName: 'TestUser',
        channelId: 'channel-789',
        data: { tier: '1000', isGift: false }
      };

      const adapter = createEventAdapter(twitchEvent);

      expect(adapter).toBeInstanceOf(TwitchEventAdapter);
      expect(adapter.getPlatform()).toBe('twitch');
      expect(adapter.getType()).toBe('subscription');
    });

    it('should create TwitchEventAdapter for Twitch bits event', () => {
      const twitchEvent = {
        platform: 'twitch' as const,
        eventId: 'evt-125',
        type: 'channel.bits.use' as const,
        timestamp: new Date('2023-01-01T12:00:00Z'),
        userId: 'user-456',
        username: 'testuser',
        displayName: 'TestUser',
        channelId: 'channel-789',
        data: { bitsUsed: 100, totalBitsUsed: 500 }
      };

      const adapter = createEventAdapter(twitchEvent);

      expect(adapter).toBeInstanceOf(TwitchEventAdapter);
      expect(adapter.getType()).toBe('cheer');
    });

    it('should create KickEventAdapter for Kick follow event', () => {
      const kickEvent = {
        platform: 'kick' as const,
        eventId: 'kick-evt-123',
        type: 'followed' as const,
        timestamp: new Date('2023-01-01T12:00:00Z'),
        userId: 'kick-user-456',
        username: 'kickuser',
        displayName: 'KickUser',
        channelId: 'kick-channel-789',
        data: {
          followerId: 'kick-user-456',
          followerUsername: 'kickuser',
          followerDisplayName: 'KickUser'
        }
      };

      const adapter = createEventAdapter(kickEvent);

      expect(adapter).toBeInstanceOf(KickEventAdapter);
      expect(adapter.getPlatform()).toBe('kick');
      expect(adapter.getId()).toBe('kick-evt-123');
      expect(adapter.getType()).toBe('follow');
      expect(adapter.getUsername()).toBe('kickuser');
    });

    it('should create YouTubeEventAdapter for YouTube SuperChat event', () => {
      const youtubeEvent = {
        platform: 'youtube' as const,
        eventId: 'yt-evt-123',
        type: 'superChatEvent' as const,
        timestamp: new Date('2023-01-01T12:00:00Z'),
        channelId: 'yt-channel-456',
        channelTitle: 'Test Channel',
        data: {
          amountDisplayString: '$10.00',
          amountMicros: 10000000,
          currency: 'USD',
          userComment: 'Great stream!'
        }
      };

      const adapter = createEventAdapter(youtubeEvent);

      expect(adapter).toBeInstanceOf(YouTubeEventAdapter);
      expect(adapter.getPlatform()).toBe('youtube');
      expect(adapter.getId()).toBe('yt-evt-123');
      expect(adapter.getType()).toBe('super_chat');
      expect(adapter.getUsername()).toBe('Test Channel');
    });

    it('should handle null optional fields', () => {
      const twitchEvent = {
        platform: 'twitch' as const,
        eventId: 'evt-1',
        type: 'channel.follow' as const,
        timestamp: new Date(),
        userId: 'user-1',
        username: 'user',
        displayName: null,
        channelId: 'channel-1',
        data: {}
      };

      const adapter = createEventAdapter(twitchEvent);
      expect(adapter.getDisplayName()).toBeNull();
    });

    it('should map all Twitch event types correctly', () => {
      const eventTypes = [
        { type: 'channel.follow' as const, expected: 'follow' as const },
        { type: 'channel.subscribe' as const, expected: 'subscription' as const },
        { type: 'channel.subscription.message' as const, expected: 'resubscribe' as const },
        { type: 'channel.subscription.gift' as const, expected: 'subscription_gift' as const },
        { type: 'channel.bits.use' as const, expected: 'cheer' as const },
        { type: 'channel.raid' as const, expected: 'raid' as const },
        { type: 'channel.channel_points_custom_reward_redemption.add' as const, expected: 'point_redemption' as const }
      ];

      eventTypes.forEach(({ type, expected }) => {
        const event = {
          platform: 'twitch' as const,
          eventId: 'evt',
          type,
          timestamp: new Date(),
          userId: 'user',
          username: 'user',
          displayName: 'User',
          channelId: 'channel',
          data: {}
        };

        const adapter = createEventAdapter(event);
        expect(adapter.getType()).toBe(expected);
      });
    });

    it('should map all Kick event types correctly', () => {
      const eventTypes = [
        { type: 'followed' as const, expected: 'follow' as const },
        { type: 'subscribed' as const, expected: 'subscription' as const },
        { type: 'subscription_gift' as const, expected: 'subscription_gift' as const },
        { type: 'raid' as const, expected: 'raid' as const },
        { type: 'tip' as const, expected: 'tip' as const }
      ];

      eventTypes.forEach(({ type, expected }) => {
        const event = {
          platform: 'kick' as const,
          eventId: 'evt',
          type,
          timestamp: new Date(),
          userId: 'user',
          username: 'user',
          displayName: 'User',
          channelId: 'channel',
          data: {}
        };

        const adapter = createEventAdapter(event);
        expect(adapter.getType()).toBe(expected);
      });
    });
  });

  describe('createEventAdapterFromRaw', () => {
    it('should convert Twitch API response and create adapter', () => {
      const rawTwitchEvent = {
        id: 'evt-123',
        subscription: { type: 'channel.follow' },
        timestamp: '2023-01-01T12:00:00Z',
        user_id: 'user-456',
        user_name: 'testuser',
        user_display_name: 'TestUser',
        broadcaster_user_id: 'channel-789'
      };

      const adapter = createEventAdapterFromRaw(rawTwitchEvent, 'twitch');

      expect(adapter).toBeInstanceOf(TwitchEventAdapter);
      expect(adapter.getPlatform()).toBe('twitch');
      expect(adapter.getType()).toBe('follow');
      expect(adapter.getUserId()).toBe('user-456');
    });

    it('should convert Kick API response and create adapter', () => {
      const rawKickEvent = {
        id: 'kick-evt-123',
        type: 'followed',
        timestamp: '2023-01-01T12:00:00Z',
        user_id: 'kick-user-456',
        username: 'kickuser',
        display_name: 'KickUser',
        channel_id: 'kick-channel-789'
      };

      const adapter = createEventAdapterFromRaw(rawKickEvent, 'kick');

      expect(adapter).toBeInstanceOf(KickEventAdapter);
      expect(adapter.getPlatform()).toBe('kick');
      expect(adapter.getType()).toBe('follow');
      expect(adapter.getUsername()).toBe('kickuser');
    });

    it('should convert YouTube API response and create adapter', () => {
      const rawYouTubeEvent = {
        id: 'yt-evt-123',
        kind: 'youtube#superChatEvent',
        snippet: {
          publishedAt: '2023-01-01T12:00:00Z',
          channelId: 'yt-channel-456',
          channelTitle: 'Test Channel'
        }
      };

      const adapter = createEventAdapterFromRaw(rawYouTubeEvent, 'youtube');

      expect(adapter).toBeInstanceOf(YouTubeEventAdapter);
      expect(adapter.getPlatform()).toBe('youtube');
      expect(adapter.getType()).toBe('super_chat');
      expect(adapter.getUsername()).toBe('Test Channel');
    });

    it('should throw error for unsupported platform', () => {
      expect(() => {
        createEventAdapterFromRaw({}, 'facebook' as any);
      }).toThrow('Unsupported platform: facebook');
    });
  });

  describe('Type safety', () => {
    it('should correctly narrow types based on platform', () => {
      const twitchEvent = {
        platform: 'twitch' as const,
        eventId: 'evt-1',
        type: 'channel.follow' as const,
        timestamp: new Date(),
        userId: 'user-1',
        username: 'user',
        displayName: 'User',
        channelId: 'channel-1',
        data: {}
      };

      const adapter = createEventAdapter(twitchEvent);

      if (adapter.getPlatform() === 'twitch') {
        expect(adapter).toBeInstanceOf(TwitchEventAdapter);
      }
    });
  });
});
