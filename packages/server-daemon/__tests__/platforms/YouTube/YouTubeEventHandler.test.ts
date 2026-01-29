import { describe, it, expect, beforeEach, vi } from 'vitest';
import { YouTubeEventHandler, createEventHandlers, YouTubeMessageType } from '../../../platforms/YouTube/event';
import type { YouTubeLiveChatMessage } from '../../../platforms/YouTube/rest/types';
import { Logger } from 'winston';

describe('YouTubeEventHandler', () => {
  let logger: Logger;
  let handler: YouTubeEventHandler;

  beforeEach(() => {
    logger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    handler = new YouTubeEventHandler(logger);
  });

  describe('initialization', () => {
    it('should initialize with empty handlers map', () => {
      expect(handler).toBeDefined();
    });

    it('should register handlers correctly', () => {
      const testHandler = vi.fn();
      handler.register(YouTubeMessageType.TextMessage, testHandler);

      expect(logger.debug).toHaveBeenCalledWith(
        'Registered handler for event type: textMessageEvent'
      );
    });

    it('should unregister handlers correctly', () => {
      const testHandler = vi.fn();
      handler.register(YouTubeMessageType.TextMessage, testHandler);
      handler.unregister(YouTubeMessageType.TextMessage);

      expect(logger.debug).toHaveBeenCalledWith(
        'Unregistered handler for event type: textMessageEvent'
      );
    });
  });

  describe('event handling', () => {
    it('should handle registered event types', async () => {
      const testHandler = vi.fn().mockResolvedValue(undefined);
      handler.register(YouTubeMessageType.TextMessage, testHandler);

      const testData = { test: 'data' };
      await handler.handle(YouTubeMessageType.TextMessage, testData);

      expect(testHandler).toHaveBeenCalledWith(testData);
    });

    it('should warn for unregistered event types', async () => {
      const testData = { test: 'data' };
      await handler.handle(YouTubeMessageType.TextMessage, testData);

      expect(logger.warn).toHaveBeenCalledWith(
        'No handler registered for event type: textMessageEvent'
      );
    });

    it('should log errors from handlers', async () => {
      const testHandler = vi.fn().mockRejectedValue(new Error('Handler error'));
      handler.register(YouTubeMessageType.TextMessage, testHandler);

      const testData = { test: 'data' };

      await expect(
        handler.handle(YouTubeMessageType.TextMessage, testData)
      ).rejects.toThrow('Handler error');

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('createEventHandlers factory', () => {
    it('should create handlers for all 6 event types', () => {
      const handlers = createEventHandlers(logger);

      expect(handlers.size).toBe(6);
      expect(handlers.has(YouTubeMessageType.TextMessage)).toBe(true);
      expect(handlers.has(YouTubeMessageType.SuperChat)).toBe(true);
      expect(handlers.has(YouTubeMessageType.SuperSticker)).toBe(true);
      expect(handlers.has(YouTubeMessageType.MemberMilestone)).toBe(true);
      expect(handlers.has(YouTubeMessageType.SponsorGift)).toBe(true);
      expect(handlers.has(YouTubeMessageType.Tombstone)).toBe(true);
    });

    it('should handle textMessageEvent', async () => {
      const handlers = createEventHandlers(logger);
      const textMessageHandler = handlers.get(YouTubeMessageType.TextMessage)!;

      const testData: YouTubeLiveChatMessage = {
        kind: 'youtube#liveChatMessage',
        etag: '"test-etag"',
        id: 'msg-1',
        snippet: {
          liveChatId: 'chat-1',
          authorChannelId: 'channel-1',
          publishedAt: '2024-01-01T00:00:00Z',
          hasDisplayContent: true,
          displayMessage: 'Hello, world!',
          textMessageDetails: {
            messageText: 'Hello, world!',
          },
        } as any,
        authorDetails: {
          channelId: 'channel-1',
          channelUrl: 'https://youtube.com/channel-1',
          displayName: 'TestUser',
          profileImageUrl: 'https://example.com/avatar.jpg',
          isVerified: false,
          isChatOwner: false,
          isChatSponsor: false,
          isChatModerator: false,
        },
      };

      await textMessageHandler(testData);

      expect(logger.debug).toHaveBeenCalledWith(
        'TextMessageEvent processed from TestUser: Hello, world!'
      );
    });

    it('should handle superChatEvent', async () => {
      const handlers = createEventHandlers(logger);
      const superChatHandler = handlers.get(YouTubeMessageType.SuperChat)!;

      const testData: YouTubeLiveChatMessage = {
        kind: 'youtube#liveChatMessage',
        etag: '"test-etag"',
        id: 'msg-2',
        snippet: {
          liveChatId: 'chat-1',
          authorChannelId: 'channel-1',
          publishedAt: '2024-01-01T00:00:00Z',
          hasDisplayContent: true,
          displayMessage: '$5.00 donation!',
          superChatDetails: {
            amountMicros: '5000000',
            currency: 'USD',
            amountDisplayString: '$5.00',
            userComment: 'Great stream!',
            tier: 1,
          },
        } as any,
        authorDetails: {
          channelId: 'channel-1',
          channelUrl: 'https://youtube.com/channel-1',
          displayName: 'SuperFan',
          profileImageUrl: 'https://example.com/avatar.jpg',
          isVerified: false,
          isChatOwner: false,
          isChatSponsor: true,
          isChatModerator: false,
        },
      };

      await superChatHandler(testData);

      expect(logger.debug).toHaveBeenCalledWith(
        'SuperChatEvent processed from SuperFan: $5.00'
      );
    });

    it('should handle superStickerEvent', async () => {
      const handlers = createEventHandlers(logger);
      const superStickerHandler = handlers.get(YouTubeMessageType.SuperSticker)!;

      const testData: YouTubeLiveChatMessage = {
        kind: 'youtube#liveChatMessage',
        etag: '"test-etag"',
        id: 'msg-3',
        snippet: {
          liveChatId: 'chat-1',
          authorChannelId: 'channel-1',
          publishedAt: '2024-01-01T00:00:00Z',
          hasDisplayContent: true,
          displayMessage: '',
          superStickerDetails: {
            amountMicros: '5000000',
            currency: 'USD',
            amountDisplayString: '$5.00',
            tier: 1,
            sticker: {
              displayName: 'Cool Sticker',
              width: 100,
              height: 100,
              url: 'https://example.com/sticker.png',
            },
          },
        } as any,
        authorDetails: {
          channelId: 'channel-1',
          channelUrl: 'https://youtube.com/channel-1',
          displayName: 'StickerFan',
          profileImageUrl: 'https://example.com/avatar.jpg',
          isVerified: false,
          isChatOwner: false,
          isChatSponsor: true,
          isChatModerator: false,
        },
      };

      await superStickerHandler(testData);

      expect(logger.debug).toHaveBeenCalledWith(
        'SuperStickerEvent processed from StickerFan: Cool Sticker'
      );
    });

    it('should handle memberMilestoneChatEvent', async () => {
      const handlers = createEventHandlers(logger);
      const milestoneHandler = handlers.get(YouTubeMessageType.MemberMilestone)!;

      const testData: YouTubeLiveChatMessage = {
        kind: 'youtube#liveChatMessage',
        etag: '"test-etag"',
        id: 'msg-4',
        snippet: {
          liveChatId: 'chat-1',
          authorChannelId: 'channel-1',
          publishedAt: '2024-01-01T00:00:00Z',
          hasDisplayContent: true,
          displayMessage: 'Member milestone!',
        } as any,
        authorDetails: {
          channelId: 'channel-1',
          channelUrl: 'https://youtube.com/channel-1',
          displayName: 'MilestoneMaster',
          profileImageUrl: 'https://example.com/avatar.jpg',
          isVerified: false,
          isChatOwner: false,
          isChatSponsor: true,
          isChatModerator: false,
        },
      };

      await milestoneHandler(testData);

      expect(logger.debug).toHaveBeenCalledWith(
        'MemberMilestoneChatEvent processed from MilestoneMaster'
      );
    });

    it('should handle sponsorOnlyGiftPaidEvent', async () => {
      const handlers = createEventHandlers(logger);
      const sponsorGiftHandler = handlers.get(YouTubeMessageType.SponsorGift)!;

      const testData: YouTubeLiveChatMessage = {
        kind: 'youtube#liveChatMessage',
        etag: '"test-etag"',
        id: 'msg-5',
        snippet: {
          liveChatId: 'chat-1',
          authorChannelId: 'channel-1',
          publishedAt: '2024-01-01T00:00:00Z',
          hasDisplayContent: true,
          displayMessage: 'Sponsor gift!',
        } as any,
        authorDetails: {
          channelId: 'channel-1',
          channelUrl: 'https://youtube.com/channel-1',
          displayName: 'Gifter',
          profileImageUrl: 'https://example.com/avatar.jpg',
          isVerified: false,
          isChatOwner: false,
          isChatSponsor: true,
          isChatModerator: false,
        },
      };

      await sponsorGiftHandler(testData);

      expect(logger.debug).toHaveBeenCalledWith(
        'SponsorOnlyGiftPaidEvent processed from Gifter'
      );
    });

    it('should handle tombstone', async () => {
      const handlers = createEventHandlers(logger);
      const tombstoneHandler = handlers.get(YouTubeMessageType.Tombstone)!;

      const testData: YouTubeLiveChatMessage = {
        kind: 'youtube#liveChatMessage',
        etag: '"test-etag"',
        id: 'msg-6',
        snippet: {
          liveChatId: 'chat-1',
          authorChannelId: 'channel-1',
          publishedAt: '2024-01-01T00:00:00Z',
          hasDisplayContent: false,
          displayMessage: 'Message deleted',
        } as any,
        authorDetails: {} as any,
      };

      await tombstoneHandler(testData);

      expect(logger.debug).toHaveBeenCalledWith(
        'Tombstone message processed: msg-6'
      );
    });

    it('should handle invalid data gracefully', async () => {
      const handlers = createEventHandlers(logger);
      const textMessageHandler = handlers.get(YouTubeMessageType.TextMessage)!;

      const invalidData = { invalid: 'data' };

      await textMessageHandler(invalidData);

      expect(logger.debug).toHaveBeenCalledWith(
        'Invalid textMessageEvent data, missing required fields'
      );
    });

    it('should handle missing snippet in tombstone', async () => {
      const handlers = createEventHandlers(logger);
      const tombstoneHandler = handlers.get(YouTubeMessageType.Tombstone)!;

      const invalidData = { id: 'test-id', invalid: 'data' } as any;

      await tombstoneHandler(invalidData);

      expect(logger.debug).toHaveBeenCalledWith(
        'Invalid tombstone data, missing snippet'
      );
    });
  });
});
