import { OAuthToken } from '@streaming-enhancement/keystore-native';

export class MockKeystoreManager {
  private store = new Map<string, OAuthToken>();

  async getCredentials(service: string, account: string): Promise<OAuthToken | null> {
    const key = `${service}:${account}`;
    return this.store.get(key) || null;
  }

  async setCredentials(service: string, account: string, token: OAuthToken): Promise<void> {
    const key = `${service}:${account}`;
    this.store.set(key, token);
  }

  async deleteCredentials(service: string, account: string): Promise<void> {
    const key = `${service}:${account}`;
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }

  has(service: string, account: string): boolean {
    const key = `${service}:${account}`;
    return this.store.has(key);
  }
}