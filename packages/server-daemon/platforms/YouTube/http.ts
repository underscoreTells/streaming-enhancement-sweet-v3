export interface YouTubeTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string[];
  token_type?: string;
}

export interface YouTubeOAuthErrorResponse {
  error: string;
  error_description?: string;
}

export class YouTubeOAuthError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'YouTubeOAuthError';
  }

  static fromResponse(
    errorData: YouTubeOAuthErrorResponse,
    statusCode: number
  ): YouTubeOAuthError {
    const message = errorData.error_description || errorData.error || 'OAuth request failed';
    return new YouTubeOAuthError(message, errorData.error, statusCode);
  }

  static isInvalidGrant(error: unknown): error is YouTubeOAuthError {
    return error instanceof YouTubeOAuthError && error.code === 'invalid_grant';
  }

  static isInvalidClient(error: unknown): error is YouTubeOAuthError {
    return error instanceof YouTubeOAuthError && error.code === 'invalid_client';
  }
}

export async function exchangeCodeForTokens(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
): Promise<YouTubeTokenResponse> {
  const url = 'https://oauth2.googleapis.com/token';
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'unknown_error' })) as YouTubeOAuthErrorResponse;
    throw YouTubeOAuthError.fromResponse(errorData, response.status);
  }

  const data = await response.json();
  return normalizeTokenResponse(data);
}

export async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<YouTubeTokenResponse> {
  const url = 'https://oauth2.googleapis.com/token';
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
    const errorData = await response.json().catch(() => ({ error: 'unknown_error' })) as YouTubeOAuthErrorResponse;
    throw YouTubeOAuthError.fromResponse(errorData, response.status);
  }

  const data = await response.json();
  return normalizeTokenResponse(data);
}

function normalizeTokenResponse(data: any): YouTubeTokenResponse {
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    scope: data.scope ? (Array.isArray(data.scope) ? data.scope : data.scope.split(' ')) : undefined,
    token_type: data.token_type,
  };
}
