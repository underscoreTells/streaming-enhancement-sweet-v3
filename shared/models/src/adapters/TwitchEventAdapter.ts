import type { TwitchEvent } from '../Event';
import { TwitchEventType } from '../Event';
import type { EventAdapter, EventType } from './EventAdapter';

export class TwitchEventAdapter implements EventAdapter {
  constructor(private readonly data: TwitchEvent) {}

  getPlatform(): 'twitch' {
    return 'twitch';
  }

  getId(): string {
    return this.data.eventId;
  }

  getType(): EventType {
    return this.mapTwitchEventType(this.data.type);
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

  private mapTwitchEventType(twitchType: TwitchEventType): EventType {
    const typeMap: Record<TwitchEventType, EventType> = {
      [TwitchEventType.Follow]: 'follow',
      [TwitchEventType.Subscribe]: 'subscription',
      [TwitchEventType.Resubscribe]: 'resubscribe',
      [TwitchEventType.SubscriptionGift]: 'subscription_gift',
      [TwitchEventType.Cheer]: 'cheer',
      [TwitchEventType.Raid]: 'raid',
      [TwitchEventType.PointRedemption]: 'point_redemption',
    };

    return typeMap[twitchType] || 'point_redemption';
  }
}
