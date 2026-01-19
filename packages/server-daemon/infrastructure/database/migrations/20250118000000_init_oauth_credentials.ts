import Database from 'better-sqlite3';
import { Migration } from './Migration';

export default {
  version: '20250118000000',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE oauth_credentials (
        platform TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        client_secret TEXT NOT NULL,
        scopes TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  },
  down(db: Database.Database): void {
    db.exec('DROP TABLE IF EXISTS oauth_credentials');
  }
} satisfies Migration;
