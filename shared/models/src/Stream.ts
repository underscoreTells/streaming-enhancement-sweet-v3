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
  startTime: Date;
  endTime?: Date | null;
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
  startTime: Date;
  endTime?: Date | null;
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
  startTime: Date;
  endTime?: Date | null;
}

export type PlatformStream = TwitchStream | KickStream | YouTubeStream;

import type { StreamAdapter } from './adapters/StreamAdapter';
import type { Platform } from './Platform';

/**
 * @deprecated Use the Stream class from './stream' instead.
 * This interface is kept for backward compatibility.
 */
export interface StreamInterface {
  commonId: string;
  obsStartTime: Date;
  obsEndTime: Date | null;
  streams: Map<Platform, StreamAdapter>;
}
