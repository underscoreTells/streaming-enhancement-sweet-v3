import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RestClient } from '../../../platforms/YouTube/rest/RestClient';
import type { YouTubeError, YouTubeApiResponse, YouTubeChannel } from '../../../platforms/YouTube/rest/types';
import { Logger } from 'winston';

describe('RestClient', () => {
  let logger: Logger;
  let client: RestClient;

  beforeEach(() => {
    logger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    client = new RestClient(logger, {
      rateLimitMs: 100,
    });

    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with correct base URL', () => {
      expect(client).toBeDefined();
      const testClient = new RestClient(logger);
      expect(testClient).toBeDefined();
    });

    it('should accept custom config', () => {
      const customClient = new RestClient(logger, {
        baseUrl: 'https://custom-api.example.com',
        rateLimitMs: 2000,
        timeout: 60000,
      });
      expect(customClient).toBeDefined();
    });

    it('should allow setting username', () => {
      client.setUsername('testuser');
    });

    it('should allow setting token', () => {
      client.setToken('test-token-123');
    });

    it('should allow setting token refresh callback', () => {
      const callback = vi.fn();
      client.setTokenRefreshCallback(callback);
    });
  });

  describe('HTTP methods', () => {
    it('should perform GET request', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      } as unknown as Response;

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse);

      const result = await client.get('/test', { param: 'value' });
      expect(result).toEqual({ data: 'test' });
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should perform POST request', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      } as unknown as Response;

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse);

      const result = await client.post('/test', { data: 'value' });
      expect(result).toEqual({ success: true });
    });

    it('should perform PUT request', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ updated: true }),
      } as unknown as Response;

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse);

      const result = await client.put('/test', { data: 'value' });
      expect(result).toEqual({ updated: true });
    });

    it('should perform DELETE request', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ deleted: true }),
      } as unknown as Response;

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse);

      const result = await client.delete('/test');
      expect(result).toEqual({ deleted: true });
    });

    it('should include Authorization header when token is set', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      } as unknown as Response;

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse);

      client.setToken('test-token-123');
      await client.get('/test');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token-123',
          }),
        })
      );
    });
  });

  describe('error handling', () => {
    it('should throw error on non-OK response', async () => {
      const mockError: YouTubeError = {
        error: {
          code: 400,
          message: 'Bad Request',
          errors: [{ domain: 'global', reason: 'invalid', message: 'Bad Request' }],
        },
      };

      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => mockError,
      } as unknown as Response;

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse);

      await expect(client.get('/test')).rejects.toThrow('Request failed: 400 - Bad Request');
    });

    it('should throw error on network failure', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      await expect(client.get('/test')).rejects.toThrow('Network error');
    });

    it('should handle timeout', async () => {
      vi.useFakeTimers();
      
      const controller = new AbortController();
      vi.mocked(fetch).mockImplementationOnce(() => {
        setTimeout(() => controller.abort(), 10);
        return Promise.reject({ name: 'AbortError' }) as any;
      });

      const timeoutClient = new RestClient(logger, { timeout: 100 });

      await expect(timeoutClient.get('/test')).rejects.toThrow();

      vi.useRealTimers();
    }, 1000);
  });

  describe('rate limiting', () => {
    it('should enforce rate limiting between requests', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      } as unknown as Response;

      vi.mocked(fetch).mockResolvedValue(mockResponse);

      const startTime = Date.now();
      await client.get('/test1');
      await client.get('/test2');
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should allow requests after rate limit interval', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      } as unknown as Response;

      vi.mocked(fetch).mockResolvedValue(mockResponse);
      vi.spyOn(Date, 'now').mockImplementation(() => 10000);

      await client.get('/test1');
      vi.spyOn(Date, 'now').mockImplementation(() => 10500);
      await client.get('/test2');

      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('retry logic', () => {
    it('should retry on 429 rate limit error', async () => {
      const mockResponse429 = {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Headers({ 'Retry-After': '5' }),
        json: async () => ({ error: 'Rate limit exceeded' }),
      } as unknown as Response;

      const mockResponse200 = {
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      } as unknown as Response;

      vi.mocked(fetch)
        .mockResolvedValueOnce(mockResponse429)
        .mockResolvedValueOnce(mockResponse200);

      await client.get('/test');

      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on 5xx server errors', async () => {
      const mockResponse500 = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' }),
      } as unknown as Response;

      const mockResponse200 = {
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      } as unknown as Response;

      vi.mocked(fetch)
        .mockResolvedValueOnce(mockResponse500)
        .mockResolvedValueOnce(mockResponse200);

      await client.get('/test');

      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should stop retrying after max attempts', async () => {
      const mockResponse500 = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' }),
      } as unknown as Response;

      vi.mocked(fetch).mockResolvedValue(mockResponse500);

      await expect(client.get('/test')).rejects.toThrow('Request failed after maximum retry attempts');
      expect(fetch).toHaveBeenCalledTimes(4);
    });

    it('should implement exponential backoff', async () => {
      const mockResponse500 = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' }),
      } as unknown as Response;

      const mockResponse200 = {
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      } as unknown as Response;

      vi.mocked(fetch)
        .mockResolvedValueOnce(mockResponse500)
        .mockResolvedValueOnce(mockResponse200);

      const sleepSpy = vi.spyOn(global, 'setTimeout');
      await client.get('/test');

      expect(sleepSpy).toHaveBeenCalled();
      sleepSpy.mockRestore();
    });
  });

  describe('token refresh', () => {
    it('should refresh token on 401 error', async () => {
      const mockResponse401 = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Invalid token' }),
      } as unknown as Response;

      const mockResponse200 = {
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      } as unknown as Response;

      vi.mocked(fetch)
        .mockResolvedValueOnce(mockResponse401)
        .mockResolvedValueOnce(mockResponse200);

      const refreshCallback = vi.fn().mockResolvedValue('new-token-456');
      client.setUsername('testuser');
      client.setToken('old-token-123');
      client.setTokenRefreshCallback(refreshCallback);

      await client.get('/test');

      expect(refreshCallback).toHaveBeenCalledWith('testuser');
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should fail if token refresh fails', async () => {
      const mockResponse401 = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Invalid token' }),
      } as unknown as Response;

      vi.mocked(fetch).mockResolvedValue(mockResponse401);

      const refreshCallback = vi.fn().mockRejectedValue(new Error('Refresh failed'));
      client.setUsername('testuser');
      client.setToken('old-token-123');
      client.setTokenRefreshCallback(refreshCallback);

      await expect(client.get('/test')).rejects.toThrow('Authentication failed and token refresh failed');
    });

    it('should not attempt refresh without username', async () => {
      const mockResponse401 = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Invalid token' }),
      } as unknown as Response;

      vi.mocked(fetch).mockResolvedValue(mockResponse401);

      client.setToken('token-123');

      await expect(client.get('/test')).rejects.toThrow('Request failed: 401 - Invalid token');
    });
  });

  describe('URL building', () => {
    it('should build correct URLs with query parameters', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      } as unknown as Response;

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse);

      await client.get('/test', { param1: 'value1', param2: 123, param3: true });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('param1=value1'),
        expect.any(Object)
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('param2=123'),
        expect.any(Object)
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('param3=true'),
        expect.any(Object)
      );
    });

    it('should build correct URLs without query parameters', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      } as unknown as Response;

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse);

      await client.get('/test');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/test$/),
        expect.any(Object)
      );
    });
  });
});

describe('RestClient integration', () => {
  let logger: Logger;
  let client: RestClient;

  beforeEach(() => {
    logger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    client = new RestClient(logger);

    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle real YouTube API response structure', async () => {
    const channelResponse: YouTubeApiResponse<YouTubeChannel> = {
      kind: 'youtube#channelListResponse',
      etag: '"test-etag"',
      pageInfo: {
        totalResults: 1,
        resultsPerPage: 1,
      },
      items: [
        {
          kind: 'youtube#channel',
          etag: '"test-etag-2"',
          id: 'UC1234567890',
          snippet: {
            title: 'Test Channel',
            description: 'Test Description',
            publishedAt: '2024-01-01T00:00:00Z',
            thumbnails: {
              default: { url: 'https://example.com/default.jpg', width: 88, height: 88 },
              medium: { url: 'https://example.com/medium.jpg', width: 240, height: 240 },
              high: { url: 'https://example.com/high.jpg', width: 800, height: 800 },
            },
            localized: {
              title: 'Test Channel',
              description: 'Test Description',
            },
          },
          statistics: {
            viewCount: '1000',
            subscriberCount: '100',
            hiddenSubscriberCount: false,
            videoCount: '10',
          },
        },
      ],
    };

    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => channelResponse,
    } as unknown as Response;

    vi.mocked(fetch).mockResolvedValueOnce(mockResponse);

    const result = await client.get('/channels', { id: 'UC1234567890', part: 'snippet,statistics' });

    expect(result).toEqual(channelResponse);
  });
});
