export enum KickEventType {
  // Channel Events
  FollowersUpdated = 'FollowersUpdated',
  StreamerIsLive = 'StreamerIsLive',
  StopStreamBroadcast = 'StopStreamBroadcast',
  ChannelSubscriptionEvent = 'ChannelSubscriptionEvent',
  LuckyUsersWhoGotGiftSubscriptionsEvent = 'LuckyUsersWhoGotGiftSubscriptionsEvent',
  GiftsLeaderboardUpdated = 'GiftsLeaderboardUpdated',
  ChatMoveToSupportedChannelEvent = 'ChatMoveToSupportedChannelEvent',

  // Chatroom Events
  ChatMessageEvent = 'ChatMessageEvent',
  StreamHostEvent = 'StreamHostEvent',
  UserBannedEvent = 'UserBannedEvent',
  MessageDeletedEvent = 'MessageDeletedEvent',
  PinnedMessageCreatedEvent = 'PinnedMessageCreatedEvent',
  UserUnbannedEvent = 'UserUnbannedEvent',
  GiftedSubscriptionsEvent = 'GiftedSubscriptionsEvent',
  PollUpdateEvent = 'PollUpdateEvent',
  SubscriptionEvent = 'SubscriptionEvent',
  ChatroomUpdatedEvent = 'ChatroomUpdatedEvent',
  ChatroomClearEvent = 'ChatroomClearEvent',
}

export type EventHandler = (data: unknown) => Promise<void> | void;
