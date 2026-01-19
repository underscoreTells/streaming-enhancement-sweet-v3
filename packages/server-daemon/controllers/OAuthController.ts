import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Logger } from 'winston';
import { KeystoreManager } from '../infrastructure/keystore/KeystoreManager';
import { OAuthCredentialsRepository } from '../infrastructure/database/OAuthCredentialsRepository';
import { createTwitchOAuth } from '../platforms/Twitch/factory';
import { createKickOAuth } from '../platforms/Kick/factory';
import { createYouTubeOAuth } from '../platforms/YouTube/factory';
import { OAuthConfig } from '../infrastructure/config/Config';
import { OAuthStateManager } from '../infrastructure/server/OAuthStateManager';
import { readFileSync } from 'fs';
import { join } from 'path';

const platformSchema = z.enum(['twitch', 'kick', 'youtube']);
const credentialsSchema = z.object({
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
  scopes: z.array(z.string()).default([]),
});

export class OAuthController {
  private router: Router;
  private logger: Logger;
  private keystore: KeystoreManager;
  private credentialRepo: OAuthCredentialsRepository;
  private oauthConfig: OAuthConfig;
  private stateManager: OAuthStateManager;

  constructor(
    logger: Logger,
    keystore: KeystoreManager,
    credentialRepo: OAuthCredentialsRepository,
    oauthConfig: OAuthConfig
  ) {
    this.logger = logger;
    this.keystore = keystore;
    this.credentialRepo = credentialRepo;
    this.oauthConfig = oauthConfig;
    this.stateManager = new OAuthStateManager();
    this.router = Router();
    this.routes();
  }

  private routes(): void {
    this.router.get('/start/:platform/:username', this.startOAuth.bind(this));
    this.router.get('/callback/:platform/:state', this.handleCallback.bind(this));
    this.router.post('/credentials/:platform', this.addCredentials.bind(this));
    this.router.get('/status/:platform/:username', this.getStatus.bind(this));
    this.router.delete('/:platform/:username', this.revokeToken.bind(this));
  }

  public getRouter(): Router {
    return this.router;
  }

  private getOAuth(platform: string) {
    switch (platform) {
      case 'twitch':
        return createTwitchOAuth(this.logger, this.keystore, this.credentialRepo, this.oauthConfig);
      case 'kick':
        return createKickOAuth(this.logger, this.keystore, this.credentialRepo, this.oauthConfig);
      case 'youtube':
        return createYouTubeOAuth(this.logger, this.keystore, this.credentialRepo, this.oauthConfig);
      default:
        throw new Error('Invalid platform');
    }
  }

  private async startOAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { platform, username } = req.params;
      platformSchema.parse(platform);

      const oauth = this.getOAuth(platform as string);
      const { url, state } = await oauth.generateAuthorizationUrl();

      await this.stateManager.storeState(platform as string, username as string, state);

      res.json({ auth_url: url, state });
    } catch (error) {
      next(error);
    }
  }

  private async handleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { platform, state } = req.params;
      const { code, error: oauthError, error_description } = req.query;

      platformSchema.parse(platform);

      if (oauthError) {
        res.status(400).send(`OAuth Error: ${oauthError} - ${error_description}`);
        return;
      }

      if (!code || typeof code !== 'string') {
        res.status(400).send('Missing authorization code');
        return;
      }

      const stateInfo = await this.stateManager.getState(platform as string, state as string);
      if (!stateInfo) {
        res.status(400).send('Invalid or expired state');
        await this.stateManager.clearState(platform as string, state as string);
        return;
      }

      const oauth = this.getOAuth(platform as string);
      await oauth.handleOAuthCallback(code, state as string, stateInfo.username);

      await this.stateManager.clearState(platform as string, state as string);

      const htmlPath = join(__dirname, '../platforms/templates/callback.html');
      const html = readFileSync(htmlPath, 'utf-8');
      const platformColors: Record<string, { color: string; hover: string; name: string }> = {
        twitch: { color: '#9146FF', hover: '#772ce8', name: 'Twitch' },
        kick: { color: '#53fc18', hover: '#53fc18', name: 'Kick' },
        youtube: { color: '#FF0000', hover: '#cc0000', name: 'YouTube' },
      };

      const platformInfo = platformColors[platform as string];
      const finalHtml = html
        .replace(/{platformName}/g, platformInfo.name)
        .replace(/{platformColor}/g, platformInfo.color)
        .replace(/{platformHover}/g, platformInfo.hover);

      res.send(finalHtml);
    } catch (error) {
      next(error);
    }
  }

  private async addCredentials(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { platform } = req.params;
      platformSchema.parse(platform);

      const credentials = credentialsSchema.parse(req.body);

      this.credentialRepo.addCredential(
        platform as string,
        credentials.client_id,
        credentials.client_secret,
        credentials.scopes
      );

      res.json({ platform, created_at: new Date().toISOString() });
    } catch (error) {
      next(error);
    }
  }

  private async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { platform, username } = req.params;
      platformSchema.parse(platform);

      const account = `oauth:${platform}:${username}`;
      const tokenData = await this.keystore.getPassword('streaming-enhancement', account);

      if (!tokenData) {
        res.status(404).json({ error: `No OAuth token found for ${account}` });
        return;
      }

      const token = JSON.parse(tokenData);
      const now = new Date();
      const expiresAt = new Date(token.expires_at);
      const status = now < expiresAt ? 'valid' : 'expired';

      res.json({
        username,
        platform,
        status,
        expires_at: token.expires_at,
        refresh_at: token.refresh_at,
        scope: token.scope,
        refreshable: status === 'expired',
      });
    } catch (error) {
      next(error);
    }
  }

  private async revokeToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { platform, username } = req.params;
      platformSchema.parse(platform);

      const account = `oauth:${platform}:${username}`;
      const deleted = await this.keystore.deletePassword('streaming-enhancement', account);

      if (!deleted) {
        res.status(404).json({ error: `No OAuth token found for ${account}` });
        return;
      }

      res.json({ message: 'OAuth token deleted successfully', platform, username });
    } catch (error) {
      next(error);
    }
  }
}
