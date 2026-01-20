#!/usr/bin/env node

import { Command } from 'commander';
import { createLogger, transports, format, Logger } from 'winston';
import { DaemonServer } from '../infrastructure/server/DaemonServer';
import { DatabaseConnection } from '../infrastructure/database/Database';
import { KeystoreManager } from '../infrastructure/keystore/KeystoreManager';
import { OAuthCredentialsRepository } from '../infrastructure/database/OAuthCredentialsRepository';
import { loadConfig } from '../infrastructure/config/Config';
import { OAuthController } from '../controllers/OAuthController';

let daemonServer: DaemonServer | null = null;
let dbConnection: DatabaseConnection | null = null;
let loggerInstance: Logger | null = null;

const gracefulShutdown = async (signal: string): Promise<void> => {
  if (!loggerInstance) {
    console.error(`Received ${signal}, shutting down...`);
  } else {
    loggerInstance.info(`Received ${signal}, shutting down...`);
  }

  try {
    if (daemonServer) {
      await daemonServer.stop();
    }

    if (dbConnection) {
      dbConnection.close();
    }

    if (loggerInstance) {
      loggerInstance.info('Shutdown complete');
    }
    process.exit(0);
  } catch (error) {
    if (loggerInstance) {
      loggerInstance.error('Error during shutdown:', error);
    } else {
      console.error('Error during shutdown:', error);
    }
    process.exit(1);
  }
};

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
      const config = loadConfig(options.config);

      if (options.port) {
        config.server.port = parseInt(options.port, 10);
      }

      const logger = createLogger({
        level: options.logLevel || config.logging.level,
        format: format.combine(
          format.colorize(),
          format.simple()
        ),
        transports: [new transports.Console()],
      });

      loggerInstance = logger;
      logger.info('Starting daemon...');

      const db = new DatabaseConnection(config.database.path, config.database.migrationsDir || '');
      await db.initialize();
      dbConnection = db;

      const keystore = new KeystoreManager(undefined);
      const credentialRepo = new OAuthCredentialsRepository(db);

      const server = new DaemonServer(logger, config);
      daemonServer = server;

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

      process.on('SIGINT', () => gracefulShutdown('SIGINT'));
      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    } catch (error) {
      console.error('Failed to start daemon:', error);

      if (dbConnection) {
        try {
          dbConnection.close();
        } catch (closeError) {
          console.error('Error closing database during cleanup:', closeError);
        }
      }

      process.exit(1);
    }
  });

program.parse(process.argv);
