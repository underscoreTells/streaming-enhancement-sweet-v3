import { randomBytes } from 'crypto';
import { Logger } from 'winston';
import { Mutex } from 'async-mutex';
import { KeystoreManager } from '../infrastructure/keystore/KeystoreManager';
import { TokenSet, serializeTokenSet, deserializeTokenSet, calculateRefreshTimes } from './types';
import { RefreshFailedError } from './errors';

export abstract class OAuthFlow {
  protected readonly logger: Logger;
  protected readonly keystore: KeystoreManager;
  protected readonly mutex: Mutex;

  constructor(logger: Logger, keystore: KeystoreManager) {
    this.logger = logger;
    this.keystore = keystore;
    this.mutex = new Mutex();
  }

  abstract readonly platform: string;

  protected abstract getAuthUrlBase(): string;

  protected abstract getClientId(): string;

  protected abstract getRedirectUri(): string;

  protected abstract getScopes(): string[];

  protected async exchangeCodeForTokens(_code: string): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string[];
  }> {
    throw new Error('exchangeCodeForTokens must be implemented by subclass');
  }

  protected async refreshAccessToken(_refreshToken: string): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string[];
  }> {
    throw new Error('refreshAccessToken must be implemented by subclass');
  }

  async generateAuthorizationUrl(state?: string): Promise<{ url: string; state: string }> {
    const finalState = state ?? this.generateState();
    const url = this.buildAuthUrl(finalState);
    return { url, state: finalState };
  }

  async handleOAuthCallback(code: string, state: string, username: string): Promise<void> {
    const tokens = await this.exchangeCodeForTokens(code);
    await this.processAccessToken(username, tokens);
  }

  async processAccessToken(
    username: string,
    tokens: {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string[];
    }
  ): Promise<void> {
    const tokenSet = this.createTokenSet(tokens);
    await this.storeTokenSet(username, tokenSet);
    this.logger.info(`OAuth tokens stored for user ${username} on platform ${this.platform}`);
  }

  async getAccessToken(username: string): Promise<TokenSet> {
    return this.mutex.runExclusive(async () => {
      try {
        const token = await this.retrieveTokenSet(username);
        if (!token) {
          throw new Error(`No token found for user ${username}`);
        }

        if (this.shouldRefresh(token)) {
          this.logger.debug(`Refreshing token for user ${username} on platform ${this.platform}`);
          const refreshed = await this.refreshTokenInternal(username, token);
          return refreshed;
        }

        return token;
      } catch (error) {
        this.logger.error(`Failed to get access token for user ${username}: ${error}`);
        throw error;
      }
    });
  }

  async refreshToken(username: string): Promise<TokenSet> {
    return this.mutex.runExclusive(async () => {
      const token = await this.retrieveTokenSet(username);
      if (!token) {
        throw new Error(`No token found for user ${username}`);
      }
      return this.refreshTokenInternal(username, token);
    });
  }

  protected generateState(): string {
    return randomBytes(32).toString('base64url');
  }

  /**
   * Override this method to add platform-specific parameters to the authorization URL.
   * @returns A record of additional query parameters to include in the auth URL.
   */
  protected getExtraAuthParams(): Record<string, string> {
    return {};
  }

  private buildAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.getClientId(),
      redirect_uri: this.getRedirectUri(),
      response_type: 'code',
      state,
    });

    const scopes = this.getScopes();
    if (scopes.length > 0) {
      params.append('scope', scopes.join(' '));
    }

    const extraParams = this.getExtraAuthParams();
    for (const [key, value] of Object.entries(extraParams)) {
      params.append(key, value);
    }

    return `${this.getAuthUrlBase()}?${params.toString()}`;
  }

  private createTokenSet(
    tokens: {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string[];
    }
  ): TokenSet {
    const expiresIn = tokens.expires_in ?? 24 * 60 * 60;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    const { expires_at, refresh_at } = calculateRefreshTimes(expiresAt);

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at,
      refresh_at,
      scope: tokens.scope ?? [],
    };
  }

  private async storeTokenSet(username: string, tokenSet: TokenSet): Promise<void> {
    const serialized = serializeTokenSet(tokenSet);
    await this.keystore.setPassword(
      'streaming-enhancement',
      `oauth:${this.platform}:${username}`,
      serialized
    );
  }

  private async retrieveTokenSet(username: string): Promise<TokenSet | null> {
    try {
      const serialized = await this.keystore.getPassword(
        'streaming-enhancement',
        `oauth:${this.platform}:${username}`
      );
      if (!serialized) {
        return null;
      }
      return deserializeTokenSet(serialized);
    } catch (error) {
      this.logger.warn(`Failed to retrieve token for user ${username}: ${error}`);
      return null;
    }
  }

  private shouldRefresh(tokenSet: TokenSet): boolean {
    return tokenSet.refresh_at <= new Date();
  }

  private async refreshTokenInternal(username: string, tokenSet: TokenSet): Promise<TokenSet> {
    if (!tokenSet.refresh_token) {
      throw new RefreshFailedError(
        `No refresh token available for user ${username}. User must re-authenticate.`
      );
    }

    try {
      const tokens = await this.refreshAccessToken(tokenSet.refresh_token);
      const newTokenSet = this.createTokenSet(tokens);

      if (!tokens.refresh_token) {
        newTokenSet.refresh_token = tokenSet.refresh_token;
      }

      await this.storeTokenSet(username, newTokenSet);
      this.logger.info(`Token refreshed successfully for user ${username} on platform ${this.platform}`);

      return newTokenSet;
    } catch (error) {
      if (error instanceof RefreshFailedError) {
        throw error;
      }
      this.logger.error(`Failed to refresh token for user ${username}: ${error}`);
      throw new RefreshFailedError(
        `Failed to refresh access token for user ${username}`,
        error instanceof Error ? error : undefined
      );
    }
  }
}