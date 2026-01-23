import type { TokenSet } from '../types';

/**
 * Interface for platform OAuth integration
 * Handles OAuth flow, token retrieval, and token refresh
 */
export interface PlatformOAuthStrategy {
  /** Platform identifier (e.g., 'twitch', 'kick', 'youtube') */
  readonly platform: string;

  /**
   * Start OAuth flow for a user
   * Returns authorization URL to redirect user to
   */
  startOAuth(username: string): Promise<string>;

  /**
   * Handle OAuth callback
   * Exchange authorization code for tokens
   */
  handleCallback(code: string, state: string): Promise<TokenSet>;

  /**
   * Get access token for a user
   * Automatically refreshes if token is expired
   */
  getAccessToken(username: string): Promise<TokenSet>;

  /**
   * Refresh access token for a user
   */
  refreshToken(refreshToken: string): Promise<TokenSet>;
}
