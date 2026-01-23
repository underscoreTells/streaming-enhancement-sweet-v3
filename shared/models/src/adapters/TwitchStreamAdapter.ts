import type { TwitchStream } from '../Stream';
import type { CategoryCache } from '../cache/CategoryCache';
import type { StreamAdapter } from './StreamAdapter';
import type { FeatureData } from '../interface';

export class TwitchStreamAdapter implements StreamAdapter {
  constructor(
    private readonly data: TwitchStream,
    private readonly categoryCache?: CategoryCache
  ) {}

  getPlatform(): 'twitch' {
    return 'twitch';
  }

  getId(): string {
    return this.data.twitchId;
  }

  getTitle(): string {
    return this.data.title;
  }

  async getCategory(): Promise<string> {
    if (!this.data.categoryId) {
      return 'No Category';
    }
    if (!this.categoryCache) {
      return this.data.categoryId;
    }
    return await this.categoryCache.getCategory(this.data.categoryId, 'twitch');
  }

  getThumbnail(): string | null {
    return this.data.thumbnailUrl;
  }

  getTags(): string[] {
    return this.data.tags;
  }

  hasFeature(feature: string): boolean {
    return feature === 'twitchChannelPoints';
  }

  getFeature(feature: string): FeatureData | null {
    if (feature === 'twitchChannelPoints') {
      return { current: this.data.channelPoints };
    }
    return null;
  }

  toStorage(): object {
    return this.data;
  }
}
