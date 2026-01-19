export interface TokenSet {
  access_token: string;
  refresh_token?: string;
  expires_at: Date;
  refresh_at: Date;
  scope: string[];
}

export interface SerializedTokenSet {
  access_token: string;
  refresh_token?: string;
  expires_at: string;
  refresh_at: string;
  scope: string[];
}

export function serializeTokenSet(tokenSet: TokenSet): string {
  const serialized: SerializedTokenSet = {
    access_token: tokenSet.access_token,
    refresh_token: tokenSet.refresh_token,
    expires_at: tokenSet.expires_at.toISOString(),
    refresh_at: tokenSet.refresh_at.toISOString(),
    scope: tokenSet.scope,
  };
  return JSON.stringify(serialized);
}

export function deserializeTokenSet(json: string): TokenSet {
  const token: SerializedTokenSet = JSON.parse(json);
  return {
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expires_at: new Date(token.expires_at),
    refresh_at: new Date(token.refresh_at),
    scope: token.scope,
  };
}

export function calculateRefreshTimes(
  expiresAt: Date,
  refreshBufferMinutes: number = 5
): { expires_at: Date; refresh_at: Date } {
  const refresh_at = new Date(expiresAt.getTime() - refreshBufferMinutes * 60 * 1000);
  return {
    expires_at: new Date(expiresAt),
    refresh_at,
  };
}

export function isTokenValid(tokenSet: TokenSet): boolean {
  return tokenSet.expires_at > new Date();
}

export function shouldRefreshToken(tokenSet: TokenSet): boolean {
  return tokenSet.refresh_at <= new Date();
}
