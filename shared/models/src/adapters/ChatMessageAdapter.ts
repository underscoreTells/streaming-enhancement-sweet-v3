import type { FeatureData } from '../interface';

export interface Badge {
  id: string;
  name: string;
  url: string | null;
  type: BadgeType;
  version?: string;
}

export enum BadgeType {
  Global = 'global',
  Channel = 'channel',
  Subscription = 'subscription',
  Moderator = 'moderator',
  VIP = 'vip',
  Owner = 'owner',
  Bits = 'bits',
  Other = 'other',
}

export interface Emote {
  id: string;
  name: string;
  url: string | null;
  positions: [number, number][];
  type?: EmoteType;
}

export enum EmoteType {
  Twitch = 'twitch',
  Kick = 'kick',
  YouTube = 'youtube',
  BTTV = 'bttv',
  FFZ = 'ffz',
  SevenTV = '7tv',
  Custom = 'custom',
}

export interface ReplyParent {
  messageId: string;
  userId: string;
  username: string;
  text: string;
}

export interface SuperChatDetails {
  amountDisplayString: string;
  amountMicros: number;
  currency: string;
  userComment: string;
  tier: number;
}

export interface ChatMessageAdapter {
  getPlatform(): 'twitch' | 'kick' | 'youtube';
  getId(): string;
  getUserId(): string;
  getUsername(): string;
  getDisplayName(): string;
  getColor(): string | null;
  getMessage(): string;
  getTimestamp(): Date;
  getRoomId(): string;
  getBadges(): Badge[];
  getEmotes(): Emote[];
  hasReplyParent(): boolean;
  getFeature(feature: 'bits' | 'superChat' | 'tip' | string): FeatureData | null;
  toStorage(): object;
}
