import { createLogger, transports, format } from 'winston';
import { DaemonServer } from './DaemonServer';
import { DatabaseConnection } from '../database/Database';
import { KeystoreManager } from '../keystore/KeystoreManager';
import { OAuthCredentialsRepository } from '../database/OAuthCredentialsRepository';
import { loadConfig } from '../config/Config';
import { OAuthController } from '../../controllers/OAuthController';

async function main() {
  const logger = createLogger({
    level: 'info',
    format: format.combine(
      format.colorize(),
      format.simple()
    ),
    transports: [new transports.Console()],
  });

  const config = loadConfig();
  const db = new DatabaseConnection(config.database.path, config.database.migrationsDir || '');
  const keystore = new KeystoreManager(undefined);
  const credentialRepo = new OAuthCredentialsRepository(db);

  const server = new DaemonServer(logger);
  const oauthController = new OAuthController(
    logger,
    keystore,
    credentialRepo,
    config.oauth
  );

  server.attachRoutes('/oauth', oauthController.getRouter());
  server.attachErrorHandler();
  await server.start();

  logger.info('Server ready');
}

export { main };
