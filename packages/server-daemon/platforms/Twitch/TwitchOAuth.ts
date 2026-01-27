import { Logger } from 'winston';
import { OAuthFlow } from '../OAuthFlow';
import { KeystoreManager } from '../../infrastructure/keystore/KeystoreManager';
import { OAuthCredentialsRepository } from '../../infrastructure/database/OAuthCredentialsRepository';
import { OAuthConfig } from '../../infrastructure/config/Config';
import type { PlatformOAuthStrategy } from '../interfaces';
import type { TokenSet } from '../types';
import {
  exchangeCodeForTokens,
  refreshAccessToken,
} from './http';

export class TwitchOAuth extends OAuthFlow implements PlatformOAuthStrategy {
  readonly platform = 'twitch';

  constructor(
    logger: Logger,
    keystore: KeystoreManager,
    private oauthRepo: OAuthCredentialsRepository,
    private config: OAuthConfig
  ) {
    super(logger, keystore);
  }

  protected getAuthUrlBase(): string {
    return 'https://id.twitch.tv/oauth2/authorize';
  }

  protected getClientId(): string {
    const credential = this.oauthRepo.getCredential('twitch');
    if (!credential) {
      throw new Error('Twitch OAuth credentials not found in database. Please add client credentials first.');
    }
    return credential.client_id;
  }

  protected getRedirectUri(): string {
    return this.config.redirect_uri;
  }

  protected getScopes(): string[] {
    const credential = this.oauthRepo.getCredential('twitch');
    if (!credential) {
      throw new Error('Twitch OAuth credentials not found in database. Please add client credentials first.');
    }
    return credential.scopes;
  }

  protected async exchangeCodeForTokens(code: string): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string[];
  }> {
    const credential = this.oauthRepo.getCredential('twitch');
    if (!credential) {
      throw new Error('Twitch OAuth credentials not found in database. Please add client credentials first.');
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
    const credential = this.oauthRepo.getCredential('twitch');
    if (!credential) {
      throw new Error('Twitch OAuth credentials not found in database. Please add client credentials first.');
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

  /**
   * PlatformOAuthStrategy implementation
   * Start OAuth flow for a user
   */
  async startOAuth(username: string): Promise<string> {
    const { url } = await this.generateAuthorizationUrl();
    return url;
  }

  /**
   * PlatformOAuthStrategy implementation
   * Handle OAuth callback
   * 
   * NOTE: This method does NOT persist tokens to the keystore.
   * The caller is responsible for associating tokens with a user
   * and calling the appropriate storage mechanism.
   */
  async handleCallback(code: string, state: string): Promise<TokenSet> {
    const tokens = await this.exchangeCodeForTokens(code);
    return this.handleTokensInternal(tokens, state);
  }

  /**
   * Internal helper to handle auth callback tokens
   */
  private async handleTokensInternal(
    tokens: {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string[];
    },
    state: string
  ): Promise<TokenSet> {
    const { expires_in, refresh_token, scope } = tokens;
    const tokenSet = {
      access_token: tokens.access_token,
      refresh_token,
      expires_at: new Date(Date.now() + (expires_in || 3600) * 1000),
      refresh_at: new Date(Date.now() + (expires_in || 3600) * 1000 - 5 * 60 * 1000),
      scope: scope || [],
    };
    return tokenSet;
  }
}
