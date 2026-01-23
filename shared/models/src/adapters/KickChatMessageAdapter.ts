import type { KickChatMessage } from '../ChatMessage';
import type { ChatMessageAdapter, Badge, Emote, BadgeType, EmoteType } from './ChatMessageAdapter';

export class KickChatMessageAdapter implements ChatMessageAdapter {
  constructor(private readonly data: KickChatMessage) {}

  getPlatform(): 'kick' {
    return 'kick';
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
        'subscriber': { type: BadgeType.Subscription, name: 'Subscriber' },
        'vip': { type: BadgeType.VIP, name: 'VIP' },
      };

      const key = (badge as any).type || (badge as any)._id || '';
      const config = badgeMap[key] || { type: BadgeType.Other, name: key };

      return {
        id: badgeMap[key]?.name || key,
        name: badgeMap[key]?.name || key,
        url: (badge as any).url || null,
        type: config.type
      };
    });
  }

  getEmotes(): Emote[] {
    return this.data.emotes.map(emote => {
      return {
        id: (emote as any).id || '',
        name: (emote as any).name || '',
        url: (emote as any).url || null,
        positions: (emote as any).positions || [],
        type: EmoteType.Kick
      };
    });
  }

  hasReplyParent(): boolean {
    return false;
  }

  getFeature(feature: string): any | null {
    return null;
  }

  toStorage(): object {
    return this.data;
  }
}
