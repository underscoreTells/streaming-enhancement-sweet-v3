import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { Migration } from './Migration';
import winston from 'winston';

const minimalLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

export class MigrationRunner {
  constructor(private db: Database.Database, private migrationsPath: string, private logger: winston.Logger = minimalLogger) {}

  private ensureMigrationsTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        version TEXT PRIMARY KEY,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  private getExecutedMigrations(): Set<string> {
    const rows = this.db.prepare('SELECT version FROM _migrations').all() as { version: string }[];
    return new Set(rows.map(r => r.version));
  }

  private loadMigrations(): Migration[] {
    const migrations: Migration[] = [];
    const files = fs.readdirSync(this.migrationsPath).filter(f => f.endsWith('.ts') || f.endsWith('.js'));

    for (const file of files) {
      const migrationPath = path.join(this.migrationsPath, file);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const module = require(migrationPath);
      if (module.default && module.default.version) {
        migrations.push(module.default);
      }
    }

    return migrations.sort((a, b) => a.version.localeCompare(b.version));
  }

  async runPendingMigrations(): Promise<void> {
    this.ensureMigrationsTable();
    const executed = this.getExecutedMigrations();
    const migrations = this.loadMigrations();

    for (const migration of migrations) {
      if (executed.has(migration.version)) {
        continue;
      }

      this.logger.info(`Running migration: ${migration.version}`);

      const runMigration = this.db.transaction(() => {
        migration.up(this.db);
        this.db.prepare('INSERT INTO _migrations (version) VALUES (?)').run(migration.version);
      });

      runMigration();

      this.logger.info(`Migration completed: ${migration.version}`);
    }

    this.logger.info(`All migrations up to date`);
  }

  async rollbackTo(targetVersion: string): Promise<void> {
    this.ensureMigrationsTable();
    const executed = this.getExecutedMigrations();
    const migrations = this.loadMigrations();

    for (let i = migrations.length - 1; i >= 0; i--) {
      const migration = migrations[i];
      if (!executed.has(migration.version) || migration.version <= targetVersion) {
        continue;
      }

      if (migration.down) {
        this.logger.info(`Rolling back migration: ${migration.version}`);
        migration.down(this.db);
        this.db.prepare('DELETE FROM _migrations WHERE version = ?').run(migration.version);
        this.logger.info(`Rollback completed: ${migration.version}`);
      } else {
        this.logger.warn(`Cannot rollback migration ${migration.version}: no down() method`);
      }
    }
  }
}
