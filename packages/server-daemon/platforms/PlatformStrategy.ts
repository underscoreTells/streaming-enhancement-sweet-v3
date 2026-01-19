import type { TokenSet } from './types';

export interface PlatformStrategy {
  readonly platform: string;

  startOAuth(username: string): Promise<string>;

  handleCallback(code: string, state: string): Promise<TokenSet>;

  getAccessToken(username: string): Promise<TokenSet>;

  refreshToken(username: string): Promise<TokenSet>;
}