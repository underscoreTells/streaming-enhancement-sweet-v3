#!/usr/bin/env node

import { Command } from 'commander';
import { createLogger, transports, format } from 'winston';
import { DaemonServer } from '../infrastructure/server/DaemonServer';
import { DatabaseConnection } from '../infrastructure/database/Database';
import { KeystoreManager } from '../infrastructure/keystore/KeystoreManager';
import { OAuthCredentialsRepository } from '../infrastructure/database/OAuthCredentialsRepository';
import { loadConfig } from '../infrastructure/config/Config';
import { OAuthController } from '../controllers/OAuthController';

const program = new Command();

program
  .name('streaming-daemon')
  .description('Streaming Enhancement Daemon')
  .version('0.1.0');

program
  .command('start')
  .description('Start the daemon server')
  .option('--port <number>', 'Server port', '3000')
  .option('--config <path>', 'Path to config file')
  .option('--log-level <level>', 'Log level (error, warn, info, debug)', 'info')
  .action(async (options) => {
    try {
      const config = loadConfig();

      const logger = createLogger({
        level: options.logLevel || config.logging.level,
        format: format.combine(
          format.colorize(),
          format.simple()
        ),
        transports: [new transports.Console()],
      });

      logger.info('Starting daemon...');

      const db = new DatabaseConnection(config.database.path, config.database.migrationsDir || '');
      const keystore = new KeystoreManager(undefined);
      const credentialRepo = new OAuthCredentialsRepository(db);

      const server = new DaemonServer(logger, config);
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
    } catch (error) {
      console.error('Failed to start daemon:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);
