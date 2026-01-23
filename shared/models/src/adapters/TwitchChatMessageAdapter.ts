import type { TwitchChatMessage } from '../ChatMessage';
import type { ChatMessageAdapter, Badge, Emote } from './ChatMessageAdapter';
import { BadgeType, EmoteType } from './ChatMessageAdapter';

export class TwitchChatMessageAdapter implements ChatMessageAdapter {
  constructor(private readonly data: TwitchChatMessage) {}

  getPlatform(): 'twitch' {
    return 'twitch';
  }

  getId(): string {
    return this.data.messageId;
  }

  getUserId(): string {
    return this.data.userId;
  }

  getUsername(): string {
    return this.data.username;
  }

  getDisplayName(): string {
    return this.data.displayName || this.data.username;
  }

  getColor(): string | null {
    return this.data.color;
  }

  getMessage(): string {
    return this.data.message;
  }

  getTimestamp(): Date {
    return this.data.timestamp;
  }

  getRoomId(): string {
    return this.data.roomId;
  }

  getBadges(): Badge[] {
    return this.data.badges.map(badge => {
      const badgeMap: Record<string, { type: BadgeType; name: string }> = {
        'broadcaster': { type: BadgeType.Owner, name: 'Broadcaster' },
        'moderator': { type: BadgeType.Moderator, name: 'Moderator' },
        'vip': { type: BadgeType.VIP, name: 'VIP' },
        'subscriber': { type: BadgeType.Subscription, name: 'Subscriber' },
        'turbo': { type: BadgeType.Global, name: 'Turbo' },
        'bits': { type: BadgeType.Bits, name: 'Bits' },
        'premium': { type: BadgeType.Global, name: 'Premium' },
      };

      const key = (badge as any)._id || '';
      const config = badgeMap[key] || { type: BadgeType.Other, name: key };

      return {
        id: config.name,
        name: config.name,
        url: null,
        type: config.type,
        version: (badge as any)._version
      };
    });
  }

  getEmotes(): Emote[] {
    return this.data.emotes.map(emote => {
      return {
        id: (emote as any)._id || '',
        name: (emote as any)._name || '',
        url: null,
        positions: (emote as any).positions || [],
        type: EmoteType.Twitch
      };
    });
  }

  hasReplyParent(): boolean {
    return !!this.data.replyParent;
  }

  getFeature(feature: string): any | null {
    if (feature === 'bits' && this.data.bits) {
      return { amount: this.data.bits };
    }
    return null;
  }

  toStorage(): object {
    return this.data;
  }
}
