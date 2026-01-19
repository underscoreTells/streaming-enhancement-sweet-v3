import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import { loadConfig } from '../../../infrastructure/config/Config';

describe('Config Loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (process.env as any).APPDATA = '/mock/appdata';
    (process.env as any).LOCALAPPDATA = '/mock/localappdata';
  });

  describe('loadConfig with no config file', () => {
    it('returns default config', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      const config = loadConfig();
      expect(config.database.path).toBeDefined();
      expect(config.logging.level).toBe('info');
    });
  });

  describe('loadConfig with valid config file', () => {
    it('merges user config with defaults', () => {
      const mockConfig = {
        database: { path: '/custom/path.db' },
        logging: { level: 'debug' }
      };
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockConfig));
      const config = loadConfig();
      expect(config.database.path).toBe('/custom/path.db');
      expect(config.logging.level).toBe('debug');
    });
  });

  describe('loadConfig with invalid config', () => {
    it('throws on invalid config', () => {
      const invalidConfig = {
        database: {},
        logging: { level: 'invalid' }
      };
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(invalidConfig));
      expect(() => loadConfig()).toThrow();
    });
  });

  describe('loadConfig with malformed JSON', () => {
    it('falls back to defaults on parse error', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue('invalid json');
      const config = loadConfig();
      expect(config.database.path).toBeDefined();
    });
  });
});
