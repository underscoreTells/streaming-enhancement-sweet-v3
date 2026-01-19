import Database from 'better-sqlite3';
import { DatabaseConnection } from './Database';
import { PlatformEnum } from '../config/schemas';
import { OAuthCredential } from './schema';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

export class OAuthCredentialsRepository {
  constructor(private db: DatabaseConnection) {
    this.nativeDb = db.getNativeDb();
  }

  private nativeDb: Database.Database;

  private validateScopes(scopes: string[]): void {
    if (!Array.isArray(scopes)) {
      throw new Error('scopes must be an array');
    }
    if (scopes.length === 0) {
      throw new Error('scopes cannot be empty');
    }
    if (scopes.some(scope => typeof scope !== 'string' || scope.trim() === '')) {
      throw new Error('All scopes must be non-empty strings');
    }
  }

  private serializeScopes(scopes: string[]): string {
    return JSON.stringify(scopes);
  }

  private deserializeScopes(scopesStr: string): string[] {
    // Handle both JSON format and legacy comma-separated format for backwards compatibility
    if (scopesStr.startsWith('[')) {
      try {
        return JSON.parse(scopesStr);
      } catch {
        // Fall through to legacy parsing
      }
    }
    // Legacy comma-separated format
    return scopesStr.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }

  addCredential(platform: string, clientId: string, clientSecret: string, scopes: string[]): void {
    const platformResult = PlatformEnum.safeParse(platform);
    if (!platformResult.success) {
      throw new Error(`Invalid platform: ${platform}. Must be one of: twitch, kick, youtube`);
    }

    if (!clientId || typeof clientId !== 'string' || clientId.trim() === '') {
      throw new Error('client_id is required');
    }
    if (!clientSecret || typeof clientSecret !== 'string' || clientSecret.trim() === '') {
      throw new Error('client_secret is required');
    }

    this.validateScopes(scopes);

    const stmt = this.nativeDb.prepare(
      'INSERT INTO oauth_credentials (platform, client_id, client_secret, scopes) VALUES (?, ?, ?, ?)'
    );

    try {
      stmt.run(platformResult.data, clientId, clientSecret, this.serializeScopes(scopes));
      logger.info(`OAuth credential added for platform: ${platform}`);
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
        throw new Error(`Credential for platform ${platform} already exists. Use updateCredential instead.`);
      }
      throw error;
    }
  }

  getCredential(platform: string): OAuthCredential | null {
    const platformResult = PlatformEnum.safeParse(platform);
    if (!platformResult.success) {
      throw new Error(`Invalid platform: ${platform}`);
    }

    const stmt = this.nativeDb.prepare(
      'SELECT platform, client_id, client_secret, scopes, created_at FROM oauth_credentials WHERE platform = ?'
    );

    const row = stmt.get(platformResult.data) as any;
    if (!row) {
      return null;
    }

    return {
      platform: row.platform,
      client_id: row.client_id,
      client_secret: row.client_secret,
      scopes: this.deserializeScopes(row.scopes),
      created_at: row.created_at
    };
  }

  updateCredential(platform: string, clientId: string, clientSecret: string, scopes: string[]): void {
    const platformResult = PlatformEnum.safeParse(platform);
    if (!platformResult.success) {
      throw new Error(`Invalid platform: ${platform}`);
    }

    if (!clientId || typeof clientId !== 'string' || clientId.trim() === '') {
      throw new Error('client_id is required');
    }
    if (!clientSecret || typeof clientSecret !== 'string' || clientSecret.trim() === '') {
      throw new Error('client_secret is required');
    }

    this.validateScopes(scopes);

    const stmt = this.nativeDb.prepare(
      'UPDATE oauth_credentials SET client_id = ?, client_secret = ?, scopes = ? WHERE platform = ?'
    );

    const result = stmt.run(clientId, clientSecret, this.serializeScopes(scopes), platformResult.data);

    if (result.changes === 0) {
      throw new Error(`Credential for platform ${platform} not found`);
    }

    logger.info(`OAuth credential updated for platform: ${platform}`);
  }

  deleteCredential(platform: string): boolean {
    const platformResult = PlatformEnum.safeParse(platform);
    if (!platformResult.success) {
      throw new Error(`Invalid platform: ${platform}`);
    }

    const stmt = this.nativeDb.prepare(
      'DELETE FROM oauth_credentials WHERE platform = ?'
    );

    const result = stmt.run(platformResult.data);
    const deleted = result.changes > 0;

    if (deleted) {
      logger.info(`OAuth credential deleted for platform: ${platform}`);
    }

    return deleted;
  }

  listCredentials(): OAuthCredential[] {
    const stmt = this.nativeDb.prepare(
      'SELECT platform, client_id, client_secret, scopes, created_at FROM oauth_credentials ORDER BY platform'
    );
    const rows = stmt.all() as any[];

    return rows.map(row => ({
      platform: row.platform,
      client_id: row.client_id,
      client_secret: row.client_secret,
      scopes: this.deserializeScopes(row.scopes),
      created_at: row.created_at
    }));
  }

  credentialExists(platform: string): boolean {
    const platformResult = PlatformEnum.safeParse(platform);
    if (!platformResult.success) {
      throw new Error(`Invalid platform: ${platform}`);
    }

    const stmt = this.nativeDb.prepare(
      'SELECT COUNT(*) as count FROM oauth_credentials WHERE platform = ?'
    );
    const result = stmt.get(platformResult.data) as any;
    return result.count > 0;
  }
}
