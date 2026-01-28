import { Logger } from 'winston';
import { YouTubeMessageType, EventHandler } from './types';
import { YouTubeChatMessageAdapter } from '@streaming-enhancement/shared-models';
import type { YouTubeLiveChatMessage } from '../rest/types';

export class YouTubeEventHandler {
  private handlers = new Map<YouTubeMessageType, EventHandler>();

  constructor(private logger: Logger) {}

  register(eventType: YouTubeMessageType, handler: EventHandler): void {
    this.handlers.set(eventType, handler);
    this.logger.debug(`Registered handler for event type: ${eventType}`);
  }

  unregister(eventType: YouTubeMessageType): void {
    this.handlers.delete(eventType);
    this.logger.debug(`Unregistered handler for event type: ${eventType}`);
  }

  async handle(eventType: YouTubeMessageType, data: unknown): Promise<void> {
    const handler = this.handlers.get(eventType);

    if (!handler) {
      this.logger.warn(`No handler registered for event type: ${eventType}`);
      return;
    }

    try {
      await handler(data);
    } catch (error) {
      this.logger.error(`Error handling event ${eventType}:`, error);
      throw error;
    }
  }
}

export function createEventHandlers(logger: Logger): Map<YouTubeMessageType, EventHandler> {
  const handlers = new Map<YouTubeMessageType, EventHandler>();

  handlers.set(YouTubeMessageType.TextMessage, async (data: unknown) => {
    const messageData = data as YouTubeLiveChatMessage;

    if (!messageData.snippet || !messageData.authorDetails) {
      logger.debug('Invalid textMessageEvent data, missing required fields');
      return;
    }

    const { snippet, authorDetails } = messageData;

    if (!snippet.textMessageDetails) {
      logger.debug('Invalid textMessageEvent, missing textMessageDetails');
      return;
    }

    const chatMessageAdapter = new YouTubeChatMessageAdapter({
      messageId: messageData.id,
      channelId: authorDetails.channelId,
      displayName: authorDetails.displayName,
      message: snippet.displayMessage,
      timestamp: new Date(snippet.publishedAt),
      liveChatId: snippet.liveChatId,
      badges: [
        authorDetails.isChatOwner ? { badgeId: 'owner' } : null,
        authorDetails.isChatModerator ? { badgeId: 'moderator' } : null,
        authorDetails.isChatSponsor ? { badgeId: 'member' } : null,
      ].filter(Boolean),
    });

    logger.debug(`TextMessageEvent processed from ${authorDetails.displayName}: ${snippet.displayMessage}`);
  });

  handlers.set(YouTubeMessageType.SuperChat, async (data: unknown) => {
    const messageData = data as YouTubeLiveChatMessage;

    if (!messageData.snippet || !messageData.authorDetails) {
      logger.debug('Invalid superChatEvent data, missing required fields');
      return;
    }

    const { snippet, authorDetails } = messageData;

    if (!snippet.superChatDetails) {
      logger.debug('Invalid superChatEvent, missing superChatDetails');
      return;
    }

    const { superChatDetails } = snippet;

    const chatMessageAdapter = new YouTubeChatMessageAdapter({
      messageId: messageData.id,
      channelId: authorDetails.channelId,
      displayName: authorDetails.displayName,
      message: superChatDetails.userComment || '',
      timestamp: new Date(snippet.publishedAt),
      liveChatId: snippet.liveChatId,
      badges: [
        { badgeId: 'supers' },
        authorDetails.isChatOwner ? { badgeId: 'owner' } : null,
        authorDetails.isChatModerator ? { badgeId: 'moderator' } : null,
        authorDetails.isChatSponsor ? { badgeId: 'member' } : null,
      ].filter(Boolean),
      superChatDetails: {
        tier: superChatDetails.tier,
        amountDisplayString: superChatDetails.amountDisplayString,
        currency: superChatDetails.currency,
        amountMicros: parseInt(superChatDetails.amountMicros, 10),
        userComment: superChatDetails.userComment,
      },
    });

    logger.debug(`SuperChatEvent processed from ${authorDetails.displayName}: ${superChatDetails.amountDisplayString}`);
  });

  handlers.set(YouTubeMessageType.SuperSticker, async (data: unknown) => {
    const messageData = data as YouTubeLiveChatMessage;

    if (!messageData.snippet || !messageData.authorDetails) {
      logger.debug('Invalid superStickerEvent data, missing required fields');
      return;
    }

    const { snippet, authorDetails } = messageData;

    if (!snippet.superStickerDetails) {
      logger.debug('Invalid superStickerEvent, missing superStickerDetails');
      return;
    }

    const { superStickerDetails } = snippet;

    const chatMessageAdapter = new YouTubeChatMessageAdapter({
      messageId: messageData.id,
      channelId: authorDetails.channelId,
      displayName: authorDetails.displayName,
      message: '',
      timestamp: new Date(snippet.publishedAt),
      liveChatId: snippet.liveChatId,
      badges: [
        { badgeId: 'supers' },
        authorDetails.isChatOwner ? { badgeId: 'owner' } : null,
        authorDetails.isChatModerator ? { badgeId: 'moderator' } : null,
        authorDetails.isChatSponsor ? { badgeId: 'member' } : null,
      ].filter(Boolean),
      superChatDetails: {
        tier: superStickerDetails.tier,
        amountDisplayString: superStickerDetails.amountDisplayString,
        currency: superStickerDetails.currency,
        amountMicros: parseInt(superStickerDetails.amountMicros, 10),
        isSuperSticker: true,
        stickerUrl: superStickerDetails.sticker.url,
        stickerName: superStickerDetails.sticker.displayName,
      },
    });

    logger.debug(`SuperStickerEvent processed from ${authorDetails.displayName}: ${superStickerDetails.sticker.displayName}`);
  });

  handlers.set(YouTubeMessageType.MemberMilestone, async (data: unknown) => {
    const messageData = data as YouTubeLiveChatMessage;

    if (!messageData.snippet || !messageData.authorDetails) {
      logger.debug('Invalid memberMilestoneChatEvent data, missing required fields');
      return;
    }

    const { snippet, authorDetails } = messageData;

    logger.debug(`MemberMilestoneChatEvent processed from ${authorDetails.displayName}`);
  });

  handlers.set(YouTubeMessageType.SponsorGift, async (data: unknown) => {
    const messageData = data as YouTubeLiveChatMessage;

    if (!messageData.snippet || !messageData.authorDetails) {
      logger.debug('Invalid sponsorOnlyGiftPaidEvent data, missing required fields');
      return;
    }

    const { snippet, authorDetails } = messageData;

    logger.debug(`SponsorOnlyGiftPaidEvent processed from ${authorDetails.displayName}`);
  });

  handlers.set(YouTubeMessageType.Tombstone, async (data: unknown) => {
    const messageData = data as YouTubeLiveChatMessage;

    if (!messageData.snippet) {
      logger.debug('Invalid tombstone data, missing snippet');
      return;
    }

    logger.debug(`Tombstone message processed: ${messageData.id}`);
  });

  return handlers;
}
