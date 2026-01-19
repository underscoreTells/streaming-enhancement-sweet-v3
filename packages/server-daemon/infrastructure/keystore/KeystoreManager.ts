import { KeystoreStrategy, createKeystoreError, KEYSTORE_ERROR_CODES, isKeystoreError } from './strategies/KeystoreStrategy';
import { WindowsKeystoreStrategy } from './strategies/WindowsKeystoreStrategy';
import { MacosKeystoreStrategy } from './strategies/MacosKeystoreStrategy';
import { LinuxKeystoreStrategy } from './strategies/LinuxKeystoreStrategy';
import { EncryptedFileStrategy } from './strategies/EncryptedFileStrategy';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

export interface KeystoreStatus {
  strategyType: string;
  isAvailable: boolean;
  isFallback: boolean;
}

export class KeystoreManager {
  private strategy: KeystoreStrategy;
  private strategyType: string;
  private isFallback: boolean;

  constructor(strategy?: KeystoreStrategy) {
    if (strategy) {
      this.strategy = strategy;
      this.strategyType = 'custom';
      this.isFallback = false;
    } else {
      const result = this.detectAndCreateStrategy();
      this.strategy = result.strategy;
      this.strategyType = result.type;
      this.isFallback = result.isFallback;
    }

    this.logStrategyStatus();
  }

  private detectAndCreateStrategy(): { strategy: KeystoreStrategy; type: string; isFallback: boolean } {
    const platform = process.platform;
    let nativeStrategy: KeystoreStrategy | null = null;
    let type = 'unknown';

    switch (platform) {
      case 'win32':
        nativeStrategy = new WindowsKeystoreStrategy();
        type = 'windows';
        break;
      case 'darwin':
        nativeStrategy = new MacosKeystoreStrategy();
        type = 'macos';
        break;
      case 'linux':
        nativeStrategy = new LinuxKeystoreStrategy();
        type = 'linux';
        break;
      default:
        logger.warn(`Unsupported platform: ${platform}, using encrypted file fallback`);
        return {
          strategy: new EncryptedFileStrategy(),
          type: 'encrypted-file',
          isFallback: true
        };
    }

    if (nativeStrategy.isAvailable()) {
      logger.info(`Using ${type} keystore strategy`);
      return { strategy: nativeStrategy, type, isFallback: false };
    }

    logger.warn(`Native ${type} keystore unavailable, falling back to encrypted file`);
    return {
      strategy: new EncryptedFileStrategy(),
      type: 'encrypted-file',
      isFallback: true
    };
  }

  private logStrategyStatus(): void {
    const status = this.getStatus();
    logger.info('KeystoreManager initialized', status);
    
    if (status.isFallback) {
      logger.warn('WARNING: Using encrypted file fallback - less secure than native keystore');
    }
  }

  getStatus(): KeystoreStatus {
    return {
      strategyType: this.strategyType,
      isAvailable: this.strategy.isAvailable(),
      isFallback: this.isFallback
    };
  }

  async setPassword(service: string, account: string, password: string): Promise<void> {
    try {
      await this.strategy.setPassword(service, account, password);
    } catch (error) {
      if (isKeystoreError(error as Error)) {
        throw error;
      }
      throw createKeystoreError(
        'Failed to set password',
        KEYSTORE_ERROR_CODES.UNKNOWN,
        error as Error
      );
    }
  }

  async getPassword(service: string, account: string): Promise<string | null> {
    try {
      return await this.strategy.getPassword(service, account);
    } catch (error) {
      if (isKeystoreError(error as Error)) {
        throw error;
      }
      throw createKeystoreError(
        'Failed to get password',
        KEYSTORE_ERROR_CODES.UNKNOWN,
        error as Error
      );
    }
  }

  async deletePassword(service: string, account: string): Promise<boolean> {
    try {
      return await this.strategy.deletePassword(service, account);
    } catch (error) {
      if (isKeystoreError(error as Error)) {
        throw error;
      }
      throw createKeystoreError(
        'Failed to delete password',
        KEYSTORE_ERROR_CODES.UNKNOWN,
        error as Error
      );
    }
  }
}
