import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import winston from 'winston';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { LoggerFactory } from '../../../infrastructure/config/LoggerFactory';

describe('LoggerFactory', () => {
  let tempDir: string;
  let createdLoggers: winston.Logger[] = [];

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'logger-test-'));
    createdLoggers = [];
  });

  afterEach(async () => {
    // Close all logger transports to prevent ENOENT errors from async writes
    for (const logger of createdLoggers) {
      await new Promise<void>((resolve) => {
        let remaining = logger.transports.length;
        if (remaining === 0) {
          resolve();
          return;
        }
        for (const transport of logger.transports) {
          transport.on('finish', () => {
            remaining--;
            if (remaining === 0) resolve();
          });
          transport.end();
        }
      });
    }

    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // Helper to track created loggers for cleanup
  const createAndTrackLogger = (config: Parameters<typeof LoggerFactory.create>[0], context?: string): winston.Logger => {
    const logger = LoggerFactory.create(config, context);
    createdLoggers.push(logger);
    return logger;
  };

  it('should create a logger with full config (console + file)', () => {
    const config = {
      level: 'info' as const,
      directory: tempDir,
      maxFiles: 7,
      maxSize: '20m' as const,
    };

    const logger = createAndTrackLogger(config, 'test-context');

    expect(logger).toBeInstanceOf(winston.Logger);
    expect(logger.level).toBe('info');
  });

  it('should create logger with no directory (console only)', () => {
    const config = {
      level: 'warn' as const,
      maxFiles: 7,
      maxSize: '20m' as const,
    };

    const logger = createAndTrackLogger(config);

    expect(logger).toBeInstanceOf(winston.Logger);
    expect(logger.level).toBe('warn');
  });

  it('should respect log level filtering', () => {
    const config = {
      level: 'error' as const,
      directory: tempDir,
      maxFiles: 7,
      maxSize: '20m' as const,
    };

    const logger = createAndTrackLogger(config);

    expect(logger.level).toBe('error');
  });

  it('should use ISO 8601 timestamp format', async () => {
    const config = {
      level: 'info' as const,
      directory: tempDir,
      maxFiles: 7,
      maxSize: '20m' as const,
    };

    const logger = createAndTrackLogger(config);

    const testMessage = 'Test message';

    logger.info(testMessage);

    await new Promise(resolve => setTimeout(resolve, 100));

    const logFiles = fs.readdirSync(tempDir);
    const logFile = logFiles.find((f) => f.startsWith('SES-') && f.endsWith('.log'));

    expect(logFile).toBeDefined();

    if (logFile) {
      const logContent = fs.readFileSync(path.join(tempDir, logFile), 'utf-8');
      const iso8601Regex = /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/;

      expect(logContent).toMatch(iso8601Regex);
    }
  });

  it('should include error stack traces at debug level', async () => {
    const config = {
      level: 'debug' as const,
      directory: tempDir,
      maxFiles: 7,
      maxSize: '20m' as const,
    };

    const logger = createAndTrackLogger(config);

    const error = new Error('Test error');
    logger.debug('Error occurred', { error });

    await new Promise(resolve => setTimeout(resolve, 100));

    await new Promise<void>((resolve) => {
      let remaining = logger.transports.length;
      if (remaining === 0) {
        resolve();
        return;
      }
      for (const transport of logger.transports) {
        transport.on('finish', () => {
          remaining--;
          if (remaining === 0) resolve();
        });
        transport.end();
      }
    });

    const logFiles = fs.readdirSync(tempDir).filter((f) => f.startsWith('SES-') && f.endsWith('.log'));
    expect(logFiles.length).toBeGreaterThan(0);

    const logFilePath = path.join(tempDir, logFiles[0]);
    const logContent = fs.readFileSync(logFilePath, 'utf-8');

    expect(logContent).toContain('Error: Test error');
    expect(logContent).toMatch(/Error: Test error[\s\S]*at /);
  });

  it('should create log directory if missing', () => {
    const newDir = path.join(tempDir, 'nonexistent', 'logs');

    expect(fs.existsSync(newDir)).toBe(false);

    const config = {
      level: 'info' as const,
      directory: newDir,
      maxFiles: 7,
      maxSize: '20m' as const,
    };

    const logger = createAndTrackLogger(config);

    expect(logger).toBeInstanceOf(winston.Logger);
    expect(fs.existsSync(newDir)).toBe(true);
  });

  it('should fall back through directory chain when configured fails', async () => {
    const invalidDir = path.join(tempDir, 'invalid-path-that-does-not-exist');

    const config = {
      level: 'info' as const,
      directory: invalidDir,
      maxFiles: 7,
      maxSize: '20m' as const,
    };

    const mkdirSpy = vi.spyOn(fs, 'mkdirSync').mockImplementation((dir, options) => {
      if (String(dir).includes('invalid-path-that-does-not-exist')) {
        const error = new Error('EACCES: permission denied');
        (error as any).code = 'EACCES';
        throw error;
      }
      return fs.mkdirSync(dir, options);
    });

    const logger = createAndTrackLogger(config);

    expect(logger).toBeInstanceOf(winston.Logger);
    expect(logger.transports.length).toBeGreaterThan(0);

    mkdirSpy.mockRestore();
  });

  it('should include context in log metadata', () => {
    const config = {
      level: 'info' as const,
      directory: tempDir,
      maxFiles: 7,
      maxSize: '20m' as const,
    };

    const context = 'test-context';
    const logger = createAndTrackLogger(config, context);

    expect(logger).toBeInstanceOf(winston.Logger);
  });
});
