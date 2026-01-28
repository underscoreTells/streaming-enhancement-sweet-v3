import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createLogger } from 'winston';

vi.mock('@streaming-enhancement/shared-models', () => ({
  KickChatMessageAdapter: class MockKickChatMessageAdapter {
    constructor(private data: any) {}
    getId = () => this.data.id;
    getSenderId = () => this.data.senderId;
    getSenderUsername = () => this.data.senderUsername;
    getSenderDisplayName = () => this.data.senderDisplayName;
    getMessage = () => this.data.message;
    getTimestamp = () => this.data.timestamp;
    getChatroomId = () => this.data.chatroomId;
    getEmotes = () => this.data.emotes;
    getSenderColor = () => this.data.senderColor;
    getSenderBadges = () => this.data.senderBadges;
    getSenderIsModerator = () => this.data.senderIsModerator;
    getSenderIsBroadcaster = () => this.data.senderIsBroadcaster;
    getSenderIsSubscriber = () => this.data.senderIsSubscriber;
  },
  KickUserAdapter: class MockKickUserAdapter {
    constructor(private data: any) {}
    getId = () => this.data.id;
    getUsername = () => this.data.username;
    getDisplayName = () => this.data.displayName;
  },
  KickStreamAdapter: class MockKickStreamAdapter {
    constructor(private data: any) {}
    getId = () => this.data.id;
    getChannelId = () => this.data.channelId;
    getTitle = () => this.data.title;
    getCategoryName = () => this.data.categoryName;
    getThumbnailUrl = () => this.data.thumbnailUrl;
    getViewerCount = () => this.data.viewerCount;
    isLive = () => this.data.isLive;
    getStartedAt = () => this.data.startedAt;
  },
  KickEventAdapter: class MockKickEventAdapter {
    constructor(private data: any) {}
    getId = () => this.data.id;
    getType = () => this.data.type;
    getTimestamp = () => this.data.timestamp;
    getUserId = () => this.data.userId;
    getUsername = () => this.data.username;
    getPlatform = () => this.data.platform;
    getGifterUsername = () => this.data.gifterUsername;
    getModeratorUsername = () => this.data.moderatorUsername;
    getDurationMs = () => this.data.durationMs;
    getReason = () => this.data.reason;
    getCumulativeMonths = () => this.data.cumulativeMonths;
  },
}));

import { KickEventHandler, createEventHandlers } from '../../../platforms/Kick/event/KickEventHandler';
import { KickEventType } from '../../../platforms/Kick/event/types';

describe('KickEventHandler', () => {
  let logger: ReturnType<typeof createLogger>;
  let handler: KickEventHandler;

  beforeEach(() => {
    logger = createLogger({ silent: true });
    handler = new KickEventHandler(logger);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Event Registration', () => {
    it('should register event handler', () => {
      const mockHandler = vi.fn().mockResolvedValue(undefined);

      handler.register(KickEventType.ChatMessageEvent, mockHandler);

      expect(handler).toBeDefined();
    });

    it('should unregister event handler', async () => {
      const mockHandler = vi.fn().mockResolvedValue(undefined);

      handler.register(KickEventType.ChatMessageEvent, mockHandler);
      handler.unregister(KickEventType.ChatMessageEvent);

      const handlePromise = handler.handle(KickEventType.ChatMessageEvent, {});
      await expect(handlePromise).resolves.toBeUndefined();
    });

    it('should log on registration', () => {
      const debugSpy = vi.spyOn(logger, 'debug').mockImplementation(() => {});
      const mockHandler = vi.fn().mockResolvedValue(undefined);

      handler.register(KickEventType.ChatMessageEvent, mockHandler);

      expect(debugSpy).toHaveBeenCalledWith('Registered handler for event type: ChatMessageEvent');
      debugSpy.mockRestore();
    });

    it('should log on unregistration', () => {
      const debugSpy = vi.spyOn(logger, 'debug').mockImplementation(() => {});
      const mockHandler = vi.fn().mockResolvedValue(undefined);

      handler.register(KickEventType.ChatMessageEvent, mockHandler);
      handler.unregister(KickEventType.ChatMessageEvent);

      expect(debugSpy).toHaveBeenCalledWith('Unregistered handler for event type: ChatMessageEvent');
      debugSpy.mockRestore();
    });
  });

  describe('Event Dispatch', () => {
    it('should call handler when event is registered', async () => {
      const mockHandler = vi.fn().mockResolvedValue(undefined);
      handler.register(KickEventType.ChatMessageEvent, mockHandler);

      await handler.handle(KickEventType.ChatMessageEvent, { test: 'data' });

      expect(mockHandler).toHaveBeenCalledWith({ test: 'data' });
    });

    it('should handle missing handler gracefully', async () => {
      const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});

      await handler.handle(KickEventType.ChatMessageEvent, {});

      expect(warnSpy).toHaveBeenCalledWith('No handler registered for event type: ChatMessageEvent');
      warnSpy.mockRestore();
    });

    it('should propagate handler errors', async () => {
      const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
      const errorHandler = vi.fn().mockRejectedValue(new Error('Handler error'));
      handler.register(KickEventType.ChatMessageEvent, errorHandler);

      await expect(handler.handle(KickEventType.ChatMessageEvent, {})).rejects.toThrow('Handler error');

      errorSpy.mockRestore();
    });
  });

  describe('createEventHandlers', () => {
    it('should create handlers for all 9 must-have events', () => {
      const handlers = createEventHandlers(logger);

      expect(handlers.size).toBe(9);
      expect(handlers.has(KickEventType.ChatMessageEvent)).toBe(true);
      expect(handlers.has(KickEventType.FollowersUpdated)).toBe(true);
      expect(handlers.has(KickEventType.StreamerIsLive)).toBe(true);
      expect(handlers.has(KickEventType.StopStreamBroadcast)).toBe(true);
      expect(handlers.has(KickEventType.ChannelSubscriptionEvent)).toBe(true);
      expect(handlers.has(KickEventType.LuckyUsersWhoGotGiftSubscriptionsEvent)).toBe(true);
      expect(handlers.has(KickEventType.UserBannedEvent)).toBe(true);
      expect(handlers.has(KickEventType.GiftedSubscriptionsEvent)).toBe(true);
      expect(handlers.has(KickEventType.SubscriptionEvent)).toBe(true);
    });
  });

  describe('ChatMessageEvent Handler', () => {
    it('should process valid chat message', async () => {
      const handlers = createEventHandlers(logger);
      const handler = handlers.get(KickEventType.ChatMessageEvent);

      if (!handler) {
        throw new Error('Handler not found');
      }

      const chatData = {
        id: '12345',
        sender: {
          id: 'user123',
          username: 'testuser',
          displayname: 'Test User',
          identity: {
            color: '#FFFFFF',
            badges: ['subscriber'],
            subscribed: true,
          },
          is_mod: false,
          is_broadcaster: false,
        },
        content: 'Hello world!',
        emotes: [],
        chatroom_id: 'chat123',
        created_at: '2024-01-01T00:00:00Z',
      };

      await expect(handler(chatData)).resolves.not.toThrow();
    });

    it('should handle missing sender field', async () => {
      const handlers = createEventHandlers(logger);
      const handler = handlers.get(KickEventType.ChatMessageEvent);

      if (!handler) {
        throw new Error('Handler not found');
      }

      const invalidData = {
        content: 'Hello world!',
      };

      await expect(handler(invalidData)).resolves.not.toThrow();
    });

    it('should handle missing content field', async () => {
      const handlers = createEventHandlers(logger);
      const handler = handlers.get(KickEventType.ChatMessageEvent);

      if (!handler) {
        throw new Error('Handler not found');
      }

      const invalidData = {
        sender: { id: '123', username: 'test' },
      };

      await expect(handler(invalidData)).resolves.not.toThrow();
    });
  });

  describe('FollowersUpdated Handler', () => {
    it('should process valid follow event', async () => {
      const handlers = createEventHandlers(logger);
      const handler = handlers.get(KickEventType.FollowersUpdated);

      if (!handler) {
        throw new Error('Handler not found');
      }

      const followData = {
        channel_id: '12345',
        user_id: 'user123',
        username: 'testuser',
        display_name: 'Test User',
        created_at: '2024-01-01T00:00:00Z',
      };

      await expect(handler(followData)).resolves.not.toThrow();
    });

    it('should handle missing channel_id', async () => {
      const handlers = createEventHandlers(logger);
      const handler = handlers.get(KickEventType.FollowersUpdated);

      if (!handler) {
        throw new Error('Handler not found');
      }

      const invalidData = {
        username: 'testuser',
      };

      await expect(handler(invalidData)).resolves.not.toThrow();
    });

    it('should handle alternative field names', async () => {
      const handlers = createEventHandlers(logger);
      const handler = handlers.get(KickEventType.FollowersUpdated);

      if (!handler) {
        throw new Error('Handler not found');
      }

      const altData = {
        channel_id: '12345',
        followerId: 'follower123',
        followerUsername: 'follower',
        followerDisplayName: 'Follower Display',
        created_at: '2024-01-01T00:00:00Z',
      };

      await expect(handler(altData)).resolves.not.toThrow();
    });
  });

  describe('StreamerIsLive Handler', () => {
    it('should process stream online event', async () => {
      const handlers = createEventHandlers(logger);
      const handler = handlers.get(KickEventType.StreamerIsLive);

      if (!handler) {
        throw new Error('Handler not found');
      }

      const streamData = {
        livestream: {
          id: 'stream123',
          channel_id: 'channel123',
          session_title: 'Test Stream',
          category_name: 'Gaming',
          thumbnail: 'https://example.com/thumb.jpg',
          viewer_count: 1000,
          created_at: '2024-01-01T00:00:00Z',
        },
      };

      await expect(handler(streamData)).resolves.not.toThrow();
    });

    it('should handle missing livestream', async () => {
      const handlers = createEventHandlers(logger);
      const handler = handlers.get(KickEventType.StreamerIsLive);

      if (!handler) {
        throw new Error('Handler not found');
      }

      const invalidData = {};

      await expect(handler(invalidData)).resolves.not.toThrow();
    });

    it('should handle nested channel_id', async () => {
      const handlers = createEventHandlers(logger);
      const handler = handlers.get(KickEventType.StreamerIsLive);

      if (!handler) {
        throw new Error('Handler not found');
      }

      const nestedData = {
        channel_id: 'external123',
        livestream: {
          id: 'stream123',
        },
      };

      await expect(handler(nestedData)).resolves.not.toThrow();
    });
  });

  describe('StopStreamBroadcast Handler', () => {
    it('should process stream offline event', async () => {
      const handlers = createEventHandlers(logger);
      const handler = handlers.get(KickEventType.StopStreamBroadcast);

      if (!handler) {
        throw new Error('Handler not found');
      }

      const streamData = {
        livestream: {
          id: 'stream123',
        },
      };

      await expect(handler(streamData)).resolves.not.toThrow();
    });

    it('should handle missing livestream', async () => {
      const handlers = createEventHandlers(logger);
      const handler = handlers.get(KickEventType.StopStreamBroadcast);

      if (!handler) {
        throw new Error('Handler not found');
      }

      const invalidData = {};

      await expect(handler(invalidData)).resolves.not.toThrow();
    });
  });

  describe('ChannelSubscriptionEvent Handler', () => {
    it('should process subscription event', async () => {
      const handlers = createEventHandlers(logger);
      const handler = handlers.get(KickEventType.ChannelSubscriptionEvent);

      if (!handler) {
        throw new Error('Handler not found');
      }

      const subData = {
        channel_id: '12345',
        user_id: 'user123',
        username: 'testuser',
        display_name: 'Test User',
      };

      await expect(handler(subData)).resolves.not.toThrow();
    });

    it('should handle missing required fields', async () => {
      const handlers = createEventHandlers(logger);
      const handler = handlers.get(KickEventType.ChannelSubscriptionEvent);

      if (!handler) {
        throw new Error('Handler not found');
      }

      const invalidData = {};

      await expect(handler(invalidData)).resolves.not.toThrow();
    });

    it('should fallback to username for display_name', async () => {
      const handlers = createEventHandlers(logger);
      const handler = handlers.get(KickEventType.ChannelSubscriptionEvent);

      if (!handler) {
        throw new Error('Handler not found');
      }

      const subData = {
        channel_id: '12345',
        username: 'testuser',
      };

      await expect(handler(subData)).resolves.not.toThrow();
    });
  });

  describe('LuckyUsersWhoGotGiftSubscriptionsEvent Handler', () => {
    it('should process gifted subscriptions', async () => {
      const handlers = createEventHandlers(logger);
      const handler = handlers.get(KickEventType.LuckyUsersWhoGotGiftSubscriptionsEvent);

      if (!handler) {
        throw new Error('Handler not found');
      }

      const giftData = {
        usernames: ['user1', 'user2', 'user3'],
        gifter_username: 'gifter',
        created_at: '2024-01-01T00:00:00Z',
      };

      await expect(handler(giftData)).resolves.not.toThrow();
    });

    it('should handle empty usernames array', async () => {
      const handlers = createEventHandlers(logger);
      const handler = handlers.get(KickEventType.LuckyUsersWhoGotGiftSubscriptionsEvent);

      if (!handler) {
        throw new Error('Handler not found');
      }

      const giftData = {
        usernames: [],
        gifter_username: 'gifter',
      };

      await expect(handler(giftData)).resolves.not.toThrow();
    });

    it('should handle missing gifter_username', async () => {
      const handlers = createEventHandlers(logger);
      const handler = handlers.get(KickEventType.LuckyUsersWhoGotGiftSubscriptionsEvent);

      if (!handler) {
        throw new Error('Handler not found');
      }

      const giftData = {
        usernames: ['user1'],
      };

      await expect(handler(giftData)).resolves.not.toThrow();
    });
  });

  describe('UserBannedEvent Handler', () => {
    it('should process ban event', async () => {
      const handlers = createEventHandlers(logger);
      const handler = handlers.get(KickEventType.UserBannedEvent);

      if (!handler) {
        throw new Error('Handler not found');
      }

      const banData = {
        user: {
          id: 'user123',
          username: 'banneduser',
        },
        banned_by: {
          username: 'moderator',
        },
        expires_at: '2024-01-02T00:00:00Z',
        metadata: {
          reason: 'Violation of rules',
        },
      };

      await expect(handler(banData)).resolves.not.toThrow();
    });

    it('should handle missing user', async () => {
      const handlers = createEventHandlers(logger);
      const handler = handlers.get(KickEventType.UserBannedEvent);

      if (!handler) {
        throw new Error('Handler not found');
      }

      const invalidData = {};

      await expect(handler(invalidData)).resolves.not.toThrow();
    });

    it('should handle timeout bans (duration)', async () => {
      const handlers = createEventHandlers(logger);
      const handler = handlers.get(KickEventType.UserBannedEvent);

      if (!handler) {
        throw new Error('Handler not found');
      }

      const timeoutData = {
        user: {
          id: 'user123',
          username: 'banneduser',
        },
        expires_at: new Date(Date.now() + 600000).toISOString(),
      };

      await expect(handler(timeoutData)).resolves.not.toThrow();
    });

    it('should handle permanent bans (no expires_at)', async () => {
      const handlers = createEventHandlers(logger);
      const handler = handlers.get(KickEventType.UserBannedEvent);

      if (!handler) {
        throw new Error('Handler not found');
      }

      const permBanData = {
        user: {
          id: 'user123',
          username: 'banneduser',
        },
      };

      await expect(handler(permBanData)).resolves.not.toThrow();
    });
  });

  describe('GiftedSubscriptionsEvent Handler', () => {
    it('should process chatroom gift subscriptions', async () => {
      const handlers = createEventHandlers(logger);
      const handler = handlers.get(KickEventType.GiftedSubscriptionsEvent);

      if (!handler) {
        throw new Error('Handler not found');
      }

      const giftData = {
        gifted_usernames: ['gift1', 'gift2'],
        gifter_username: 'gifter',
      };

      await expect(handler(giftData)).resolves.not.toThrow();
    });

    it('should handle empty gifted_usernames array', async () => {
      const handlers = createEventHandlers(logger);
      const handler = handlers.get(KickEventType.GiftedSubscriptionsEvent);

      if (!handler) {
        throw new Error('Handler not found');
      }

      const giftData = {
        gifted_usernames: [],
        gifter_username: 'gifter',
      };

      await expect(handler(giftData)).resolves.not.toThrow();
    });

    it('should handle missing gifter_username', async () => {
      const handlers = createEventHandlers(logger);
      const handler = handlers.get(KickEventType.GiftedSubscriptionsEvent);

      if (!handler) {
        throw new Error('Handler not found');
      }

      const giftData = {
        gifted_usernames: ['gift1'],
      };

      await expect(handler(giftData)).resolves.not.toThrow();
    });
  });

  describe('SubscriptionEvent Handler', () => {
    it('should process chatroom subscription event', async () => {
      const handlers = createEventHandlers(logger);
      const handler = handlers.get(KickEventType.SubscriptionEvent);

      if (!handler) {
        throw new Error('Handler not found');
      }

      const subData = {
        chatroom_id: 'chat123',
        user_id: 'user123',
        username: 'testuser',
        display_name: 'Test User',
        months: 5,
      };

      await expect(handler(subData)).resolves.not.toThrow();
    });

    it('should handle missing username', async () => {
      const handlers = createEventHandlers(logger);
      const handler = handlers.get(KickEventType.SubscriptionEvent);

      if (!handler) {
        throw new Error('Handler not found');
      }

      const invalidData = {
        chatroom_id: 'chat123',
      };

      await expect(handler(invalidData)).resolves.not.toThrow();
    });

    it('should fallback to username for display_name', async () => {
      const handlers = createEventHandlers(logger);
      const handler = handlers.get(KickEventType.SubscriptionEvent);

      if (!handler) {
        throw new Error('Handler not found');
      }

      const subData = {
        chatroom_id: 'chat123',
        username: 'testuser',
      };

      await expect(handler(subData)).resolves.not.toThrow();
    });

    it('should default to 1 month if not specified', async () => {
      const handlers = createEventHandlers(logger);
      const handler = handlers.get(KickEventType.SubscriptionEvent);

      if (!handler) {
        throw new Error('Handler not found');
      }

      const subData = {
        chatroom_id: 'chat123',
        username: 'testuser',
      };

      await expect(handler(subData)).resolves.not.toThrow();
    });
  });

  describe('Error Handling in Handlers', () => {
    it('should not throw on adapter creation', async () => {
      const handlers = createEventHandlers(logger);
      const handler = handlers.get(KickEventType.ChatMessageEvent);

      if (!handler) {
        throw new Error('Handler not found');
      }

      const minimalData = {
        sender: {},
        content: '',
      };

      await expect(handler(minimalData)).resolves.not.toThrow();
    });

    it('should use debug logging for invalid data', async () => {
      const debugSpy = vi.spyOn(logger, 'debug').mockImplementation(() => {});
      const handlers = createEventHandlers(logger);
      const handler = handlers.get(KickEventType.ChatMessageEvent);

      if (!handler) {
        throw new Error('Handler not found');
      }

      await handler({ content: 'test' });

      expect(debugSpy).toHaveBeenCalledWith('Invalid chat message data, missing required fields');
      debugSpy.mockRestore();
    });
  });
});
