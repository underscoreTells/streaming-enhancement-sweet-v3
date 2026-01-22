import type { KickStream } from '../Stream';
import type { KickUser } from '../User';

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

    if (!stream.username && !(data as any).user?.username) {
      throw new Error('Invalid Kick stream API response: missing username');
    }

    if (!stream.title) {
      throw new Error('Invalid Kick stream API response: missing title');
    }

    const username = stream.username || (data as any).user.username;

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
