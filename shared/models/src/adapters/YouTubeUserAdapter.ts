import type { YouTubeUser } from '../User';
import type { UserAdapter } from './UserAdapter';
import type { FeatureData } from '../interface';

export class YouTubeUserAdapter implements UserAdapter {
  constructor(private readonly data: YouTubeUser) {}

  getPlatform(): 'youtube' {
    return 'youtube';
  }

  getId(): string {
    return this.data.channelId;
  }

  getUsername(): string {
    return this.data.customUrl || this.data.channelTitle;
  }

  getDisplayName(): string {
    return this.data.channelTitle;
  }

  getAvatar(): string | null {
    return this.data.thumbnailUrl;
  }

  getBio(): string | null {
    return this.data.description;
  }

  getCreatedAt(): Date | null {
    return this.data.createdAt;
  }

  hasFeature(feature: string): boolean {
    return feature === 'subscriberCount' || feature === 'videoCount' || feature === 'viewCount';
  }

  getFeature(feature: string): FeatureData | null {
    if (feature === 'subscriberCount') {
      return { total: this.data.subscriberCount };
    }
    if (feature === 'videoCount') {
      return { total: this.data.videoCount };
    }
    if (feature === 'viewCount') {
      return { total: this.data.viewCount };
    }
    return null;
  }

  toStorage(): object {
    return this.data;
  }
}
