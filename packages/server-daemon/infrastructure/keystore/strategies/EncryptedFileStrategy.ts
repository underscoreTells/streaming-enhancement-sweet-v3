import { KeystoreStrategy, createKeystoreError, KEYSSTORE_ERROR_CODES } from './KeystoreStrategy';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export class EncryptedFileStrategy implements KeystoreStrategy {
  private keyPath: string;
  private dataPath: string;
  private key: Buffer;

  constructor() {
    const configDir = this.getConfigDirectory();
    const dataDir = this.getDataDirectory();
    
    this.keyPath = path.join(configDir, 'file.key');
    this.dataPath = path.join(dataDir, 'keystore.json');
    this.key = Buffer.from('');
  }

  private async initializeKey(): Promise<void> {
    if (this.key.length === 0) {
      this.key = Buffer.from(await this.getOrGenerateKey(), 'hex');
    }
  }

  private async ensureKeyInitialized(): Promise<void> {
    if (this.key.length === 0) {
      await this.initializeKey();
    }
  }

  isAvailable(): boolean {
    return true;
  }

  async setPassword(service: string, account: string, password: string): Promise<void> {
    await this.ensureKeyInitialized();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    const data = await this.loadKeystoreData();
    const key = this.createEntryKey(service, account);
    data[key] = {
      iv: iv.toString('hex'),
      ciphertext: encrypted,
      authTag: authTag.toString('hex')
    };

    await this.writeKeystoreData(data);
  }

  async getPassword(service: string, account: string): Promise<string | null> {
    await this.ensureKeyInitialized();
    const data = await this.loadKeystoreData();
    const key = this.createEntryKey(service, account);
    const entry = data[key];

    if (!entry) {
      return null;
    }

    try {
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        this.key,
        Buffer.from(entry.iv, 'hex')
      );
      decipher.setAuthTag(Buffer.from(entry.authTag, 'hex'));

      let decrypted = decipher.update(entry.ciphertext, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      throw createKeystoreError(
        'Failed to decrypt password',
        KEYSSTORE_ERROR_CODES.DECRYPTION_FAILED,
        error as Error
      );
    }
  }

  async deletePassword(service: string, account: string): Promise<boolean> {
    await this.ensureKeyInitialized();
    const data = await this.loadKeystoreData();
    const key = this.createEntryKey(service, account);
    
    if (!(key in data)) {
      return false;
    }

    delete data[key];
    await this.writeKeystoreData(data);
    return true;
  }

  private createEntryKey(service: string, account: string): string {
    return `${service}:${account}`;
  }

  private async loadKeystoreData(): Promise<Record<string, any>> {
    try {
      const content = await fs.readFile(this.dataPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {};
      }
      throw createKeystoreError(
        'Failed to load keystore data',
        KEYSSTORE_ERROR_CODES.READ_FAILED,
        error as Error
      );
    }
  }

  private async writeKeystoreData(data: Record<string, any>): Promise<void> {
    const content = JSON.stringify(data, null, 2);
    const tempPath = this.dataPath + '.tmp';
    
    await fs.writeFile(tempPath, content, 'utf-8');
    await fs.rename(tempPath, this.dataPath);
  }

  private async getOrGenerateKey(): Promise<string> {
    try {
      const content = await fs.readFile(this.keyPath, 'utf-8');
      const key = content.trim();
      
      if (key.length === 64) {
        return key;
      }
      throw createKeystoreError('Invalid key file format', KEYSSTORE_ERROR_CODES.READ_FAILED);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        const newKey = crypto.randomBytes(32).toString('hex');
        await this.ensureDirectoryExists(this.keyPath);
        await fs.writeFile(this.keyPath, newKey, { mode: 0o600 });
        return newKey;
      }
      throw error;
    }
  }

  private async ensureDirectoryExists(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { mode: 0o700, recursive: true });
  }

  private getConfigDirectory(): string {
    switch (process.platform) {
      case 'win32':
        return path.join(process.env.APPDATA || '', 'streaming-enhancement');
      case 'darwin':
        return path.join(os.homedir(), 'Library/Application Support/streaming-enhancement');
      case 'linux':
        return path.join(os.homedir(), '.config/streaming-enhancement');
      default:
        return path.join(os.homedir(), '.streaming-enhancement');
    }
  }

  private getDataDirectory(): string {
    switch (process.platform) {
      case 'win32':
        return path.join(process.env.LOCALAPPDATA || '', 'streaming-enhancement');
      case 'darwin':
        return path.join(os.homedir(), 'Library/Application Support/streaming-enhancement');
      case 'linux':
        return path.join(os.homedir(), '.local/share/streaming-enhancement');
      default:
        return path.join(os.homedir(), '.streaming-enhancement');
    }
  }
}
