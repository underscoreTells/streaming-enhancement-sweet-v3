import { describe, it, expect, vi, afterEach } from 'vitest';
import { KeystoreManager } from '../../../infrastructure/keystore/KeystoreManager';
import { KeystoreStrategy } from '../../../infrastructure/keystore/strategies/KeystoreStrategy';
import { LoggerFactory } from '../../../infrastructure/config';

class MockStrategy implements KeystoreStrategy {
  isAvailableCalled = false;

  constructor(private logger?: any) {}

  isAvailable(): boolean {
    this.isAvailableCalled = true;
    return true;
  }

  async setPassword(): Promise<void> {}
  async getPassword(): Promise<string | null> { return null; }
  async deletePassword(): Promise<boolean> { return false; }
}

const logger = LoggerFactory.create({ level: 'error', maxFiles: 1, maxSize: '1m' }, 'test');

describe('KeystoreManager', () => {
  afterEach(async () => {
    await new Promise<void>((resolve) => {
      let remaining = logger.transports.length;
      if (remaining === 0) {
        resolve();
        return;
      }
      for (const transport of logger.transports) {
        transport.on('finish', () => {
          remaining--;
          if (remaining === 0) resolve();
        });
        transport.end();
      }
    });
  });

  it('should use custom strategy if provided', () => {
    const mockStrategy = new MockStrategy(logger);
    const manager = new KeystoreManager(mockStrategy, logger);
    const status = manager.getStatus();

    expect(status.strategyType).toBe('custom');
    expect(status.isFallback).toBe(false);
  });

  it('should detect platform and create strategy', () => {
    const manager = new KeystoreManager(undefined, logger);
    const status = manager.getStatus();

    expect(['windows', 'macos', 'linux', 'encrypted-file']).toContain(status.strategyType);
    expect(typeof status.isAvailable).toBe('boolean');
  });

  it('should fallback to encrypted file if native unavailable', () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, 'platform', { value: 'fake-platform' });

    try {
      const manager = new KeystoreManager(undefined, logger);
      const status = manager.getStatus();

      expect(status.strategyType).toBe('encrypted-file');
      expect(status.isFallback).toBe(true);
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    }
  });

  it('should delegate setPassword to strategy', async () => {
    const mockStrategy = new MockStrategy(logger);
    const setPasswordSpy = vi.spyOn(mockStrategy, 'setPassword');
    const manager = new KeystoreManager(mockStrategy, logger);

    await manager.setPassword('service', 'account', 'password');

    expect(setPasswordSpy).toHaveBeenCalledWith('service', 'account', 'password');
  });

  it('should delegate getPassword to strategy', async () => {
    const mockStrategy = new MockStrategy(logger);
    const getPasswordSpy = vi.spyOn(mockStrategy, 'getPassword').mockResolvedValue('password');
    const manager = new KeystoreManager(mockStrategy, logger);

    await manager.getPassword('service', 'account');

    expect(getPasswordSpy).toHaveBeenCalledWith('service', 'account');
  });

  it('should delegate deletePassword to strategy', async () => {
    const mockStrategy = new MockStrategy(logger);
    const deletePasswordSpy = vi.spyOn(mockStrategy, 'deletePassword').mockResolvedValue(true);
    const manager = new KeystoreManager(mockStrategy, logger);

    await manager.deletePassword('service', 'account');

    expect(deletePasswordSpy).toHaveBeenCalledWith('service', 'account');
  });
});
