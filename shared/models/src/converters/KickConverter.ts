import type { KickStream } from '../Stream';
import type { KickUser } from '../User';
import type { KickChatMessage } from '../ChatMessage';
import type { KickEvent } from '../Event';
import { KickEventType } from '../Event';

interface KickStreamApiResponse {
  id: string;
  channel_id: string;
  category_id: string;
  category_name: string;
  title: string;
  thumbnail: string;
  is_live: boolean;
  viewer_count: number;
  created_at: string;
  language: string;
  tags: string[];
  username?: string;
  user?: {
    username: string;
  };
}

interface KickUserApiResponse {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  banner_url: string;
  followers_count: number;
  following_count: number;
  subscriber_count: number;
  is_verified: boolean;
  is_banned: boolean;
  created_at: string;
}

export class KickConverter {
  static convertStream(data: unknown): KickStream {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid Kick stream API response: not an object');
    }
    const stream = data as KickStreamApiResponse;

    if (!stream.id) {
      throw new Error('Invalid Kick stream API response: missing stream id');
    }

    if (!stream.title) {
      throw new Error('Invalid Kick stream API response: missing title');
    }

    const username = stream.username || (data as any).user?.username;

    return {
      platform: 'kick',
      kickId: stream.id,
      username: username,
      title: stream.title,
      categorySlug: stream.category_id || '',
      tags: stream.tags || [],
      language: stream.language || 'en',
      thumbnailUrl: stream.thumbnail || null,
      totalTipsUsd: 0
    };
  }

  static convertUser(data: unknown): KickUser {
    const user = data as KickUserApiResponse;

    if (!user) {
      throw new Error('Invalid Kick user API response: empty response');
    }

    if (!user.id) {
      throw new Error('Invalid Kick user API response: missing user id');
    }

    if (!user.username) {
      throw new Error('Invalid Kick user API response: missing username');
    }

    return {
      platform: 'kick',
      kickId: user.id,
      username: user.username,
      displayName: user.display_name || null,
      avatarUrl: user.avatar_url || null,
      bio: user.bio || null,
      isVerified: user.is_verified ?? false,
      createdAt: this.parseDate(user.created_at)
    };
  }

  static convertChatMessage(data: unknown): KickChatMessage {
    const msg = data as any;

    if (!msg) {
      throw new Error('Invalid Kick chat message: empty data');
    }

    if (!msg.id && !msg.chat_id) {
      throw new Error('Invalid Kick chat message: missing message id');
    }

    return {
      platform: 'kick',
      messageId: msg.id || msg.chat_id || '',
      userId: msg.user_id || msg.sender?.id || '',
      username: msg.username || msg.sender?.username || '',
      displayName: msg.display_name || msg.sender?.display_name || null,
      color: msg.color || null,
      message: msg.content || '',
      timestamp: this.parseDate(msg.created_at || msg.timestamp) || new Date(),
      roomId: msg.room_id || msg.channel_id || '',
      badges: msg.badges || msg.sender?.badges || [],
      emotes: msg.emotes || []
    };
  }

  static convertEvent(data: unknown): KickEvent {
    const event = data as any;

    if (!event) {
      throw new Error('Invalid Kick event: empty data');
    }

    let eventType: KickEventType;
    switch (event.type || event.event_type) {
      case 'followed':
        eventType = KickEventType.Follow;
        break;
      case 'subscribed':
        eventType = KickEventType.Subscribe;
        break;
      case 'subscription_gift':
        eventType = KickEventType.SubscriptionGift;
        break;
      case 'raid':
        eventType = KickEventType.Raid;
        break;
      case 'tip':
        eventType = KickEventType.Tip;
        break;
      default:
        eventType = KickEventType.Follow;
    }

    return {
      platform: 'kick',
      eventId: event.id || '',
      type: eventType,
      timestamp: this.parseDate(event.timestamp || event.created_at) || new Date(),
      userId: event.user_id || '',
      username: event.username || '',
      displayName: event.display_name || null,
      channelId: event.channel_id || '',
      data: event.data || event
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
}
