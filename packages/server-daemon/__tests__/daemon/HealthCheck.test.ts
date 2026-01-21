import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import winston from 'winston';
import { HealthCheck } from '../../src/daemon/HealthCheck';

describe('HealthCheck', () => {
  let mockServer: any;
  let mockDatabase: any;
  let mockKeystore: any;
  let logger: winston.Logger;
  let healthCheck: HealthCheck;

  beforeEach(() => {
    vi.useFakeTimers();

    mockServer = {
      getStartTime: vi.fn().mockReturnValue(Date.now() - 1000),
      getUptime: vi.fn().mockReturnValue(1000),
      getPort: vi.fn().mockReturnValue(3000),
    };

    mockDatabase = {
      isOpen: vi.fn().mockReturnValue(true),
      getPath: vi.fn().mockReturnValue('/path/to/database.db'),
    };

    mockKeystore = {
      getStatus: vi.fn().mockReturnValue({
        strategyType: 'windows',
        isAvailable: true,
        isFallback: false,
      }),
    };

    logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [new winston.transports.Console()],
    });

    healthCheck = new HealthCheck(
      mockServer,
      mockDatabase,
      mockKeystore,
      logger,
      5000
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getStatus', () => {
    it('should return healthy status when all components are healthy', () => {
      const status = healthCheck.getStatus();

      expect(status.status).toBe('healthy');
      expect(status.components.server.status).toBe('healthy');
      expect(status.components.database.status).toBe('healthy');
      expect(status.components.keystore.status).toBe('healthy');
      expect(status.version).toBeDefined();
    });

    it('should return unhealthy status when database is closed', () => {
      mockDatabase.isOpen.mockReturnValue(false);
      mockDatabase.status = 'unhealthy';

      const status = healthCheck.getStatus();

      expect(status.status).toBe('unhealthy');
      expect(status.components.database.status).toBe('unhealthy');
      expect(status.components.database.open).toBe(false);
    });

    it('should return degraded status when keystore is using fallback', () => {
      mockKeystore.getStatus.mockReturnValue({
        strategyType: 'encrypted-file',
        isAvailable: true,
        isFallback: true,
      });

      const status = healthCheck.getStatus();

      expect(status.status).toBe('degraded');
      expect(status.components.keystore.status).toBe('degraded');
      expect(status.components.keystore.isFallback).toBe(true);
      expect(status.components.keystore.type).toBe('encrypted-file');
    });

    it('should return unhealthy status when keystore is unavailable', () => {
      mockKeystore.getStatus.mockReturnValue({
        strategyType: 'encrypted-file',
        isAvailable: false,
        isFallback: true,
      });

      const status = healthCheck.getStatus();

      expect(status.status).toBe('unhealthy');
      expect(status.components.keystore.status).toBe('unhealthy');
      expect(status.components.keystore.type).toBe('encrypted-file');
      expect(status.components.keystore.isFallback).toBe(true);
    });

    it('should return unhealthy status when multiple issues exist', () => {
      mockDatabase.isOpen.mockReturnValue(false);
      mockKeystore.getStatus.mockReturnValue({
        strategyType: 'encrypted-file',
        isAvailable: false,
        isFallback: true,
      });

      const status = healthCheck.getStatus();

      expect(status.status).toBe('unhealthy');
      expect(status.components.database.status).toBe('unhealthy');
      expect(status.components.keystore.status).toBe('unhealthy');
    });

    it('should cache result for configured duration', () => {
      const firstCall = healthCheck.getStatus();

      vi.advanceTimersByTime(2000);
      const secondCall = healthCheck.getStatus();

      expect(mockServer.getUptime).toHaveBeenCalledTimes(1);
      expect(mockDatabase.isOpen).toHaveBeenCalledTimes(1);
      expect(mockKeystore.getStatus).toHaveBeenCalledTimes(1);
      expect(secondCall).toEqual(firstCall);
    });

    it('should refresh cache after cache duration expires', () => {
      healthCheck.getStatus();

      vi.advanceTimersByTime(5000);

      healthCheck.getStatus();

      expect(mockServer.getUptime).toHaveBeenCalledTimes(2);
      expect(mockDatabase.isOpen).toHaveBeenCalledTimes(2);
      expect(mockKeystore.getStatus).toHaveBeenCalledTimes(2);
    });

    it('should include server uptime and port', () => {
      mockServer.getUptime.mockReturnValue(5000);
      mockServer.getPort.mockReturnValue(8080);

      const status = healthCheck.getStatus();

      expect(status.components.server.uptime).toBe(5000);
      expect(status.components.server.port).toBe(8080);
    });

    it('should include database path and open status', () => {
      mockDatabase.getPath.mockReturnValue('/custom/path/to/db.sqlite');
      mockDatabase.isOpen.mockReturnValue(true);

      const status = healthCheck.getStatus();

      expect(status.components.database.path).toBe('/custom/path/to/db.sqlite');
      expect(status.components.database.open).toBe(true);
    });

    it('should include keystore type and fallback status', () => {
      mockKeystore.getStatus.mockReturnValue({
        strategyType: 'macos',
        isAvailable: true,
        isFallback: false,
      });

      const status = healthCheck.getStatus();

      expect(status.components.keystore.type).toBe('macos');
      expect(status.components.keystore.isFallback).toBe(false);
    });
  });

  describe('checkServer', () => {
    it('should always return healthy for running server', () => {
      const status = healthCheck.getStatus();

      expect(status.components.server.status).toBe('healthy');
    });
  });

  describe('checkDatabase', () => {
    it('should return healthy when database is open', () => {
      mockDatabase.isOpen.mockReturnValue(true);

      const status = healthCheck.getStatus();

      expect(status.components.database.status).toBe('healthy');
      expect(status.components.database.open).toBe(true);
    });

    it('should return unhealthy when database is closed', () => {
      mockDatabase.isOpen.mockReturnValue(false);

      const status = healthCheck.getStatus();

      expect(status.components.database.status).toBe('unhealthy');
      expect(status.components.database.open).toBe(false);
    });
  });

  describe('checkKeystore', () => {
    it('should return healthy for native keystore', () => {
      mockKeystore.getStatus.mockReturnValue({
        strategyType: 'windows',
        isAvailable: true,
        isFallback: false,
      });

      const status = healthCheck.getStatus();

      expect(status.components.keystore.status).toBe('healthy');
      expect(status.components.keystore.type).toBe('windows');
      expect(status.components.keystore.isFallback).toBe(false);
    });

    it('should return degraded for encrypted file fallback', () => {
      mockKeystore.getStatus.mockReturnValue({
        strategyType: 'encrypted-file',
        isAvailable: true,
        isFallback: true,
      });

      const status = healthCheck.getStatus();

      expect(status.components.keystore.status).toBe('degraded');
      expect(status.components.keystore.type).toBe('encrypted-file');
      expect(status.components.keystore.isFallback).toBe(true);
    });

    it('should return unhealthy when keystore is not available', () => {
      mockKeystore.getStatus.mockReturnValue({
        strategyType: 'encrypted-file',
        isAvailable: false,
        isFallback: true,
      });

      const status = healthCheck.getStatus();

      expect(status.components.keystore.status).toBe('unhealthy');
    });
  });

  describe('calculateOverallStatus', () => {
    it('should return healthy when all components are healthy', () => {
      const status = healthCheck.getStatus();
      expect(status.status).toBe('healthy');
    });

    it('should return unhealthy when any component is unhealthy', () => {
      mockDatabase.isOpen.mockReturnValue(false);
      const status = healthCheck.getStatus();
      expect(status.status).toBe('unhealthy');
    });

    it('should return degraded when no unhealthy but some degraded', () => {
      mockKeystore.getStatus.mockReturnValue({
        strategyType: 'encrypted-file',
        isAvailable: true,
        isFallback: true,
      });

      const status = healthCheck.getStatus();
      expect(status.status).toBe('degraded');
    });
  });
});
