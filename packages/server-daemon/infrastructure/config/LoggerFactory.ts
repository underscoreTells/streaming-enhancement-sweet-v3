import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import fs from 'fs';
import path from 'path';
import { getDefaultLogDirectory } from './Config';
import type { LoggingConfig } from './schemas';

export class LoggerFactory {
  private static readonly SERVICE_NAME = 'SES';

  static create(config: LoggingConfig, context?: string): winston.Logger {
    const logLevel = config.level;
    const transports: winston.transport[] = [];

    const logDir = this.resolveLogDirectory(config.directory);

    if (logDir) {
      try {
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }

        const logFilename = path.join(logDir, `${this.SERVICE_NAME}-%DATE%.log`);

        const fileTransport = new DailyRotateFile({
          filename: logFilename,
          datePattern: 'YYYY-MM-DD',
          level: logLevel,
          maxSize: config.maxSize,
          maxFiles: config.maxFiles,
          symlinkName: `${this.SERVICE_NAME}-current.log`,
          format: this.createFormat(),
        });

        transports.push(fileTransport);
      } catch (error) {
        console.error(`Failed to initialize file transport, using console only:`, error);
      }
    }

    const consoleTransport = new winston.transports.Console({
      level: logLevel,
      format: this.createFormat(),
    });

    transports.push(consoleTransport);

    return winston.createLogger({
      level: logLevel,
      transports,
      defaultMeta: context ? { context } : undefined,
    });
  }

  private static resolveLogDirectory(configuredDir?: string): string | null {
    const candidates: (string | undefined)[] = [
      configuredDir,
      getDefaultLogDirectory(),
      process.cwd(),
    ];

    for (const dir of candidates) {
      if (!dir) continue;

      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        const testFile = path.join(dir, '.write-test');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);

        return dir;
      } catch {
        continue;
      }
    }

    return null;
  }

  private static createFormat(): winston.Logform.Format {
    return winston.format.combine(
      winston.format.timestamp({
        format: () => new Date().toISOString(),
      }),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ level, message, timestamp, context, ...metadata }) => {
        let metaStr = '';
        if (Object.keys(metadata).length > 0) {
          metaStr = JSON.stringify(metadata, (key, value) => {
            if (value instanceof Error) {
              return {
                message: value.message,
                stack: value.stack,
              };
            }
            return value;
          });
        }

        const contextStr = context ? `[${context}] ` : '';

        return `[${timestamp}] [${level}] ${contextStr}${message} ${metaStr}`.trim();
      })
    );
  }
}
