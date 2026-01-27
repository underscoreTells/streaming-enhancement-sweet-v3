export type PusherEventType = 
  | 'ChatMessageEvent'
  | 'FollowersUpdated'
  | 'StreamerIsLive'
  | 'ChannelSubscriptionEvent'
  | 'LuckyUsersWhoGotGiftSubscriptionsEvent'
  | 'StopStreamBroadcast'
  | 'UserBannedEvent'
  | 'GiftedSubscriptionsEvent'
  | 'SubscriptionEvent'
  | 'StreamHostEvent'
  | 'MessageDeletedEvent'
  | 'PinnedMessageCreatedEvent'
  | 'UserUnbannedEvent'
  | 'PollUpdateEvent'
  | 'ChatroomUpdatedEvent'
  | 'ChatroomClearEvent'
  | 'GiftsLeaderboardUpdated'
  | 'ChatMoveToSupportedChannelEvent';

export interface PusherMessage {
  event: string;
  data: unknown;
  channel?: string;
}

export interface PusherSubscribeMessage {
  event: 'pusher:subscribe';
  data: {
    channel: string;
    auth?: string;
  };
}

export interface PusherConnectedMessage {
  event: 'pusher:connection_established';
  data: {
    socket_id: string;
    activity_timeout: number;
  };
}

export interface PusherErrorMessage {
  event: 'pusher:error';
  data: {
    code: number;
    message: string;
  };
}

export interface PusherSubscribedMessage {
  event: 'pusher_internal:subscription_succeeded';
  data: unknown;
}

export interface ChatMessageEventData {
  id: string;
  chatroom_id: number;
  content: string;
  type: string;
  created_at: string;
  sender: {
    id: number;
    username: string;
    slug: string;
    identity: {
      color: string;
      badges: Array<{
        type: string;
        text: string;
        count?: number;
      }>;
    };
  };
}

export interface FollowersUpdatedEventData {
  followersCount: string | number;
  channel_id: number;
  username: string;
  created_at: number;
  followed: boolean;
}

export interface StreamerIsLiveEventData {
  livestream: {
    id: number;
    channel_id: number;
    session_title: string;
    source: unknown;
    created_at: string;
  };
}

export interface UserBannedEventData {
  id: string;
  user: {
    id: number;
    username: string;
    slug: string;
  };
  banned_by: {
    id: number;
    username: string;
    slug: string;
  };
  expires_at?: string;
}

export type Region = 'us2' | 'eu1' | 'as1' | 'us1';
