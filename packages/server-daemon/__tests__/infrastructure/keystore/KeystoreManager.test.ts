import { describe, it, expect, vi } from 'vitest';
import { KeystoreManager } from '../../../infrastructure/keystore/KeystoreManager';
import { KeystoreStrategy } from '../../../infrastructure/keystore/strategies/KeystoreStrategy';

class MockStrategy implements KeystoreStrategy {
  isAvailableCalled = false;
  
  isAvailable(): boolean {
    this.isAvailableCalled = true;
    return true;
  }

  async setPassword(): Promise<void> {}
  async getPassword(): Promise<string | null> { return null; }
  async deletePassword(): Promise<boolean> { return false; }
}

describe('KeystoreManager', () => {
  it('should use custom strategy if provided', () => {
    const mockStrategy = new MockStrategy();
    const manager = new KeystoreManager(mockStrategy);
    const status = manager.getStatus();
    
    expect(status.strategyType).toBe('custom');
    expect(status.isFallback).toBe(false);
  });

  it('should detect platform and create strategy', () => {
    const manager = new KeystoreManager();
    const status = manager.getStatus();
    
    expect(['windows', 'macos', 'linux', 'encrypted-file']).toContain(status.strategyType);
    expect(typeof status.isAvailable).toBe('boolean');
  });

  it('should fallback to encrypted file if native unavailable', () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, 'platform', { value: 'fake-platform' });
    
    try {
      const manager = new KeystoreManager();
      const status = manager.getStatus();
      
      expect(status.strategyType).toBe('encrypted-file');
      expect(status.isFallback).toBe(true);
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    }
  });

  it('should delegate setPassword to strategy', async () => {
    const mockStrategy = new MockStrategy();
    const setPasswordSpy = vi.spyOn(mockStrategy, 'setPassword');
    const manager = new KeystoreManager(mockStrategy);
    
    await manager.setPassword('service', 'account', 'password');
    
    expect(setPasswordSpy).toHaveBeenCalledWith('service', 'account', 'password');
  });

  it('should delegate getPassword to strategy', async () => {
    const mockStrategy = new MockStrategy();
    const getPasswordSpy = vi.spyOn(mockStrategy, 'getPassword').mockResolvedValue('password');
    const manager = new KeystoreManager(mockStrategy);
    
    await manager.getPassword('service', 'account');
    
    expect(getPasswordSpy).toHaveBeenCalledWith('service', 'account');
  });

  it('should delegate deletePassword to strategy', async () => {
    const mockStrategy = new MockStrategy();
    const deletePasswordSpy = vi.spyOn(mockStrategy, 'deletePassword').mockResolvedValue(true);
    const manager = new KeystoreManager(mockStrategy);
    
    await manager.deletePassword('service', 'account');
    
    expect(deletePasswordSpy).toHaveBeenCalledWith('service', 'account');
  });
});
