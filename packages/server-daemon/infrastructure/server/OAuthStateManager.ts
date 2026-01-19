import { Mutex } from 'async-mutex';

interface StateInfo {
  state: string;
  username: string;
  expiresAt: number;
}

export class OAuthStateManager {
  private states: Map<string, StateInfo> = new Map();
  private mutex: Mutex = new Mutex();
  private static readonly STATE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  async storeState(platform: string, username: string, state: string): Promise<void> {
    return this.mutex.runExclusive(() => {
      const key = `${platform}:${state}`;
      this.states.set(key, {
        state,
        username,
        expiresAt: Date.now() + OAuthStateManager.STATE_TTL_MS,
      });
    });
  }

  async getState(platform: string, state: string): Promise<{ username: string } | null> {
    return this.mutex.runExclusive(() => {
      const key = `${platform}:${state}`;
      const stateInfo = this.states.get(key);

      if (!stateInfo) {
        return null;
      }

      if (Date.now() > stateInfo.expiresAt) {
        this.states.delete(key);
        return null;
      }

      return { username: stateInfo.username };
    });
  }

  async clearState(platform: string, state: string): Promise<void> {
    return this.mutex.runExclusive(() => {
      const key = `${platform}:${state}`;
      this.states.delete(key);
    });
  }

  async cleanupExpiredStates(): Promise<void> {
    return this.mutex.runExclusive(() => {
      const now = Date.now();
      for (const [key, stateInfo] of this.states.entries()) {
        if (now > stateInfo.expiresAt) {
          this.states.delete(key);
        }
      }
    });
  }
}
