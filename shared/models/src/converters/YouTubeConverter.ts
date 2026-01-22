import type { YouTubeStream } from '../Stream';
import type { YouTubeUser } from '../User';

interface YouTubeStreamApiResponse {
  kind: string;
  etag: string;
  items?: Array<{
    kind: string;
    etag: string;
    id: string;
    snippet: {
      publishedAt: string;
      channelId: string;
      title: string;
      description: string;
      thumbnails: {
        default?: {
          url: string;
          width: number;
          height: number;
        };
      };
      channelTitle: string;
      categoryId: string;
      liveBroadcastContent: string;
      tags?: string[];
    };
    status: {
      privacyStatus: string;
      publicStatsViewable: boolean;
    };
    statistics: {
      viewCount: string;
      likeCount: string;
    };
  }>;
}

interface YouTubeUserApiResponse {
  kind: string;
  etag: string;
  items?: Array<{
    kind: string;
    etag: string;
    id: string;
    snippet: {
      title: string;
      description: string;
      customUrl: string;
      publishedAt: string;
      thumbnails: {
        default?: {
          url: string;
        };
      };
    };
    statistics: {
      viewCount: string;
      subscriberCount: string;
      hiddenSubscriberCount: boolean;
      videoCount: string;
    };
  }>;
}

export class YouTubeConverter {
  static convertStream(data: unknown): YouTubeStream {
    const response = data as YouTubeStreamApiResponse;
    const stream = response?.items?.[0];

    if (!stream) {
      throw new Error('Invalid YouTube stream API response: missing items or empty array');
    }

    if (!stream.id) {
      throw new Error('Invalid YouTube stream API response: missing video id');
    }

    if (!stream.snippet?.channelTitle) {
      throw new Error('Invalid YouTube stream API response: missing channel title');
    }

    if (!stream.snippet?.title) {
      throw new Error('Invalid YouTube stream API response: missing title');
    }

    return {
      platform: 'youtube',
      videoId: stream.id,
      channelTitle: stream.snippet.channelTitle,
      title: stream.snippet.title,
      categoryId: stream.snippet.categoryId || '0',
      tags: stream.snippet.tags || [],
      privacyStatus: stream.status?.privacyStatus || 'public',
      thumbnailUrl: stream.snippet.thumbnails?.default?.url || null,
      subscriberCount: 0,
      superChatTotal: 0
    };
  }

  static convertUser(data: unknown): YouTubeUser {
    const response = data as YouTubeUserApiResponse;
    const user = response?.items?.[0];

    if (!user) {
      throw new Error('Invalid YouTube user API response: missing items or empty array');
    }

    if (!user.id) {
      throw new Error('Invalid YouTube user API response: missing channel id');
    }

    if (!user.snippet?.title) {
      throw new Error('Invalid YouTube user API response: missing channel title');
    }

    return {
      platform: 'youtube',
      channelId: user.id,
      channelTitle: user.snippet.title,
      customUrl: user.snippet.customUrl || null,
      thumbnailUrl: user.snippet.thumbnails?.default?.url || null,
      description: user.snippet.description || null,
      subscriberCount: this.parseNumber(user.statistics?.subscriberCount),
      videoCount: this.parseNumber(user.statistics?.videoCount),
      viewCount: this.parseNumber(user.statistics?.viewCount),
      createdAt: this.parseDate(user.snippet.publishedAt)
    };
  }

  private static parseDate(isoString: string | undefined | null): Date | null {
    if (!isoString) return null;
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return null;
      return date;
    } catch {
      return null;
    }
  }

  private static parseNumber(numberString: string | undefined | null): number {
    if (!numberString) return 0;
    const parsed = parseInt(numberString, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
}
