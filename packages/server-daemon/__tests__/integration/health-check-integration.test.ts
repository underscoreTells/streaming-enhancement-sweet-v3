import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Server } from 'http';
import { DaemonServer } from '../../infrastructure/server/DaemonServer';
import { Logger } from 'winston';

describe('Health Check Integration', () => {
  let mockLogger: Logger;
  let serverInstance: Server;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    } as unknown as Logger;

    vi.spyOn(global, 'setTimeout').mockImplementation((fn: () => void, _delay?: number) => {
      fn();
      return 0 as unknown as NodeJS.Timeout;
    });
  });

  afterEach(() => {
    if (serverInstance) {
      serverInstance.close();
    }
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('should create DaemonServer with host configuration', () => {
    const mockConfig = {
      server: {
        port: 3000,
        host: '127.0.0.1',
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
        redirect_uri: 'http://localhost:3000/callback'
      }
    } as any;

    const server = new DaemonServer(mockLogger, mockConfig);
    expect(server.getHost()).toBe('127.0.0.1');
    expect(server.getPort()).toBe(3000);
  });

  it('should bind to configured host', async () => {
    const mockConfig = {
      server: {
        port: 0,
        host: '127.0.0.1',
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
        redirect_uri: 'http://localhost:3000/callback'
      }
    } as any;

    const server = new DaemonServer(mockLogger, mockConfig);
    await server.start();

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Daemon server listening on 127.0.0.1:')
    );

    await server.stop();
  });

  it('should warn when binding to all interfaces', async () => {
    const mockConfig = {
      server: {
        port: 0,
        host: '0.0.0.0',
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
        redirect_uri: 'http://localhost:3000/callback'
      }
    } as any;

    const server = new DaemonServer(mockLogger, mockConfig);
    await server.start();

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Server is accessible from any network interface'
    );

    await server.stop();
  });
});