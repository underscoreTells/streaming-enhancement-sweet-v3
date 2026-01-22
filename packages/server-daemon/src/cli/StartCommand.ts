import { Command } from 'commander';
import { Logger } from 'winston';
import { loadConfig, LoggerFactory } from '../../infrastructure/config';
import { DatabaseConnection } from '../../infrastructure/database/Database';
import { KeystoreManager } from '../../infrastructure/keystore/KeystoreManager';
import { OAuthCredentialsRepository } from '../../infrastructure/database/OAuthCredentialsRepository';
import { DaemonApp } from '../daemon/DaemonApp';
import { ShutdownHandler } from '../daemon/ShutdownHandler';

/** Error codes for daemon startup failures */
export enum DaemonErrorCode {
  CONFIG_ERROR = 1,
  INIT_ERROR = 2,
  STARTUP_ERROR = 3
}

/** Custom error class for typed error handling */
export class DaemonError extends Error {
  constructor(message: string, public readonly code: DaemonErrorCode) {
    super(message);
    this.name = 'DaemonError';
  }
}

export interface StartCommandOptions {
  configPath?: string;
  port?: string;
  logLevel?: string;
}

export class StartCommand {
  private configPath?: string;
  private port?: string;
  private logLevel?: string;
  private database?: DatabaseConnection;
  private keystore?: KeystoreManager;
  private credentialRepo?: OAuthCredentialsRepository;
  private logger?: Logger;

  constructor(options: StartCommandOptions = {}) {
    this.configPath = options.configPath;
    this.port = options.port;
    this.logLevel = options.logLevel;
  }

  async execute(): Promise<void> {
    try {
      const config = loadConfig(this.configPath);

      if (this.port) {
        config.server.port = parseInt(this.port, 10);
      }

      if (this.logLevel) {
        config.logging.level = this.logLevel as 'error' | 'warn' | 'info' | 'debug';
      }

      this.logger = LoggerFactory.create(config.logging, 'daemon');
      this.logger.info('Starting daemon...');

      await this.initializeComponents(config);

      const daemonApp = new DaemonApp({
        config,
        logger: this.logger,
        database: this.database!,
        keystore: this.keystore!,
        oauthCredentialRepo: this.credentialRepo!
      });

      await daemonApp.start();
      daemonApp.addHealthCheckRoute();

      const shutdownHandler = new ShutdownHandler({
        server: daemonApp.getServer(),
        database: this.database!,
        logger: this.logger
      }, config.server.shutdownTimeout || 10000);
      shutdownHandler.register();

      this.logger.info('Daemon started successfully');
    } catch (error) {
      this.handleError(error);
    }
  }

  private async initializeComponents(config: any): Promise<void> {
    const db = new DatabaseConnection(config.database.path, config.database.migrationsDir || '', this.logger);
    await db.initialize();
    this.database = db;

    const keystore = new KeystoreManager(undefined, this.logger);
    this.keystore = keystore;

    const credentialRepo = new OAuthCredentialsRepository(db, this.logger);
    this.credentialRepo = credentialRepo;
  }

  private handleError(error: unknown): never {
    if (this.database) {
      try {
        this.database.close();
      } catch (closeError) {
        console.error('Error closing database during cleanup:', closeError);
      }
    }

    const errorMessage = error instanceof Error ? error.message : String(error);

    // Use typed error codes if available, otherwise fall back to generic startup error
    if (error instanceof DaemonError) {
      const prefix = error.code === DaemonErrorCode.CONFIG_ERROR ? 'Configuration error'
        : error.code === DaemonErrorCode.INIT_ERROR ? 'Initialization error'
        : 'Failed to start daemon';
      console.error(`${prefix}: ${errorMessage}`);
      process.exit(error.code);
    } else {
      console.error(`Failed to start daemon: ${errorMessage}`);
      process.exit(DaemonErrorCode.STARTUP_ERROR);
    }
  }

  getCommand(): Command {
    const command = new Command('start');

    command
      .description('Start daemon server')
      .option('--port <number>', 'Server port', '3000')
      .option('--config <path>', 'Path to config file')
      .option('--log-level <level>', 'Log level (error, warn, info, debug)', 'info')
      .action(async (options) => {
        const startCommand = new StartCommand(options);
        await startCommand.execute();
      });

    return command;
  }
}