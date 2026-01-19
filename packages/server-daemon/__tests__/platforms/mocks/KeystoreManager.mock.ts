export class MockKeystoreManager {
  private store = new Map<string, string>();

  async getPassword(service: string, account: string): Promise<string | null> {
    const key = `${service}:${account}`;
    return this.store.get(key) || null;
  }

  async setPassword(service: string, account: string, password: string): Promise<void> {
    const key = `${service}:${account}`;
    this.store.set(key, password);
  }

  async deletePassword(service: string, account: string): Promise<boolean> {
    const key = `${service}:${account}`;
    return this.store.delete(key);
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
