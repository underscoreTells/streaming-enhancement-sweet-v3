import type { YouTubeEvent } from '../Event';
import { YouTubeEventType } from '../Event';
import type { EventAdapter, EventType } from './EventAdapter';

export class YouTubeEventAdapter implements EventAdapter {
  constructor(private readonly data: YouTubeEvent) {}

  getPlatform(): 'youtube' {
    return 'youtube';
  }

  getId(): string {
    return this.data.eventId;
  }

  getType(): EventType {
    return this.mapYouTubeEventType(this.data.type);
  }

  getTimestamp(): Date {
    return this.data.timestamp;
  }

  getUserId(): string | null {
    return null;
  }

  getUsername(): string | null {
    return this.data.channelTitle;
  }

  getDisplayName(): string | null {
    return this.data.channelTitle;
  }

  getData(): object {
    return this.data.data;
  }

  toStorage(): object {
    return this.data;
  }

  private mapYouTubeEventType(youTubeType: YouTubeEventType): EventType {
    const typeMap: Record<YouTubeEventType, EventType> = {
      [YouTubeEventType.SuperChat]: 'super_chat',
      [YouTubeEventType.SuperSticker]: 'super_sticker',
      [YouTubeEventType.Membership]: 'membership',
      [YouTubeEventType.NewMember]: 'membership',
      [YouTubeEventType.MemberMilestone]: 'membership',
    };

    return typeMap[youTubeType] || 'membership';
  }
}
