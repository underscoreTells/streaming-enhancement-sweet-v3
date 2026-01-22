export interface TwitchUser {
  platform: 'twitch';
  twitchId: string;
  username: string;
  displayName: string;
  profileImageUrl: string | null;
  bio: string | null;
  createdAt: Date | null;
}

export interface KickUser {
  platform: 'kick';
  kickId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  isVerified: boolean;
  createdAt: Date | null;
}

export interface YouTubeUser {
  platform: 'youtube';
  channelId: string;
  channelTitle: string;
  customUrl: string | null;
  thumbnailUrl: string | null;
  description: string | null;
  subscriberCount: number | null;
  hiddenSubscriberCount: boolean;
  videoCount: number;
  viewCount: number;
  createdAt: Date | null;
}

export type PlatformUser = TwitchUser | KickUser | YouTubeUser;

import type { UserAdapter } from './adapters/UserAdapter';
import type { Platform } from './Platform';

export interface User {
  commonId: string;
  userId: string;
  username: string;
  platforms: Map<Platform, UserAdapter>;
}
