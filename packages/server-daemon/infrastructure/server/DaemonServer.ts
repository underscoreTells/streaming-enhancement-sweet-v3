import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Logger } from 'winston';
import { ZodError } from 'zod';
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

  public attachErrorHandler(): void {
    this.app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      if (err instanceof ZodError) {
        res.status(400).json({ error: err.issues[0].message });
        return;
      }
      this.logger.error('Unhandled error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(
        this.config.oauth.server_port,
        () => {
          this.logger.info(
            `Daemon server listening on port ${this.config.oauth.server_port}`
          );
          resolve();
        }
      );

      this.server.on('error', (error) => {
        this.logger.error('Failed to start server:', error);
        reject(error);
      });
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
