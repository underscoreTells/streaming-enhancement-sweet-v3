import { Logger } from 'winston';
import { OAuthFlow } from '../OAuthFlow';
import { KeystoreManager } from '../../infrastructure/keystore/KeystoreManager';
import { OAuthCredentialsRepository } from '../../infrastructure/database/OAuthCredentialsRepository';
import { OAuthConfig } from '../../infrastructure/config/Config';
import {
  exchangeCodeForTokens,
  refreshAccessToken,
} from './http';

export class YouTubeOAuth extends OAuthFlow {
  readonly platform = 'youtube';

  constructor(
    logger: Logger,
    keystore: KeystoreManager,
    private oauthRepo: OAuthCredentialsRepository,
    private config: OAuthConfig
  ) {
    super(logger, keystore);
  }

  protected getAuthUrlBase(): string {
    return 'https://accounts.google.com/o/oauth2/v2/auth';
  }

  protected getClientId(): string {
    const credential = this.oauthRepo.getCredential('youtube');
    if (!credential) {
      throw new Error('YouTube OAuth credentials not found in database. Please add client credentials first.');
    }
    return credential.client_id;
  }

  protected getRedirectUri(): string {
    return this.config.redirect_uri;
  }

  protected getScopes(): string[] {
    const credential = this.oauthRepo.getCredential('youtube');
    if (!credential) {
      throw new Error('YouTube OAuth credentials not found in database. Please add client credentials first.');
    }
    return credential.scopes;
  }

  protected getExtraAuthParams(): Record<string, string> {
    return {
      access_type: 'offline',
      include_granted_scopes: 'true',
      prompt: 'consent',
    };
  }

  protected async exchangeCodeForTokens(code: string): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string[];
  }> {
    const credential = this.oauthRepo.getCredential('youtube');
    if (!credential) {
      throw new Error('YouTube OAuth credentials not found in database. Please add client credentials first.');
    }

    const response = await exchangeCodeForTokens(
      credential.client_id,
      credential.client_secret,
      code,
      this.config.redirect_uri
    );

    this.logger.debug('Successfully exchanged authorization code for tokens', {
      hasRefreshToken: !!response.refresh_token,
      expiresIn: response.expires_in,
    });

    return response;
  }

  protected async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string[];
  }> {
    const credential = this.oauthRepo.getCredential('youtube');
    if (!credential) {
      throw new Error('YouTube OAuth credentials not found in database. Please add client credentials first.');
    }

    const response = await refreshAccessToken(
      credential.client_id,
      credential.client_secret,
      refreshToken
    );

    this.logger.debug('Successfully refreshed access token', {
      hasRefreshToken: !!response.refresh_token,
      expiresIn: response.expires_in,
    });

    return response;
  }

  async handleOAuthCallback(code: string, state: string, username: string): Promise<void> {
    const tokens = await this.exchangeCodeForTokens(code);
    await this.processAccessToken(username, tokens);
  }
}
