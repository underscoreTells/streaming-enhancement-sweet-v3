import type { TwitchStream } from '../Stream';
import type { TwitchUser } from '../User';

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
      channelPoints: 0
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
