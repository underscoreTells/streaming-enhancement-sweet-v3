import { Logger } from 'winston';
import { KickEventType, EventHandler } from './types';
import {
  KickStreamAdapter,
  KickUserAdapter,
  KickChatMessageAdapter,
  KickEventAdapter,
} from '@streaming-enhancement/shared-models';

export class KickEventHandler {
  private handlers = new Map<KickEventType, EventHandler>();

  constructor(private logger: Logger) {}

  register(eventType: KickEventType, handler: EventHandler): void {
    this.handlers.set(eventType, handler);
    this.logger.debug(`Registered handler for event type: ${eventType}`);
  }

  unregister(eventType: KickEventType): void {
    this.handlers.delete(eventType);
    this.logger.debug(`Unregistered handler for event type: ${eventType}`);
  }

  async handle(eventType: KickEventType, data: unknown): Promise<void> {
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

export function createEventHandlers(logger: Logger): Map<KickEventType, EventHandler> {
  const handlers = new Map<KickEventType, EventHandler>();

  handlers.set(KickEventType.ChatMessageEvent, async (data: unknown) => {
    const chatData = data as any;
    
    if (!chatData.sender || !chatData.content) {
      logger.debug('Invalid chat message data, missing required fields');
      return;
    }

    const chatMessageAdapter = new KickChatMessageAdapter({
      id: chatData.id || '',
      senderId: String(chatData.sender?.id || ''),
      senderUsername: chatData.sender?.username || '',
      senderDisplayName: chatData.sender?.displayname || null,
      senderColor: chatData.sender?.identity?.color || null,
      senderBadges: chatData.sender?.identity?.badges || [],
      senderIsModerator: chatData.sender?.is_mod || false,
      senderIsBroadcaster: chatData.sender?.is_broadcaster || false,
      senderIsSubscriber: chatData.sender?.identity?.subscribed || false,
      message: chatData.content,
      timestamp: chatData.created_at || '',
      emotes: chatData.emotes || [],
      chatroomId: String(chatData.chatroom_id || ''),
    });

    logger.debug('ChatMessageEvent processed');
  });

  handlers.set(KickEventType.FollowersUpdated, async (data: unknown) => {
    const eventData = data as any;

    if (!eventData.channel_id) {
      logger.debug('Invalid FollowersUpdated data, missing channel_id');
      return;
    }

    const userAdapter = new KickUserAdapter({
      id: String(eventData.user_id || eventData.followerId || ''),
      username: eventData.username || eventData.followerUsername || '',
      displayName: eventData.display_name || eventData.followerDisplayName || '',
    });

    const eventAdapter = new KickEventAdapter({
      id: `follow_${eventData.channel_id}_${Date.now()}`,
      type: 'follow',
      timestamp: new Date(eventData.created_at || Date.now()).toISOString(),
      userId: userAdapter.getId(),
      username: userAdapter.getUsername(),
      platform: 'kick',
    });

    logger.debug('FollowersUpdated processed (follow event)');
  });

  handlers.set(KickEventType.StreamerIsLive, async (data: unknown) => {
    const eventData = data as any;

    if (!eventData.livestream?.id) {
      logger.debug('Invalid StreamerIsLive data, missing livestream');
      return;
    }

    const streamAdapter = new KickStreamAdapter({
      id: String(eventData.livestream.id),
      channelId: String(eventData.livestream.channel_id || eventData.channel_id || ''),
      title: eventData.livestream.session_title || '',
      categoryName: eventData.livestream.category_name || '',
      thumbnailUrl: eventData.livestream.thumbnail || '',
      viewerCount: eventData.livestream.viewer_count || 0,
      isLive: true,
      startedAt: eventData.livestream.created_at || '',
    });

    logger.debug('StreamerIsLive processed (stream online)');
  });

  handlers.set(KickEventType.StopStreamBroadcast, async (data: unknown) => {
    const eventData = data as any;

    if (!eventData.livestream?.id) {
      logger.debug('Invalid StopStreamBroadcast data, missing livestream');
      return;
    }

    const streamAdapter = new KickStreamAdapter({
      id: String(eventData.livestream.id),
      channelId: String(eventData.livestream.id),
      title: '',
      categoryName: '',
      thumbnailUrl: '',
      viewerCount: 0,
      isLive: false,
      startedAt: '',
    });

    logger.debug('StopStreamBroadcast processed (stream offline)');
  });

  handlers.set(KickEventType.ChannelSubscriptionEvent, async (data: unknown) => {
    const eventData = data as any;

    if (!eventData.username || !eventData.channel_id) {
      logger.debug('Invalid ChannelSubscriptionEvent data');
      return;
    }

    const userAdapter = new KickUserAdapter({
      id: String(eventData.user_id || ''),
      username: eventData.username,
      displayName: eventData.display_name || eventData.username,
    });

    const eventAdapter = new KickEventAdapter({
      id: `subscribe_${eventData.channel_id}_${Date.now()}`,
      type: 'subscribe',
      timestamp: new Date().toISOString(),
      userId: userAdapter.getId(),
      username: userAdapter.getUsername(),
      platform: 'kick',
    });

    logger.debug('ChannelSubscriptionEvent processed');
  });

  handlers.set(KickEventType.LuckyUsersWhoGotGiftSubscriptionsEvent, async (data: unknown) => {
    const eventData = data as any;

    const usernames = eventData.usernames || [];
    const gifterUsername = eventData.gifter_username || '';

    usernames.forEach((username: string, index: number) => {
      const userAdapter = new KickUserAdapter({
        id: `${username}_${index}`,
        username,
        displayName: username,
      });

      const eventAdapter = new KickEventAdapter({
        id: `sub_gift_${username}_${Date.now()}_${index}`,
        type: 'subscription_gift',
        timestamp: new Date(eventData.created_at || Date.now()).toISOString(),
        userId: userAdapter.getId(),
        username: userAdapter.getUsername(),
        platform: 'kick',
        gifterUsername,
      });

      logger.debug(`LuckyUsersWhoGotGiftSubscriptionsEvent processed for ${username}`);
    });
  });

  handlers.set(KickEventType.UserBannedEvent, async (data: unknown) => {
    const eventData = data as any;

    if (!eventData.user?.username) {
      logger.debug('Invalid UserBannedEvent data');
      return;
    }

    const userAdapter = new KickUserAdapter({
      id: String(eventData.user.id || ''),
      username: eventData.user.username,
      displayName: eventData.user.username,
    });

    const eventAdapter = new KickEventAdapter({
      id: `ban_${eventData.user.id}_${Date.now()}`,
      type: 'ban',
      timestamp: new Date().toISOString(),
      userId: userAdapter.getId(),
      username: userAdapter.getUsername(),
      platform: 'kick',
      moderatorUsername: eventData.banned_by?.username || '',
      durationMs: eventData.expires_at ? new Date(eventData.expires_at).getTime() - Date.now() : null,
      reason: eventData.metadata?.reason || '',
    });

    logger.debug('UserBannedEvent processed');
  });

  handlers.set(KickEventType.GiftedSubscriptionsEvent, async (data: unknown) => {
    const eventData = data as any;

    const giftedUsernames = eventData.gifted_usernames || [];
    const gifterUsername = eventData.gifter_username || '';

    giftedUsernames.forEach((username: string, index: number) => {
      const userAdapter = new KickUserAdapter({
        id: `${username}_${index}`,
        username,
        displayName: username,
      });

      const eventAdapter = new KickEventAdapter({
        id: `sub_gift_${username}_${Date.now()}_${index}`,
        type: 'subscription_gift',
        timestamp: new Date().toISOString(),
        userId: userAdapter.getId(),
        username: userAdapter.getUsername(),
        platform: 'kick',
        gifterUsername,
      });

      logger.debug(`GiftedSubscriptionsEvent processed for ${username}`);
    });
  });

  handlers.set(KickEventType.SubscriptionEvent, async (data: unknown) => {
    const eventData = data as any;

    if (!eventData.username) {
      logger.debug('Invalid SubscriptionEvent data');
      return;
    }

    const userAdapter = new KickUserAdapter({
      id: String(eventData.user_id || ''),
      username: eventData.username,
      displayName: eventData.display_name || eventData.username,
    });

    const eventAdapter = new KickEventAdapter({
      id: `subscribe_${eventData.chatroom_id}_${Date.now()}`,
      type: 'subscribe',
      timestamp: new Date().toISOString(),
      userId: userAdapter.getId(),
      username: userAdapter.getUsername(),
      platform: 'kick',
      cumulativeMonths: eventData.months || 1,
    });

    logger.debug('SubscriptionEvent processed');
  });

  return handlers;
}
