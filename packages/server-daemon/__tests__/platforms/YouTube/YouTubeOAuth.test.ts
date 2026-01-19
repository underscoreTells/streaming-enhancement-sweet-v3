import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createLogger } from 'winston';
import { YouTubeOAuth } from '../../../platforms/YouTube/YouTubeOAuth';
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

describe('YouTubeOAuth', () => {
  let youtubeOAuth: YouTubeOAuth;
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

    mockRepo.setCredential('youtube', 'test_client_id', 'test_client_secret', [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube',
    ]);

    youtubeOAuth = new YouTubeOAuth(
      logger,
      mockKeystore as unknown as KeystoreManager,
      mockRepo as any,
      config
    );

    mockFetch.clear();
  });

  describe('Configuration', () => {
    it('should load credentials from database', () => {
      expect(mockRepo.credentialExists('youtube')).toBe(true);
      const credential = mockRepo.getCredential('youtube');
      expect(credential?.client_id).toBe('test_client_id');
      expect(credential?.client_secret).toBe('test_client_secret');
      expect(credential?.scopes).toEqual([
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/youtube',
      ]);
    });

    it('should use redirect_uri from config', async () => {
      const { url } = await youtubeOAuth.generateAuthorizationUrl();
      expect(url).toContain('redirect_uri=');
      const urlObj = new URL(url);
      expect(urlObj.searchParams.get('redirect_uri')).toBe('http://localhost:3000/callback');
    });

    it('should throw error when credentials missing', async () => {
      mockRepo.clear();
      await expect(() => {
        return youtubeOAuth.generateAuthorizationUrl();
      }).rejects.toThrow('YouTube OAuth credentials not found in database');
    });
  });

  describe('Authorization URL Generation', () => {
    it('should generate correct YouTube auth URL', async () => {
      const { url, state } = await youtubeOAuth.generateAuthorizationUrl();

      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('client_id=test_client_id');
      expect(url).toContain('response_type=code');
      expect(url).toContain(`state=${state}`);
      expect(url).toContain('access_type=offline');
      expect(url).toContain('include_granted_scopes=true');

      const urlObj = new URL(url);
      const scope = urlObj.searchParams.get('scope');
      expect(scope).toContain('https://www.googleapis.com/auth/youtube.readonly');
      expect(scope).toContain('https://www.googleapis.com/auth/youtube');
    });

    it('should generate unique states for multiple calls', async () => {
      const result1 = await youtubeOAuth.generateAuthorizationUrl();
      const result2 = await youtubeOAuth.generateAuthorizationUrl();

      expect(result1.state).not.toBe(result2.state);
      expect(result1.url).toContain(result1.state);
      expect(result2.url).toContain(result2.state);
    });

    it('should include access_type=offline for refresh tokens', async () => {
      const { url } = await youtubeOAuth.generateAuthorizationUrl();
      expect(url).toContain('access_type=offline');
    });

    it('should include include_granted_scopes=true for incremental authorization', async () => {
      const { url } = await youtubeOAuth.generateAuthorizationUrl();
      expect(url).toContain('include_granted_scopes=true');
    });

    it('should include prompt=consent to ensure refresh token on re-authorization', async () => {
      const { url } = await youtubeOAuth.generateAuthorizationUrl();
      expect(url).toContain('prompt=consent');
    });

    it('should include all scopes in auth URL', async () => {
      mockRepo.setCredential('youtube', 'client_id', 'client_secret', [
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube',
      ]);

      const oauth = new YouTubeOAuth(
        logger,
        mockKeystore as unknown as KeystoreManager,
        mockRepo as any,
        config
      );

      const { url } = await oauth.generateAuthorizationUrl();
      expect(url).toContain('youtube.readonly');
      expect(url).toContain('youtube.upload');
      expect(url).toContain('youtube');
    });
  });

  describe('Token Exchange', () => {
    it('should successfully exchange code for tokens', async () => {
      mockFetch.setMockResponse('https://oauth2.googleapis.com/token', {
        status: 200,
        data: {
          access_token: 'test_access_token',
          refresh_token: 'test_refresh_token',
          expires_in: 3600,
          scope: ['https://www.googleapis.com/auth/youtube.readonly'],
          token_type: 'Bearer',
        },
      });

      const tokens = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        expires_in: 3600,
        scope: ['https://www.googleapis.com/auth/youtube.readonly'],
      };

      await youtubeOAuth.processAccessToken('testuser', tokens);

      const storedJson = await mockKeystore.getPassword('streaming-enhancement', 'oauth:youtube:testuser');
      expect(storedJson).toBeDefined();

      const stored = JSON.parse(storedJson!);
      expect(stored.access_token).toBe('test_access_token');
      expect(stored.refresh_token).toBe('test_refresh_token');
      expect(stored.scope).toEqual(['https://www.googleapis.com/auth/youtube.readonly']);
    });

    it('should store tokens in keystore with correct service/account', async () => {
      mockFetch.setMockResponse('https://oauth2.googleapis.com/token', {
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

      await youtubeOAuth.processAccessToken('testuser', tokens);

      expect(mockKeystore.has('streaming-enhancement', 'oauth:youtube:testuser')).toBe(true);
    });

    it('should handle space-separated scopes from YouTube', async () => {
      const tokens = {
        access_token: 'test_access_token',
        expires_in: 3600,
        scope: ['scope1', 'scope2', 'scope3'],
      };

      await youtubeOAuth.processAccessToken('testuser', tokens);

      const storedJson = await mockKeystore.getPassword('streaming-enhancement', 'oauth:youtube:testuser');
      const stored = JSON.parse(storedJson!);
      expect(stored.scope).toEqual(['scope1', 'scope2', 'scope3']);
    });

    it('should calculate expires_at and refresh_at correctly', async () => {
      const tokens = {
        access_token: 'test_access_token',
        expires_in: 3600,
        scope: ['scope1'],
      };

      await youtubeOAuth.processAccessToken('testuser', tokens);

      const storedJson = await mockKeystore.getPassword('streaming-enhancement', 'oauth:youtube:testuser');
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
      mockFetch.setMockResponse('https://oauth2.googleapis.com/token', {
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

      await youtubeOAuth.processAccessToken('testuser', tokens);
      mockFetch.clear();
    });

    it('should refresh tokens successfully', async () => {
      mockFetch.setMockResponse('https://oauth2.googleapis.com/token', {
        status: 200,
        data: {
          access_token: 'new_access_token',
          refresh_token: 'new_refresh_token',
          expires_in: 7200,
        },
      });

      const refreshed = await youtubeOAuth.refreshToken('testuser');

      expect(refreshed.access_token).toBe('new_access_token');
      expect(refreshed.refresh_token).toBe('new_refresh_token');

      const storedJson = await mockKeystore.getPassword('streaming-enhancement', 'oauth:youtube:testuser');
      const stored = JSON.parse(storedJson!);
      expect(stored.access_token).toBe('new_access_token');
      expect(stored.refresh_token).toBe('new_refresh_token');
    });

    it('should update tokens in keystore after refresh', async () => {
      mockFetch.setMockResponse('https://oauth2.googleapis.com/token', {
        status: 200,
        data: {
          access_token: 'new_access_token',
          refresh_token: 'new_refresh_token',
          expires_in: 7200,
        },
      });

      await youtubeOAuth.refreshToken('testuser');

      const storedJson = await mockKeystore.getPassword('streaming-enhancement', 'oauth:youtube:testuser');
      const stored = JSON.parse(storedJson!);
      expect(stored.access_token).toBe('new_access_token');
      expect(stored.refresh_token).toBe('new_refresh_token');
    });

    it('should preserve old refresh_token when new one not provided', async () => {
      mockFetch.setMockResponse('https://oauth2.googleapis.com/token', {
        status: 200,
        data: {
          access_token: 'new_access_token',
          expires_in: 7200,
        },
      });

      const refreshed = await youtubeOAuth.refreshToken('testuser');

      expect(refreshed.access_token).toBe('new_access_token');
      expect(refreshed.refresh_token).toBe('test_refresh_token');

      const storedJson = await mockKeystore.getPassword('streaming-enhancement', 'oauth:youtube:testuser');
      const stored = JSON.parse(storedJson!);
      expect(stored.refresh_token).toBe('test_refresh_token');
    });

    it('should throw error on invalid refresh token', async () => {
      mockFetch.setMockResponse('https://oauth2.googleapis.com/token', {
        status: 401,
        data: {
          error: 'invalid_grant',
          error_description: 'Invalid refresh token',
        },
      });

      await expect(youtubeOAuth.refreshToken('testuser')).rejects.toThrow(
        RefreshFailedError
      );
    });

    it('should throw error on invalid client credentials during refresh', async () => {
      mockFetch.setMockResponse('https://oauth2.googleapis.com/token', {
        status: 401,
        data: {
          error: 'invalid_client',
          error_description: 'Invalid client credentials',
        },
      });

      await expect(youtubeOAuth.refreshToken('testuser')).rejects.toThrow(
        RefreshFailedError
      );
    });

    it('should throw when no token found', async () => {
      await expect(youtubeOAuth.refreshToken('nonexistent')).rejects.toThrow(
        'No token found for user nonexistent'
      );
    });

    it('should throw when refresh_token is missing', async () => {
      mockFetch.setMockResponse('https://oauth2.googleapis.com/token', {
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

      await youtubeOAuth.processAccessToken('no_refresh_user', tokens);

      await expect(youtubeOAuth.refreshToken('no_refresh_user')).rejects.toThrow(
        'No refresh token available'
      );
    });

    it('should handle network errors during refresh', async () => {
      mockFetch.setMockError('https://oauth2.googleapis.com/token', new Error('Network error'));

      await expect(youtubeOAuth.refreshToken('testuser')).rejects.toThrow(
        RefreshFailedError
      );
    });
  });

  describe('getAccessToken', () => {
    it('should return stored token when valid', async () => {
      mockFetch.setMockResponse('https://oauth2.googleapis.com/token', {
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

      await youtubeOAuth.processAccessToken('testuser', tokens);

      const tokenSet = await youtubeOAuth.getAccessToken('testuser');

      expect(tokenSet).toBeDefined();
      expect(tokenSet.access_token).toBe('test_access_token');
      expect(tokenSet.scope).toEqual(['scope1']);
    });

    it('should refresh token when it needs refresh', async () => {
      // Using expires_in: 1 second. With the 5-minute refresh buffer,
      // refresh_at = now + 1s - 300s = now - 299s (already in the past)
      // This means the token will immediately need refresh.
      const tokens = {
        access_token: 'initial_token',
        refresh_token: 'initial_refresh',
        expires_in: 1,
        scope: ['scope1'],
      };

      await youtubeOAuth.processAccessToken('testuser', tokens);

      mockFetch.clear();
      mockFetch.setMockResponse('https://oauth2.googleapis.com/token', {
        status: 200,
        data: {
          access_token: 'refreshed_token',
          refresh_token: 'refreshed_refresh',
          expires_in: 3600,
        },
      });

      const tokenSet = await youtubeOAuth.getAccessToken('testuser');

      expect(tokenSet.access_token).toBe('refreshed_token');
      expect(tokenSet.refresh_token).toBe('refreshed_refresh');
    });

    it('should throw when no token found', async () => {
      await expect(youtubeOAuth.getAccessToken('nonexistent')).rejects.toThrow(
        'No token found for user nonexistent'
      );
    });

    it('should handle concurrent requests with mutex', async () => {
      // Using expires_in: 1 second. With the 5-minute refresh buffer,
      // the token will immediately need refresh.
      const tokens = {
        access_token: 'initial_token',
        refresh_token: 'initial_refresh',
        expires_in: 1,
        scope: ['scope1'],
      };

      await youtubeOAuth.processAccessToken('testuser', tokens);

      mockFetch.clear();
      mockFetch.setMockResponse('https://oauth2.googleapis.com/token', {
        status: 200,
        data: {
          access_token: 'refreshed_token',
          refresh_token: 'refreshed_refresh',
          expires_in: 3600,
        },
      });

      const [tokenSet1, tokenSet2] = await Promise.all([
        youtubeOAuth.getAccessToken('testuser'),
        youtubeOAuth.getAccessToken('testuser'),
      ]);

      expect(tokenSet1.access_token).toBe('refreshed_token');
      expect(tokenSet2.access_token).toBe('refreshed_token');
    });
  });

  describe('Error Handling', () => {
    it('should throw clear error for missing credentials', async () => {
      mockRepo.clear();

      await expect(() => {
        return youtubeOAuth.generateAuthorizationUrl();
      }).rejects.toThrow('YouTube OAuth credentials not found in database');
    });
  });
});
