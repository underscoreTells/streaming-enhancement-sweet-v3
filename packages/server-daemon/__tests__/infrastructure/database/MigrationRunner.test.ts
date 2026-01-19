import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { MigrationRunner } from '../../../infrastructure/database/migrations/MigrationRunner';
import { Migration } from '../../../infrastructure/database/migrations/Migration';
import path from 'path';

describe('MigrationRunner', () => {
  let db: Database.Database;
  let runner: MigrationRunner;

  beforeEach(() => {
    db = new Database(':memory:');
    runner = new MigrationRunner(db, path.join(__dirname, 'mock-migrations'));
  });

  afterEach(() => {
    db.close();
  });

  describe('runPendingMigrations', () => {
    it('creates _migrations table', () => {
      runner['ensureMigrationsTable']();
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      expect(tables.some((t: any) => t.name === '_migrations')).toBe(true);
    });

    it('tracks executed migrations', () => {
      runner['ensureMigrationsTable']();
      db.prepare('INSERT INTO _migrations (version) VALUES (?)').run('20250118000000');
      const executed = runner['getExecutedMigrations']();
      expect(executed.has('20250118000000')).toBe(true);
    });
  });
});

describe('Migration interface', () => {
  it('defines required methods', () => {
    const migration: Migration = {
      version: '20250118000000',
      up: () => {},
      down: () => {}
    };
    expect(migration.version).toBe('20250118000000');
    expect(typeof migration.up).toBe('function');
    expect(typeof migration.down).toBe('function');
  });

  it('allows optional down method', () => {
    const migration: Migration = {
      version: '20250118000000',
      up: () => {}
    };
    expect(migration.down).toBeUndefined();
  });
});
