export enum EventType {
  StreamOnline = 'channel.stream.online',
  StreamOffline = 'channel.stream.offline',
  ChannelUpdate = 'channel.update',
  ChatMessage = 'channel.chat.message',
  Subscribe = 'channel.subscribe',
  SubscriptionMessage = 'channel.subscription.message',
  SubscriptionGift = 'channel.subscription.gift',
  RewardRedemption = 'channel.channel_points_custom_reward_redemption.add',
  Follow = 'channel.follow',
}

export interface EventSubMessage {
  metadata: {
    message_id: string;
    message_type: 'session_welcome' | 'session_keepalive' | 'session_reconnect' | 'notification' | 'revocation';
    subscription_type?: string;
    subscription_version?: string;
  };
  payload: unknown;
}

export interface SessionWelcome {
  id: string;
  status: string;
  keepalive_timeout_seconds: number;
  reconnect_url?: string;
  connected_at: string;
}

export interface SessionReconnect {
  id: string;
  status: string;
  keepalive_timeout_seconds: number;
  reconnect_url: string;
  connected_at: string;
}

export interface SubscriptionData {
  id: string;
  status: string;
  type: string;
  version: string;
  condition: Record<string, string>;
  created_at: string;
  transport: {
    method: 'websocket';
    session_id: string;
  };
  cost: number;
}

export interface CreateSubscriptionRequest {
  type: string;
  version: string;
  condition: Record<string, string>;
  transport: {
    method: 'websocket';
    session_id: string;
  };
}