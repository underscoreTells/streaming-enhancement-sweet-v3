import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { DatabaseConnection } from '../../../infrastructure/database/Database';
import { DatabaseProxy } from '../../../infrastructure/database/DatabaseProxy';
import fs from 'fs';
import path from 'path';

describe('DatabaseProxy', () => {
  let proxy: DatabaseProxy;
  let testDbPath: string;

  beforeEach(() => {
    testDbPath = path.join(__dirname, 'test-proxy.db');
  });

  afterEach(() => {
    if (proxy) {
      proxy.close();
    }
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    const walPath = testDbPath + '-wal';
    const shmPath = testDbPath + '-shm';
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
  });

  describe('constructor', () => {
    it('creates proxy with database', () => {
      const db = new DatabaseConnection(testDbPath, path.join(__dirname, '../../../infrastructure/database/migrations'));
      proxy = new DatabaseProxy(db);
      expect(proxy.isHealthy()).toBe(true);
    });
  });

  describe('isHealthy', () => {
    it('returns true for healthy database', () => {
      const db = new DatabaseConnection(testDbPath, path.join(__dirname, '../../../infrastructure/database/migrations'));
      proxy = new DatabaseProxy(db);
      expect(proxy.isHealthy()).toBe(true);
    });

    it('returns false for closed database', () => {
      const db = new DatabaseConnection(testDbPath, path.join(__dirname, '../../../infrastructure/database/migrations'));
      proxy = new DatabaseProxy(db);
      db.close();
      expect(proxy.isHealthy()).toBe(false);
    });
  });

  describe('query validation', () => {
    beforeEach(() => {
      const db = new DatabaseConnection(testDbPath, path.join(__dirname, '../../../infrastructure/database/migrations'));
      proxy = new DatabaseProxy(db);
    });

    it('allows SELECT queries', async () => {
      await expect(proxy.query('SELECT 1')).resolves.toEqual([{ 1: 1 }]);
    });

    it('blocks INSERT queries', async () => {
      await expect(proxy.query('INSERT INTO test VALUES (1)')).rejects.toThrow('Write operations must use repository methods');
    });

    it('blocks UPDATE queries', async () => {
      await expect(proxy.query('UPDATE test SET a = 1')).rejects.toThrow('Write operations must use repository methods');
    });

    it('blocks DELETE queries', async () => {
      await expect(proxy.query('DELETE FROM test')).rejects.toThrow('Write operations must use repository methods');
    });

    it('blocks CREATE queries', async () => {
      await expect(proxy.query('CREATE TABLE test (a INTEGER)')).rejects.toThrow('Write operations must use repository methods');
    });

    it('blocks DROP queries', async () => {
      await expect(proxy.query('DROP TABLE test')).rejects.toThrow('Write operations must use repository methods');
    });

    it('blocks ALTER queries', async () => {
      await expect(proxy.query('ALTER TABLE test ADD COLUMN b INTEGER')).rejects.toThrow('Write operations must use repository methods');
    });

    it('blocks mixed case queries', async () => {
      await expect(proxy.query('Insert Into test Values (1)')).rejects.toThrow('Write operations must use repository methods');
    });
  });

  describe('write operations with mutex', () => {
    beforeEach(async () => {
      const db = new DatabaseConnection(testDbPath, path.join(__dirname, '../../../infrastructure/database/migrations'));
      proxy = new DatabaseProxy(db);

      const nativeDb = db.getNativeDb();
      nativeDb.exec(`
        CREATE TABLE oauth_credentials (
          platform TEXT PRIMARY KEY,
          client_id TEXT NOT NULL,
          client_secret TEXT NOT NULL,
          scopes TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await proxy.addCredential('twitch', 'client123', 'secret456', ['scope1', 'scope2']);
    });

    it('executes addCredential with locking', async () => {
      await expect(proxy.addCredential('kick', 'client789', 'secret012', ['scope3'])).resolves.not.toThrow();
    });

    it('executes updateCredential with locking', async () => {
      await expect(proxy.updateCredential('twitch', 'client789', 'secret012', ['scope3'])).resolves.not.toThrow();
    });

    it('executes deleteCredential with locking', async () => {
      await expect(proxy.deleteCredential('twitch')).resolves.toBe(true);
    });

    it('allows concurrent read operations', async () => {
      const results = await Promise.all([
        proxy.getCredential('twitch'),
        proxy.getCredential('twitch'),
        proxy.getCredential('twitch')
      ]);
      expect(results).toHaveLength(3);
      results.forEach((r: any) => {
        expect(r?.platform).toBe('twitch');
      });
    });

    it('serializes write operations', async () => {
      const operations = [
        proxy.updateCredential('twitch', 'client1', 'secret1', ['scope1']),
        proxy.updateCredential('twitch', 'client2', 'secret2', ['scope2']),
        proxy.updateCredential('twitch', 'client3', 'secret3', ['scope3'])
      ];

      await expect(Promise.all(operations)).resolves.not.toThrow();
      const final = await proxy.getCredential('twitch');
      expect(final).not.toBeNull();
    });
  });

  describe('transaction support', () => {
    beforeEach(async () => {
      const db = new DatabaseConnection(testDbPath, path.join(__dirname, '../../../infrastructure/database/migrations'));
      proxy = new DatabaseProxy(db);

      const nativeDb = db.getNativeDb();
      nativeDb.exec(`
        CREATE TABLE oauth_credentials (
          platform TEXT PRIMARY KEY,
          client_id TEXT NOT NULL,
          client_secret TEXT NOT NULL,
          scopes TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });

    it('executes read-only transaction', async () => {
      await proxy.addCredential('twitch', 'client123', 'secret456', ['scope1']);
      const result = await proxy.transaction((db: Database.Database) => {
        return db.prepare('SELECT * FROM oauth_credentials WHERE platform = ?').get('twitch');
      });
      expect(result).not.toBeNull();
    });

    it('rejects async transaction callbacks', async () => {
      await proxy.addCredential('twitch', 'client123', 'secret456', ['scope1']);
      await expect(proxy.transaction(
        // @ts-expect-error - Test that async callbacks are rejected at runtime
        async (db: Database.Database) => {
        return db.prepare('SELECT * FROM oauth_credentials WHERE platform = ?').get('twitch');
      })).rejects.toThrow('Transaction function cannot return a promise');
    });
  });

  describe('close', () => {
    it('closes database connection', () => {
      const db = new DatabaseConnection(testDbPath, path.join(__dirname, '../../../infrastructure/database/migrations'));
      proxy = new DatabaseProxy(db);
      proxy.close();
      expect(proxy.isHealthy()).toBe(false);
    });
  });
});
