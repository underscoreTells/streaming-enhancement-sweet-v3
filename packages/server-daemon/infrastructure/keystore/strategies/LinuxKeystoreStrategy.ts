import { KeystoreStrategy, createKeystoreError, KEYSSTORE_ERROR_CODES } from './KeystoreStrategy';
import winston from 'winston';
import { NapiKeystore } from '@streaming-enhancement/keystore-native';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

export class LinuxKeystoreStrategy implements KeystoreStrategy {
  private available: boolean | null = null;
  private keystore: NapiKeystore;

  constructor() {
    this.keystore = new NapiKeystore();
    this.checkAvailability();
  }

  private checkAvailability(): void {
    try {
      this.available = this.keystore.isAvailable();
      if (!this.available) {
        logger.warn('Linux Secret Service not available');
      }
    } catch (error) {
      logger.error('Failed to check Linux Secret Service availability', error);
      this.available = false;
    }
  }

  isAvailable(): boolean {
    return this.available === true;
  }

  async setPassword(service: string, account: string, password: string): Promise<void> {
    try {
      this.keystore.setPassword(service, account, password);
    } catch (error) {
      const err = error as Error;
      throw createKeystoreError(
        `Failed to set password: ${err.message}`,
        KEYSSTORE_ERROR_CODES.WRITE_FAILED,
        err
      );
    }
  }

  async getPassword(service: string, account: string): Promise<string | null> {
    try {
      const password = this.keystore.getPassword(service, account);
      return password;
    } catch (error) {
      const err = error as Error;
      if (err.message.includes('No entry found') || err.message.includes('NoEntry')) {
        return null;
      }
      throw createKeystoreError(
        `Failed to get password: ${err.message}`,
        KEYSSTORE_ERROR_CODES.READ_FAILED,
        err
      );
    }
  }

  async deletePassword(service: string, account: string): Promise<boolean> {
    try {
      this.keystore.deletePassword(service, account);
      return true;
    } catch (error) {
      const err = error as Error;
      if (err.message.includes('No entry found') || err.message.includes('NoEntry')) {
        return false;
      }
      throw createKeystoreError(
        `Failed to delete password: ${err.message}`,
        KEYSSTORE_ERROR_CODES.UNKNOWN,
        err
      );
    }
  }
}
