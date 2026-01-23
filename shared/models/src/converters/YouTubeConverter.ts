import type { YouTubeStream } from '../Stream';
import type { YouTubeUser } from '../User';
import type { YouTubeChatMessage } from '../ChatMessage';
import type { YouTubeEvent } from '../Event';
import { YouTubeEventType } from '../Event';

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
      superChatTotal: 0,
      startTime: this.parseDate(stream.snippet.publishedAt) || new Date(),
      endTime: null
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

  static convertChatMessage(data: unknown): YouTubeChatMessage {
    const msg = data as any;

    if (!msg) {
      throw new Error('Invalid YouTube chat message: empty data');
    }

    const snippet = msg.snippet || {};
    const authorDetails = msg.authorDetails || {};

    return {
      platform: 'youtube',
      messageId: msg.id || '',
      channelId: authorDetails.channelId || '',
      displayName: authorDetails.displayName || '',
      profileImageUrl: authorDetails.profileImageUrl || null,
      message: snippet.textMessageDetails?.message || snippet.displayMessage || '',
      timestamp: this.parseDate(snippet.publishedAt) || new Date(),
      liveChatId: snippet.liveChatId || '',
      badges: authorDetails.badges || [],
      superChatDetails: snippet.superChatDetails ? {
        amountDisplayString: snippet.superChatDetails.amountDisplayString || '',
        amountMicros: snippet.superChatDetails.amountMicros || 0,
        currency: snippet.superChatDetails.currency || '',
        userComment: snippet.superChatDetails.userComment || '',
        tier: snippet.superChatDetails.tier || 0
      } : undefined
    };
  }

  static convertEvent(data: unknown): YouTubeEvent {
    const event = data as any;

    if (!event) {
      throw new Error('Invalid YouTube event: empty data');
    }

    let eventType: YouTubeEventType;
    switch (event.kind) {
      case 'youtube#superChatEvent':
        eventType = YouTubeEventType.SuperChat;
        break;
      case 'youtube#superStickerEvent':
        eventType = YouTubeEventType.SuperSticker;
        break;
      case 'youtube#membershipGiftingEvent':
        eventType = YouTubeEventType.Membership;
        break;
      case 'youtube#newSponsorEvent':
        eventType = YouTubeEventType.NewMember;
        break;
      case 'youtube#memberMilestoneChatEvent':
        eventType = YouTubeEventType.MemberMilestone;
        break;
      default:
        eventType = YouTubeEventType.Membership;
    }

    const snippet = event.snippet || {};

    return {
      platform: 'youtube',
      eventId: event.id || '',
      type: eventType,
      timestamp: this.parseDate(snippet.publishedAt || event.timestamp) || new Date(),
      channelId: snippet.channelId || '',
      channelTitle: snippet.channelTitle || '',
      data: event.snippet || event
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
