import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ShutdownHandler } from '../../src/daemon/ShutdownHandler';
import { DaemonServer } from '../../infrastructure/server/DaemonServer';
import { DatabaseConnection } from '../../infrastructure/database/Database';
import { Logger } from 'winston';

describe('ShutdownHandler', () => {
  let mockServer: DaemonServer;
  let mockDatabase: DatabaseConnection;
  let mockLogger: Logger;
  let exitSpy: vi.SpyInstance;

  beforeEach(() => {
    mockServer = {
      stop: vi.fn().mockResolvedValue(undefined),
      getAddress: vi.fn()
    } as unknown as DaemonServer;

    mockDatabase = {
      close: vi.fn(),
      getDb: vi.fn()
    } as unknown as DatabaseConnection;

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    } as unknown as Logger;

    exitSpy = vi.spyOn(process, 'exit').mockImplementation((_code?: string | number | null) => {
      throw new Error(`process.exit called`);
    });

    vi.spyOn(global, 'setTimeout').mockImplementation((fn: () => void, _delay?: number) => {
      fn();
      return 0 as unknown as NodeJS.Timeout;
    });
  });

  afterEach(() => {
    exitSpy.mockRestore();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('should create instance with default timeout', () => {
    const handler = new ShutdownHandler({
      server: mockServer,
      database: mockDatabase,
      logger: mockLogger
    });
    expect(handler).toBeDefined();
  });

  it('should create instance with custom timeout', () => {
    const handler = new ShutdownHandler({
      server: mockServer,
      database: mockDatabase,
      logger: mockLogger
    }, 5000);
    expect(handler).toBeDefined();
  });

  it('should register SIGTERM and SIGINT handlers', () => {
    const onSpy = vi.spyOn(process, 'on');
    const handler = new ShutdownHandler({
      server: mockServer,
      database: mockDatabase,
      logger: mockLogger
    });

    handler.register();

    expect(onSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    expect(onSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));

    onSpy.mockRestore();
  });

  it('should stop server during shutdown', async () => {
    const handler = new ShutdownHandler({
      server: mockServer,
      database: mockDatabase,
      logger: mockLogger
    });

    await expect(handler.shutdown('SIGTERM')).rejects.toThrow();

    expect(mockServer.stop).toHaveBeenCalled();
  });

  it('should close database during shutdown', async () => {
    const handler = new ShutdownHandler({
      server: mockServer,
      database: mockDatabase,
      logger: mockLogger
    });

    await expect(handler.shutdown('SIGTERM')).rejects.toThrow();

    expect(mockDatabase.close).toHaveBeenCalled();
  });

  it('should call process.exit(0) after shutdown', async () => {
    const handler = new ShutdownHandler({
      server: mockServer,
      database: mockDatabase,
      logger: mockLogger
    });

    await expect(handler.shutdown('SIGTERM')).rejects.toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('should log shutdown start and completion', async () => {
    const handler = new ShutdownHandler({
      server: mockServer,
      database: mockDatabase,
      logger: mockLogger
    });

    await expect(handler.shutdown('SIGTERM')).rejects.toThrow();

    expect(mockLogger.info).toHaveBeenCalledWith('Received SIGTERM, shutting down...');
    expect(mockLogger.info).toHaveBeenCalledWith('Shutdown complete');
  });

  it('should prevent double shutdown', async () => {
    const handler = new ShutdownHandler({
      server: mockServer,
      database: mockDatabase,
      logger: mockLogger
    });

    await expect(handler.shutdown('SIGTERM')).rejects.toThrow();

    await expect(handler.shutdown('SIGTERM')).resolves.toBeUndefined();

    expect(mockServer.stop).toHaveBeenCalledTimes(1);
    expect(mockDatabase.close).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledTimes(1);
  });

  it('should handle server.stop() errors gracefully', async () => {
    const error = new Error('Server stop failed');
    (mockServer.stop as any).mockRejectedValue(error);

    const handler = new ShutdownHandler({
      server: mockServer,
      database: mockDatabase,
      logger: mockLogger
    });

    await expect(handler.shutdown('SIGTERM')).rejects.toThrow();

    expect(mockLogger.error).toHaveBeenCalledWith('Error stopping server:', error);
    expect(mockDatabase.close).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('should handle database.close() errors gracefully', async () => {
    const error = new Error('Database close failed');
    (mockDatabase.close as any).mockImplementation(() => {
      throw error;
    });

    const handler = new ShutdownHandler({
      server: mockServer,
      database: mockDatabase,
      logger: mockLogger
    });

    await expect(handler.shutdown('SIGTERM')).rejects.toThrow();

    expect(mockLogger.error).toHaveBeenCalledWith('Error closing database:', error);
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('should use custom timeout for in-flight requests', async () => {
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation((fn: () => void, _delay?: number) => {
      fn();
      return 0 as unknown as NodeJS.Timeout;
    });

    const handler = new ShutdownHandler({
      server: mockServer,
      database: mockDatabase,
      logger: mockLogger
    }, 5000);

    await expect(handler.shutdown('SIGTERM')).rejects.toThrow();

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
  });
});
