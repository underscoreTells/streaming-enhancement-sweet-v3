import express, { Express } from 'express';
import cors from 'cors';
import { Logger } from 'winston';
import { loadConfig, type AppConfig } from '../config/Config';

export class DaemonServer {
  private app: Express;
  private server: ReturnType<Express['listen']> | null = null;
  private logger: Logger;
  private config: AppConfig;

  constructor(logger: Logger) {
    this.logger = logger;
    this.config = loadConfig();
    this.app = express();
    this.middleware();
  }

  private middleware(): void {
    this.app.use(cors({ origin: 'http://localhost:3000' }));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  public attachRoutes(routePath: string, routes: express.Router): void {
    this.app.use(routePath, routes);
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(
        this.config.oauth.server_port,
        () => {
          this.logger.info(
            `Daemon server listening on port ${this.config.oauth.server_port}`
          );
          resolve();
        }
      );
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.logger.info('Daemon server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
