import { describe, it, expect } from 'vitest';
import { createChatMessageAdapter, createChatMessageAdapterFromRaw } from '../../src/translators/ChatMessageTranslator';
import { TwitchChatMessageAdapter, KickChatMessageAdapter, YouTubeChatMessageAdapter } from '../../src/adapters';
import { BadgeType, EmoteType } from '../../src/adapters/ChatMessageAdapter';

describe('ChatMessageTranslator', () => {
  describe('createChatMessageAdapter', () => {
    it('should create TwitchChatMessageAdapter for Twitch message', () => {
      const twitchMessage = {
        platform: 'twitch' as const,
        messageId: 'msg-123',
        userId: 'user-456',
        username: 'testuser',
        displayName: 'TestUser',
        color: '#FF0000',
        message: 'Hello chat!',
        timestamp: new Date('2023-01-01T12:00:00Z'),
        roomId: 'room-789',
        badges: [{ _id: 'broadcaster', _version: '1' }],
        emotes: [{ _id: 'emote-1', _name: 'Kappa', positions: [[0, 4]] }],
        bits: 100
      };

      const adapter = createChatMessageAdapter(twitchMessage);

      expect(adapter).toBeInstanceOf(TwitchChatMessageAdapter);
      expect(adapter.getPlatform()).toBe('twitch');
      expect(adapter.getId()).toBe('msg-123');
      expect(adapter.getUserId()).toBe('user-456');
      expect(adapter.getUsername()).toBe('testuser');
      expect(adapter.getMessage()).toBe('Hello chat!');
    });

    it('should normalize Twitch badges', () => {
      const twitchMessage = {
        platform: 'twitch' as const,
        messageId: 'msg-1',
        userId: 'user-1',
        username: 'user',
        displayName: 'User',
        color: '#000000',
        message: 'Test',
        timestamp: new Date(),
        roomId: 'room-1',
        badges: [
          { _id: 'broadcaster', _version: '1' },
          { _id: 'moderator', _version: '1' },
          { _id: 'subscriber', _version: '3' },
          { _id: 'vip', _version: '1' }
        ],
        emotes: []
      };

      const adapter = createChatMessageAdapter(twitchMessage);
      const badges = adapter.getBadges();

      expect(badges).toHaveLength(4);
      expect(badges[0].type).toBe(BadgeType.Owner);
      expect(badges[0].name).toBe('Broadcaster');
      expect(badges[1].type).toBe(BadgeType.Moderator);
      expect(badges[2].type).toBe(BadgeType.Subscription);
      expect(badges[3].type).toBe(BadgeType.VIP);
    });

    it('should normalize Twitch emotes', () => {
      const twitchMessage = {
        platform: 'twitch' as const,
        messageId: 'msg-1',
        userId: 'user-1',
        username: 'user',
        displayName: 'User',
        color: '#000000',
        message: 'Test',
        timestamp: new Date(),
        roomId: 'room-1',
        badges: [],
        emotes: [
          { _id: 'emote-1', _name: 'Kappa', positions: [[0, 4]] },
          { _id: 'emote-2', _name: 'PogChamp', positions: [[6, 14]] }
        ]
      };

      const adapter = createChatMessageAdapter(twitchMessage);
      const emotes = adapter.getEmotes();

      expect(emotes).toHaveLength(2);
      expect(emotes[0].id).toBe('emote-1');
      expect(emotes[0].name).toBe('Kappa');
      expect(emotes[0].type).toBe(EmoteType.Twitch);
      expect(emotes[0].positions).toEqual([[0, 4]]);
    });

    it('should create KickChatMessageAdapter for Kick message', () => {
      const kickMessage = {
        platform: 'kick' as const,
        messageId: 'kick-msg-123',
        userId: 'kick-user-456',
        username: 'kickuser',
        displayName: 'KickUser',
        color: '#00FF00',
        message: 'Hi from Kick!',
        timestamp: new Date('2023-01-01T12:00:00Z'),
        roomId: 'kick-room-789',
        badges: [{ type: 'broadcaster', url: 'https://example.com/badge.png' }],
        emotes: [{ id: ' Kick-emote-1', name: 'LULW', positions: [[0, 3]] }]
      };

      const adapter = createChatMessageAdapter(kickMessage);

      expect(adapter).toBeInstanceOf(KickChatMessageAdapter);
      expect(adapter.getPlatform()).toBe('kick');
      expect(adapter.getId()).toBe('kick-msg-123');
      expect(adapter.getUsername()).toBe('kickuser');
      expect(adapter.getMessage()).toBe('Hi from Kick!');
    });

    it('should create YouTubeChatMessageAdapter for YouTube message', () => {
      const youtubeMessage = {
        platform: 'youtube' as const,
        messageId: 'yt-msg-123',
        channelId: 'channel-456',
        displayName: 'YouTubeUser',
        profileImageUrl: 'https://example.com/avatar.jpg',
        message: 'Hello YouTube!',
        timestamp: new Date('2023-01-01T12:00:00Z'),
        liveChatId: 'live-chat-789',
        badges: [{ badgeId: 'owner' }],
        superChatDetails: {
          amountDisplayString: '$10.00',
          amountMicros: 10000000,
          currency: 'USD',
          userComment: 'Great stream!',
          tier: 1
        }
      };

      const adapter = createChatMessageAdapter(youtubeMessage);

      expect(adapter).toBeInstanceOf(YouTubeChatMessageAdapter);
      expect(adapter.getPlatform()).toBe('youtube');
      expect(adapter.getId()).toBe('yt-msg-123');
      expect(adapter.getDisplayName()).toBe('YouTubeUser');
      expect(adapter.getMessage()).toBe('Hello YouTube!');
    });

    it('should handle optional fields', () => {
      const twitchMessage = {
        platform: 'twitch' as const,
        messageId: 'msg-1',
        userId: 'user-1',
        username: 'user',
        displayName: null,
        color: null,
        message: 'Test',
        timestamp: new Date(),
        roomId: 'room-1',
        badges: [],
        emotes: []
      };

      const adapter = createChatMessageAdapter(twitchMessage);
      expect(adapter.getDisplayName()).toBe('user');
      expect(adapter.getColor()).toBeNull();
    });

    it('should handle reply parent feature', () => {
      const twitchMessage = {
        platform: 'twitch' as const,
        messageId: 'msg-1',
        userId: 'user-1',
        username: 'user',
        displayName: 'User',
        color: '#000000',
        message: 'Reply',
        timestamp: new Date(),
        roomId: 'room-1',
        badges: [],
        emotes: [],
        replyParent: {
          messageId: 'parent-msg',
          userId: 'parent-user',
          username: 'parent',
          text: 'Original message'
        }
      };

      const adapter = createChatMessageAdapter(twitchMessage);
      expect(adapter.hasReplyParent()).toBe(true);
    });
  });

  describe('createChatMessageAdapterFromRaw', () => {
    it('should convert Twitch chat message and create adapter', () => {
      const rawTwitchMessage = {
        id: 'msg-123',
        user_id: 'user-456',
        login: 'testuser',
        display_name: 'TestUser',
        color: '#FF0000',
        message: 'Hello chat!',
        timestamp: '2023-01-01T12:00:00Z',
        room_id: 'room-789',
        badges: [{ _id: 'broadcaster', _version: '1' }],
        emotes: []
      };

      const adapter = createChatMessageAdapterFromRaw(rawTwitchMessage, 'twitch');

      expect(adapter).toBeInstanceOf(TwitchChatMessageAdapter);
      expect(adapter.getPlatform()).toBe('twitch');
      expect(adapter.getId()).toBe('msg-123');
      expect(adapter.getMessage()).toBe('Hello chat!');
    });

    it('should convert Kick chat message and create adapter', () => {
      const rawKickMessage = {
        id: 'kick-msg-123',
        user_id: 'kick-user-456',
        username: 'kickuser',
        display_name: 'KickUser',
        color: '#00FF00',
        content: 'Hi from Kick!',
        created_at: '2023-01-01T12:00:00Z',
        channel_id: 'kick-room-789',
        badges: [],
        emotes: []
      };

      const adapter = createChatMessageAdapterFromRaw(rawKickMessage, 'kick');

      expect(adapter).toBeInstanceOf(KickChatMessageAdapter);
      expect(adapter.getPlatform()).toBe('kick');
      expect(adapter.getId()).toBe('kick-msg-123');
    });

    it('should convert YouTube chat message and create adapter', () => {
      const rawYouTubeMessage = {
        id: 'yt-msg-123',
        authorDetails: {
          channelId: 'channel-456',
          displayName: 'YouTubeUser',
          profileImageUrl: 'https://example.com/avatar.jpg',
          badges: []
        },
        snippet: {
          textMessageDetails: { message: 'Hello YouTube!' },
          publishedAt: '2023-01-01T12:00:00Z',
          liveChatId: 'live-chat-789'
        }
      };

      const adapter = createChatMessageAdapterFromRaw(rawYouTubeMessage, 'youtube');

      expect(adapter).toBeInstanceOf(YouTubeChatMessageAdapter);
      expect(adapter.getPlatform()).toBe('youtube');
      expect(adapter.getId()).toBe('yt-msg-123');
      expect(adapter.getDisplayName()).toBe('YouTubeUser');
    });

    it('should throw error for unsupported platform', () => {
      expect(() => {
        createChatMessageAdapterFromRaw({}, 'facebook' as any);
      }).toThrow('Unsupported platform: facebook');
    });
  });

  describe('Type safety', () => {
    it('should correctly narrow types based on platform', () => {
      const twitchMessage = {
        platform: 'twitch' as const,
        messageId: 'msg-123',
        userId: 'user-456',
        username: 'testuser',
        displayName: 'TestUser',
        color: '#FF0000',
        message: 'Hello chat!',
        timestamp: new Date(),
        roomId: 'room-789',
        badges: [],
        emotes: []
      };

      const adapter = createChatMessageAdapter(twitchMessage);

      if (adapter.getPlatform() === 'twitch') {
        expect(adapter).toBeInstanceOf(TwitchChatMessageAdapter);
      }
    });
  });
});
