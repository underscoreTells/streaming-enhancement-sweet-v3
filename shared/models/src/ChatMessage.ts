export interface TwitchChatMessage {
  platform: 'twitch';
  messageId: string;
  userId: string;
  username: string;
  displayName: string | null;
  color: string | null;
  message: string;
  timestamp: Date;
  roomId: string;
  badges: any[];
  emotes: any[];
  bits?: number;
  replyParent?: {
    messageId: string;
    userId: string;
    username: string;
    text: string;
  };
}

export interface KickChatMessage {
  platform: 'kick';
  messageId: string;
  userId: string;
  username: string;
  displayName: string | null;
  color: string | null;
  message: string;
  timestamp: Date;
  roomId: string;
  badges: any[];
  emotes: any[];
}

export interface YouTubeChatMessage {
  platform: 'youtube';
  messageId: string;
  channelId: string;
  displayName: string;
  profileImageUrl: string | null;
  message: string;
  timestamp: Date;
  liveChatId: string;
  badges: any[];
  superChatDetails?: {
    amountDisplayString: string;
    amountMicros: number;
    currency: string;
    userComment: string;
    tier: number;
  };
}

export type PlatformChatMessage = TwitchChatMessage | KickChatMessage | YouTubeChatMessage;
