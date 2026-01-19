import Database from 'better-sqlite3';

export interface Migration {
  version: string;
  up(db: Database.Database): void;
  down?(db: Database.Database): void;
}
