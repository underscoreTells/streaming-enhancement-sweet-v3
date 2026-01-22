#!/usr/bin/env node

import { Command } from 'commander';
import { DaemonServer } from '../infrastructure/server/DaemonServer';
import { DatabaseConnection } from '../infrastructure/database/Database';
import { KeystoreManager } from '../infrastructure/keystore/KeystoreManager';
import { OAuthCredentialsRepository } from '../infrastructure/database/OAuthCredentialsRepository';
import { loadConfig, LoggerFactory } from '../infrastructure/config';
import { OAuthController } from '../controllers/OAuthController';
import { ShutdownHandler } from './daemon/ShutdownHandler';

const program = new Command();

program
  .name('streaming-daemon')
  .description('Streaming Enhancement Daemon')
  .version('0.1.0');

program
  .command('start')
  .description('Start daemon server')
  .option('--port <number>', 'Server port', '3000')
  .option('--config <path>', 'Path to config file')
  .option('--log-level <level>', 'Log level (error, warn, info, debug)', 'info')
  .action(async (options) => {
    try {
      const config = loadConfig(options.config);

      if (options.port) {
        config.server.port = parseInt(options.port, 10);
      }

      if (options.logLevel) {
        config.logging.level = options.logLevel as 'error' | 'warn' | 'info' | 'debug';
      }

      const logger = LoggerFactory.create(config.logging, 'daemon');
      logger.info('Starting daemon...');

      const db = new DatabaseConnection(config.database.path, config.database.migrationsDir || '', logger);
      await db.initialize();

      const keystore = new KeystoreManager(undefined, logger);
      const credentialRepo = new OAuthCredentialsRepository(db, logger);

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

      const shutdownHandler = new ShutdownHandler({
        server,
        database: db,
        logger
      }, config.server.shutdownTimeout || 10000);
      shutdownHandler.register();
    } catch (error) {
      console.error('Failed to start daemon:', error);
      process.exit(2);
    }
  });

program.parse(process.argv);
