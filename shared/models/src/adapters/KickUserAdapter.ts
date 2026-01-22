import type { KickUser } from '../User';
import type { UserAdapter } from './UserAdapter';
import type { FeatureData } from '../interface';

export class KickUserAdapter implements UserAdapter {
  constructor(private readonly data: KickUser) {}

  getPlatform(): 'kick' {
    return 'kick';
  }

  getId(): string {
    return this.data.kickId;
  }

  getUsername(): string {
    return this.data.username;
  }

  getDisplayName(): string {
    return this.data.displayName || this.data.username;
  }

  getAvatar(): string | null {
    return this.data.avatarUrl;
  }

  getBio(): string | null {
    return this.data.bio;
  }

  getCreatedAt(): Date | null {
    return this.data.createdAt;
  }

  hasFeature(feature: string): boolean {
    return feature === 'isVerified';
  }

  getFeature(feature: string): FeatureData | null {
    if (feature === 'isVerified') {
      return { isVerified: this.data.isVerified };
    }
    return null;
  }

  toStorage(): object {
    return this.data;
  }
}
