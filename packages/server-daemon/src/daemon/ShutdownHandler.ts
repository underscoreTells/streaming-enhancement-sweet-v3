import { DaemonServer } from '../../infrastructure/server/DaemonServer';
import { DatabaseConnection } from '../../infrastructure/database/Database';
import { Logger } from 'winston';

export interface ShutdownDeps {
  server: DaemonServer | null;
  database: DatabaseConnection;
  logger: Logger;
}

export class ShutdownHandler {
  private isShuttingDown: boolean = false;
  private readonly timeout: number;
  private readonly deps: ShutdownDeps;

  constructor(deps: ShutdownDeps, timeout: number = 10000) {
    this.deps = deps;
    this.timeout = timeout;
  }

  register(): void {
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));
  }

  async shutdown(signal?: string): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    this.deps.logger.info(`Received ${signal}, shutting down...`);

    try {
      if (this.deps.server) {
        await this.deps.server.stop();
      }
    } catch (error) {
      this.deps.logger.error('Error stopping server:', error);
    }

    await this.waitForInFlightRequests();

    try {
      this.deps.database.close();
    } catch (error) {
      this.deps.logger.error('Error closing database:', error);
    }

    this.deps.logger.info('Shutdown complete');
    process.exit(0);
  }

  private waitForInFlightRequests(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, this.timeout);
    });
  }
}
