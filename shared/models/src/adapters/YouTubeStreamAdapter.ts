import type { YouTubeStream } from '../Stream';
import type { CategoryCache } from '../cache/CategoryCache';
import type { StreamAdapter } from './StreamAdapter';
import type { FeatureData } from '../interface';

export class YouTubeStreamAdapter implements StreamAdapter {
  constructor(
    private readonly data: YouTubeStream,
    private readonly categoryCache?: CategoryCache
  ) {}

  getPlatform(): 'youtube' {
    return 'youtube';
  }

  getId(): string {
    return this.data.videoId;
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
    try {
      return await this.categoryCache.getCategory(this.data.categoryId, 'youtube');
    } catch {
      return 'No Category';
    }
  }

  getThumbnail(): string | null {
    return this.data.thumbnailUrl;
  }

  getTags(): string[] {
    return this.data.tags;
  }

  hasFeature(feature: string): boolean {
    return feature === 'subscriberCount' || feature === 'youtubeSuperChat';
  }

  getFeature(feature: string): FeatureData | null {
    if (feature === 'subscriberCount') {
      return { total: this.data.subscriberCount };
    }
    if (feature === 'youtubeSuperChat') {
      return { value: this.data.superChatTotal, currency: 'USD' };
    }
    return null;
  }

  toStorage(): object {
    return this.data;
  }
}
