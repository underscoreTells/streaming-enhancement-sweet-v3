import { z } from 'zod';

export const PlatformEnum = z.enum(['twitch', 'kick', 'youtube']);
export type Platform = z.infer<typeof PlatformEnum>;

export const DatabaseConfigSchema = z.object({
  path: z.string().min(1),
  migrationsDir: z.string().optional(),
});

export const KeystoreConfigSchema = z.object({
  type: z.enum(['native', 'encrypted-file']).optional(),
});

export const LoggingConfigSchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

export const OAuthConfigSchema = z.object({
  redirect_uri: z.string().url().default('http://localhost:3000/callback'),
  server_port: z.number().int().min(1).max(65535).default(3000),
});

export const AppConfigSchema = z.object({
  database: DatabaseConfigSchema,
  keystore: KeystoreConfigSchema.optional(),
  logging: LoggingConfigSchema,
  oauth: OAuthConfigSchema.optional(),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export type OAuthConfig = z.infer<typeof OAuthConfigSchema>;
