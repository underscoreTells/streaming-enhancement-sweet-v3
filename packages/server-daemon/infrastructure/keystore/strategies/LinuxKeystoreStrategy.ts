import { KeystoreStrategy, createKeystoreError, KEYSTORE_ERROR_CODES } from './KeystoreStrategy';
import winston from 'winston';
import { NapiKeystore } from '@streaming-enhancement/keystore-native';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

/**
 * Extracts the error code from a native keystore error.
 * The error code may be in err.code, nested in err.error.code, or embedded in the message.
 */
const extractErrorCode = (err: Error & { code?: string; error?: Error & { code?: string } }): string | undefined => {
  const nestedError = err.error;
  return err.code || nestedError?.code || err.message?.split(':')[0];
};

/**
 * Checks if the error indicates a key was not found.
 */
const isKeyNotFoundError = (err: Error & { code?: string; error?: Error & { code?: string } }): boolean => {
  const errorCode = extractErrorCode(err);
  return errorCode === 'ERR_KEY_NOT_FOUND' || err.message?.includes('ERR_KEY_NOT_FOUND') === true;
};

export class LinuxKeystoreStrategy implements KeystoreStrategy {
  private available: boolean | null = null;
  private keystore: NapiKeystore | null = null;

  constructor() {
    try {
      this.keystore = new NapiKeystore();
    } catch (error) {
      logger.error('Failed to initialize NapiKeystore', error);
      this.available = false;
      return;
    }
    this.checkAvailability();
  }

  private checkAvailability(): void {
    try {
      if (!this.keystore) {
        this.available = false;
        return;
      }
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
    if (!this.keystore) {
      throw createKeystoreError(
        'Linux Secret Service not available',
        KEYSTORE_ERROR_CODES.WRITE_FAILED
      );
    }
    try {
      this.keystore.setPassword(service, account, password);
    } catch (error) {
      const err = error as Error & { code?: string };
      throw createKeystoreError(
        `Failed to set password: ${err.message}`,
        KEYSTORE_ERROR_CODES.WRITE_FAILED,
        err
      );
    }
  }

  async getPassword(service: string, account: string): Promise<string | null> {
    if (!this.keystore) {
      throw createKeystoreError(
        'Linux Secret Service not available',
        KEYSTORE_ERROR_CODES.READ_FAILED
      );
    }
    try {
      const password = this.keystore.getPassword(service, account);
      return password;
    } catch (error) {
      const err = error as Error & { code?: string; error?: Error & { code?: string } };
      if (isKeyNotFoundError(err)) {
        return null;
      }
      throw createKeystoreError(
        `Failed to get password: ${err.message}`,
        KEYSTORE_ERROR_CODES.READ_FAILED,
        err
      );
    }
  }

  async deletePassword(service: string, account: string): Promise<boolean> {
    if (!this.keystore) {
      throw createKeystoreError(
        'Linux Secret Service not available',
        KEYSTORE_ERROR_CODES.DELETE_FAILED
      );
    }
    try {
      this.keystore.deletePassword(service, account);
      return true;
    } catch (error) {
      const err = error as Error & { code?: string; error?: Error & { code?: string } };
      if (isKeyNotFoundError(err)) {
        return false;
      }
      throw createKeystoreError(
        `Failed to delete password: ${err.message}`,
        KEYSTORE_ERROR_CODES.DELETE_FAILED,
        err
      );
    }
  }
}
