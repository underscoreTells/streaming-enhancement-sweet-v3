import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createLogger } from 'winston';
import { createHash } from 'crypto';
import { KickOAuth } from '../../../platforms/Kick/KickOAuth';
import { MockKeystoreManager } from '../mocks/KeystoreManager.mock';
import { KeystoreManager } from '../../../infrastructure/keystore/KeystoreManager';
import { OAuthConfig } from '../../../infrastructure/config/Config';
import { PKCEManager } from '../../../platforms/pkce/PKCEManager';
import { RefreshFailedError } from '../../../platforms/errors';

class MockOAuthCredentialsRepository {
  private credentials: Map<string, { client_id: string; client_secret: string; scopes: string[]; created_at: string }> = new Map();

  setCredential(platform: string, clientId: string, clientSecret: string, scopes: string[]): void {
    this.credentials.set(platform, {
      client_id: clientId,
      client_secret: clientSecret,
      scopes,
      created_at: new Date().toISOString(),
    });
  }

  getCredential(platform: string) {
    return this.credentials.get(platform) || null;
  }

  credentialExists(platform: string): boolean {
    return this.credentials.has(platform);
  }

  clear(): void {
    this.credentials.clear();
  }
}

class MockFetch {
  private mockResponses: Map<string, { status: number; data: any }> = new Map();
  private mockErrors: Map<string, Error> = new Map();

  setMockResponse(url: string, response: { status: number; data: any }): void {
    this.mockResponses.set(url, response);
  }

  setMockError(url: string, error: Error): void {
    this.mockErrors.set(url, error);
  }

  async fetch(url: string, _options?: RequestInit): Promise<Response> {
    const error = this.mockErrors.get(url);
    if (error) {
      throw error;
    }

    const mockResponse = this.mockResponses.get(url);
    if (mockResponse) {
      return {
        ok: mockResponse.status >= 200 && mockResponse.status < 300,
        status: mockResponse.status,
        json: async () => mockResponse.data,
      } as Response;
    }

    throw new Error(`No mock response configured for URL: ${url}`);
  }

  clear(): void {
    this.mockResponses.clear();
    this.mockErrors.clear();
  }
}

const mockFetch = new MockFetch();

vi.stubGlobal('fetch', mockFetch.fetch.bind(mockFetch));

describe('KickOAuth', () => {
  let kickOAuth: KickOAuth;
  let mockKeystore: MockKeystoreManager;
  let mockRepo: MockOAuthCredentialsRepository;
  let logger: ReturnType<typeof createLogger>;
  let config: OAuthConfig;
  let pkceManager: PKCEManager;

  beforeEach(() => {
    logger = createLogger({ silent: true });
    mockKeystore = new MockKeystoreManager();
    mockRepo = new MockOAuthCredentialsRepository();
    pkceManager = new PKCEManager();
    config = {
      redirect_uri: 'http://localhost:3000/callback',
    };

    mockRepo.setCredential('kick', 'test_kick_client_id', 'test_kick_client_secret', [
      'user:read',
      'channel:read',
      'channel:write',
      'events:subscribe',
    ]);

    kickOAuth = new KickOAuth(
      logger,
      mockKeystore as unknown as KeystoreManager,
      mockRepo as any,
      config,
      pkceManager
    );

    mockFetch.clear();
  });

  describe('Configuration', () => {
    it('should load credentials from database', () => {
      expect(mockRepo.credentialExists('kick')).toBe(true);
      const credential = mockRepo.getCredential('kick');
      expect(credential?.client_id).toBe('test_kick_client_id');
      expect(credential?.client_secret).toBe('test_kick_client_secret');
      expect(credential?.scopes).toEqual([
        'user:read',
        'channel:read',
        'channel:write',
        'events:subscribe',
      ]);
    });

    it('should use redirect_uri from config', async () => {
      const { url } = await kickOAuth.generateAuthorizationUrl();
      expect(url).toContain('redirect_uri=');
      const urlObj = new URL(url);
      expect(urlObj.searchParams.get('redirect_uri')).toBe('http://localhost:3000/callback');
    });

    it('should throw error when credentials missing', async () => {
      mockRepo.clear();
      await expect(kickOAuth.generateAuthorizationUrl()).rejects.toThrow('Kick OAuth credentials not found in database. Please add client credentials first.');
    });
  });

  describe('Authorization URL Generation', () => {
    it('should generate correct Kick auth URL with PKCE', async () => {
      const { url, state } = await kickOAuth.generateAuthorizationUrl();

      expect(url).toContain('https://id.kick.com/oauth/authorize');
      expect(url).toContain('client_id=test_kick_client_id');
      expect(url).toContain('response_type=code');
      expect(url).toContain(`state=${state}`);
      expect(url).toContain('code_challenge=');
      expect(url).toContain('code_challenge_method=S256');

      const urlObj = new URL(url);
      const scope = urlObj.searchParams.get('scope');
      expect(scope).toContain('user:read');
      expect(scope).toContain('channel:read');
      expect(scope).toContain('channel:write');
      expect(scope).toContain('events:subscribe');
    });

    it('should generate unique states for multiple calls', async () => {
      const result1 = await kickOAuth.generateAuthorizationUrl();
      const result2 = await kickOAuth.generateAuthorizationUrl();

      expect(result1.state).not.toBe(result2.state);
      expect(result1.url).toContain(result1.state);
      expect(result2.url).toContain(result2.state);
    });

    it('should generate unique code_verifiers for multiple calls', async () => {
      const result1 = await kickOAuth.generateAuthorizationUrl();
      const result2 = await kickOAuth.generateAuthorizationUrl();

      const verifier1 = await pkceManager.getVerifier(result1.state);
      const verifier2 = await pkceManager.getVerifier(result2.state);

      expect(verifier1).not.toBe(verifier2);
    });

    it('should use custom state if provided', async () => {
      const customState = 'custom-state-12345';
      const { url, state } = await kickOAuth.generateAuthorizationUrl(customState);

      expect(state).toBe(customState);
      expect(url).toContain(`state=${customState}`);
    });

    it('should include all scopes in auth URL', async () => {
      mockRepo.setCredential('kick', 'client_id', 'client_secret', ['scope1', 'scope2', 'scope3']);

      const oauth = new KickOAuth(
        logger,
        mockKeystore as unknown as KeystoreManager,
        mockRepo as any,
        config,
        pkceManager
      );

      const { url } = await oauth.generateAuthorizationUrl();
      expect(url).toContain('scope1+scope2+scope3');
    });

    it('should include code_challenge derived from code_verifier', async () => {
      const { url, state } = await kickOAuth.generateAuthorizationUrl();
      const verifier = await pkceManager.getVerifier(state);
      const expectedChallenge = createHash('sha256').update(verifier!).digest('base64url');

      const urlObj = new URL(url);
      const challenge = urlObj.searchParams.get('code_challenge');

      expect(challenge).toBe(expectedChallenge);
    });
  });

  describe('handleOAuthCallback', () => {
    it('should successfully handle callback with valid state', async () => {
      mockFetch.setMockResponse('https://id.kick.com/oauth/token', {
        status: 200,
        data: {
          access_token: 'test_access_token',
          refresh_token: 'test_refresh_token',
          expires_in: '3600',
          scope: 'user:read channel:read',
          token_type: 'Bearer',
        },
      });

      const { state } = await kickOAuth.generateAuthorizationUrl();

      await kickOAuth.handleOAuthCallback('test_code', state, 'testuser');

      const storedJson = await mockKeystore.getPassword('streaming-enhancement', 'oauth:kick:testuser');
      expect(storedJson).toBeDefined();

      const stored = JSON.parse(storedJson!);
      expect(stored.access_token).toBe('test_access_token');
      expect(stored.refresh_token).toBe('test_refresh_token');
      expect(stored.scope).toEqual(['user:read', 'channel:read']);
    });

    it('should throw error when state is not provided', async () => {
      await expect(kickOAuth.handleOAuthCallback('code', '', 'testuser')).rejects.toThrow(
        'state parameter is required for Kick OAuth'
      );
    });

    it('should throw error when state is null', async () => {
      await expect(kickOAuth.handleOAuthCallback('code', null as any, 'testuser')).rejects.toThrow(
        'state parameter is required for Kick OAuth'
      );
    });

    it('should throw error when code_verifier not found', async () => {
      await expect(kickOAuth.handleOAuthCallback('code', 'non-existent-state', 'testuser')).rejects.toThrow(
        'Unable to retrieve code_verifier for state. OAuth flow may have expired.'
      );
    });

    it('should clear code_verifier after successful token exchange', async () => {
      mockFetch.setMockResponse('https://id.kick.com/oauth/token', {
        status: 200,
        data: {
          access_token: 'test_access_token',
          expires_in: '3600',
        },
      });

      const { state } = await kickOAuth.generateAuthorizationUrl();
      expect(await pkceManager.getVerifier(state)).not.toBeNull();

      await kickOAuth.handleOAuthCallback('code', state, 'testuser');

      expect(await pkceManager.getVerifier(state)).toBeNull();
    });

    it('should handle space-separated scopes from Kick', async () => {
      mockFetch.setMockResponse('https://id.kick.com/oauth/token', {
        status: 200,
        data: {
          access_token: 'test_access_token',
          expires_in: '3600',
          scope: 'scope1 scope2 scope3',
        },
      });

      const { state } = await kickOAuth.generateAuthorizationUrl();
      await kickOAuth.handleOAuthCallback('code', state, 'testuser');

      const storedJson = await mockKeystore.getPassword('streaming-enhancement', 'oauth:kick:testuser');
      const stored = JSON.parse(storedJson!);
      expect(stored.scope).toEqual(['scope1', 'scope2', 'scope3']);
    });

    it('should handle array scopes from Kick', async () => {
      mockFetch.setMockResponse('https://id.kick.com/oauth/token', {
        status: 200,
        data: {
          access_token: 'test_access_token',
          expires_in: '3600',
          scope: ['scope1', 'scope2'],
        },
      });

      const { state } = await kickOAuth.generateAuthorizationUrl();
      await kickOAuth.handleOAuthCallback('code', state, 'testuser');

      const storedJson = await mockKeystore.getPassword('streaming-enhancement', 'oauth:kick:testuser');
      const stored = JSON.parse(storedJson!);
      expect(stored.scope).toEqual(['scope1', 'scope2']);
    });

    it('should handle string expires_in from Kick', async () => {
      mockFetch.setMockResponse('https://id.kick.com/oauth/token', {
        status: 200,
        data: {
          access_token: 'test_access_token',
          expires_in: '7200',
        },
      });

      const { state } = await kickOAuth.generateAuthorizationUrl();
      await kickOAuth.handleOAuthCallback('code', state, 'testuser');

      const storedJson = await mockKeystore.getPassword('streaming-enhancement', 'oauth:kick:testuser');
      const stored = JSON.parse(storedJson!);
      expect(stored.expires_at).toBeDefined();
    });

    it('should handle number expires_in from Kick', async () => {
      mockFetch.setMockResponse('https://id.kick.com/oauth/token', {
        status: 200,
        data: {
          access_token: 'test_access_token',
          expires_in: 7200,
        },
      });

      const { state } = await kickOAuth.generateAuthorizationUrl();
      await kickOAuth.handleOAuthCallback('code', state, 'testuser');

      const storedJson = await mockKeystore.getPassword('streaming-enhancement', 'oauth:kick:testuser');
      const stored = JSON.parse(storedJson!);
      expect(stored.expires_at).toBeDefined();
    });

    it('should calculate expires_at and refresh_at correctly', async () => {
      mockFetch.setMockResponse('https://id.kick.com/oauth/token', {
        status: 200,
        data: {
          access_token: 'test_access_token',
          expires_in: '3600',
        },
      });

      const { state } = await kickOAuth.generateAuthorizationUrl();
      await kickOAuth.handleOAuthCallback('code', state, 'testuser');

      const storedJson = await mockKeystore.getPassword('streaming-enhancement', 'oauth:kick:testuser');
      const stored = JSON.parse(storedJson!);
      const expiresAt = new Date(stored.expires_at);
      const refreshAt = new Date(stored.refresh_at);
      const bufferMinutes = (expiresAt.getTime() - refreshAt.getTime()) / (60 * 1000);

      expect(bufferMinutes).toBe(5);
    });
  });

  describe('Token Refresh', () => {
    beforeEach(async () => {
      mockFetch.setMockResponse('https://id.kick.com/oauth/token', {
        status: 200,
        data: {
          access_token: 'test_access_token',
          refresh_token: 'test_refresh_token',
          expires_in: '3600',
          scope: 'user:read',
        },
      });

      const { state } = await kickOAuth.generateAuthorizationUrl();
      await kickOAuth.handleOAuthCallback('code', state, 'testuser');
      mockFetch.clear();
    });

    it('should refresh tokens successfully', async () => {
      mockFetch.setMockResponse('https://id.kick.com/oauth/token', {
        status: 200,
        data: {
          access_token: 'new_access_token',
          refresh_token: 'new_refresh_token',
          expires_in: '7200',
          scope: 'user:read channel:read',
        },
      });

      const refreshed = await kickOAuth.refreshToken('testuser');

      expect(refreshed.access_token).toBe('new_access_token');
      expect(refreshed.refresh_token).toBe('new_refresh_token');
      expect(refreshed.scope).toEqual(['user:read', 'channel:read']);

      const storedJson = await mockKeystore.getPassword('streaming-enhancement', 'oauth:kick:testuser');
      const stored = JSON.parse(storedJson!);
      expect(stored.access_token).toBe('new_access_token');
      expect(stored.refresh_token).toBe('new_refresh_token');
    });

    it('should update tokens in keystore after refresh', async () => {
      mockFetch.setMockResponse('https://id.kick.com/oauth/token', {
        status: 200,
        data: {
          access_token: 'new_access_token',
          refresh_token: 'new_refresh_token',
          expires_in: '7200',
        },
      });

      await kickOAuth.refreshToken('testuser');

      const storedJson = await mockKeystore.getPassword('streaming-enhancement', 'oauth:kick:testuser');
      const stored = JSON.parse(storedJson!);
      expect(stored.access_token).toBe('new_access_token');
      expect(stored.refresh_token).toBe('new_refresh_token');
    });

    it('should preserve old refresh_token when new one not provided', async () => {
      mockFetch.setMockResponse('https://id.kick.com/oauth/token', {
        status: 200,
        data: {
          access_token: 'new_access_token',
          expires_in: '7200',
        },
      });

      const refreshed = await kickOAuth.refreshToken('testuser');

      expect(refreshed.access_token).toBe('new_access_token');
      expect(refreshed.refresh_token).toBe('test_refresh_token');

      const storedJson = await mockKeystore.getPassword('streaming-enhancement', 'oauth:kick:testuser');
      const stored = JSON.parse(storedJson!);
      expect(stored.refresh_token).toBe('test_refresh_token');
    });

    it('should throw error on invalid refresh token', async () => {
      mockFetch.setMockResponse('https://id.kick.com/oauth/token', {
        status: 401,
        data: {
          error: 'invalid_grant',
          error_description: 'Invalid refresh token',
        },
      });

      await expect(kickOAuth.refreshToken('testuser')).rejects.toThrow(
        RefreshFailedError
      );
    });

    it('should throw error on invalid client credentials during refresh', async () => {
      mockFetch.setMockResponse('https://id.kick.com/oauth/token', {
        status: 401,
        data: {
          error: 'invalid_client',
          error_description: 'Invalid client credentials',
        },
      });

      await expect(kickOAuth.refreshToken('testuser')).rejects.toThrow(
        RefreshFailedError
      );
    });

    it('should throw when no token found', async () => {
      await expect(kickOAuth.refreshToken('nonexistent')).rejects.toThrow(
        'No token found for user nonexistent'
      );
    });

    it('should throw when refresh_token is missing', async () => {
      mockFetch.setMockResponse('https://id.kick.com/oauth/token', {
        status: 200,
        data: {
          access_token: 'test_access_token',
          expires_in: '3600',
        },
      });

      const { state } = await kickOAuth.generateAuthorizationUrl();
      await kickOAuth.handleOAuthCallback('code', state, 'no_refresh_user');

      await expect(kickOAuth.refreshToken('no_refresh_user')).rejects.toThrow(
        'No refresh token available'
      );
    });

    it('should handle network errors during refresh', async () => {
      mockFetch.setMockError('https://id.kick.com/oauth/token', new Error('Network error'));

      await expect(kickOAuth.refreshToken('testuser')).rejects.toThrow(
        RefreshFailedError
      );
    });
  });

  describe('getAccessToken', () => {
    it('should return stored token when valid', async () => {
      mockFetch.setMockResponse('https://id.kick.com/oauth/token', {
        status: 200,
        data: {
          access_token: 'test_access_token',
          expires_in: '3600',
          scope: 'user:read',
        },
      });

      const { state } = await kickOAuth.generateAuthorizationUrl();
      await kickOAuth.handleOAuthCallback('code', state, 'testuser');

      const tokenSet = await kickOAuth.getAccessToken('testuser');

      expect(tokenSet).toBeDefined();
      expect(tokenSet.access_token).toBe('test_access_token');
      expect(tokenSet.scope).toEqual(['user:read']);
    });

    it('should refresh token when it needs refresh', async () => {
      mockFetch.setMockResponse('https://id.kick.com/oauth/token', {
        status: 200,
        data: {
          access_token: 'initial_token',
          refresh_token: 'initial_refresh',
          expires_in: '200',
          scope: 'user:read',
        },
      });

      const { state } = await kickOAuth.generateAuthorizationUrl();
      await kickOAuth.handleOAuthCallback('code', state, 'testuser');

      await new Promise(resolve => setTimeout(resolve, 250));

      mockFetch.clear();
      mockFetch.setMockResponse('https://id.kick.com/oauth/token', {
        status: 200,
        data: {
          access_token: 'refreshed_token',
          refresh_token: 'refreshed_refresh',
          expires_in: '3600',
          scope: 'user:read channel:read',
        },
      });

      const tokenSet = await kickOAuth.getAccessToken('testuser');

      expect(tokenSet.access_token).toBe('refreshed_token');
      expect(tokenSet.refresh_token).toBe('refreshed_refresh');
    });

    it('should throw when no token found', async () => {
      await expect(kickOAuth.getAccessToken('nonexistent')).rejects.toThrow(
        'No token found for user nonexistent'
      );
    });

    it('should handle concurrent requests with mutex', async () => {
      mockFetch.setMockResponse('https://id.kick.com/oauth/token', {
        status: 200,
        data: {
          access_token: 'initial_token',
          refresh_token: 'initial_refresh',
          expires_in: '200',
          scope: 'user:read',
        },
      });

      const { state } = await kickOAuth.generateAuthorizationUrl();
      await kickOAuth.handleOAuthCallback('code', state, 'testuser');

      await new Promise(resolve => setTimeout(resolve, 250));

      mockFetch.clear();
      mockFetch.setMockResponse('https://id.kick.com/oauth/token', {
        status: 200,
        data: {
          access_token: 'refreshed_token',
          refresh_token: 'refreshed_refresh',
          expires_in: '3600',
          scope: 'user:read',
        },
      });

      const [tokenSet1, tokenSet2] = await Promise.all([
        kickOAuth.getAccessToken('testuser'),
        kickOAuth.getAccessToken('testuser'),
      ]);

      expect(tokenSet1.access_token).toBe('refreshed_token');
      expect(tokenSet2.access_token).toBe('refreshed_token');
    });
  });

  describe('Error Handling', () => {
    it('should throw clear error for missing credentials', async () => {
      mockRepo.clear();
      await expect(kickOAuth.generateAuthorizationUrl()).rejects.toThrow('Kick OAuth credentials not found in database. Please add client credentials first.');
    });

    it('should handle OAuth errors from API', async () => {
      mockFetch.setMockResponse('https://id.kick.com/oauth/token', {
        status: 400,
        data: {
          error: 'invalid_request',
          error_description: 'Invalid request',
        },
      });

      const { state } = await kickOAuth.generateAuthorizationUrl();

      await expect(kickOAuth.handleOAuthCallback('invalid_code', state, 'testuser')).rejects.toThrow();
    });
  });
});
