import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createLogger } from 'winston';
import request from 'supertest';
import express from 'express';
import { OAuthController } from '../../controllers/OAuthController';
import { KeystoreManager } from '../../infrastructure/keystore/KeystoreManager';
import { DatabaseConnection } from '../../infrastructure/database/Database';
import { OAuthCredentialsRepository } from '../../infrastructure/database/OAuthCredentialsRepository';
import { loadConfig, type AppConfig } from '../../infrastructure/config/Config';
import { createTwitchOAuth, createKickOAuth, createYouTubeOAuth } from '../../platforms';
import { ZodError } from 'zod';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../../platforms/Twitch/factory');
vi.mock('../../platforms/Kick/factory');
vi.mock('../../platforms/YouTube/factory');

describe('OAuthController', () => {
  let logger: ReturnType<typeof createLogger>;
  let keystore: KeystoreManager;
  let db: DatabaseConnection;
  let credentialRepo: OAuthCredentialsRepository;
  let oauthConfig: AppConfig['oauth'];
  let app: express.Application;

  const mockTwitchOAuth = {
    generateAuthorizationUrl: vi.fn().mockResolvedValue({ url: 'https://twitch.test/auth', state: 'test-state' }),
    handleOAuthCallback: vi.fn().mockResolvedValue(undefined),
  };

  const mockKickOAuth = {
    generateAuthorizationUrl: vi.fn().mockResolvedValue({ url: 'https://kick.test/auth', state: 'test-state' }),
    handleOAuthCallback: vi.fn().mockResolvedValue(undefined),
  };

  const mockYouTubeOAuth = {
    generateAuthorizationUrl: vi.fn().mockResolvedValue({ url: 'https://youtube.test/auth', state: 'test-state' }),
    handleOAuthCallback: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    logger = createLogger({ silent: true });

    vi.mocked(createTwitchOAuth).mockReturnValue(mockTwitchOAuth as any);
    vi.mocked(createKickOAuth).mockReturnValue(mockKickOAuth as any);
    vi.mocked(createYouTubeOAuth).mockReturnValue(mockYouTubeOAuth as any);

    const config = loadConfig();
    db = new DatabaseConnection(':memory:', '');
    const nativeDb = db.getNativeDb();
    nativeDb.exec(`
      CREATE TABLE oauth_credentials (
        platform TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        client_secret TEXT NOT NULL,
        scopes TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    keystore = new KeystoreManager(undefined);
    credentialRepo = new OAuthCredentialsRepository(db);
    oauthConfig = config.oauth;

    const controller = new OAuthController(logger, keystore, credentialRepo, oauthConfig);
    app = express();
    app.use(express.json());
    app.use('/oauth', controller.getRouter());

    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      if (err instanceof ZodError) {
        res.status(400).json({ error: err.issues[0].message });
        return;
      }
      if (typeof (err as any).status === 'number') {
        res.status((err as any).status).json({ error: err.message });
        return;
      }
      logger.error('Unhandled error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
  });

  afterEach(async () => {
    vi.clearAllMocks();
    if (db) {
      await db.close();
    }
  });

  describe('GET /oauth/start/:platform/:username', () => {
    it('should generate authorization URL for Twitch', async () => {
      credentialRepo.addCredential('twitch', 'test-client-id', 'test-secret', ['scope1']);

      const response = await request(app)
        .get('/oauth/start/twitch/testuser')
        .expect(200);

      expect(response.body).toEqual({
        auth_url: 'https://twitch.test/auth',
        state: 'test-state',
      });
      expect(mockTwitchOAuth.generateAuthorizationUrl).toHaveBeenCalled();
    });

    it('should generate authorization URL for Kick', async () => {
      credentialRepo.addCredential('kick', 'test-client-id', 'test-secret', ['scope1']);

      const response = await request(app)
        .get('/oauth/start/kick/testuser')
        .expect(200);

      expect(response.body).toEqual({
        auth_url: 'https://kick.test/auth',
        state: 'test-state',
      });
      expect(mockKickOAuth.generateAuthorizationUrl).toHaveBeenCalled();
    });

    it('should generate authorization URL for YouTube', async () => {
      credentialRepo.addCredential('youtube', 'test-client-id', 'test-secret', ['scope1']);

      const response = await request(app)
        .get('/oauth/start/youtube/testuser')
        .expect(200);

      expect(response.body).toEqual({
        auth_url: 'https://youtube.test/auth',
        state: 'test-state',
      });
      expect(mockYouTubeOAuth.generateAuthorizationUrl).toHaveBeenCalled();
    });

    it('should return 400 for invalid platform', async () => {
      const response = await request(app)
        .get('/oauth/start/invalid/testuser')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 when credentials not found', async () => {
      const response = await request(app)
        .get('/oauth/start/twitch/testuser')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /oauth/callback/:platform/:state', () => {
    it('should handle OAuth callback for Twitch', async () => {
      credentialRepo.addCredential('twitch', 'test-client-id', 'test-secret', ['scope1']);

      const startResponse = await request(app)
        .get('/oauth/start/twitch/testuser')
        .expect(200);

      const state = startResponse.body.state;

      const response = await request(app)
        .get(`/oauth/callback/twitch/${state}?code=test-code`)
        .expect(200);

      expect(response.text).toContain('Authentication Complete');
      expect(response.text).toContain('Twitch');
      expect(mockTwitchOAuth.handleOAuthCallback).toHaveBeenCalledWith('test-code', state, 'testuser');
    });

    it('should handle OAuth callback for Kick', async () => {
      credentialRepo.addCredential('kick', 'test-client-id', 'test-secret', ['scope1']);

      const startResponse = await request(app)
        .get('/oauth/start/kick/testuser')
        .expect(200);

      const state = startResponse.body.state;

      const response = await request(app)
        .get(`/oauth/callback/kick/${state}?code=test-code`)
        .expect(200);

      expect(response.text).toContain('Authentication Complete');
      expect(response.text).toContain('Kick');
      expect(mockKickOAuth.handleOAuthCallback).toHaveBeenCalledWith('test-code', state, 'testuser');
    });

    it('should handle OAuth callback for YouTube', async () => {
      credentialRepo.addCredential('youtube', 'test-client-id', 'test-secret', ['scope1']);

      const startResponse = await request(app)
        .get('/oauth/start/youtube/testuser')
        .expect(200);

      const state = startResponse.body.state;

      const response = await request(app)
        .get(`/oauth/callback/youtube/${state}?code=test-code`)
        .expect(200);

      expect(response.text).toContain('Authentication Complete');
      expect(response.text).toContain('YouTube');
      expect(mockYouTubeOAuth.handleOAuthCallback).toHaveBeenCalledWith('test-code', state, 'testuser');
    });

    it('should return 400 for missing code parameter', async () => {
      const response = await request(app)
        .get('/oauth/callback/twitch/test-state')
        .expect(400);

      expect(response.text).toContain('Missing authorization code');
    });

    it('should return 400 for OAuth error', async () => {
      const response = await request(app)
        .get('/oauth/callback/twitch/test-state?error=access_denied&error_description=User denied access')
        .expect(400);

      expect(response.text).toContain('OAuth Error');
      expect(response.text).toContain('access_denied');
    });
  });

  describe('POST /oauth/credentials/:platform', () => {
    it('should add Twitch credentials', async () => {
      const response = await request(app)
        .post('/oauth/credentials/twitch')
        .send({ client_id: 'test-id', client_secret: 'test-secret', scopes: ['scope1'] })
        .expect(200);

      expect(response.body).toHaveProperty('platform', 'twitch');
      expect(response.body).toHaveProperty('created_at');

      const credential = credentialRepo.getCredential('twitch');
      expect(credential).toEqual({
        platform: 'twitch',
        client_id: 'test-id',
        client_secret: 'test-secret',
        scopes: ['scope1'],
        created_at: expect.any(String),
      });
    });

    it('should add Kick credentials', async () => {
      const response = await request(app)
        .post('/oauth/credentials/kick')
        .send({ client_id: 'test-id', client_secret: 'test-secret', scopes: ['scope1'] })
        .expect(200);

      expect(response.body).toHaveProperty('platform', 'kick');
    });

    it('should add YouTube credentials', async () => {
      const response = await request(app)
        .post('/oauth/credentials/youtube')
        .send({ client_id: 'test-id', client_secret: 'test-secret', scopes: ['scope1'] })
        .expect(200);

      expect(response.body).toHaveProperty('platform', 'youtube');
    });

    it('should return 400 for invalid platform', async () => {
      const response = await request(app)
        .post('/oauth/credentials/invalid')
        .send({ client_id: 'test-id', client_secret: 'test-secret' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for missing client_id', async () => {
      const response = await request(app)
        .post('/oauth/credentials/twitch')
        .send({ client_secret: 'test-secret' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for missing client_secret', async () => {
      const response = await request(app)
        .post('/oauth/credentials/twitch')
        .send({ client_id: 'test-id' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should accept credentials with scopes array', async () => {
      const response = await request(app)
        .post('/oauth/credentials/twitch')
        .send({ client_id: 'test-id', client_secret: 'test-secret', scopes: ['scope1'] })
        .expect(200);

      expect(response.body).toHaveProperty('platform', 'twitch');

      const credential = credentialRepo.getCredential('twitch');
      expect(credential).toHaveProperty('scopes', ['scope1']);
    });
  });

  describe('GET /oauth/status/:platform/:username', () => {
    it('should return token status for valid token', async () => {
      const tokenData = {
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        refresh_at: new Date(Date.now() + 3000000).toISOString(),
        scope: ['scope1', 'scope2'],
      };

      await keystore.setPassword('streaming-enhancement', 'oauth:twitch:testuser', JSON.stringify(tokenData));

      const response = await request(app)
        .get('/oauth/status/twitch/testuser')
        .expect(200);

      expect(response.body).toEqual({
        username: 'testuser',
        platform: 'twitch',
        status: 'valid',
        expires_at: tokenData.expires_at,
        refresh_at: tokenData.refresh_at,
        scope: ['scope1', 'scope2'],
        refreshable: false,
      });
    });

    it('should return expired status for expired token', async () => {
      const tokenData = {
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        expires_at: new Date(Date.now() - 3600000).toISOString(),
        refresh_at: new Date(Date.now() - 4200000).toISOString(),
        scope: ['scope1'],
      };

      await keystore.setPassword('streaming-enhancement', 'oauth:twitch:testuser', JSON.stringify(tokenData));

      const response = await request(app)
        .get('/oauth/status/twitch/testuser')
        .expect(200);

      expect(response.body).toEqual({
        username: 'testuser',
        platform: 'twitch',
        status: 'expired',
        expires_at: tokenData.expires_at,
        refresh_at: tokenData.refresh_at,
        scope: ['scope1'],
        refreshable: true,
      });
    });

    it('should return 404 for non-existent token', async () => {
      const response = await request(app)
        .get('/oauth/status/twitch/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid platform', async () => {
      const response = await request(app)
        .get('/oauth/status/invalid/testuser')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /oauth/:platform/:username', () => {
    it('should delete existing token', async () => {
      await keystore.setPassword('streaming-enhancement', 'oauth:twitch:testuser', JSON.stringify({ access_token: 'test-token' }));

      const response = await request(app)
        .delete('/oauth/twitch/testuser')
        .expect(200);

      expect(response.body).toEqual({
        message: 'OAuth token deleted successfully',
        platform: 'twitch',
        username: 'testuser',
      });

      const tokenData = await keystore.getPassword('streaming-enhancement', 'oauth:twitch:testuser');
      expect(tokenData).toBeNull();
    });

    it('should return 404 for non-existent token', async () => {
      const response = await request(app)
        .delete('/oauth/twitch/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid platform', async () => {
      const response = await request(app)
        .delete('/oauth/invalid/testuser')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});
