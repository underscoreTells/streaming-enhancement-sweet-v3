import { Logger } from 'winston';
import type { DaemonServer } from '../../infrastructure/server/DaemonServer';
import type { DatabaseConnection } from '../../infrastructure/database/Database';
import type { KeystoreManager } from '../../infrastructure/keystore/KeystoreManager';
import { getVersion } from '../../infrastructure/server/utility';

type ComponentStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface ServerHealth {
  status: ComponentStatus;
  uptime: number;
  port: number;
}

export interface DatabaseHealth {
  status: ComponentStatus;
  path: string;
  open: boolean;
}

export interface KeystoreHealth {
  status: ComponentStatus;
  type: string;
  isFallback: boolean;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    server: ServerHealth;
    database: DatabaseHealth;
    keystore: KeystoreHealth;
  };
  version: string;
}

export class HealthCheck {
  private server: DaemonServer;
  private database: DatabaseConnection;
  private keystore: KeystoreManager;
  private logger: Logger;
  private cachedStatus: HealthStatus | null = null;
  private lastCheckTime: number = 0;
  private readonly cacheDurationMs: number = 5000; // 5 seconds

  constructor(
    server: DaemonServer,
    database: DatabaseConnection,
    keystore: KeystoreManager,
    logger: Logger,
    cacheDurationMs: number = 5000
  ) {
    this.server = server;
    this.database = database;
    this.keystore = keystore;
    this.logger = logger;
    this.cacheDurationMs = cacheDurationMs;
  }

  /**
   * Gets the current health status of all components.
   * Results are cached for `cacheDurationMs` (default 5 seconds) to reduce overhead.
   * Note: Cached status may be stale if component health changes within the cache window.
   */
  public getStatus(): HealthStatus {
    const now = Date.now();

    if (this.cachedStatus && (now - this.lastCheckTime) < this.cacheDurationMs) {
      return this.cachedStatus;
    }

    this.logger.debug('Health check requested');

    const serverHealth = this.checkServer();
    const databaseHealth = this.checkDatabase();
    const keystoreHealth = this.checkKeystore();

    const overallStatus = this.calculateOverallStatus(serverHealth, databaseHealth, keystoreHealth);

    this.cachedStatus = {
      status: overallStatus,
      components: {
        server: serverHealth,
        database: databaseHealth,
        keystore: keystoreHealth,
      },
      version: getVersion(),
    };

    this.lastCheckTime = now;

    return this.cachedStatus;
  }

  /**
   * Checks server health.
   * Note: Always returns 'healthy' because HealthCheck is only instantiated after the server starts.
   * If this is called before server.start() or after server.stop(), the status may be misleading.
   */
  private checkServer(): ServerHealth {
    const uptime = this.server.getUptime();
    return {
      status: 'healthy',
      uptime,
      port: this.server.getPort(),
    };
  }

  private checkDatabase(): DatabaseHealth {
    const isOpen = this.database.isOpen();
    return {
      status: isOpen ? 'healthy' : 'unhealthy',
      path: this.database.getPath(),
      open: isOpen,
    };
  }

  private checkKeystore(): KeystoreHealth {
    const keystoreStatus = this.keystore.getStatus();
    const isAvailable = keystoreStatus.isAvailable;

    if (!isAvailable) {
      return {
        status: 'unhealthy',
        type: keystoreStatus.strategyType,
        isFallback: keystoreStatus.isFallback,
      };
    }

    if (keystoreStatus.isFallback) {
      return {
        status: 'degraded',
        type: keystoreStatus.strategyType,
        isFallback: true,
      };
    }

    return {
      status: 'healthy',
      type: keystoreStatus.strategyType,
      isFallback: false,
    };
  }

  private calculateOverallStatus(
    server: ServerHealth,
    database: DatabaseHealth,
    keystore: KeystoreHealth
  ): 'healthy' | 'degraded' | 'unhealthy' {
    if (server.status === 'unhealthy' || database.status === 'unhealthy' || keystore.status === 'unhealthy') {
      return 'unhealthy';
    }

    if (server.status === 'degraded' || database.status === 'degraded' || keystore.status === 'degraded') {
      return 'degraded';
    }

    return 'healthy';
  }
}
