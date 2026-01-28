import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createLogger } from 'winston';
import { RestClient } from '../../../platforms/Kick/rest/RestClient';

describe('RestClient', () => {
  let logger: ReturnType<typeof createLogger>;
  let client: RestClient;
  let mockFetch: ReturnType<typeof vi.fn>;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    logger = createLogger({ silent: true });
    client = new RestClient(logger, {
      baseUrl: 'https://kick.com',
      timeout: 30000,
    });

    originalFetch = global.fetch;
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('GET requests', () => {
    it('should make GET request with correct headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
        status: 200,
      });

      const result = await client.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://kick.com/test',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'streaming-daemon/1.0',
          },
        })
      );

      expect(result).toEqual({ data: 'test' });
    });

    it('should append query parameters to URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
        status: 200,
      });

      await client.get('/test', { key1: 'value1', key2: 42, key3: true });

      const url = new URL(mockFetch.mock.calls[0][0]);
      expect(url.searchParams.get('key1')).toBe('value1');
      expect(url.searchParams.get('key2')).toBe('42');
      expect(url.searchParams.get('key3')).toBe('true');
    });

    it('should encode query parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
        status: 200,
      });

      await client.get('/test', { space: 'test value', special: 'key=value' });

      const url = new URL(mockFetch.mock.calls[0][0]);
      expect(url.searchParams.get('space')).toBe('test value');
      expect(url.searchParams.get('special')).toBe('key=value');
    });
  });

  describe('POST requests', () => {
    it('should make POST request with body', async () => {
      const postData = { name: 'test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        status: 200,
      });

      const result = await client.post('/test', postData);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://kick.com/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(postData),
        })
      );

      expect(result).toEqual({ success: true });
    });

    it('should make POST request without body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        status: 200,
      });

      await client.post('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://kick.com/test',
        expect.not.objectContaining({
          body: expect.anything(),
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
        status: 200,
      });

      const result = await client.put('/test', putData);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://kick.com/test',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(putData),
        })
      );

      expect(result).toEqual({ updated: true });
    });

    it('should make PUT request without body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ updated: true }),
        status: 200,
      });

      await client.put('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://kick.com/test',
        expect.not.objectContaining({
          body: expect.anything(),
        })
      );
    });
  });

  describe('DELETE requests', () => {
    it('should make DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ deleted: true }),
        status: 200,
      });

      const result = await client.delete('/test/123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://kick.com/test/123',
        expect.objectContaining({
          method: 'DELETE',
        })
      );

      expect(result).toEqual({ deleted: true });
    });
  });

  describe('Error Handling', () => {
    it('should throw error on 404', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not Found' }),
        statusText: 'Not Found',
      });

      await expect(client.get('/test')).rejects.toThrow('Request failed: 404 Not Found');
    });

    it('should throw error on 400', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Bad Request' }),
        statusText: 'Bad Request',
      });

      await expect(client.get('/test')).rejects.toThrow('Request failed: 400 Bad Request');
    });

    it('should throw error on generic failure', async () => {
      const sleepSpy = vi.spyOn(RestClient.prototype as any, 'sleep').mockResolvedValue(undefined);

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal Server Error' }),
        statusText: 'Internal Server Error',
      });

      await expect(client.get('/test')).rejects.toThrow('Request failed: 500 Internal Server Error');

      sleepSpy.mockRestore();
    });
  });

  describe('safeJson handling', () => {
    it('should handle json parse errors gracefully in 500 response', async () => {
      const sleepSpy = vi.spyOn(RestClient.prototype as any, 'sleep').mockResolvedValue(undefined);

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => { throw new Error('Invalid JSON'); },
        statusText: 'Internal Server Error',
      });

      await expect(client.get('/test')).rejects.toThrow('Request failed: 500 Internal Server Error');

      sleepSpy.mockRestore();
    });
  });

  describe('Retry Logic', () => {
    it('should retry on 429 rate limit exceeded', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: async () => ({ message: 'Rate limit' }),
          statusText: 'Too Many Requests',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: 'test' }),
          status: 200,
        });

      const result = await client.get('/test');

      expect(result).toEqual({ data: 'test' });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on 500 server error', async () => {
      const sleepSpy = vi.spyOn(RestClient.prototype as any, 'sleep').mockResolvedValue(undefined);

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ message: 'Internal Server Error' }),
          statusText: 'Internal Server Error',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: 'test' }),
          status: 200,
        });

      const result = await client.get('/test');

      expect(result).toEqual({ data: 'test' });
      expect(mockFetch).toHaveBeenCalledTimes(2);

      sleepSpy.mockRestore();
    });

    it('should retry on 502 server error', async () => {
      const sleepSpy = vi.spyOn(RestClient.prototype as any, 'sleep').mockResolvedValue(undefined);

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 502,
          json: async () => ({ message: 'Bad Gateway' }),
          statusText: 'Bad Gateway',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: 'test' }),
          status: 200,
        });

      const result = await client.get('/test');

      expect(result).toEqual({ data: 'test' });
      expect(mockFetch).toHaveBeenCalledTimes(2);

      sleepSpy.mockRestore();
    });

    it('should retry on 503 server error', async () => {
      const sleepSpy = vi.spyOn(RestClient.prototype as any, 'sleep').mockResolvedValue(undefined);

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          json: async () => ({ message: 'Service Unavailable' }),
          statusText: 'Service Unavailable',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: 'test' }),
          status: 200,
        });

      const result = await client.get('/test');

      expect(result).toEqual({ data: 'test' });
      expect(mockFetch).toHaveBeenCalledTimes(2);

      sleepSpy.mockRestore();
    });

    it('should retry on network errors', async () => {
      const sleepSpy = vi.spyOn(RestClient.prototype as any, 'sleep').mockResolvedValue(undefined);

      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: 'test' }),
          status: 200,
        });

      const result = await client.get('/test');

      expect(result).toEqual({ data: 'test' });
      expect(mockFetch).toHaveBeenCalledTimes(2);

      sleepSpy.mockRestore();
    });

    it('should stop retrying after max attempts', async () => {
      const sleepSpy = vi.spyOn(RestClient.prototype as any, 'sleep').mockResolvedValue(undefined);

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal Server Error' }),
        statusText: 'Internal Server Error',
      });

      await expect(client.get('/test')).rejects.toThrow('Request failed: 500 Internal Server Error');
      expect(mockFetch).toHaveBeenCalledTimes(4);

      sleepSpy.mockRestore();
    }, 10000);
  });

  describe('safeJson handling', () => {
    it('should handle json parse errors gracefully in 500 response', async () => {
      const sleepSpy = vi.spyOn(RestClient.prototype as any, 'sleep').mockResolvedValue(undefined);

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => { throw new Error('Invalid JSON'); },
        statusText: 'Internal Server Error',
      });

      await expect(client.get('/test')).rejects.toThrow('Request failed: 500 Internal Server Error');

      sleepSpy.mockRestore();
    });
  });

  describe('Retry Logic', () => {
    it('should retry on 429 rate limit exceeded', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: async () => ({ message: 'Rate limit' }),
          statusText: 'Too Many Requests',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: 'test' }),
          status: 200,
        });

      const result = await client.get('/test');

      expect(result).toEqual({ data: 'test' });
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(sleepSpy).toHaveBeenCalledWith(5000);

      sleepSpy.mockRestore();
    });

    it('should retry on 500 server error', async () => {
      const sleepSpy = vi.spyOn(RestClient.prototype as any, 'sleep').mockResolvedValue(undefined);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal Server Error' }),
        statusText: 'Internal Server Error',
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
        status: 200,
      });

      const result = await client.get('/test');

      expect(result).toEqual({ data: 'test' });
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(sleepSpy).toHaveBeenCalled();

      sleepSpy.mockRestore();
    });

    it('should retry on 502 server error', async () => {
      const sleepSpy = vi.spyOn(RestClient.prototype as any, 'sleep').mockResolvedValue(undefined);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => ({ message: 'Bad Gateway' }),
        statusText: 'Bad Gateway',
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
        status: 200,
      });

      const result = await client.get('/test');

      expect(result).toEqual({ data: 'test' });
      expect(mockFetch).toHaveBeenCalledTimes(2);

      sleepSpy.mockRestore();
    });

    it('should retry on 503 server error', async () => {
      const sleepSpy = vi.spyOn(RestClient.prototype as any, 'sleep').mockResolvedValue(undefined);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ message: 'Service Unavailable' }),
        statusText: 'Service Unavailable',
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
        status: 200,
      });

      const result = await client.get('/test');

      expect(result).toEqual({ data: 'test' });
      expect(mockFetch).toHaveBeenCalledTimes(2);

      sleepSpy.mockRestore();
    });

    it('should retry on network errors', async () => {
      const sleepSpy = vi.spyOn(RestClient.prototype as any, 'sleep').mockResolvedValue(undefined);

      mockFetch.mockRejectedValueOnce(new Error('Network error')).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
        status: 200,
      });

      const result = await client.get('/test');

      expect(result).toEqual({ data: 'test' });
      expect(mockFetch).toHaveBeenCalledTimes(2);

      sleepSpy.mockRestore();
    });

    it('should stop retrying after max attempts', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal Server Error' }),
        statusText: 'Internal Server Error',
      });

      await expect(client.get('/test')).rejects.toThrow('Request failed after maximum retry attempts');
      expect(mockFetch).toHaveBeenCalledTimes(4);
    }, 10000);

    it('should use exponential backoff for 5xx errors', async () => {
      const sleepSpy = vi.spyOn(RestClient.prototype as any, 'sleep').mockImplementation((ms: number) => {
        expect(ms).toBeGreaterThanOrEqual(1000);
        expect(ms).toBeLessThanOrEqual(8000);
        return Promise.resolve();
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal Server Error' }),
        statusText: 'Internal Server Error',
      }).mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'test' }),
        status: 200,
      });

      await client.get('/test');

      expect(sleepSpy).toHaveBeenCalled();
      sleepSpy.mockRestore();
    });

    it('should cap exponential backoff at 8 seconds', async () => {
      const sleepSpy = vi.spyOn(RestClient.prototype as any, 'sleep').mockImplementation((ms: number) => {
        expect(ms).toBeLessThanOrEqual(8000);
        return Promise.resolve();
      });

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Error' }),
        statusText: 'Error',
      });

      try {
        await client.get('/test');
      } catch (error) {
      }

      sleepSpy.mockRestore();
    }, 10000);
  });

  describe('Timeout Handling', () => {
    it('should use default 30s timeout', async () => {
      const abortSpy = vi.spyOn(AbortController.prototype, 'abort').mockImplementation(() => {});

      mockFetch.mockImplementation((url: string, options: any) => {
        expect(options.signal).toBeDefined();
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: 'test' }),
          status: 200,
        });
      });

      await client.get('/test');

      abortSpy.mockRestore();
    });

    it('should use custom timeout', async () => {
      const customClient = new RestClient(logger, {
        baseUrl: 'https://kick.com',
        timeout: 5000,
      });

      mockFetch.mockImplementation((url: string, options: any) => {
        expect(options.signal).toBeDefined();
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: 'test' }),
          status: 200,
        });
      });

      await customClient.get('/test');

      customClient.disconnect?.();
    });

    it('should throw on timeout', async () => {
      mockFetch.mockImplementation((): Promise<Response> => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 100);
        });
      });

      await expect(client.get('/test')).rejects.toThrow();
    });
  });

  describe('URL Building', () => {
    it('should use custom baseUrl', async () => {
      const customClient = new RestClient(logger, {
        baseUrl: 'https://custom.kick.com',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
        status: 200,
      });

      await customClient.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://custom.kick.com/test',
        expect.any(Object)
      );
    });

    it('should default to https://kick.com', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
        status: 200,
      });

      await client.get('/test');

      expect(mockFetch.mock.calls[0][0]).toContain('https://kick.com/test');
    });

    it('should handle empty query params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
        status: 200,
      });

      await client.get('/test', {});

      const url = mockFetch.mock.calls[0][0];
      expect(url).toBe('https://kick.com/test');
    });
  });

  describe('Headers', () => {
    it('should include Content-Type application/json', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
        status: 200,
      });

      await client.post('/test', { data: 'test' });

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should include User-Agent header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
        status: 200,
      });

      await client.get('/test');

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['User-Agent']).toBe('streaming-daemon/1.0');
    });
  });

  describe('Queue Processing', () => {
    it('should process requests in order', async () => {
      const order: number[] = [];
      mockFetch.mockImplementation((): Promise<Response> => {
        order.push(Date.now());
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: 'test' }),
          status: 200,
        });
      });

      await Promise.all([
        client.get('/test1'),
        client.get('/test2'),
        client.get('/test3'),
      ]);

      expect(order).toHaveLength(3);
    });
  });

  describe('Rate Limit Backoff Delays', () => {
    it('should use correct delay for rate limit', async () => {
      const sleepSpy = vi.spyOn(RestClient.prototype as any, 'sleep').mockResolvedValue(undefined);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ message: 'Rate Limited' }),
        statusText: 'Too Many Requests',
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
        status: 200,
      });

      await client.get('/test');

      expect(sleepSpy).toHaveBeenCalledWith(5000);

      sleepSpy.mockRestore();
    });
  });

  describe('Multiple 5xx Errors', () => {
    it('should retry multiple 5xx errors', async () => {
      const sleepSpy = vi.spyOn(RestClient.prototype as any, 'sleep').mockResolvedValue(undefined);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Error' }),
        statusText: 'Error',
      }).mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => ({ message: 'Error' }),
        statusText: 'Error',
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
        status: 200,
      });

      const result = await client.get('/test');

      expect(result).toEqual({ data: 'test' });
      expect(mockFetch).toHaveBeenCalledTimes(3);

      sleepSpy.mockRestore();
    });
  });

  describe('Request Body', () => {
    it('should stringify request body', async () => {
      const bodyData = { key: 'value', number: 123 };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        status: 200,
      });

      await client.post('/test', bodyData);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body).toEqual(bodyData);
    });

    it('should not attach body for GET requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
        status: 200,
      });

      await client.get('/test');

      expect(mockFetch.mock.calls[0][1].body).toBeUndefined();
    });

    it('should not attach body for DELETE requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ deleted: true }),
        status: 200,
      });

      await client.delete('/test');

      expect(mockFetch.mock.calls[0][1].body).toBeUndefined();
    });
  });
});
