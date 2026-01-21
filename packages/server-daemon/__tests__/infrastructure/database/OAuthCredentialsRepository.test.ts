import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { OAuthCredentialsRepository } from '../../../infrastructure/database/OAuthCredentialsRepository';
import { LoggerFactory } from '../../../infrastructure/config';

describe('OAuthCredentialsRepository', () => {
  let nativeDb: Database.Database;
  let repo: OAuthCredentialsRepository;
  const logger = LoggerFactory.create({ level: 'error', maxFiles: 1, maxSize: '1m' }, 'test');

  beforeEach(() => {
    nativeDb = new Database(':memory:');
    nativeDb.exec(`
      CREATE TABLE oauth_credentials (
        platform TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        client_secret TEXT NOT NULL,
        scopes TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    repo = new OAuthCredentialsRepository({
      getNativeDb: () => nativeDb
    } as any, logger);
  });

  describe('validateScopes', () => {
    it('accepts valid scopes array', () => {
      expect(() => repo['validateScopes'](['scope1', 'scope2'])).not.toThrow();
    });

    it('rejects non-array', () => {
      expect(() => repo['validateScopes']('scope1,scope2' as any)).toThrow('scopes must be an array');
    });

    it('rejects empty array', () => {
      expect(() => repo['validateScopes']([])).toThrow('scopes cannot be empty');
    });

    it('rejects array with empty strings', () => {
      expect(() => repo['validateScopes'](['scope1', '', 'scope2'])).toThrow('All scopes must be non-empty strings');
    });

    it('rejects array with whitespace-only strings', () => {
      expect(() => repo['validateScopes'](['scope1', '   ', 'scope2'])).toThrow('All scopes must be non-empty strings');
    });
  });

  describe('addCredential', () => {
    it('adds credential successfully', () => {
      expect(() => repo.addCredential('twitch', 'client123', 'secret456', ['scope1', 'scope2'])).not.toThrow();
    });

    it('rejects invalid platform', () => {
      expect(() => repo.addCredential('facebook', 'client123', 'secret456', ['scope1'])).toThrow();
    });

    it('rejects empty client_id', () => {
      expect(() => repo.addCredential('twitch', '', 'secret456', ['scope1'])).toThrow('client_id is required');
    });

    it('rejects empty client_secret', () => {
      expect(() => repo.addCredential('twitch', 'client123', '', ['scope1'])).toThrow('client_secret is required');
    });

    it('rejects duplicate platform', () => {
      repo.addCredential('twitch', 'client123', 'secret456', ['scope1']);
      expect(() => repo.addCredential('twitch', 'client789', 'secret012', ['scope2'])).toThrow('already exists');
    });

    it('stores scopes as JSON string', () => {
      repo.addCredential('twitch', 'client123', 'secret456', ['scope1', 'scope2', 'scope3']);
      const row = nativeDb.prepare('SELECT scopes FROM oauth_credentials WHERE platform = ?').get('twitch') as any;
      expect(row.scopes).toBe(JSON.stringify(['scope1', 'scope2', 'scope3']));
    });
  });

  describe('getCredential', () => {
    beforeEach(() => {
      repo.addCredential('twitch', 'client123', 'secret456', ['scope1', 'scope2']);
    });

    it('retrieves credential', () => {
      const cred = repo.getCredential('twitch');
      expect(cred).not.toBeNull();
      expect(cred?.platform).toBe('twitch');
      expect(cred?.client_id).toBe('client123');
      expect(cred?.client_secret).toBe('secret456');
      expect(cred?.scopes).toEqual(['scope1', 'scope2']);
    });

    it('returns null for non-existent platform', () => {
      const cred = repo.getCredential('youtube');
      expect(cred).toBeNull();
    });

    it('rejects invalid platform', () => {
      expect(() => repo.getCredential('facebook')).toThrow();
    });

    it('deserializes scopes correctly', () => {
      nativeDb.prepare('INSERT INTO oauth_credentials (platform, client_id, client_secret, scopes) VALUES (?, ?, ?, ?)')
        .run('kick', 'client789', 'secret012', 'scopeA,scopeB,scopeC');
      const cred = repo.getCredential('kick');
      expect(cred?.scopes).toEqual(['scopeA', 'scopeB', 'scopeC']);
    });

    it('trims whitespace from scopes', () => {
      nativeDb.prepare('INSERT INTO oauth_credentials (platform, client_id, client_secret, scopes) VALUES (?, ?, ?, ?)')
        .run('youtube', 'client012', 'secret789', ' scopeA , scopeB , scopeC ');
      const cred = repo.getCredential('youtube');
      expect(cred?.scopes).toEqual(['scopeA', 'scopeB', 'scopeC']);
    });
  });

  describe('updateCredential', () => {
    beforeEach(() => {
      repo.addCredential('twitch', 'client123', 'secret456', ['scope1', 'scope2']);
    });

    it('updates credential successfully', () => {
      expect(() => repo.updateCredential('twitch', 'client789', 'secret012', ['scope3', 'scope4'])).not.toThrow();
      const cred = repo.getCredential('twitch');
      expect(cred?.client_id).toBe('client789');
      expect(cred?.scopes).toEqual(['scope3', 'scope4']);
    });

    it('rejects update for non-existent platform', () => {
      expect(() => repo.updateCredential('youtube', 'client123', 'secret456', ['scope1'])).toThrow('not found');
    });

    it('validates scopes on update', () => {
      expect(() => repo.updateCredential('twitch', 'client123', 'secret456', [])).toThrow('scopes cannot be empty');
    });
  });

  describe('deleteCredential', () => {
    beforeEach(() => {
      repo.addCredential('twitch', 'client123', 'secret456', ['scope1']);
    });

    it('deletes credential successfully', () => {
      const result = repo.deleteCredential('twitch');
      expect(result).toBe(true);
      expect(repo.getCredential('twitch')).toBeNull();
    });

    it('returns false for non-existent platform', () => {
      const result = repo.deleteCredential('youtube');
      expect(result).toBe(false);
    });

    it('rejects invalid platform', () => {
      expect(() => repo.deleteCredential('facebook')).toThrow();
    });
  });

  describe('listCredentials', () => {
    beforeEach(() => {
      repo.addCredential('twitch', 'client123', 'secret456', ['scope1']);
      repo.addCredential('kick', 'client789', 'secret012', ['scope2']);
      repo.addCredential('youtube', 'client012', 'secret789', ['scope3']);
    });

    it('lists all credentials sorted by platform', () => {
      const list = repo.listCredentials();
      expect(list).toHaveLength(3);
      expect(list[0].platform).toBe('kick');
      expect(list[1].platform).toBe('twitch');
      expect(list[2].platform).toBe('youtube');
    });

    it('returns empty array when no credentials', () => {
      nativeDb.exec('DELETE FROM oauth_credentials');
      const list = repo.listCredentials();
      expect(list).toEqual([]);
    });

    it('returns scopes as arrays', () => {
      const list = repo.listCredentials();
      list.forEach((cred: any) => {
        expect(Array.isArray(cred.scopes)).toBe(true);
      });
    });
  });

  describe('credentialExists', () => {
    beforeEach(() => {
      repo.addCredential('twitch', 'client123', 'secret456', ['scope1']);
    });

    it('returns true for existing platform', () => {
      expect(repo.credentialExists('twitch')).toBe(true);
    });

    it('returns false for non-existent platform', () => {
      expect(repo.credentialExists('youtube')).toBe(false);
    });

    it('rejects invalid platform', () => {
      expect(() => repo.credentialExists('facebook')).toThrow();
    });
  });
});
