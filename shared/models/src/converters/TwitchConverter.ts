import type { TwitchStream } from '../Stream';
import type { TwitchUser } from '../User';
import type { TwitchChatMessage } from '../ChatMessage';
import type { TwitchEvent } from '../Event';
import { TwitchEventType } from '../Event';

interface TwitchStreamApiResponse {
  data?: Array<{
    id: string;
    user_login: string;
    title: string;
    game_id: string;
    tags?: string[];
    is_mature?: boolean;
    language: string;
    thumbnail_url?: string;
    started_at?: string;
  }>;
}

interface TwitchUserApiResponse {
  data?: Array<{
    id: string;
    login: string;
    display_name: string;
    profile_image_url?: string;
    description: string;
    created_at: string;
  }>;
}

export class TwitchConverter {
  static convertStream(data: unknown): TwitchStream {
    const stream = (data as TwitchStreamApiResponse)?.data?.[0];

    if (!stream) {
      throw new Error('Invalid Twitch stream API response: missing data field');
    }

    if (!stream.id) {
      throw new Error('Invalid Twitch stream API response: missing stream id');
    }

    if (!stream.user_login) {
      throw new Error('Invalid Twitch stream API response: missing user_login');
    }

    if (!stream.title) {
      throw new Error('Invalid Twitch stream API response: missing title');
    }

    if (!stream.language) {
      throw new Error('Invalid Twitch stream API response: missing language');
    }

    return {
      platform: 'twitch',
      twitchId: stream.id,
      username: stream.user_login,
      title: stream.title,
      categoryId: stream.game_id || '',
      tags: stream.tags || [],
      isMature: stream.is_mature ?? false,
      language: stream.language,
      thumbnailUrl: stream.thumbnail_url || null,
      channelPoints: 0,
      startTime: this.parseDate(stream.started_at) || new Date(),
      endTime: null
    };
  }

  static convertUser(data: unknown): TwitchUser {
    const user = (data as TwitchUserApiResponse)?.data?.[0];

    if (!user) {
      throw new Error('Invalid Twitch user API response: missing data field');
    }

    if (!user.id) {
      throw new Error('Invalid Twitch user API response: missing user id');
    }

    if (!user.login) {
      throw new Error('Invalid Twitch user API response: missing login');
    }

    if (!user.display_name) {
      throw new Error('Invalid Twitch user API response: missing display_name');
    }

    return {
      platform: 'twitch',
      twitchId: user.id,
      username: user.login,
      displayName: user.display_name,
      profileImageUrl: user.profile_image_url || null,
      bio: user.description || null,
      createdAt: this.parseDate(user.created_at)
    };
  }

  static convertChatMessage(data: unknown): TwitchChatMessage {
    const msg = data as any;

    if (!msg) {
      throw new Error('Invalid Twitch chat message: empty data');
    }

    if (!msg.id) {
      throw new Error('Invalid Twitch chat message: missing message id');
    }

    if (!msg.user_id) {
      throw new Error('Invalid Twitch chat message: missing user id');
    }

    return {
      platform: 'twitch',
      messageId: msg.id,
      userId: msg.user_id,
      username: msg.login || msg.username || '',
      displayName: msg.display_name || null,
      color: msg.color || null,
      message: msg.message || '',
      timestamp: this.parseDate(msg.timestamp) || new Date(),
      roomId: msg.room_id || msg.channel_id || '',
      badges: msg.badges || [],
      emotes: msg.emotes || [],
      bits: msg.bits,
      replyParent: msg.reply_parent
    };
  }

  static convertEvent(data: unknown): TwitchEvent {
    const event = data as any;

    if (!event) {
      throw new Error('Invalid Twitch event: empty data');
    }

    let eventType: TwitchEventType;
    switch (event.subscription?.type || event.type) {
      case 'channel.follow':
        eventType = TwitchEventType.Follow;
        break;
      case 'channel.subscribe':
        eventType = TwitchEventType.Subscribe;
        break;
      case 'channel.subscription.message':
        eventType = TwitchEventType.Resubscribe;
        break;
      case 'channel.subscription.gift':
        eventType = TwitchEventType.SubscriptionGift;
        break;
      case 'channel.bits.use':
        eventType = TwitchEventType.Cheer;
        break;
      case 'channel.raid':
        eventType = TwitchEventType.Raid;
        break;
      case 'channel.channel_points_custom_reward_redemption.add':
        eventType = TwitchEventType.PointRedemption;
        break;
      default:
        eventType = TwitchEventType.PointRedemption;
    }

    return {
      platform: 'twitch',
      eventId: event.id || event.event?.id || '',
      type: eventType,
      timestamp: this.parseDate(event.timestamp || event.event?.timestamp) || new Date(),
      userId: event.user_id || event.data?.user_id || event.event?.user_id || '',
      username: event.user_name || event.data?.user_name || '',
      displayName: event.user_display_name || event.data?.user_login || '',
      channelId: event.broadcaster_user_id || event.event?.broadcaster_user_id || '',
      data: event.event || event.data || {}
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
