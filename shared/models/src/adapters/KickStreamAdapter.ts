import type { KickStream } from '../Stream';
import type { CategoryCache } from '../cache/CategoryCache';
import type { StreamAdapter } from './StreamAdapter';
import type { FeatureData } from '../interface';

export class KickStreamAdapter implements StreamAdapter {
  constructor(
    private readonly data: KickStream,
    private readonly categoryCache?: CategoryCache
  ) {}

  getPlatform(): 'kick' {
    return 'kick';
  }

  getId(): string {
    return this.data.kickId;
  }

  getTitle(): string {
    return this.data.title;
  }

  async getCategory(): Promise<string> {
    if (!this.data.categorySlug) {
      return 'No Category';
    }
    if (!this.categoryCache) {
      return this.data.categorySlug;
    }
    return await this.categoryCache.getCategory(this.data.categorySlug, 'kick');
  }

  getThumbnail(): string | null {
    return this.data.thumbnailUrl;
  }

  getTags(): string[] {
    return this.data.tags;
  }

  hasFeature(feature: string): boolean {
    return feature === 'kickTips';
  }

  getFeature(feature: string): FeatureData | null {
    if (feature === 'kickTips') {
      return { value: this.data.totalTipsUsd, currency: 'USD' };
    }
    return null;
  }

  toStorage(): object {
    return this.data;
  }
}
