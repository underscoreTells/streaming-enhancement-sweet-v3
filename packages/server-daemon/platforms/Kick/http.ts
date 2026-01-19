export interface KickTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number | string;
  scope?: string[];
  token_type?: string;
}

export interface KickOAuthErrorResponse {
  error: string;
  error_description?: string;
  hint?: string;
}

export class KickOAuthError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'KickOAuthError';
  }

  static fromResponse(
    errorData: KickOAuthErrorResponse,
    statusCode: number
  ): KickOAuthError {
    const message = errorData.error_description || errorData.error || 'OAuth request failed';
    return new KickOAuthError(message, errorData.error, statusCode);
  }

  static isInvalidGrant(error: unknown): error is KickOAuthError {
    return error instanceof KickOAuthError && error.code === 'invalid_grant';
  }

  static isInvalidClient(error: unknown): error is KickOAuthError {
    return error instanceof KickOAuthError && error.code === 'invalid_client';
  }
}

export async function exchangeCodeForTokens(
  clientId: string,
  clientSecret: string,
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<KickTokenResponse> {
  const url = 'https://id.kick.com/oauth/token';
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    code_verifier: codeVerifier,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'unknown_error' })) as KickOAuthErrorResponse;
    throw KickOAuthError.fromResponse(errorData, response.status);
  }

  const data = await response.json();
  return normalizeTokenResponse(data);
}

export async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<KickTokenResponse> {
  const url = 'https://id.kick.com/oauth/token';
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'unknown_error' })) as KickOAuthErrorResponse;
    throw KickOAuthError.fromResponse(errorData, response.status);
  }

  const data = await response.json();
  return normalizeTokenResponse(data);
}

function normalizeTokenResponse(data: any): KickTokenResponse {
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: typeof data.expires_in === 'string' ? parseInt(data.expires_in, 10) : data.expires_in,
    scope: data.scope ? (Array.isArray(data.scope) ? data.scope : data.scope.split(' ')) : undefined,
    token_type: data.token_type,
  };
}
