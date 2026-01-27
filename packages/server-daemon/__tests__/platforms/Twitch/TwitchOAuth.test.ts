import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createLogger } from 'winston';
import { TwitchOAuth } from '../../../platforms/Twitch/TwitchOAuth';
import { MockKeystoreManager } from '../mocks/KeystoreManager.mock';
import { KeystoreManager } from '../../../infrastructure/keystore/KeystoreManager';
import { OAuthConfig } from '../../../infrastructure/config/Config';
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

describe('TwitchOAuth', () => {
  let twitchOAuth: TwitchOAuth;
  let mockKeystore: MockKeystoreManager;
  let mockRepo: MockOAuthCredentialsRepository;
  let logger: ReturnType<typeof createLogger>;
  let config: OAuthConfig;

  beforeEach(() => {
    logger = createLogger({ silent: true });
    mockKeystore = new MockKeystoreManager();
    mockRepo = new MockOAuthCredentialsRepository();
    config = {
      redirect_uri: 'http://localhost:3000/callback',
    };

    mockRepo.setCredential('twitch', 'test_client_id', 'test_client_secret', [
      'channel:read:subscriptions',
      'chat:read',
      'chat:edit',
      'bits:read',
    ]);

    twitchOAuth = new TwitchOAuth(
      logger,
      mockKeystore as unknown as KeystoreManager,
      mockRepo as any,
      config
    );

    mockFetch.clear();
  });

  describe('Configuration', () => {
    it('should load credentials from database', () => {
      expect(mockRepo.credentialExists('twitch')).toBe(true);
      const credential = mockRepo.getCredential('twitch');
      expect(credential?.client_id).toBe('test_client_id');
      expect(credential?.client_secret).toBe('test_client_secret');
      expect(credential?.scopes).toEqual([
        'channel:read:subscriptions',
        'chat:read',
        'chat:edit',
        'bits:read',
      ]);
    });

    it('should use redirect_uri from config', async () => {
      const { url } = await twitchOAuth.generateAuthorizationUrl();
      expect(url).toContain('redirect_uri=');
      const urlObj = new URL(url);
      expect(urlObj.searchParams.get('redirect_uri')).toBe('http://localhost:3000/callback');
    });

    it('should throw error when credentials missing', async () => {
      mockRepo.clear();
      await expect(() => {
        return twitchOAuth.generateAuthorizationUrl();
      }).rejects.toThrow('Twitch OAuth credentials not found in database');
    });
  });

  describe('Authorization URL Generation', () => {
    it('should generate correct Twitch auth URL', async () => {
      const { url, state } = await twitchOAuth.generateAuthorizationUrl();

      expect(url).toContain('https://id.twitch.tv/oauth2/authorize');
      expect(url).toContain('client_id=test_client_id');
      expect(url).toContain('response_type=code');
      expect(url).toContain(`state=${state}`);

      const urlObj = new URL(url);
      const scope = urlObj.searchParams.get('scope');
      expect(scope).toContain('channel:read:subscriptions');
      expect(scope).toContain('chat:read');
      expect(scope).toContain('chat:edit');
      expect(scope).toContain('bits:read');
    });

    it('should generate unique states for multiple calls', async () => {
      const result1 = await twitchOAuth.generateAuthorizationUrl();
      const result2 = await twitchOAuth.generateAuthorizationUrl();

      expect(result1.state).not.toBe(result2.state);
      expect(result1.url).toContain(result1.state);
      expect(result2.url).toContain(result2.state);
    });

    it('should include all scopes in auth URL', async () => {
      mockRepo.setCredential('twitch', 'client_id', 'client_secret', ['scope1', 'scope2', 'scope3']);

      const oauth = new TwitchOAuth(
        logger,
        mockKeystore as unknown as KeystoreManager,
        mockRepo as any,
        config
      );

      const { url } = await oauth.generateAuthorizationUrl();
      expect(url).toContain('scope1+scope2+scope3');
    });
  });

  describe('Token Exchange', () => {
    it('should successfully exchange code for tokens', async () => {
      mockFetch.setMockResponse('https://id.twitch.tv/oauth2/token', {
        status: 200,
        data: {
          access_token: 'test_access_token',
          refresh_token: 'test_refresh_token',
          expires_in: 3600,
          scope: ['channel:read:subscriptions', 'chat:read'],
          token_type: 'bearer',
        },
      });

      const tokens = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        expires_in: 3600,
        scope: ['channel:read:subscriptions', 'chat:read'],
      };

      await twitchOAuth.processAccessToken('testuser', tokens);

      const storedJson = await mockKeystore.getPassword('streaming-enhancement', 'oauth:twitch:testuser');
      expect(storedJson).toBeDefined();

      const stored = JSON.parse(storedJson!);
      expect(stored.access_token).toBe('test_access_token');
      expect(stored.refresh_token).toBe('test_refresh_token');
      expect(stored.scope).toEqual(['channel:read:subscriptions', 'chat:read']);
    });

    it('should store tokens in keystore with correct service/account', async () => {
      mockFetch.setMockResponse('https://id.twitch.tv/oauth2/token', {
        status: 200,
        data: {
          access_token: 'test_access_token',
          refresh_token: 'test_refresh_token',
          expires_in: 3600,
        },
      });

      const tokens = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        expires_in: 3600,
        scope: ['scope1'],
      };

      await twitchOAuth.processAccessToken('testuser', tokens);

      expect(mockKeystore.has('streaming-enhancement', 'oauth:twitch:testuser')).toBe(true);
    });

    it('should handle space-separated scopes from Twitch', async () => {
      const tokens = {
        access_token: 'test_access_token',
        expires_in: 3600,
        scope: ['scope1', 'scope2', 'scope3'],
      };

      await twitchOAuth.processAccessToken('testuser', tokens);

      const storedJson = await mockKeystore.getPassword('streaming-enhancement', 'oauth:twitch:testuser');
      const stored = JSON.parse(storedJson!);
      expect(stored.scope).toEqual(['scope1', 'scope2', 'scope3']);
    });

    it('should calculate expires_at and refresh_at correctly', async () => {
      const tokens = {
        access_token: 'test_access_token',
        expires_in: 3600,
        scope: ['scope1'],
      };

      await twitchOAuth.processAccessToken('testuser', tokens);

      const storedJson = await mockKeystore.getPassword('streaming-enhancement', 'oauth:twitch:testuser');
      const stored = JSON.parse(storedJson!);
      const expiresAt = new Date(stored.expires_at);
      const refreshAt = new Date(stored.refresh_at);
      const bufferMinutes = (expiresAt.getTime() - refreshAt.getTime()) / (60 * 1000);

      expect(bufferMinutes).toBe(5);
    });
  });

  describe('Token Refresh', () => {
    beforeEach(async () => {
      mockFetch.clear();
      mockFetch.setMockResponse('https://id.twitch.tv/oauth2/token', {
        status: 200,
        data: {
          access_token: 'test_access_token',
          refresh_token: 'test_refresh_token',
          expires_in: 3600,
        },
      });

      const tokens = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        expires_in: 3600,
        scope: ['scope1'],
      };

      await twitchOAuth.processAccessToken('testuser', tokens);
      mockFetch.clear();
    });

    it('should refresh tokens successfully', async () => {
      mockFetch.setMockResponse('https://id.twitch.tv/oauth2/token', {
        status: 200,
        data: {
          access_token: 'new_access_token',
          refresh_token: 'new_refresh_token',
          expires_in: 7200,
        },
      });

      const refreshed = await twitchOAuth.refreshToken('testuser');

      expect(refreshed.access_token).toBe('new_access_token');
      expect(refreshed.refresh_token).toBe('new_refresh_token');

      const storedJson = await mockKeystore.getPassword('streaming-enhancement', 'oauth:twitch:testuser');
      const stored = JSON.parse(storedJson!);
      expect(stored.access_token).toBe('new_access_token');
      expect(stored.refresh_token).toBe('new_refresh_token');
    });

    it('should update tokens in keystore after refresh', async () => {
      mockFetch.setMockResponse('https://id.twitch.tv/oauth2/token', {
        status: 200,
        data: {
          access_token: 'new_access_token',
          refresh_token: 'new_refresh_token',
          expires_in: 7200,
        },
      });

      await twitchOAuth.refreshToken('testuser');

      const storedJson = await mockKeystore.getPassword('streaming-enhancement', 'oauth:twitch:testuser');
      const stored = JSON.parse(storedJson!);
      expect(stored.access_token).toBe('new_access_token');
      expect(stored.refresh_token).toBe('new_refresh_token');
    });

    it('should preserve old refresh_token when new one not provided', async () => {
      mockFetch.setMockResponse('https://id.twitch.tv/oauth2/token', {
        status: 200,
        data: {
          access_token: 'new_access_token',
          expires_in: 7200,
        },
      });

      const refreshed = await twitchOAuth.refreshToken('testuser');

      expect(refreshed.access_token).toBe('new_access_token');
      expect(refreshed.refresh_token).toBe('test_refresh_token');

      const storedJson = await mockKeystore.getPassword('streaming-enhancement', 'oauth:twitch:testuser');
      const stored = JSON.parse(storedJson!);
      expect(stored.refresh_token).toBe('test_refresh_token');
    });

    it('should throw error on invalid refresh token', async () => {
      mockFetch.setMockResponse('https://id.twitch.tv/oauth2/token', {
        status: 401,
        data: {
          error: 'invalid_grant',
          error_description: 'Invalid refresh token',
        },
      });

      await expect(twitchOAuth.refreshToken('testuser')).rejects.toThrow(
        RefreshFailedError
      );
    });

    it('should throw error on invalid client credentials during refresh', async () => {
      mockFetch.setMockResponse('https://id.twitch.tv/oauth2/token', {
        status: 401,
        data: {
          error: 'invalid_client',
          error_description: 'Invalid client credentials',
        },
      });

      await expect(twitchOAuth.refreshToken('testuser')).rejects.toThrow(
        RefreshFailedError
      );
    });

    it('should throw when no token found', async () => {
      await expect(twitchOAuth.refreshToken('nonexistent')).rejects.toThrow(
        'No token found for user nonexistent'
      );
    });

    it('should throw when refresh_token is missing', async () => {
      mockFetch.setMockResponse('https://id.twitch.tv/oauth2/token', {
        status: 200,
        data: {
          access_token: 'test_access_token',
          expires_in: 3600,
        },
      });

      const tokens = {
        access_token: 'test_access_token',
        expires_in: 3600,
        scope: ['scope1'],
      };

      await twitchOAuth.processAccessToken('no_refresh_user', tokens);

      await expect(twitchOAuth.refreshToken('no_refresh_user')).rejects.toThrow(
        'No refresh token available'
      );
    });

    it('should handle network errors during refresh', async () => {
      mockFetch.setMockError('https://id.twitch.tv/oauth2/token', new Error('Network error'));

      await expect(twitchOAuth.refreshToken('testuser')).rejects.toThrow(
        RefreshFailedError
      );
    });
  });

  describe('getAccessToken', () => {
    it('should return stored token when valid', async () => {
      mockFetch.setMockResponse('https://id.twitch.tv/oauth2/token', {
        status: 200,
        data: {
          access_token: 'test_access_token',
          expires_in: 3600,
        },
      });

      const tokens = {
        access_token: 'test_access_token',
        expires_in: 3600,
        scope: ['scope1'],
      };

      await twitchOAuth.processAccessToken('testuser', tokens);

      const tokenSet = await twitchOAuth.getAccessToken('testuser');

      expect(tokenSet).toBeDefined();
      expect(tokenSet.access_token).toBe('test_access_token');
      expect(tokenSet.scope).toEqual(['scope1']);
    });

    it('should refresh token when it needs refresh', async () => {
      const tokens = {
        access_token: 'initial_token',
        refresh_token: 'initial_refresh',
        expires_in: 200,
        scope: ['scope1'],
      };

      await twitchOAuth.processAccessToken('testuser', tokens);

      await new Promise(resolve => setTimeout(resolve, 250));

      mockFetch.clear();
      mockFetch.setMockResponse('https://id.twitch.tv/oauth2/token', {
        status: 200,
        data: {
          access_token: 'refreshed_token',
          refresh_token: 'refreshed_refresh',
          expires_in: 3600,
        },
      });

      const tokenSet = await twitchOAuth.getAccessToken('testuser');

      expect(tokenSet.access_token).toBe('refreshed_token');
      expect(tokenSet.refresh_token).toBe('refreshed_refresh');
    });

    it('should throw when no token found', async () => {
      await expect(twitchOAuth.getAccessToken('nonexistent')).rejects.toThrow(
        'No token found for user nonexistent'
      );
    });

    it('should handle concurrent requests with mutex', async () => {
      mockFetch.setMockResponse('https://id.twitch.tv/oauth2/token', {
        status: 200,
        data: {
          access_token: 'initial_token',
          refresh_token: 'initial_refresh',
          expires_in: 200,
        },
      });

      const tokens = {
        access_token: 'initial_token',
        refresh_token: 'initial_refresh',
        expires_in: 200,
        scope: ['scope1'],
      };

      await twitchOAuth.processAccessToken('testuser', tokens);

      await new Promise(resolve => setTimeout(resolve, 250));

      mockFetch.clear();
      mockFetch.setMockResponse('https://id.twitch.tv/oauth2/token', {
        status: 200,
        data: {
          access_token: 'refreshed_token',
          refresh_token: 'refreshed_refresh',
          expires_in: 3600,
        },
      });

      const [tokenSet1, tokenSet2] = await Promise.all([
        twitchOAuth.getAccessToken('testuser'),
        twitchOAuth.getAccessToken('testuser'),
      ]);

      expect(tokenSet1.access_token).toBe('refreshed_token');
      expect(tokenSet2.access_token).toBe('refreshed_token');
    });
  });

  describe('Error Handling', () => {
    it('should throw clear error for missing credentials', async () => {
      mockRepo.clear();

      await expect(() => {
        return twitchOAuth.generateAuthorizationUrl();
      }).rejects.toThrow('Twitch OAuth credentials not found in database');
    });
  });
});
