import type { KickEvent } from '../Event';
import { KickEventType } from '../Event';
import type { EventAdapter, EventType } from './EventAdapter';

export class KickEventAdapter implements EventAdapter {
  constructor(private readonly data: KickEvent) {}

  getPlatform(): 'kick' {
    return 'kick';
  }

  getId(): string {
    return this.data.eventId;
  }

  getType(): EventType {
    return this.mapKickEventType(this.data.type);
  }

  getTimestamp(): Date {
    return this.data.timestamp;
  }

  getUserId(): string | null {
    return this.data.userId;
  }

  getUsername(): string | null {
    return this.data.username;
  }

  getDisplayName(): string | null {
    return this.data.displayName;
  }

  getData(): object {
    return this.data.data;
  }

  toStorage(): object {
    return this.data;
  }

  private mapKickEventType(kickType: KickEventType): EventType {
    const typeMap: Record<KickEventType, EventType> = {
      [KickEventType.Follow]: 'follow',
      [KickEventType.Subscribe]: 'subscription',
      [KickEventType.SubscriptionGift]: 'subscription_gift',
      [KickEventType.Raid]: 'raid',
      [KickEventType.Tip]: 'tip',
    };

    return typeMap[kickType] || 'tip';
  }
}
