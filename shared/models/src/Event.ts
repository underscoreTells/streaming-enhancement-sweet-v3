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
  Cheer = 'channel.bits.use',
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
  data: KickEventData;
}

export enum KickEventType {
  Follow = 'followed',
  Subscribe = 'subscribed',
  SubscriptionGift = 'subscription_gift',
  Raid = 'raid',
  Tip = 'tip',
}

export type KickEventData = KickFollowEventData | KickSubscribeEventData | KickSubscriptionGiftEventData | KickRaidEventData | KickTipEventData;

export interface KickFollowEventData {
  followerId: string;
  followerUsername: string;
  followerDisplayName: string;
}

export interface KickSubscribeEventData {
  userId: string;
  username: string;
  displayName: string;
  months: number;
}

export interface KickSubscriptionGiftEventData {
  userId: string;
  username: string;
  displayName: string;
  total: number;
}

export interface KickRaidEventData {
  userId: string;
  username: string;
  displayName: string;
  viewers: number;
}

export interface KickTipEventData {
  userId: string;
  username: string;
  displayName: string;
  amount: number;
  currency: string;
  message: string | null;
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
  Membership = 'membershipGiftingEvent',
  NewMember = 'newSponsorEvent',
  MemberMilestone = 'memberMilestoneChatEvent',
}

export type PlatformEvent = TwitchEvent | KickEvent | YouTubeEvent;
