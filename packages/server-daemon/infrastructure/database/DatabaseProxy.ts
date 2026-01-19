import { Mutex } from 'async-mutex';
import { DatabaseConnection } from './Database';
import { OAuthCredentialsRepository } from './OAuthCredentialsRepository';

export class DatabaseProxy {
  private database: DatabaseConnection;
  private oauthRepo: OAuthCredentialsRepository;
  private writeMutex = new Mutex();

  constructor(db: DatabaseConnection) {
    this.database = db;
    this.oauthRepo = new OAuthCredentialsRepository(db);
  }

  async initialize(): Promise<void> {
    return this.database.initialize();
  }

  async addCredential(platform: string, clientId: string, clientSecret: string, scopes: string[]): Promise<void> {
    const release = await this.writeMutex.acquire();
    try {
      return this.oauthRepo.addCredential(platform, clientId, clientSecret, scopes);
    } finally {
      release();
    }
  }

  async getCredential(platform: string): Promise<any | null> {
    return this.oauthRepo.getCredential(platform);
  }

  async updateCredential(platform: string, clientId: string, clientSecret: string, scopes: string[]): Promise<void> {
    const release = await this.writeMutex.acquire();
    try {
      return this.oauthRepo.updateCredential(platform, clientId, clientSecret, scopes);
    } finally {
      release();
    }
  }

  async deleteCredential(platform: string): Promise<boolean> {
    const release = await this.writeMutex.acquire();
    try {
      return this.oauthRepo.deleteCredential(platform);
    } finally {
      release();
    }
  }

  async listCredentials(): Promise<any[]> {
    return this.oauthRepo.listCredentials();
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    const normalizedSql = sql.trim().toLowerCase();
    const forbidden = ['insert', 'update', 'delete', 'drop', 'create', 'alter', 'truncate'];
    if (forbidden.some(cmd => normalizedSql.startsWith(cmd))) {
      throw new Error('Write operations must use repository methods');
    }
    return this.database.raw(sql, params);
  }

  async transaction<T>(fn: (db: import('better-sqlite3').Database) => T): Promise<T> {
    return this.database.transaction(() => fn(this.database.getNativeDb()));
  }

  isHealthy(): boolean {
    try {
      this.database.getDb().pragma('quick_check');
      return true;
    } catch {
      return false;
    }
  }

  close(): void {
    this.database.close();
  }

  getDatabase(): DatabaseConnection {
    return this.database;
  }
}
