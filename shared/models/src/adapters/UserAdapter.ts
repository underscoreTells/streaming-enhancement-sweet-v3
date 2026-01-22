import type { FeatureData } from '../interface';

export interface UserAdapter {
  getPlatform(): 'twitch' | 'kick' | 'youtube';
  getId(): string;
  getUsername(): string;
  getDisplayName(): string;
  getAvatar(): string | null;
  getBio(): string | null;
  getCreatedAt(): Date | null;
  hasFeature(feature: string): boolean;
  getFeature(feature: 'isVerified' | 'subscriberCount' | 'videoCount' | 'viewCount' | string): FeatureData | null;
  toStorage(): object;
}
