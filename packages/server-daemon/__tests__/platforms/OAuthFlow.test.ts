import { describe, it, expect, beforeEach } from 'vitest';
import { createLogger } from 'winston';
import { OAuthFlow } from '../../platforms/OAuthFlow';
import { MockKeystoreManager } from './mocks/KeystoreManager.mock';
import { KeystoreManager } from '../../infrastructure/keystore/KeystoreManager';

class TestOAuthFlow extends OAuthFlow {
  readonly platform = 'test';

  private mockAuthUrlBase = 'https://example.com/oauth/authorize';
  private mockClientId = 'test_client_id';
  private mockRedirectUri = 'http://localhost:3000/callback';
  private mockScopes = ['read', 'write'];
  private mockExchangeResponse = {
    access_token: 'new_access_token',
    refresh_token: 'new_refresh_token',
    expires_in: 3600,
    scope: ['read', 'write'],
  };
  private mockRefreshResponse = {
    access_token: 'refreshed_access_token',
    refresh_token: 'refreshed_refresh_token',
    expires_in: 3600,
    scope: ['read', 'write'],
  };

  protected getAuthUrlBase(): string {
    return this.mockAuthUrlBase;
  }

  protected getClientId(): string {
    return this.mockClientId;
  }

  protected getRedirectUri(): string {
    return this.mockRedirectUri;
  }

  protected getScopes(): string[] {
    return this.mockScopes;
  }

  protected async exchangeCodeForTokens(_code: string) {
    return this.mockExchangeResponse;
  }

  protected async refreshAccessToken(_refreshToken: string) {
    return this.mockRefreshResponse;
  }

  setMockExchangeResponse(response: {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string[];
  }) {
    this.mockExchangeResponse = {
      ...this.mockExchangeResponse,
      ...response,
    };
  }

  setMockRefreshResponse(response: {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string[];
  }) {
    this.mockRefreshResponse = {
      ...this.mockRefreshResponse,
      ...response,
    };
  }

  setMockScopes(scopes: string[]) {
    this.mockScopes = scopes;
  }
}

describe('OAuthFlow', () => {
  let oauthFlow: TestOAuthFlow;
  let mockKeystore: MockKeystoreManager;
  let logger: ReturnType<typeof createLogger>;

  beforeEach(() => {
    logger = createLogger({
      silent: true,
    });
    mockKeystore = new MockKeystoreManager();
    // Cast mock to KeystoreManager since it implements the same interface
    oauthFlow = new TestOAuthFlow(logger, mockKeystore as unknown as KeystoreManager);
  });

  describe('generateAuthorizationUrl', () => {
    it('should generate authorization URL with state', () => {
      const result = oauthFlow.generateAuthorizationUrl();

      expect(result.url).toBeDefined();
      expect(result.state).toBeDefined();
      expect(result.state.length).toBeGreaterThan(0);
      expect(result.url).toContain('test_client_id');
      expect(result.url).toContain(encodeURIComponent('http://localhost:3000/callback'));
      expect(result.url).toContain('code');
      expect(result.url).toContain(`state=${result.state}`);
      expect(result.url).toContain('read+write');
    });

    it('should generate unique states for multiple calls', () => {
      const result1 = oauthFlow.generateAuthorizationUrl();
      const result2 = oauthFlow.generateAuthorizationUrl();

      expect(result1.state).not.toBe(result2.state);
      expect(result1.url).toContain(result1.state);
      expect(result2.url).toContain(result2.state);
    });

    it('should not include scope parameter when scopes array is empty', () => {
      oauthFlow.setMockScopes([]);
      const result = oauthFlow.generateAuthorizationUrl();

      expect(result.url).not.toContain('scope=');
      expect(result.url).toContain('code');
    });
  });

  describe('processAccessToken', () => {
    it('should store token set from token response', async () => {
      const tokens = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        expires_in: 3600,
        scope: ['read', 'write'],
      };

      await oauthFlow.processAccessToken('testuser', tokens);

      const storedJson = await mockKeystore.getPassword(
        'streaming-enhancement',
        'oauth:test:testuser'
      );

      expect(storedJson).toBeDefined();
      const stored = JSON.parse(storedJson!);
      expect(stored.access_token).toBe('test_access_token');
      expect(stored.refresh_token).toBe('test_refresh_token');
      expect(stored.scope).toEqual(['read', 'write']);
      expect(new Date(stored.expires_at)).toBeInstanceOf(Date);
      expect(new Date(stored.refresh_at)).toBeInstanceOf(Date);
    });

    it('should use default expires_in when not provided', async () => {
      const tokens = {
        access_token: 'test_access_token',
        expires_in: undefined,
        scope: ['read'],
      };

      await oauthFlow.processAccessToken('testuser', tokens);

      const storedJson = await mockKeystore.getPassword(
        'streaming-enhancement',
        'oauth:test:testuser'
      );

      expect(storedJson).toBeDefined();
      const stored = JSON.parse(storedJson!);
      const expiresAt = new Date(stored.expires_at);
      const now = Date.now();
      const oneDayInMs = 24 * 60 * 60 * 1000;
      
      expect(expiresAt.getTime()).toBeGreaterThan(now + oneDayInMs - 2000);
      expect(expiresAt.getTime()).toBeLessThan(now + oneDayInMs + 2000);
    });

    it('should handle missing refresh_token', async () => {
      const tokens = {
        access_token: 'test_access_token',
        expires_in: 3600,
        scope: ['read'],
      };

      await oauthFlow.processAccessToken('testuser', tokens);

      const storedJson = await mockKeystore.getPassword(
        'streaming-enhancement',
        'oauth:test:testuser'
      );

      expect(storedJson).toBeDefined();
      const stored = JSON.parse(storedJson!);
      expect(stored.refresh_token).toBeUndefined();
    });
  });

  describe('getAccessToken', () => {
    it('should return stored token when valid', async () => {
      const tokens = {
        access_token: 'test_access_token',
        expires_in: 3600,
        scope: ['read'],
      };

      await oauthFlow.processAccessToken('testuser', tokens);
      const tokenSet = await oauthFlow.getAccessToken('testuser');

      expect(tokenSet).toBeDefined();
      expect(tokenSet.access_token).toBe('test_access_token');
      expect(tokenSet.scope).toEqual(['read']);
    });

    it('should refresh token when it needs refresh', async () => {
      const tokens = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        expires_in: 200,
        scope: ['read'],
      };

      await oauthFlow.processAccessToken('testuser', tokens);
      
      await new Promise(resolve => setTimeout(resolve, 250));
      
      const tokenSet = await oauthFlow.getAccessToken('testuser');

      expect(tokenSet.access_token).toBe('refreshed_access_token');
      expect(tokenSet.refresh_token).toBe('refreshed_refresh_token');
    });

    it('should throw when no token found', async () => {
      await expect(oauthFlow.getAccessToken('nonexistent')).rejects.toThrow(
        'No token found for user nonexistent'
      );
    });

    it('should handle concurrent requests with mutex', async () => {
      const tokens = {
        access_token: 'initial_token',
        refresh_token: 'test_refresh_token',
        expires_in: 200,
        scope: ['read'],
      };

      await oauthFlow.processAccessToken('testuser', tokens);
      
      await new Promise(resolve => setTimeout(resolve, 250));
      
      const [tokenSet1, tokenSet2] = await Promise.all([
        oauthFlow.getAccessToken('testuser'),
        oauthFlow.getAccessToken('testuser'),
      ]);

      expect(tokenSet1.access_token).toBe('refreshed_access_token');
      expect(tokenSet2.access_token).toBe('refreshed_access_token');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const tokens = {
        access_token: 'old_token',
        refresh_token: 'old_refresh_token',
        expires_in: 3600,
        scope: ['read'],
      };

      await oauthFlow.processAccessToken('testuser', tokens);
      const refreshed = await oauthFlow.refreshToken('testuser');

      expect(refreshed.access_token).toBe('refreshed_access_token');
      expect(refreshed.refresh_token).toBe('refreshed_refresh_token');
    });

    it('should throw when no token found', async () => {
      await expect(oauthFlow.refreshToken('nonexistent')).rejects.toThrow(
        'No token found for user nonexistent'
      );
    });

    it('should preserve old refresh_token when new one is not provided', async () => {
      oauthFlow.setMockRefreshResponse({
        access_token: 'new_access_token',
        refresh_token: undefined,
        expires_in: 3600,
        scope: ['read'],
      });

      const tokens = {
        access_token: 'old_token',
        refresh_token: 'initial_refresh_token',
        expires_in: 3600,
        scope: ['read'],
      };

      await oauthFlow.processAccessToken('testuser', tokens);
      const refreshed = await oauthFlow.refreshToken('testuser');

      expect(refreshed.access_token).toBe('new_access_token');
      expect(refreshed.refresh_token).toBe('initial_refresh_token');
    });

    it('should throw RefreshFailedError when refresh_token is missing', async () => {
      const tokens = {
        access_token: 'old_token',
        expires_in: 3600,
        scope: ['read'],
      };

      await oauthFlow.processAccessToken('testuser', tokens);

      await expect(oauthFlow.refreshToken('testuser')).rejects.toThrow(
        'No refresh token available'
      );
    });
  });

  describe('Token refresh timing', () => {
    it('should set refresh_at 5 minutes before expires_at', async () => {
      const tokens = {
        access_token: 'test_token',
        expires_in: 3600,
        scope: ['read'],
      };

      await oauthFlow.processAccessToken('testuser', tokens);

      const storedJson = await mockKeystore.getPassword(
        'streaming-enhancement',
        'oauth:test:testuser'
      );

      const stored = JSON.parse(storedJson!);
      const expiresAt = new Date(stored.expires_at);
      const refreshAt = new Date(stored.refresh_at);
      const bufferMinutes = (expiresAt.getTime() - refreshAt.getTime()) / (60 * 1000);

      expect(bufferMinutes).toBe(5);
    });
  });
});
