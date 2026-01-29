export type EventHandler = (data: unknown) => Promise<void> | void;

export enum YouTubeMessageType {
  TextMessage = 'textMessageEvent',
  SuperChat = 'superChatEvent',
  SuperSticker = 'superStickerEvent',
  MemberMilestone = 'memberMilestoneChatEvent',
  SponsorGift = 'sponsorOnlyGiftPaidEvent',
  Tombstone = 'tombstone',
}
