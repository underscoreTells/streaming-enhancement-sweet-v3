import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createLogger } from 'winston';
import { RestClient } from '../../../../platforms/Twitch/rest/RestClient';

describe('RestClient', () => {
  let logger: ReturnType<typeof createLogger>;
  let client: RestClient;
  let mockAccessToken: string;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    logger = createLogger({ silent: true });
    mockAccessToken = 'test_access_token';

    client = new RestClient(logger, {
      clientId: 'test_client_id',
      getAccessToken: vi.fn().mockResolvedValue(mockAccessToken),
    });

    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  describe('GET requests', () => {
    it('should make GET request with correct headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
        headers: new Headers({
          'ratelimit-limit': '800',
          'ratelimit-remaining': '799',
          'ratelimit-reset': String(Math.floor(Date.now() / 1000) + 60),
        }),
      });

      const result = await client.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.twitch.tv/helix/test',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Client-ID': 'test_client_id',
            'Authorization': 'Bearer test_access_token',
            'Content-Type': 'application/json',
          },
        })
      );

      expect(result).toEqual({ data: 'test' });
    });

    it('should append query parameters to URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
        headers: new Headers({
          'ratelimit-limit': '800',
          'ratelimit-remaining': '799',
          'ratelimit-reset': String(Math.floor(Date.now() / 1000) + 60),
        }),
      });

      await client.get('/test', { key1: 'value1', key2: 42 });

      const url = new URL(mockFetch.mock.calls[0][0]);
      expect(url.searchParams.get('key1')).toBe('value1');
      expect(url.searchParams.get('key2')).toBe('42');
    });
  });

  describe('POST requests', () => {
    it('should make POST request with body', async () => {
      const postData = { name: 'test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        headers: new Headers({
          'ratelimit-limit': '800',
          'ratelimit-remaining': '799',
          'ratelimit-reset': String(Math.floor(Date.now() / 1000) + 60),
        }),
      });

      const result = await client.post('/test', postData);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.twitch.tv/helix/test',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Client-ID': 'test_client_id',
            'Authorization': 'Bearer test_access_token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(postData),
        })
      );

      expect(result).toEqual({ success: true });
    });

    it('should make POST request without body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        headers: new Headers({
          'ratelimit-limit': '800',
          'ratelimit-remaining': '799',
          'ratelimit-reset': String(Math.floor(Date.now() / 1000) + 60),
        }),
      });

      await client.post('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.twitch.tv/helix/test',
        expect.objectContaining({
          method: 'POST',
          body: undefined,
        })
      );
    });
  });

  describe('PUT requests', () => {
    it('should make PUT request with body', async () => {
      const putData = { update: 'test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ updated: true }),
        headers: new Headers({
          'ratelimit-limit': '800',
          'ratelimit-remaining': '799',
          'ratelimit-reset': String(Math.floor(Date.now() / 1000) + 60),
        }),
      });

      const result = await client.put('/test', putData);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.twitch.tv/helix/test',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(putData),
        })
      );

      expect(result).toEqual({ updated: true });
    });
  });

  describe('DELETE requests', () => {
    it('should make DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ deleted: true }),
        headers: new Headers({
          'ratelimit-limit': '800',
          'ratelimit-remaining': '799',
          'ratelimit-reset': String(Math.floor(Date.now() / 1000) + 60),
        }),
      });

      const result = await client.delete('/test/123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.twitch.tv/helix/test/123',
        expect.objectContaining({
          method: 'DELETE',
        })
      );

      expect(result).toEqual({ deleted: true });
    });
  });

  describe('Error Handling', () => {
    it('should throw error on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
        headers: new Headers(),
      });

      await expect(client.get('/test')).rejects.toThrow('Request failed: 404 - Not Found');
    });

    it('should throw error on generic failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
        headers: new Headers(),
      });

      await expect(client.get('/test')).rejects.toThrow('Request failed: 400 - Bad Request');
    });
  });

  describe('Rate Limiting', () => {
    it('should update rate limit from headers', async () => {
      const resetTime = Math.floor(Date.now() / 1000) + 60;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
        headers: new Headers({
          'ratelimit-limit': '800',
          'ratelimit-remaining': '750',
          'ratelimit-reset': String(resetTime),
        }),
      });

      await client.get('/test');

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should wait when rate limit reached', async () => {
      const resetTime = Math.floor(Date.now() / 1000) + 1;
      const startSpy = vi.spyOn(Date, 'now').mockReturnValue(Date.now());

      const rateLimitClient = new RestClient(logger, {
        clientId: 'test_client_id',
        getAccessToken: vi.fn().mockResolvedValue('token'),
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'test' }),
        headers: new Headers({
          'ratelimit-limit': '800',
          'ratelimit-remaining': '0',
          'ratelimit-reset': String(resetTime),
        }),
      });

      await rateLimitClient.get('/test');
      await rateLimitClient.get('/test');

      startSpy.mockRestore();
    });

    it('should not wait when rate limit not reached', async () => {
      const sleepSpy = vi.spyOn(RestClient.prototype as any, 'sleep').mockResolvedValue(undefined);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'test' }),
        headers: new Headers({
          'ratelimit-limit': '800',
          'ratelimit-remaining': '799',
          'ratelimit-reset': String(Math.floor(Date.now() / 1000) + 60),
        }),
      });

      await client.get('/test');

      expect(sleepSpy).not.toHaveBeenCalled();
      sleepSpy.mockRestore();
    });
  });

  describe('Retry Logic', () => {
    it('should retry on 429 rate limit exceeded', async () => {
      const resetTime = Math.floor(Date.now() / 1000) + 1;

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Rate Limit Exceeded',
        headers: new Headers({
          'ratelimit-reset': String(resetTime),
        }),
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
        headers: new Headers({
          'ratelimit-limit': '800',
          'ratelimit-remaining': '799',
          'ratelimit-reset': String(Math.floor(Date.now() / 1000) + 60),
        }),
      });

      const result = await client.get('/test');

      expect(result).toEqual({ data: 'test' });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on 500 server error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
        headers: new Headers(),
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
        headers: new Headers({
          'ratelimit-limit': '800',
          'ratelimit-remaining': '799',
          'ratelimit-reset': String(Math.floor(Date.now() / 1000) + 60),
        }),
      });

      const result = await client.get('/test');

      expect(result).toEqual({ data: 'test' });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: 'test' }),
          headers: new Headers({
            'ratelimit-limit': '800',
            'ratelimit-remaining': '799',
            'ratelimit-reset': String(Math.floor(Date.now() / 1000) + 60),
          }),
        });

      const result = await client.get('/test');

      expect(result).toEqual({ data: 'test' });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should stop retrying after max attempts', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
        headers: new Headers(),
      });

      await expect(client.get('/test')).rejects.toThrow('Max retries reached');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should handle exponential backoff', async () => {
      const sleepSpy = vi.spyOn(RestClient.prototype as any, 'sleep').mockImplementation((ms: number) => {
        expect(ms).toBeGreaterThan(1000);
        return Promise.resolve();
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
        headers: new Headers(),
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
        headers: new Headers({
          'ratelimit-limit': '800',
          'ratelimit-remaining': '799',
          'ratelimit-reset': String(Math.floor(Date.now() / 1000) + 60),
        }),
      });

      await client.get('/test');

      expect(sleepSpy).toHaveBeenCalled();
      sleepSpy.mockRestore();
    });
  });

  describe('Backoff Delays', () => {
    it('should wait for reset time on 429', async () => {
      const resetTime = Math.floor(Date.now() / 1000) + 2;
      const sleepSpy = vi.spyOn(RestClient.prototype as any, 'sleep').mockResolvedValue(undefined);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Rate Limited',
        headers: new Headers({
          'ratelimit-reset': String(resetTime),
        }),
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
        headers: new Headers(),
      });

      await client.get('/test');

      const delay: number = sleepSpy.mock.calls[0][0];
      expect(delay).toBeGreaterThanOrEqual(2000);
      expect(delay).toBeLessThan(3000);

      sleepSpy.mockRestore();
    });

    it('should use exponential backoff for 5xx after first attempt', async () => {
      const sleepSpy = vi.spyOn(RestClient.prototype as any, 'sleep').mockResolvedValue(undefined);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Server Error',
        headers: new Headers(),
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
        headers: new Headers(),
      });

      await client.get('/test');

      const delay: number = sleepSpy.mock.calls[0][0];
      expect(delay).toBeGreaterThanOrEqual(1000);
      expect(delay).toBeLessThan(2000);

      sleepSpy.mockRestore();
    });
  });

  describe('Access Token Management', () => {
    it('should fetch access token on each request', async () => {
      const getAccessTokenSpy = vi.fn().mockResolvedValue('token');

      const tokenClient = new RestClient(logger, {
        clientId: 'test_client_id',
        getAccessToken: getAccessTokenSpy,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'test' }),
        headers: new Headers({
          'ratelimit-limit': '800',
          'ratelimit-remaining': '799',
          'ratelimit-reset': String(Math.floor(Date.now() / 1000) + 60),
        }),
      });

      await tokenClient.get('/test');

      expect(getAccessTokenSpy).toHaveBeenCalled();
    });

    it('should include Bearer token in Authorization header', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'test' }),
        headers: new Headers({
          'ratelimit-limit': '800',
          'ratelimit-remaining': '799',
          'ratelimit-reset': String(Math.floor(Date.now() / 1000) + 60),
        }),
      });

      await client.get('/test');

      const authHeader = mockFetch.mock.calls[0][1].headers.Authorization;
      expect(authHeader).toBe('Bearer test_access_token');
    });
  });
});
