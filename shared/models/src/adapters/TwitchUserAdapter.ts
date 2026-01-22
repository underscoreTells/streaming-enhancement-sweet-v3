import type { TwitchUser } from '../User';
import type { UserAdapter } from './UserAdapter';
import type { FeatureData } from '../interface';

export class TwitchUserAdapter implements UserAdapter {
  constructor(private readonly data: TwitchUser) {}

  getPlatform(): 'twitch' {
    return 'twitch';
  }

  getId(): string {
    return this.data.twitchId;
  }

  getUsername(): string {
    return this.data.username;
  }

  getDisplayName(): string {
    return this.data.displayName || this.data.username;
  }

  getAvatar(): string | null {
    return this.data.profileImageUrl;
  }

  getBio(): string | null {
    return this.data.bio;
  }

  getCreatedAt(): Date | null {
    return this.data.createdAt;
  }

  hasFeature(_feature: string): boolean {
    return false;
  }

  getFeature(_feature: string): FeatureData | null {
    return null;
  }

  toStorage(): object {
    return this.data;
  }
}
