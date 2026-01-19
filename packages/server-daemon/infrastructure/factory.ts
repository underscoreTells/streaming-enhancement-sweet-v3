import { AppConfig, loadConfig } from './config/Config';
import { DatabaseConnection, DatabaseProxy } from './database';
import path from 'path';

export class DatabaseFactory {
  static async createProxy(config: AppConfig): Promise<DatabaseProxy> {
    const db = new DatabaseConnection(
      config.database.path,
      config.database.migrationsDir || path.join(__dirname, 'database', 'migrations')
    );
    const proxy = new DatabaseProxy(db);
    await proxy.initialize();
    return proxy;
  }
}

export { loadConfig };
export * from './config/schemas';
export { DatabaseConnection as Database } from './database/Database';
export * from './database/DatabaseProxy';
export * from './database/OAuthCredentialsRepository';
export * from './database/schema';
