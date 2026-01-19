import { randomBytes, createHash } from 'crypto';
import { Mutex } from 'async-mutex';

interface VerifierEntry {
  verifier: string;
  createdAt: number;
}

export class PKCEManager {
  private readonly verifiers: Map<string, VerifierEntry> = new Map();
  private readonly mutex: Mutex = new Mutex();
  private readonly ttlMs: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(ttlMinutes = 10, cleanupIntervalMinutes = 5) {
    this.ttlMs = ttlMinutes * 60 * 1000;
    this.startCleanupInterval(cleanupIntervalMinutes * 60 * 1000);
  }

  generateCodeVerifier(length = 64): string {
    const bytes = randomBytes(Math.ceil(length * 0.75));
    return bytes.toString('base64url').slice(0, length);
  }

  generateCodeChallenge(verifier: string): string {
    return createHash('sha256').update(verifier).digest('base64url');
  }

  async storeVerifier(state: string, verifier: string): Promise<void> {
    return this.mutex.runExclusive(() => {
      this.verifiers.set(state, {
        verifier,
        createdAt: Date.now(),
      });
    });
  }

  async getVerifier(state: string): Promise<string | null> {
    return this.mutex.runExclusive(() => {
      const entry = this.verifiers.get(state);
      if (!entry) {
        return null;
      }
      if (this.isExpired(entry)) {
        this.verifiers.delete(state);
        return null;
      }
      return entry.verifier;
    });
  }

  async clearVerifier(state: string): Promise<void> {
    return this.mutex.runExclusive(() => {
      this.verifiers.delete(state);
    });
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private isExpired(entry: VerifierEntry): boolean {
    return Date.now() - entry.createdAt > this.ttlMs;
  }

  private startCleanupInterval(intervalMs: number): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredVerifiers();
    }, intervalMs);

    // Ensure the interval doesn't prevent process exit
    this.cleanupInterval.unref();
  }

  private cleanupExpiredVerifiers(): void {
    this.mutex.runExclusive(() => {
      for (const [state, entry] of this.verifiers) {
        if (this.isExpired(entry)) {
          this.verifiers.delete(state);
        }
      }
    });
  }
}
