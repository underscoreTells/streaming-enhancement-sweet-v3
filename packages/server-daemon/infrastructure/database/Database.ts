import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { MigrationRunner } from './migrations/MigrationRunner';
import winston from 'winston';

type NonPromise<T> = T extends Promise<any> ? never : T;

const minimalLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

export class DatabaseConnection {
  private db: Database.Database;
  private migrationRunner: MigrationRunner;
  private readonly dbPath: string;
  private readonly logger: winston.Logger;

  constructor(dbPath: string, migrationsPath: string, logger?: winston.Logger) {
    this.logger = logger || minimalLogger;
    this.dbPath = dbPath;

    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true, mode: 0o700 });
    }

    this.db = new Database(dbPath, {
      fileMustExist: false,
      timeout: 5000,
      verbose: process.env.NODE_ENV === 'development'
        ? (message: unknown) => { if (typeof message === 'string') this.logger.debug(message); }
        : undefined
    });

    try {
      if (fs.existsSync(this.dbPath)) {
        fs.chmodSync(this.dbPath, 0o600);
      }
    } catch (error) {
      this.logger.warn(`Failed to set file permissions on database: ${error}`);
    }

    this.db.pragma('journal_mode = WAL');
    this.db.pragma('busy_timeout = 5000');

    this.migrationRunner = new MigrationRunner(this.db, migrationsPath, this.logger);
  }

  async initialize(): Promise<void> {
    try {
      await this.migrationRunner.runPendingMigrations();
      this.logger.info(`Database initialized at ${this.dbPath}`);
    } catch (error) {
      this.logger.error('Failed to initialize database', error);
      throw error;
    }
  }

  getDb(): Database.Database {
    return this.db;
  }

  getNativeDb(): Database.Database {
    return this.db;
  }

  getPath(): string {
    return this.dbPath;
  }

  close(): void {
    this.db.close();
    this.logger.info('Database connection closed');
  }

  raw(sql: string, params: any[] = []): any {
    return this.db.prepare(sql).all(params);
  }

  rawExec(sql: string): any {
    return this.db.exec(sql);
  }

  transaction<T>(fn: () => NonPromise<T>): T {
    return this.db.transaction(fn)();
  }
}
