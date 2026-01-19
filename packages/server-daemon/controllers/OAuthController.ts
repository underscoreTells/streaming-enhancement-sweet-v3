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

      const credentials = this.credentialRepo.getCredential(platform as string);
      if (!credentials) {
        const error = new Error(`OAuth credentials not found for platform: ${platform}`) as any;
        error.status = 404;
        throw error;
      }

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
        return;
      }

      const oauth = this.getOAuth(platform as string);
      await oauth.handleOAuthCallback(code, state as string, stateInfo.username);

      await this.stateManager.clearState(platform as string, state as string);

      const htmlPath = join(__dirname, '../platforms/templates/callback.html');
      const html = readFileSync(htmlPath, 'utf-8');
      const platformColors: Record<string, { color: string; hover: string; name: string; logo: string }> = {
        twitch: {
          color: '#9146FF',
          hover: '#772ce8',
          name: 'Twitch',
          logo: '<svg viewBox="0 0 24 24" fill="#9146FF"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>',
        },
        kick: {
          color: '#53fc18',
          hover: '#53fc18',
          name: 'Kick',
          logo: '<svg viewBox="0 0 24 24" fill="#53fc18"><path d="M1.333 0v24h5.334v-8.5L12.5 24h7.167l-7.334-10.5L19.667 0H12.5l-5.833 8.5V0z"/></svg>',
        },
        youtube: {
          color: '#FF0000',
          hover: '#cc0000',
          name: 'YouTube',
          logo: '<svg viewBox="0 0 24 24" fill="#FF0000"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
        },
      };

      const platformInfo = platformColors[platform as string];
      const finalHtml = html
        .replace(/{platformName}/g, platformInfo.name)
        .replace(/{platformColor}/g, platformInfo.color)
        .replace(/{platformHover}/g, platformInfo.hover)
        .replace(/{platformLogo}/g, platformInfo.logo);

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
