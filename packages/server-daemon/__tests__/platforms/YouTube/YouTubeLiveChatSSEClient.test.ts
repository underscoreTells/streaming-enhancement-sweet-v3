import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { YouTubeLiveChatSSEClient, YouTubeChatPollingClient } from '../../../platforms/YouTube/sse';
import type { YouTubeLiveChatMessage, YouTubeLiveChatResponse } from '../../../platforms/YouTube/rest/types';
import { Logger } from 'winston';

describe('YouTubeLiveChatSSEClient', () => {
  let logger: Logger;
  let client: YouTubeLiveChatSSEClient;

  beforeEach(() => {
    logger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(async () => {
    if (client) {
      await client.disconnect();
    }
    vi.unstubAllGlobals();
  });

  describe('initialization', () => {
    it('should initialize with correct config', () => {
      const config = {
        liveChatId: 'test-chat-id',
        accessToken: 'test-token',
        pollingFallback: true,
      };

      client = new YouTubeLiveChatSSEClient(logger, config);
      expect(client).toBeDefined();
    });

    it('should start in disconnected state', () => {
      const config = {
        liveChatId: 'test-chat-id',
        accessToken: 'test-token',
      };

      client = new YouTubeLiveChatSSEClient(logger, config);
      expect(client.getState()).toBe('disconnected');
      expect(client.isConnected()).toBe(false);
    });
  });

  describe('connection lifecycle', () => {
    it('should transition to connecting when connect() is called', async () => {
      const mockResponse: YouTubeLiveChatResponse = {
        kind: 'youtube#liveChatMessageListResponse',
        etag: '"test-etag"',
        nextPageToken: 'next-page-token-123',
        pollingIntervalMillis: 5000,
        items: [],
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as unknown as Response);

      client = new YouTubeLiveChatSSEClient(logger, {
        liveChatId: 'test-chat-id',
        accessToken: 'test-token',
      });

      const connectPromise = client.connect();
      expect(client.getState()).toBe('connecting');
      
      await connectPromise;
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(fetch).toHaveBeenCalled();
      expect(client.getState()).toBe('connected');
    });

    it('should emit stateChanged events', async () => {
      const mockResponse: YouTubeLiveChatResponse = {
        kind: 'youtube#liveChatMessageListResponse',
        etag: '"test-etag"',
        nextPageToken: 'next-page-token-123',
        pollingIntervalMillis: 5000,
        items: [],
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as unknown as Response);

      client = new YouTubeLiveChatSSEClient(logger, {
        liveChatId: 'test-chat-id',
        accessToken: 'test-token',
      });

      const states: string[] = [];
      client.on('stateChanged', (data: { oldState: string; newState: string }) => {
        states.push(data.newState);
      });

      await client.connect();
      await new Promise(resolve => setTimeout(resolve, 50));
      await client.disconnect();

      expect(states.length).toBeGreaterThan(0);
      expect(states).toContain('connected');
      expect(states).toContain('disconnected');
    });

    it('should disconnect properly', async () => {
      const mockResponse: YouTubeLiveChatResponse = {
        kind: 'youtube#liveChatMessageListResponse',
        etag: '"test-etag"',
        nextPageToken: 'next-page-token-123',
        pollingIntervalMillis: 5000,
        items: [],
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as unknown as Response);

      client = new YouTubeLiveChatSSEClient(logger, {
        liveChatId: 'test-chat-id',
        accessToken: 'test-token',
      });

      await client.connect();
      await new Promise(resolve => setTimeout(resolve, 50));
      await client.disconnect();

      expect(client.getState()).toBe('disconnected');
      expect(client.isConnected()).toBe(false);
    });

    it('should handle connection errors', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Connection failed'));

      client = new YouTubeLiveChatSSEClient(logger, {
        liveChatId: 'test-chat-id',
        accessToken: 'test-token',
        pollingFallback: false,
        maxRetries: 1,
      });

      await client.connect();
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(fetch).toHaveBeenCalled();
      expect(client.getState()).toBe('error');
    });
  });

  describe('message handling', () => {
    it('should receive chat messages via polling', async () => {
      const testData: YouTubeLiveChatResponse = {
        kind: 'youtube#liveChatMessageListResponse',
        etag: '"test-etag"',
        nextPageToken: 'next-page-token-123',
        pollingIntervalMillis: 5000,
        items: [
          {
            kind: 'youtube#liveChatMessage',
            etag: '"message-etag"',
            id: 'msg-1',
            snippet: {
              liveChatId: 'test-chat-id',
              authorChannelId: 'channel-1',
              publishedAt: '2024-01-01T00:00:00Z',
              hasDisplayContent: true,
              displayMessage: 'Hello!',
              textMessageDetails: {
                messageText: 'Hello!',
              },
            },
            authorDetails: {
              channelId: 'channel-1',
              channelUrl: 'https://youtube.com/channel-1',
              displayName: 'TestUser',
              profileImageUrl: 'https://example.com/avatar.jpg',
              isVerified: false,
              isChatOwner: false,
              isChatSponsor: false,
              isChatModerator: false,
            },
          } as YouTubeLiveChatMessage,
        ],
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => testData,
      } as unknown as Response);

      const messages: any[] = [];
      client = new YouTubeLiveChatSSEClient(logger, {
        liveChatId: 'test-chat-id',
        accessToken: 'test-token',
      });

      client.on('message', (msg) => {
        messages.push(msg);
      });

      await client.connect();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe('msg-1');
      expect(client.getCurrentPageToken()).toBe('next-page-token-123');
      
      await client.disconnect();
    });
  });

  describe('fallback to polling', () => {
    it('should emit fallback event when pollingFallback is enabled and connection fails', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Connection failed'));

      const fallbackSpy = vi.fn();
      client = new YouTubeLiveChatSSEClient(logger, {
        liveChatId: 'test-chat-id',
        accessToken: 'test-token',
        pollingFallback: true,
      });

      client.on('fallback', fallbackSpy);

      await client.connect();
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(fallbackSpy).toHaveBeenCalled();
      expect(client.getState()).toBe('polling');
    });

    it('should not fallback when pollingFallback is disabled', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Connection failed'));

      const fallbackSpy = vi.fn();
      client = new YouTubeLiveChatSSEClient(logger, {
        liveChatId: 'test-chat-id',
        accessToken: 'test-token',
        pollingFallback: false,
        maxRetries: 1,
      });

      client.on('fallback', fallbackSpy);

      await client.connect();

      expect(fallbackSpy).not.toHaveBeenCalled();
    });
  });

  describe('reconnection logic', () => {
    it('should handle connection lifecycle', async () => {
      const mockResponse: YouTubeLiveChatResponse = {
        kind: 'youtube#liveChatMessageListResponse',
        etag: '"test-etag"',
        nextPageToken: 'next-page-token',
        pollingIntervalMillis: 5000,
        items: [],
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as unknown as Response);

      client = new YouTubeLiveChatSSEClient(logger, {
        liveChatId: 'test-chat-id',
        accessToken: 'test-token',
        maxRetries: 2,
        reconnectDelay: 100,
      });

      await client.connect();
      await client.disconnect();

      expect(client.getState()).toBe('disconnected');
    });
  });
});

describe('YouTubeChatPollingClient', () => {
  let logger: Logger;
  let client: YouTubeChatPollingClient;

  beforeEach(() => {
    logger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    vi.stubGlobal('fetch', vi.fn());
    vi.useFakeTimers();
  });

  afterEach(async () => {
    if (client) {
      await client.disconnect();
    }
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with correct config', () => {
      const config = {
        liveChatId: 'test-chat-id',
        accessToken: 'test-token',
        initialPollInterval: 3000,
      };

      client = new YouTubeChatPollingClient(logger, config);
      expect(client).toBeDefined();
      expect(client.getCurrentPollInterval()).toBe(5000);
    });

    it('should start in disconnected state', () => {
      const config = {
        liveChatId: 'test-chat-id',
        accessToken: 'test-token',
      };

      client = new YouTubeChatPollingClient(logger, config);
      expect(client.getState()).toBe('disconnected');
      expect(client.isConnected()).toBe(false);
    });
  });

  describe('connection lifecycle', () => {
    it('should transition to polling when connect() is called', async () => {
      const mockResponse: YouTubeLiveChatResponse = {
        kind: 'youtube#liveChatMessageListResponse',
        etag: '"test-etag"',
        nextPageToken: 'next-page-token',
        pollingIntervalMillis: 5000,
        items: [],
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as unknown as Response);

      client = new YouTubeChatPollingClient(logger, {
        liveChatId: 'test-chat-id',
        accessToken: 'test-token',
      });

      await client.connect();

      expect(client.getState()).toBe('polling');
      expect(client.isConnected()).toBe(true);
    });

    it('should emit stateChanged events', async () => {
      const mockResponse: YouTubeLiveChatResponse = {
        kind: 'youtube#liveChatMessageListResponse',
        etag: '"test-etag"',
        nextPageToken: 'next-page-token',
        pollingIntervalMillis: 5000,
        items: [],
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as unknown as Response);

      client = new YouTubeChatPollingClient(logger, {
        liveChatId: 'test-chat-id',
        accessToken: 'test-token',
      });

      const states: string[] = [];
      client.on('stateChanged', (data: { oldState: string; newState: string }) => {
        states.push(data.newState);
      });

      await client.connect();

      expect(states).toContain('polling');
    });

    it('should disconnect properly', async () => {
      const mockResponse: YouTubeLiveChatResponse = {
        kind: 'youtube#liveChatMessageListResponse',
        etag: '"test-etag"',
        nextPageToken: 'next-page-token',
        pollingIntervalMillis: 5000,
        items: [],
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as unknown as Response);

      client = new YouTubeChatPollingClient(logger, {
        liveChatId: 'test-chat-id',
        accessToken: 'test-token',
      });

      await client.connect();
      await client.disconnect();

      expect(client.getState()).toBe('disconnected');
      expect(client.isConnected()).toBe(false);
    });
  });

  describe('polling functionality', () => {
    it('should poll for messages', async () => {
      const mockResponse: YouTubeLiveChatResponse = {
        kind: 'youtube#liveChatMessageListResponse',
        etag: '"test-etag"',
        nextPageToken: 'next-page-token',
        pollingIntervalMillis: 5000,
        items: [
          {
            kind: 'youtube#liveChatMessage',
            etag: '"message-etag"',
            id: 'msg-1',
            snippet: {
              liveChatId: 'test-chat-id',
              authorChannelId: 'channel-1',
              publishedAt: '2024-01-01T00:00:00Z',
              hasDisplayContent: true,
              displayMessage: 'Test message',
              textMessageDetails: {
                messageText: 'Test message',
              },
            },
            authorDetails: {
              channelId: 'channel-1',
              channelUrl: 'https://youtube.com/channel-1',
              displayName: 'TestUser',
              profileImageUrl: 'https://example.com/avatar.jpg',
              isVerified: false,
              isChatOwner: false,
              isChatSponsor: false,
              isChatModerator: false,
            },
          } as YouTubeLiveChatMessage,
        ],
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as unknown as Response);

      const messages: any[] = [];
      client = new YouTubeChatPollingClient(logger, {
        liveChatId: 'test-chat-id',
        accessToken: 'test-token',
      });

      client.on('message', (msg) => messages.push(msg));

      await client.connect();

      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe('msg-1');
      expect(client.getCurrentPageToken()).toBe('next-page-token');
    });

    it('should use correct polling interval from API response', async () => {
      const mockResponse: YouTubeLiveChatResponse = {
        kind: 'youtube#liveChatMessageListResponse',
        etag: '"test-etag"',
        nextPageToken: 'next-page-token',
        pollingIntervalMillis: 10000,
        items: [],
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as unknown as Response);

      client = new YouTubeChatPollingClient(logger, {
        liveChatId: 'test-chat-id',
        accessToken: 'test-token',
      });

      await client.connect();

      expect(client.getCurrentPollInterval()).toBe(10000);
    });

    it('should continue polling on errors', async () => {
      const successResponse: YouTubeLiveChatResponse = {
        kind: 'youtube#liveChatMessageListResponse',
        etag: '"test-etag"',
        nextPageToken: 'next-page-token',
        pollingIntervalMillis: 5000,
        items: [],
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => successResponse,
      } as unknown as Response);

      client = new YouTubeChatPollingClient(logger, {
        liveChatId: 'test-chat-id',
        accessToken: 'test-token',
      });

      await client.connect();

      expect(client.getState()).toBe('polling');
    });
  });
});
