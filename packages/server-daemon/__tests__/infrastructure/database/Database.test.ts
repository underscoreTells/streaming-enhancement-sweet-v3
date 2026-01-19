import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { DatabaseConnection } from '../../../infrastructure/database/Database';
import fs from 'fs';
import path from 'path';

describe('DatabaseConnection', () => {
  let db: DatabaseConnection;
  let testDbPath: string;

  beforeEach(() => {
    testDbPath = path.join(__dirname, 'test.db');
  });

  afterEach(() => {
    if (db) {
      db.close();
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
    it('creates database file', () => {
      db = new DatabaseConnection(testDbPath, path.join(__dirname, '../../../infrastructure/database/migrations'));
      expect(fs.existsSync(testDbPath)).toBe(true);
    });

    it('creates directory if not exists', () => {
      const nestedPath = path.join(__dirname, 'nested/test.db');
      db = new DatabaseConnection(nestedPath, path.join(__dirname, '../../../infrastructure/database/migrations'));
      expect(fs.existsSync(nestedPath)).toBe(true);
      db.close();
      fs.unlinkSync(nestedPath);
      const nestedDir = path.join(__dirname, 'nested');
      if (fs.existsSync(nestedDir)) fs.rmdirSync(nestedDir);
    });
  });

  describe('getDb', () => {
    it('returns better-sqlite3 database', () => {
      db = new DatabaseConnection(testDbPath, path.join(__dirname, '../../../infrastructure/database/migrations'));
      expect(db.getDb()).toBeInstanceOf(Database);
    });
  });

  describe('getPath', () => {
    it('returns database path', () => {
      db = new DatabaseConnection(testDbPath, path.join(__dirname, '../../../infrastructure/database/migrations'));
      expect(db.getPath()).toBe(testDbPath);
    });
  });

  describe('transaction', () => {
    it('executes transaction', () => {
      db = new DatabaseConnection(testDbPath, path.join(__dirname, '../../../infrastructure/database/migrations'));
      const result = db.transaction(() => {
        return 'success';
      });
      expect(result).toBe('success');
    });

    it('rolls back on error', () => {
      db = new DatabaseConnection(testDbPath, path.join(__dirname, '../../../infrastructure/database/migrations'));
      expect(() => {
        db.transaction(() => {
          throw new Error('Test error');
        });
      }).toThrow();
    });
  });

  describe('close', () => {
    it('closes database connection', () => {
      db = new DatabaseConnection(testDbPath, path.join(__dirname, '../../../infrastructure/database/migrations'));
      db.close();
      expect(() => db.getDb().prepare('SELECT 1').get()).toThrow();
    });
  });
});
