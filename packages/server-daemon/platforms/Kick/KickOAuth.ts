import { Logger } from 'winston';
import { OAuthFlow } from '../OAuthFlow';
import { KeystoreManager } from '../../infrastructure/keystore/KeystoreManager';
import { OAuthCredentialsRepository } from '../../infrastructure/database/OAuthCredentialsRepository';
import { OAuthConfig } from '../../infrastructure/config/Config';
import { PKCEManager } from '../pkce/PKCEManager';
import {
  exchangeCodeForTokens,
  refreshAccessToken,
} from './http';

export class KickOAuth extends OAuthFlow {
  readonly platform = 'kick';

  constructor(
    logger: Logger,
    keystore: KeystoreManager,
    private oauthRepo: OAuthCredentialsRepository,
    private config: OAuthConfig,
    private pkceManager: PKCEManager
  ) {
    super(logger, keystore);
  }

  override async generateAuthorizationUrl(state?: string): Promise<{ url: string; state: string }> {
    const finalState = state ?? this.generateState();

    const codeVerifier = this.pkceManager.generateCodeVerifier();
    const codeChallenge = this.pkceManager.generateCodeChallenge(codeVerifier);

    await this.pkceManager.storeVerifier(finalState, codeVerifier);

    const url = this.buildAuthUrlWithPKCE(finalState, codeChallenge);

    return { url, state: finalState };
  }

  async handleOAuthCallback(
    code: string,
    state: string,
    username: string
  ): Promise<void> {
    if (!state) {
      throw new Error('state parameter is required for Kick OAuth');
    }

    const codeVerifier = await this.pkceManager.getVerifier(state);
    if (!codeVerifier) {
      throw new Error('Unable to retrieve code_verifier for state. OAuth flow may have expired.');
    }

    const tokens = await this.exchangeCodeForTokensWithVerifier(code, codeVerifier);

    await this.pkceManager.clearVerifier(state);

    await this.processAccessToken(username, tokens);
  }

  protected getAuthUrlBase(): string {
    return 'https://id.kick.com/oauth/authorize';
  }

  protected getClientId(): string {
    const credential = this.oauthRepo.getCredential('kick');
    if (!credential) {
      throw new Error('Kick OAuth credentials not found in database. Please add client credentials first.');
    }
    return credential.client_id;
  }

  protected getRedirectUri(): string {
    return this.config.redirect_uri;
  }

  protected getScopes(): string[] {
    const credential = this.oauthRepo.getCredential('kick');
    if (!credential) {
      throw new Error('Kick OAuth credentials not found in database. Please add client credentials first.');
    }
    return credential.scopes;
  }

  protected async exchangeCodeForTokensWithVerifier(
    code: string,
    codeVerifier: string
  ): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string[];
  }> {
    const credential = this.oauthRepo.getCredential('kick');
    if (!credential) {
      throw new Error('Kick OAuth credentials not found in database. Please add client credentials first.');
    }

    const response = await exchangeCodeForTokens(
      credential.client_id,
      credential.client_secret,
      code,
      codeVerifier,
      this.config.redirect_uri
    );

    this.logger.debug('Successfully exchanged authorization code for tokens', {
      hasRefreshToken: !!response.refresh_token,
      expiresIn: response.expires_in,
    });

    return {
      access_token: response.access_token,
      refresh_token: response.refresh_token,
      expires_in: response.expires_in,
      scope: response.scope,
    };
  }

  protected async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string[];
  }> {
    const credential = this.oauthRepo.getCredential('kick');
    if (!credential) {
      throw new Error('Kick OAuth credentials not found in database. Please add client credentials first.');
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

    return {
      access_token: response.access_token,
      refresh_token: response.refresh_token,
      expires_in: response.expires_in,
      scope: response.scope,
    };
  }

  private buildAuthUrlWithPKCE(state: string, codeChallenge: string): string {
    const params = new URLSearchParams({
      client_id: this.getClientId(),
      redirect_uri: this.getRedirectUri(),
      response_type: 'code',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    const scopes = this.getScopes();
    if (scopes.length > 0) {
      params.append('scope', scopes.join(' '));
    }

    return `${this.getAuthUrlBase()}?${params.toString()}`;
  }
}
