import type { FeatureData } from '../interface';

export type EventType =
  | 'follow'
  | 'subscription'
  | 'resubscribe'
  | 'subscription_gift'
  | 'cheer'
  | 'tip'
  | 'raid'
  | 'point_redemption'
  | 'super_chat'
  | 'super_sticker'
  | 'membership';

export type EventData = object;

export interface EventAdapter {
  getPlatform(): 'twitch' | 'kick' | 'youtube';
  getId(): string;
  getType(): EventType;
  getTimestamp(): Date;
  getUserId(): string | null;
  getUsername(): string | null;
  getDisplayName(): string | null;
  getData(): EventData;
  toStorage(): object;
}
