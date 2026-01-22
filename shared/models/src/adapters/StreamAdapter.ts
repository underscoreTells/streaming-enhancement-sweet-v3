import type { CategoryCache } from '../cache/CategoryCache';
import type { FeatureData } from '../interface';

export interface StreamAdapter {
  getPlatform(): 'twitch' | 'kick' | 'youtube';
  getId(): string;
  getTitle(): string;
  getCategory(): Promise<string>;
  getThumbnail(): string | null;
  getTags(): string[];
  hasFeature(feature: string): boolean;
  getFeature(feature: 'twitchChannelPoints' | 'kickTips' | 'youtubeSuperChat' | 'subscriberCount' | string): FeatureData | null;
  toStorage(): object;
}
