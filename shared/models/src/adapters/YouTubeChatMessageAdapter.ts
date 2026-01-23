import type { YouTubeChatMessage } from '../ChatMessage';
import type { ChatMessageAdapter, Badge, Emote, BadgeType, EmoteType, SuperChatDetails } from './ChatMessageAdapter';

export class YouTubeChatMessageAdapter implements ChatMessageAdapter {
  constructor(private readonly data: YouTubeChatMessage) {}

  getPlatform(): 'youtube' {
    return 'youtube';
  }

  getId(): string {
    return this.data.messageId;
  }

  getUserId(): string {
    return this.data.channelId;
  }

  getUsername(): string {
    return this.data.channelTitle;
  }

  getDisplayName(): string {
    return this.data.displayName;
  }

  getColor(): string | null {
    return null;
  }

  getMessage(): string {
    return this.data.message;
  }

  getTimestamp(): Date {
    return this.data.timestamp;
  }

  getRoomId(): string {
    return this.data.liveChatId;
  }

  getBadges(): Badge[] {
    return this.data.badges.map(badge => {
      const badgeMap: Record<string, { type: BadgeType; name: string }> = {
        'owner': { type: BadgeType.Owner, name: 'Owner' },
        'moderator': { type: BadgeType.Moderator, name: 'Moderator' },
        'member': { type: BadgeType.Subscription, name: 'Member' },
      };

      const key = (badge as any).badgeId || '';
      const config = badgeMap[key] || { type: BadgeType.Other, name: key };

      return {
        id: key,
        name: badgeMap[key]?.name || key,
        url: (badge as any).url || null,
        type: config.type
      };
    });
  }

  getEmotes(): Emote[] {
    return [];
  }

  hasReplyParent(): boolean {
    return false;
  }

  getFeature(feature: string): SuperChatDetails | null {
    if (feature === 'superChat' && this.data.superChatDetails) {
      return this.data.superChatDetails;
    }
    return null;
  }

  toStorage(): object {
    return this.data;
  }
}
