export interface TwitchStream {
  platform: 'twitch';
  twitchId: string;
  username: string;
  title: string;
  categoryId: string;
  tags: string[];
  isMature: boolean;
  language: string;
  thumbnailUrl: string | null;
  channelPoints: number;
}

export interface KickStream {
  platform: 'kick';
  kickId: string;
  username: string;
  title: string;
  categorySlug: string;
  tags: string[];
  language: string;
  thumbnailUrl: string | null;
  totalTipsUsd: number;
}

export interface YouTubeStream {
  platform: 'youtube';
  videoId: string;
  channelTitle: string;
  title: string;
  categoryId: string;
  tags: string[];
  privacyStatus: string;
  thumbnailUrl: string | null;
  subscriberCount: number;
  superChatTotal: number;
}

export type PlatformStream = TwitchStream | KickStream | YouTubeStream;

import type { StreamAdapter } from './adapters/StreamAdapter';

export interface Stream {
  commonId: string;
  obsStartTime: Date;
  obsEndTime: Date | null;
  streams: Map<string, StreamAdapter>;
}
