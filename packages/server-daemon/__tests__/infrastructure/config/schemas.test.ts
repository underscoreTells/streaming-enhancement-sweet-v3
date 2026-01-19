import { describe, it, expect } from 'vitest';
import { PlatformEnum, AppConfigSchema, DatabaseConfigSchema } from '../../../infrastructure/config/schemas';

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
        database: {
          path: '/path/to/database.db'
        },
        logging: {
          level: 'info'
        }
      });
      expect(result.database.path).toBe('/path/to/database.db');
      expect(result.logging.level).toBe('info');
    });

    it('accepts app config with keystore config', () => {
      const result = AppConfigSchema.parse({
        database: {
          path: '/path/to/database.db'
        },
        keystore: {
          type: 'encrypted-file'
        },
        logging: {
          level: 'debug'
        }
      });
      expect(result.keystore?.type).toBe('encrypted-file');
    });

    it('defaults logging level to info', () => {
      const result = AppConfigSchema.parse({
        database: {
          path: '/path/to/database.db'
        },
        logging: {}
      });
      expect(result.logging.level).toBe('info');
    });

    it('rejects invalid database config', () => {
      expect(() => AppConfigSchema.parse({
        database: {},
        logging: { level: 'info' }
      } as any)).toThrow();
    });

    it('rejects invalid logging level', () => {
      expect(() => AppConfigSchema.parse({
        database: { path: '/path/to/database.db' },
        logging: { level: 'invalid' } as any
      })).toThrow();
    });
  });
});
