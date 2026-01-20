import fs from 'fs';
import path from 'path';
import os from 'os';
import { z } from 'zod';
import { AppConfigSchema, type AppConfig } from './schemas';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

const getConfigPath = (): string => {
  const platform = os.platform();
  if (platform === 'win32') {
    return path.join(process.env.APPDATA || '', 'streaming-enhancement', 'config.json');
  }
  return path.join(os.homedir(), '.config', 'streaming-enhancement', 'config.json');
};

const getDefaultDatabasePath = (): string => {
  const platform = os.platform();
  if (platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA || '', 'streaming-enhancement', 'database.db');
  }
  return path.join(os.homedir(), '.local', 'share', 'streaming-enhancement', 'database.db');
};

const getDefaultLogDirectory = (): string => {
  const platform = os.platform();
  if (platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA || '', 'streaming-enhancement', 'logs');
  }
  if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Logs', 'streaming-enhancement');
  }
  return path.join(os.homedir(), '.local', 'state', 'streaming-enhancement', 'logs');
};

const getDefaultConfig = (): AppConfig => {
  return {
    server: {
      port: 3000,
      shutdownTimeout: 10000,
      healthCheckPath: '/status',
    },
    database: { path: getDefaultDatabasePath() },
    keystore: {},
    logging: {
      level: 'info',
      directory: getDefaultLogDirectory(),
      maxFiles: 7,
      maxSize: '20m',
    },
    oauth: {
      redirect_uri: 'http://localhost:3000/callback',
    }
  };
};

export const loadConfig = (): AppConfig => {
  const configPath = getConfigPath();
  const defaultConfig = getDefaultConfig();

  let userConfig: Partial<AppConfig> = {};

  if (fs.existsSync(configPath)) {
    try {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      userConfig = JSON.parse(configContent);
    } catch {
      logger.warn(`Failed to load config from ${configPath}, using defaults`);
    }
  }

  const mergedConfig = {
    server: {
      ...defaultConfig.server,
      ...(userConfig.server || {})
    },
    database: {
      ...defaultConfig.database,
      ...(userConfig.database || {})
    },
    keystore: {
      ...defaultConfig.keystore,
      ...(userConfig.keystore || {})
    },
    logging: {
      ...defaultConfig.logging,
      ...(userConfig.logging || {})
    },
    oauth: {
      ...defaultConfig.oauth,
      ...(userConfig.oauth || {})
    }
  } as const;

  try {
    const validatedConfig = AppConfigSchema.parse(mergedConfig);
    logger.info('Config loaded successfully', {
      dbPath: validatedConfig.database.path,
      logLevel: validatedConfig.logging.level
    });
    return validatedConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Config validation failed', error.issues);
      throw new Error(`Invalid configuration: ${error.issues.map((e: any) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export type { AppConfig };
export type { OAuthConfig } from './schemas';
