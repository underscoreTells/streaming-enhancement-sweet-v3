import { describe, it, expect } from 'vitest';
import { PlatformEnum, AppConfigSchema, DatabaseConfigSchema, ServerConfigSchema, LoggingConfigSchema } from '../../../infrastructure/config/schemas';

describe('Config Schemas', () => {
  describe('PlatformEnum', () => {
    it('accepts valid platforms', () => {
      expect(PlatformEnum.parse('twitch')).toBe('twitch');
      expect(PlatformEnum.parse('kick')).toBe('kick');
      expect(PlatformEnum.parse('youtube')).toBe('youtube');
    });

    it('rejects invalid platforms', () => {
      expect(() => PlatformEnum.parse('facebook')).toThrow();
      expect(() => PlatformEnum.parse('')).toThrow();
      expect(() => PlatformEnum.parse('Twitch')).toThrow();
    });
  });

  describe('ServerConfigSchema', () => {
    it('accepts valid server config', () => {
      const result = ServerConfigSchema.parse({
        port: 3000,
        shutdownTimeout: 10000,
        healthCheckPath: '/status'
      });
      expect(result.port).toBe(3000);
      expect(result.shutdownTimeout).toBe(10000);
      expect(result.healthCheckPath).toBe('/status');
    });

    it('uses default values for server config', () => {
      const result = ServerConfigSchema.parse({});
      expect(result.port).toBe(3000);
      expect(result.shutdownTimeout).toBe(10000);
      expect(result.healthCheckPath).toBe('/status');
    });
  });

  describe('LoggingConfigSchema', () => {
    it('accepts valid logging config', () => {
      const result = LoggingConfigSchema.parse({
        level: 'debug',
        directory: '/path/to/logs',
        maxFiles: 14,
        maxSize: '50m'
      });
      expect(result.level).toBe('debug');
      expect(result.directory).toBe('/path/to/logs');
      expect(result.maxFiles).toBe(14);
      expect(result.maxSize).toBe('50m');
    });

    it('defaults logging level to info', () => {
      const result = LoggingConfigSchema.parse({});
      expect(result.level).toBe('info');
      expect(result.maxFiles).toBe(7);
      expect(result.maxSize).toBe('20m');
    });

    it('rejects invalid logging level', () => {
      expect(() => LoggingConfigSchema.parse({ level: 'invalid' } as any)).toThrow();
    });
  });

  describe('DatabaseConfigSchema', () => {
    it('accepts valid database config', () => {
      const result = DatabaseConfigSchema.parse({
        path: '/path/to/database.db',
        migrationsDir: '/path/to/migrations'
      });
      expect(result.path).toBe('/path/to/database.db');
      expect(result.migrationsDir).toBe('/path/to/migrations');
    });

    it('accepts database config without migrationsDir', () => {
      const result = DatabaseConfigSchema.parse({
        path: '/path/to/database.db'
      });
      expect(result.path).toBe('/path/to/database.db');
      expect(result.migrationsDir).toBeUndefined();
    });

    it('rejects empty path', () => {
      expect(() => DatabaseConfigSchema.parse({ path: '' })).toThrow();
      expect(() => DatabaseConfigSchema.parse({} as any)).toThrow();
    });
  });

  describe('AppConfigSchema', () => {
    it('accepts valid app config', () => {
      const result = AppConfigSchema.parse({
        server: {
          port: 3000
        },
        database: {
          path: '/path/to/database.db'
        },
        logging: {
          level: 'info'
        },
        oauth: {
          redirect_uri: 'http://localhost:3000/callback'
        }
      });
      expect(result.server.port).toBe(3000);
      expect(result.database.path).toBe('/path/to/database.db');
      expect(result.logging.level).toBe('info');
    });

    it('accepts app config with keystore config', () => {
      const result = AppConfigSchema.parse({
        server: {},
        database: {
          path: '/path/to/database.db'
        },
        keystore: {
          type: 'encrypted-file'
        },
        logging: {
          level: 'debug'
        },
        oauth: {
          redirect_uri: 'http://localhost:3000/callback'
        }
      });
      expect(result.keystore?.type).toBe('encrypted-file');
    });

    it('defaults all config values', () => {
      const result = AppConfigSchema.parse({
        server: {},
        database: {
          path: '/path/to/database.db'
        },
        logging: {},
        oauth: {
          redirect_uri: 'http://localhost:3000/callback'
        }
      });
      expect(result.server.port).toBe(3000);
      expect(result.server.shutdownTimeout).toBe(10000);
      expect(result.server.healthCheckPath).toBe('/status');
      expect(result.logging.level).toBe('info');
      expect(result.logging.maxFiles).toBe(7);
      expect(result.logging.maxSize).toBe('20m');
    });

    it('rejects invalid database config', () => {
      expect(() => AppConfigSchema.parse({
        server: {},
        database: {},
        logging: { level: 'info' },
        oauth: { redirect_uri: 'http://localhost:3000/callback' }
      } as any)).toThrow();
    });

    it('rejects invalid logging level', () => {
      expect(() => AppConfigSchema.parse({
        server: {},
        database: { path: '/path/to/database.db' },
        logging: { level: 'invalid' } as any,
        oauth: { redirect_uri: 'http://localhost:3000/callback' }
      })).toThrow();
    });
  });
});
