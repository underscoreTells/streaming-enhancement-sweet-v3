export interface KeystoreStrategy {
  setPassword(service: string, account: string, password: string): Promise<void>;
  getPassword(service: string, account: string): Promise<string | null>;
  deletePassword(service: string, account: string): Promise<boolean>;
  isAvailable(): boolean;
}

export const KEYSTORE_ERROR_CODES = {
  UNAVAILABLE: 'KEYSTORE_UNAVAILABLE',
  NOT_FOUND: 'KEYSTORE_NOT_FOUND',
  PERMISSION_DENIED: 'KEYSTORE_PERMISSION_DENIED',
  ENCRYPTION_FAILED: 'KEYSTORE_ENCRYPTION_FAILED',
  DECRYPTION_FAILED: 'KEYSTORE_DECRYPTION_FAILED',
  WRITE_FAILED: 'KEYSTORE_WRITE_FAILED',
  READ_FAILED: 'KEYSTORE_READ_FAILED',
  UNKNOWN: 'KEYSTORE_UNKNOWN_ERROR'
} as const;

export type KeystoreErrorCode = typeof KEYSTORE_ERROR_CODES[keyof typeof KEYSTORE_ERROR_CODES];

export function createKeystoreError(message: string, code: KeystoreErrorCode, originalError?: Error): Error {
  const error = new Error(message) as Error & { code: KeystoreErrorCode; originalError?: Error };
  error.code = code;
  if (originalError) {
    error.originalError = originalError;
  }
  return error;
}

export function isKeystoreError(error: Error): error is Error & { code: KeystoreErrorCode } {
  if (!('code' in error) || typeof error.code !== 'string') {
    return false;
  }
  const validCodes = Object.values(KEYSTORE_ERROR_CODES) as string[];
  return validCodes.includes(error.code);
}
