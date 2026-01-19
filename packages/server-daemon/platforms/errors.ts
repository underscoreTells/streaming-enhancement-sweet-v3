export class OAuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'OAuthError';
  }
}

export class InvalidStateError extends OAuthError {
  constructor(message?: string, cause?: Error) {
    super('INVALID_STATE', message || 'Invalid OAuth state', cause);
    this.name = 'InvalidStateError';
  }
}

export class TokenExpiredError extends OAuthError {
  constructor(message?: string, cause?: Error) {
    super('TOKEN_EXPIRED', message || 'Token has expired', cause);
    this.name = 'TokenExpiredError';
  }
}

export class RefreshFailedError extends OAuthError {
  constructor(message?: string, cause?: Error) {
    super('REFRESH_FAILED', message || 'Failed to refresh access token', cause);
    this.name = 'RefreshFailedError';
  }
}

export class InvalidResponseError extends OAuthError {
  constructor(message?: string, cause?: Error) {
    super('INVALID_RESPONSE', message || 'Invalid response from OAuth provider', cause);
    this.name = 'InvalidResponseError';
  }
}

export class NetworkError extends OAuthError {
  constructor(message?: string, cause?: Error) {
    super('NETWORK_ERROR', message || 'Network error during OAuth flow', cause);
    this.name = 'NetworkError';
  }
}

export function isOAuthError(error: unknown): error is OAuthError {
  return error instanceof OAuthError;
}

export function isInvalidStateError(error: unknown): error is InvalidStateError {
  return error instanceof InvalidStateError;
}

export function isTokenExpiredError(error: unknown): error is TokenExpiredError {
  return error instanceof TokenExpiredError;
}

export function isRefreshFailedError(error: unknown): error is RefreshFailedError {
  return error instanceof RefreshFailedError;
}

export function isInvalidResponseError(error: unknown): error is InvalidResponseError {
  return error instanceof InvalidResponseError;
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}