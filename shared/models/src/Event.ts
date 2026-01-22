export interface TwitchEvent {
  platform: 'twitch';
  eventId: string;
  type: TwitchEventType;
  timestamp: Date;
  userId: string;
  username: string;
  displayName: string | null;
  channelId: string;
  data: any;
}

export enum TwitchEventType {
  Follow = 'channel.follow',
  Subscribe = 'channel.subscribe',
  Resubscribe = 'channel.subscription.message',
  SubscriptionGift = 'channel.subscription.gift',
  Cheer = 'channel.cheer',
  Raid = 'channel.raid',
  PointRedemption = 'channel.channel_points_custom_reward_redemption.add',
}

export interface KickEvent {
  platform: 'kick';
  eventId: string;
  type: KickEventType;
  timestamp: Date;
  userId: string;
  username: string;
  displayName: string | null;
  channelId: string;
  data: any;
}

export enum KickEventType {
  Follow = 'followed',
  Subscribe = 'subscribed',
  SubscriptionGift = 'subscription_gift',
  Raid = 'raid',
  Tip = 'tip',
}

export interface YouTubeEvent {
  platform: 'youtube';
  eventId: string;
  type: YouTubeEventType;
  timestamp: Date;
  channelId: string;
  channelTitle: string;
  data: any;
}

export enum YouTubeEventType {
  SuperChat = 'superChatEvent',
  SuperSticker = 'superStickerEvent',
  Membership = 'membershipGifting',
}

export type PlatformEvent = TwitchEvent | KickEvent | YouTubeEvent;
