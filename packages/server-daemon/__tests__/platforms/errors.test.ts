import { describe, it, expect } from 'vitest';
import {
  OAuthError,
  InvalidStateError,
  TokenExpiredError,
  RefreshFailedError,
  InvalidResponseError,
  NetworkError,
  isOAuthError,
  isInvalidStateError,
  isTokenExpiredError,
  isRefreshFailedError,
  isInvalidResponseError,
  isNetworkError,
} from '../../platforms/errors';

describe('OAuthError', () => {
  it('should create OAuthError with code and message', () => {
    const error = new OAuthError('TEST_CODE', 'Test error message');

    expect(error).toBeInstanceOf(OAuthError);
    expect(error.code).toBe('TEST_CODE');
    expect(error.message).toBe('Test error message');
    expect(error.name).toBe('OAuthError');
    expect(error.cause).toBeUndefined();
  });

  it('should create OAuthError with code, message and cause', () => {
    const cause = new Error('Inner error');
    const error = new OAuthError('TEST_CODE', 'Test error message', cause);

    expect(error.cause).toBe(cause);
  });
});

describe('InvalidStateError', () => {
  it('should create InvalidStateError with default message', () => {
    const error = new InvalidStateError();

    expect(error).toBeInstanceOf(InvalidStateError);
    expect(error).toBeInstanceOf(OAuthError);
    expect(error.code).toBe('INVALID_STATE');
    expect(error.message).toBe('Invalid OAuth state');
    expect(error.name).toBe('InvalidStateError');
  });

  it('should create InvalidStateError with custom message', () => {
    const error = new InvalidStateError('Custom invalid state message');

    expect(error.message).toBe('Custom invalid state message');
  });

  it('should create InvalidStateError with cause', () => {
    const cause = new Error('Inner invalid state error');
    const error = new InvalidStateError('Custom message', cause);

    expect(error.cause).toBe(cause);
  });
});

describe('TokenExpiredError', () => {
  it('should create TokenExpiredError with default message', () => {
    const error = new TokenExpiredError();

    expect(error).toBeInstanceOf(TokenExpiredError);
    expect(error).toBeInstanceOf(OAuthError);
    expect(error.code).toBe('TOKEN_EXPIRED');
    expect(error.message).toBe('Token has expired');
    expect(error.name).toBe('TokenExpiredError');
  });

  it('should create TokenExpiredError with custom message', () => {
    const error = new TokenExpiredError('Custom expired message');

    expect(error.message).toBe('Custom expired message');
  });
});

describe('RefreshFailedError', () => {
  it('should create RefreshFailedError with default message', () => {
    const error = new RefreshFailedError();

    expect(error).toBeInstanceOf(RefreshFailedError);
    expect(error).toBeInstanceOf(OAuthError);
    expect(error.code).toBe('REFRESH_FAILED');
    expect(error.message).toBe('Failed to refresh access token');
    expect(error.name).toBe('RefreshFailedError');
  });

  it('should create RefreshFailedError with custom message', () => {
    const error = new RefreshFailedError('Custom refresh failed message');

    expect(error.message).toBe('Custom refresh failed message');
  });
});

describe('InvalidResponseError', () => {
  it('should create InvalidResponseError with default message', () => {
    const error = new InvalidResponseError();

    expect(error).toBeInstanceOf(InvalidResponseError);
    expect(error).toBeInstanceOf(OAuthError);
    expect(error.code).toBe('INVALID_RESPONSE');
    expect(error.message).toBe('Invalid response from OAuth provider');
    expect(error.name).toBe('InvalidResponseError');
  });

  it('should create InvalidResponseError with custom message', () => {
    const error = new InvalidResponseError('Custom invalid response message');

    expect(error.message).toBe('Custom invalid response message');
  });
});

describe('NetworkError', () => {
  it('should create NetworkError with default message', () => {
    const error = new NetworkError();

    expect(error).toBeInstanceOf(NetworkError);
    expect(error).toBeInstanceOf(OAuthError);
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.message).toBe('Network error during OAuth flow');
    expect(error.name).toBe('NetworkError');
  });

  it('should create NetworkError with custom message', () => {
    const error = new NetworkError('Custom network error message');

    expect(error.message).toBe('Custom network error message');
  });
});

describe('Type guards', () => {
  it('isOAuthError should identify OAuthError instances', () => {
    const error = new OAuthError('TEST', 'Test');
    const standardError = new Error('Standard error');

    expect(isOAuthError(error)).toBe(true);
    expect(isOAuthError(standardError)).toBe(false);
    expect(isOAuthError(null)).toBe(false);
    expect(isOAuthError(undefined)).toBe(false);
  });

  it('isInvalidStateError should identify InvalidStateError instances', () => {
    const error = new InvalidStateError();
    const otherError = new TokenExpiredError();

    expect(isInvalidStateError(error)).toBe(true);
    expect(isInvalidStateError(otherError)).toBe(false);
  });

  it('isTokenExpiredError should identify TokenExpiredError instances', () => {
    const error = new TokenExpiredError();
    const otherError = new InvalidStateError();

    expect(isTokenExpiredError(error)).toBe(true);
    expect(isTokenExpiredError(otherError)).toBe(false);
  });

  it('isRefreshFailedError should identify RefreshFailedError instances', () => {
    const error = new RefreshFailedError();
    const otherError = new TokenExpiredError();

    expect(isRefreshFailedError(error)).toBe(true);
    expect(isRefreshFailedError(otherError)).toBe(false);
  });

  it('isInvalidResponseError should identify InvalidResponseError instances', () => {
    const error = new InvalidResponseError();
    const otherError = new RefreshFailedError();

    expect(isInvalidResponseError(error)).toBe(true);
    expect(isInvalidResponseError(otherError)).toBe(false);
  });

  it('isNetworkError should identify NetworkError instances', () => {
    const error = new NetworkError();
    const otherError = new InvalidResponseError();

    expect(isNetworkError(error)).toBe(true);
    expect(isNetworkError(otherError)).toBe(false);
  });
});