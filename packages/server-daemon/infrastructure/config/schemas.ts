import { z } from 'zod';

export const PlatformEnum = z.enum(['twitch', 'kick', 'youtube']);
export type Platform = z.infer<typeof PlatformEnum>;

export const ServerConfigSchema = z.object({
  port: z.number().int().min(1).max(65535).default(3000),
  shutdownTimeout: z.number().default(10000),
  healthCheckPath: z.string().default('/status'),
});

export const DatabaseConfigSchema = z.object({
  path: z.string().min(1),
  migrationsDir: z.string().optional(),
});

export const KeystoreConfigSchema = z.object({
  type: z.enum(['native', 'encrypted-file']).optional(),
});

export const LoggingConfigSchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  directory: z.string().optional(),
  maxFiles: z.number().default(7),
  maxSize: z.string().default('20m'),
});

export const OAuthConfigSchema = z.object({
  redirect_uri: z.string().url().default('http://localhost:3000/callback'),
});

export const AppConfigSchema = z.object({
  server: ServerConfigSchema,
  database: DatabaseConfigSchema,
  keystore: KeystoreConfigSchema.optional(),
  logging: LoggingConfigSchema,
  oauth: OAuthConfigSchema,
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export type OAuthConfig = z.infer<typeof OAuthConfigSchema>;

export type ServerConfig = z.infer<typeof ServerConfigSchema>;

export type LoggingConfig = z.infer<typeof LoggingConfigSchema>;
