import { DaemonServer } from '../../infrastructure/server/DaemonServer';
import { DatabaseConnection } from '../../infrastructure/database/Database';
import { KeystoreManager } from '../../infrastructure/keystore/KeystoreManager';
import { OAuthCredentialsRepository } from '../../infrastructure/database/OAuthCredentialsRepository';
import { OAuthController } from '../../controllers/OAuthController';
import { HealthCheck } from './HealthCheck';
import { AppConfig } from '../../infrastructure/config/Config';
import { Logger } from 'winston';

export interface DaemonAppDeps {
  config: AppConfig;
  logger: Logger;
  database: DatabaseConnection;
  keystore: KeystoreManager;
  oauthCredentialRepo: OAuthCredentialsRepository;
}

export class DaemonApp {
  private readonly config: AppConfig;
  private readonly logger: Logger;
  private readonly database: DatabaseConnection;
  private readonly keystore: KeystoreManager;
  private readonly oauthCredentialRepo: OAuthCredentialsRepository;
  private server: DaemonServer | null = null;
  private oauthController: OAuthController | null = null;
  private healthCheck: HealthCheck | null = null;

  constructor(deps: DaemonAppDeps) {
    this.config = deps.config;
    this.logger = deps.logger;
    this.database = deps.database;
    this.keystore = deps.keystore;
    this.oauthCredentialRepo = deps.oauthCredentialRepo;
  }

  async start(): Promise<void> {
    const server = new DaemonServer(this.logger, this.config);
    const oauthController = new OAuthController(
      this.logger,
      this.keystore,
      this.oauthCredentialRepo,
      this.config.oauth
    );

    server.attachRoutes('/oauth', oauthController.getRouter());
    server.attachErrorHandler();
    await server.start();

    this.server = server;
    this.oauthController = oauthController;

    this.logger.info(`Server listening on port ${this.config.server.port}, PID: ${process.pid}`);
  }

  async stop(): Promise<void> {
    if (!this.server) {
      return;
    }

    this.logger.info('Stopping daemon...');

    try {
      await this.server.stop();
    } catch (error) {
      this.logger.error('Error stopping server:', error);
    }

    this.server = null;
    this.oauthController = null;

    this.logger.info('Daemon stopped');
  }

  addHealthCheckRoute(): void {
    if (!this.server) {
      throw new Error('Server not started. Call start() first.');
    }

    const healthCheck = new HealthCheck(
      this.server,
      this.database,
      this.keystore,
      this.logger,
      5000
    );

    this.server.getApp().get('/status', (req, res) => {
      const ip = req.ip || req.socket.remoteAddress || '';
      const isLocalhost = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
      if (!isLocalhost) {
        res.status(403).json({ error: 'Forbidden - localhost only' });
        return;
      }

      const status = healthCheck.getStatus();
      res.json(status);
    });

    this.healthCheck = healthCheck;
    this.logger.info(`Health check available at http://localhost:${this.config.server.port}/status`);
  }

  getServer(): DaemonServer | null {
    return this.server;
  }

  getLogger(): Logger {
    return this.logger;
  }

  isStarted(): boolean {
    return this.server !== null;
  }
}