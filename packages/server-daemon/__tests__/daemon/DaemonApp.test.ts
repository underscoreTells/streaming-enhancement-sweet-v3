import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DaemonApp } from '../../src/daemon/DaemonApp';
import { DatabaseConnection } from '../../infrastructure/database/Database';
import { KeystoreManager } from '../../infrastructure/keystore/KeystoreManager';
import { AppConfig } from '../../infrastructure/config/Config';
import { Logger } from 'winston';

const oauthCredentialRepoMock = {
  addCredential: vi.fn(),
  getCredential: vi.fn(),
  deleteCredential: vi.fn(),
  hasCredential: vi.fn(),
  clear: vi.fn()
} as any;

describe('DaemonApp', () => {
  let mockDatabase: DatabaseConnection;
  let mockKeystore: KeystoreManager;
  let mockConfig: AppConfig;
  let mockLogger: Logger;
  let originalEnv: string;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV || '';

    mockDatabase = {
      initialize: vi.fn().mockResolvedValue(undefined),
      close: vi.fn(),
      getDb: vi.fn()
    } as unknown as DatabaseConnection;

    mockKeystore = {
      initialize: vi.fn().mockResolvedValue(undefined),
      getStatus: vi.fn().mockReturnValue({
        strategyType: 'encrypted-file',
        isAvailable: true,
        isFallback: false
      })
    } as unknown as KeystoreManager;

    mockConfig = {
      server: {
        port: 3000,
        shutdownTimeout: 10000,
        healthCheckPath: '/status'
      },
      database: {
        path: '/tmp/test.db',
        migrationsDir: ''
      },
      logging: {
        level: 'info',
        maxFiles: 5,
        maxSize: '10M'
      },
      oauth: {
        twitch: { clientId: 'test', clientSecret: 'test' },
        kick: { clientId: 'test' },
        youtube: { clientId: 'test' }
      }
    } as unknown as AppConfig;

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    } as unknown as Logger;

    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('should create instance with dependencies', () => {
    const daemonApp = new DaemonApp({
      config: mockConfig,
      logger: mockLogger,
      database: mockDatabase,
      keystore: mockKeystore,
      oauthCredentialRepo: oauthCredentialRepoMock
    });

    expect(daemonApp).toBeDefined();
    expect(daemonApp.isStarted()).toBe(false);
    expect(daemonApp.getLogger()).toBe(mockLogger);
  });

  it('should throw when adding health check route before start', () => {
    const daemonApp = new DaemonApp({
      config: mockConfig,
      logger: mockLogger,
      database: mockDatabase,
      keystore: mockKeystore,
      oauthCredentialRepo: oauthCredentialRepoMock
    });

    expect(() => daemonApp.addHealthCheckRoute()).toThrow('Server not started');
  });

  it('should return logger', () => {
    const daemonApp = new DaemonApp({
      config: mockConfig,
      logger: mockLogger,
      database: mockDatabase,
      keystore: mockKeystore,
      oauthCredentialRepo: oauthCredentialRepoMock
    });

    expect(daemonApp.getLogger()).toBe(mockLogger);
  });

  it('should return null for server before start', () => {
    const daemonApp = new DaemonApp({
      config: mockConfig,
      logger: mockLogger,
      database: mockDatabase,
      keystore: mockKeystore,
      oauthCredentialRepo: oauthCredentialRepoMock
    });

    expect(daemonApp.getServer()).toBe(null);
  });
});