import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { EncryptedFileStrategy } from '../../../../infrastructure/keystore/strategies/EncryptedFileStrategy';

describe('EncryptedFileStrategy', () => {
  let strategy: EncryptedFileStrategy;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'keystore-test-'));
    
    strategy = new EncryptedFileStrategy();
    strategy['keyPath'] = path.join(tempDir, 'key');
    strategy['dataPath'] = path.join(tempDir, 'data.json');
    strategy['key'] = Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should be available', () => {
    expect(strategy.isAvailable()).toBe(true);
  });

  it('should store and retrieve password', async () => {
    await strategy.setPassword('test-service', 'test-account', 'my-password');
    const password = await strategy.getPassword('test-service', 'test-account');
    expect(password).toBe('my-password');
  });

  it('should return null for non-existent password', async () => {
    const password = await strategy.getPassword('test-service', 'non-existent');
    expect(password).toBeNull();
  });

  it('should delete password', async () => {
    await strategy.setPassword('test-service', 'test-account', 'my-password');
    const deleted = await strategy.deletePassword('test-service', 'test-account');
    expect(deleted).toBe(true);
    
    const password = await strategy.getPassword('test-service', 'test-account');
    expect(password).toBeNull();
  });

  it('should return false when deleting non-existent password', async () => {
    const deleted = await strategy.deletePassword('test-service', 'non-existent');
    expect(deleted).toBe(false);
  });

  it('should persist password across instances', async () => {
    await strategy.setPassword('test-service', 'test-account', 'my-password');
    
    const strategy2 = new EncryptedFileStrategy();
    strategy2['keyPath'] = strategy['keyPath'];
    strategy2['dataPath'] = strategy['dataPath'];
    strategy2['key'] = strategy['key'];
    
    const password = await strategy2.getPassword('test-service', 'test-account');
    expect(password).toBe('my-password');
  });
});
