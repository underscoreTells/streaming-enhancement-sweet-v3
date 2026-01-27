import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createLogger } from 'winston';
import { TwitchStrategy } from '../../../../platforms/Twitch/TwitchStrategy';
import { TwitchOAuth } from '../../../../platforms/Twitch/TwitchOAuth';
import { MockKeystoreManager } from '../../../mocks/KeystoreManager.mock';
import { OAuthCredentialsRepository } from '../../../infrastructure/database/OAuthCredentialsRepository';
import type { TokenSet } from '../../../../platforms/types';

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

class MockTwitchOAuth {
  async startOAuth(_username: string): Promise<string> {
    return 'https://id.twitch.tv/oauth2/authorize?client_id=test_client_id&redirect_uri=http://localhost:3000/callback&response_type=code&state=test_state';
  }

  async handleCallback(_code: string, _state: string): Promise<TokenSet> {
    return {
      access_token: 'test_access_token',
      refresh_token: 'test_refresh_token',
      expires_in: 3600,
      scope: ['chat:read', 'chat:edit'],
    };
  }

  async getAccessToken(_username: string): Promise<TokenSet> {
    return {
      access_token: 'test_access_token',
      refresh_token: 'test_refresh_token',
      expires_in: 3600,
      scope: ['chat:read', 'chat:edit'],
    };
  }

  async refreshToken(_refreshToken: string): Promise<TokenSet> {
    return {
      access_token: 'new_access_token',
      refresh_token: 'new_refresh_token',
      expires_in: 7200,
      scope: ['chat:read', 'chat:edit'],
    };
  }
}

describe('TwitchStrategy', () => {
  let logger: ReturnType<typeof createLogger>;
  let mockKeystore: MockKeystoreManager;
  let mockRepo: MockOAuthCredentialsRepository;
  let mockOAuth: MockTwitchOAuth;
  let strategy: TwitchStrategy;

  beforeEach(() => {
    logger = createLogger({ silent: true });
    mockKeystore = new MockKeystoreManager();
    mockRepo = new MockOAuthCredentialsRepository();
    mockOAuth = new MockTwitchOAuth();

    mockRepo.setCredential('twitch', 'test_client_id', 'test_client_secret', ['chat:read', 'chat:edit']);

    strategy = new TwitchStrategy(
      logger,
      mockOAuth as any,
      mockRepo as any as OAuthCredentialsRepository,
      {
        clientId: 'test_client_id',
        eventSubUrl: 'wss://eventsub.test.ws',
        ircUrl: 'wss://irc.test.ws',
      }
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Construction', () => {
    it('should create strategy with correct platform', () => {
      expect(strategy.platform).toBe('twitch');
    });

    it('should initialize with disconnected state', () => {
      expect(strategy.getConnectionState()).toBe('disconnected');
    });

    it('should have correct initial health status', () => {
      const status = strategy.getHealthStatus();

      expect(status.platform).toBe('twitch');
      expect(status.state).toBe('disconnected');
      expect(status.eventsub.connected).toBe(false);
      expect(status.eventsub.sessionId).toBeNull();
      expect(status.irc.connected).toBe(false);
      expect(status.rest.clientId).toBe('test_client_id');
    });

    it('should limit maxListeners', () => {
      const strategyWithLimit = new TwitchStrategy(
        logger,
        mockOAuth as any,
        mockRepo as any as OAuthCredentialsRepository,
        { clientId: 'test_client_id' }
      );

      expect(strategyWithLimit.getMaxListeners()).toBe(100);
    });
  });

  describe('Connection State', () => {
    it('should emit connectionStateChanged', (done) => {
      const originalConnect = strategy.connect.bind(strategy);

      strategy.on('connectionStateChanged', ({ oldState, newState }) => {
        expect(oldState).toBe('disconnected');
        expect(newState).toBe('connecting');

        setTimeout(() => {
          const status = strategy.getConnectionState();
          expect(status).toBe('connecting');
          done();
        }, 0);
      });

      vi.spyOn(strategy as any, 'eventSubClient', 'set').mockImplementation(() => {});
      strategy.connect = originalConnect;
    });

    it('should transition to connected state on successful connection', async () => {
      const EventSubClientMock = vi.fn().mockImplementation(() => ({
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn(),
        getSessionId: () => 'test-session-id',
        on: vi.fn(),
      }));

      const EventSubSubscriptionManagerMock = vi.fn().mockImplementation(() => ({
        create: vi.fn().mockResolvedValue({ id: 'sub1' }),
      }));

      const EventSubHandlerMock = vi.fn().mockImplementation(() => ({
        register: vi.fn(),
        handle: vi.fn(),
      }));

      const IrcClientMock = vi.fn().mockImplementation(() => ({
        connect: vi.fn(),
        disconnect: vi.fn(),
        isConnected: () => true,
        join: vi.fn(),
        on: vi.fn(),
      }));

      const RestClientMock = vi.fn().mockImplementation(() => ({
        get: vi.fn().mockResolvedValue({ data: [] }),
        post: vi.fn(),
      }));

      const createEventHandlersMock = vi.fn(() => new Map());

      vi.doMock('../../../../platforms/Twitch/eventsub/EventSubClient', () => ({ EventSubClient: EventSubClientMock }));
      vi.doMock('../../../../platforms/Twitch/eventsub/EventSubSubscription', () => ({ EventSubSubscriptionManager: EventSubSubscriptionManagerMock }));
      vi.doMock('../../../../platforms/Twitch/eventsub/EventSubHandler', () => ({ EventSubHandler: EventSubHandlerMock, createEventHandlers: createEventHandlersMock }));
      vi.doMock('../../../../platforms/Twitch/irc/IrcClient', () => ({ IrcClient: IrcClientMock }));
      vi.doMock('../../../../platforms/Twitch/rest/RestClient', () => ({ RestClient: RestClientMock }));

      await strategy.connect();

      expect(strategy.getConnectionState()).toBe('connected');
    });

    it('should transition to error state on connection failure', async () => {
      vi.spyOn(mockOAuth, 'getAccessToken').mockRejectedValue(new Error('Token error'));

      await expect(strategy.connect()).rejects.toThrow('Token error');
      expect(strategy.getConnectionState()).toBe('error');
    });
  });

  describe('disconnect', () => {
    it('should disconnect all clients', async () => {
      const disconnectMocks = [
        { disconnect: vi.fn() },
        { disconnect: vi.fn() },
      ];

      vi.spyOn(strategy as any, 'eventSubClient', 'get').mockReturnValue(disconnectMocks[0]);
      vi.spyOn(strategy as any, 'ircClient', 'get').mockReturnValue(disconnectMocks[1]);

      await strategy.disconnect();

      expect(disconnectMocks[0].disconnect).toHaveBeenCalled();
      expect(disconnectMocks[1].disconnect).toHaveBeenCalled();

      vi.restoreAllMocks();
    });

    it('should set state to disconnected', async () => {
      const disconnectMock = { disconnect: vi.fn() };
      vi.spyOn(strategy as any, 'eventSubClient', 'get').mockReturnValue(disconnectMock);
      vi.spyOn(strategy as any, 'ircClient', 'get').mockReturnValue(disconnectMock);

      await strategy.disconnect();

      expect(strategy.getConnectionState()).toBe('disconnected');

      vi.restoreAllMocks();
    });
  });

  describe('OAuth Methods', () => {
    it('should delegate startOAuth to oauth', async () => {
      const result = await strategy.startOAuth('testuser');

      expect(result).toContain('https://id.twitch.tv/oauth2/authorize');
    });

    it('should delegate handleCallback to oauth', async () => {
      const tokens = await strategy.handleCallback('auth_code', 'state');

      expect(tokens.access_token).toBe('test_access_token');
      expect(tokens.refresh_token).toBe('test_refresh_token');
    });

    it('should delegate getAccessToken to oauth', async () => {
      const tokens = await strategy.getAccessToken('testuser');

      expect(tokens.access_token).toBe('test_access_token');
    });

    it('should delegate refreshToken to oauth', async () => {
      const tokens = await strategy.refreshToken('old_refresh_token');

      expect(tokens.access_token).toBe('new_access_token');
      expect(tokens.refresh_token).toBe('new_refresh_token');
    });
  });

  describe('REST Methods', () => {
    it('should throw error when not connected', async () => {
      await expect(strategy.get('/users')).rejects.toThrow('REST client not initialized');
      await expect(strategy.post('/test')).rejects.toThrow('REST client not initialized');
      await expect(strategy.put('/test')).rejects.toThrow('REST client not initialized');
      await expect(strategy.delete('/test')).rejects.toThrow('REST client not initialized');
    });

    it('should delegate get to restClient when connected', async () => {
      const restClientMock = {
        get: vi.fn().mockResolvedValue({ data: [] }),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      };

      vi.spyOn(strategy as any, 'restClient', 'get').mockReturnValue(restClientMock);
      vi.spyOn(strategy as any, 'connectionState', 'get').mockReturnValue('connected');

      await strategy.get('/users');

      expect(restClientMock.get).toHaveBeenCalledWith('/users', undefined);

      vi.restoreAllMocks();
    });

    it('should delegate post to restClient when connected', async () => {
      const restClientMock = {
        get: vi.fn(),
        post: vi.fn().mockResolvedValue({ success: true }),
        put: vi.fn(),
        delete: vi.fn(),
      };

      vi.spyOn(strategy as any, 'restClient', 'get').mockReturnValue(restClientMock);
      vi.spyOn(strategy as any, 'connectionState', 'get').mockReturnValue('connected');

      await strategy.post('/test', { data: 'test' });

      expect(restClientMock.post).toHaveBeenCalledWith('/test', { data: 'test' });

      vi.restoreAllMocks();
    });

    it('should delegate put to restClient when connected', async () => {
      const restClientMock = {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn().mockResolvedValue({ updated: true }),
        delete: vi.fn(),
      };

      vi.spyOn(strategy as any, 'restClient', 'get').mockReturnValue(restClientMock);
      vi.spyOn(strategy as any, 'connectionState', 'get').mockReturnValue('connected');

      await strategy.put('/test', { data: 'test' });

      expect(restClientMock.put).toHaveBeenCalledWith('/test', { data: 'test' });

      vi.restoreAllMocks();
    });

    it('should delegate delete to restClient when connected', async () => {
      const restClientMock = {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn().mockResolvedValue({ deleted: true }),
      };

      vi.spyOn(strategy as any, 'restClient', 'get').mockReturnValue(restClientMock);
      vi.spyOn(strategy as any, 'connectionState', 'get').mockReturnValue('connected');

      await strategy.delete('/test');

      expect(restClientMock.delete).toHaveBeenCalledWith('/test');

      vi.restoreAllMocks();
    });
  });

  describe('subscribeToChannel', () => {
    it('should throw error when not connected', async () => {
      await expect(strategy.subscribeToChannel('12345', 'testuser')).rejects.toThrow('Not connected');
    });

    it('should throw error when username not provided', async () => {
      vi.spyOn(strategy as any, 'eventSubClient', 'get').mockReturnValue({ getSessionId: () => 'sess1' });
      vi.spyOn(strategy as any, 'eventSubSubscription', 'get').mockReturnValue({ create: vi.fn() });
      vi.spyOn(strategy as any, 'ircClient', 'get').mockReturnValue({ join: vi.fn() });

      await expect(strategy.subscribeToChannel('12345')).rejects.toThrow('Username is required');

      vi.restoreAllMocks();
    });

    it('should create EventSub subscriptions and join IRC', async () => {
      const mockRestClient = {
        get: vi.fn().mockResolvedValue({
          data: [{
            id: '12345',
            login: 'testuser',
            display_name: 'TestUser',
            type: '',
            broadcaster_type: '',
            description: '',
            profile_image_url: '',
            offline_image_url: '',
            view_count: 0,
            created_at: '2024-01-01T00:00:00Z',
          }],
        }),
      };

      const mockEventSubClient = {
        getSessionId: () => 'sess123',
      };

      const mockEventSubSubscription = {
        create: vi.fn().mockResolvedValue({ id: 'sub1' }),
      };

      const mockIrcClient = {
        connect: vi.fn(),
        join: vi.fn(),
      };

      vi.spyOn(strategy as any, 'connectionState', 'get').mockReturnValue('connected');
      vi.spyOn(strategy as any, 'eventSubClient', 'get').mockReturnValue(mockEventSubClient);
      vi.spyOn(strategy as any, 'eventSubSubscription', 'get').mockReturnValue(mockEventSubSubscription);
      vi.spyOn(strategy as any, 'eventSubSubscription', 'set').mockImplementation(() => {});
      vi.spyOn(strategy as any, 'ircClient', 'get').mockReturnValue(mockIrcClient);
      vi.spyOn(strategy as any, 'restClient', 'get').mockReturnValue(mockRestClient);

      await strategy.subscribeToChannel('12345', 'testuser');

      expect(mockEventSubSubscription.create).toHaveBeenCalledTimes(8);
      expect(mockIrcClient.connect).toHaveBeenCalledWith('testuser', 'test_access_token');
      expect(mockIrcClient.join).toHaveBeenCalledWith('testuser');

      vi.restoreAllMocks();
    });

    it('should throw error when user not found', async () => {
      const mockRestClient = {
        get: vi.fn().mockResolvedValue({ data: [] }),
      };

      vi.spyOn(strategy as any, 'connectionState', 'get').mockReturnValue('connected');
      vi.spyOn(strategy as any, 'eventSubClient', 'get').mockReturnValue({ getSessionId: () => 'sess1' });
      vi.spyOn(strategy as any, 'eventSubSubscription', 'get').mockReturnValue({ create: vi.fn() });
      vi.spyOn(strategy as any, 'ircClient', 'get').mockReturnValue({ join: vi.fn() });
      vi.spyOn(strategy as any, 'restClient', 'get').mockReturnValue(mockRestClient);

      await expect(strategy.subscribeToChannel('12345', 'nonexistent')).rejects.toThrow('User nonexistent not found');

      vi.restoreAllMocks();
    });
  });

  describe('subscribeToChat', () => {
    it('should throw error when not connected', async () => {
      await expect(strategy.subscribeToChat('12345')).rejects.toThrow('Not connected');
    });

    it('should create chat subscription and join IRC', async () => {
      const mockRestClient = {
        get: vi.fn().mockResolvedValue({
          data: [{
            id: '12345',
            login: 'testuser',
            display_name: 'TestUser',
            type: '',
            broadcaster_type: '',
            description: '',
            profile_image_url: '',
            offline_image_url: '',
            view_count: 0,
            created_at: '2024-01-01T00:00:00Z',
          }],
        }),
      };

      const mockEventSubClient = {
        getSessionId: () => 'sess123',
      };

      const mockEventSubSubscription = {
        create: vi.fn().mockResolvedValue({ id: 'sub1' }),
      };

      const mockIrcClient = {
        connect: vi.fn(),
        join: vi.fn(),
      };

      vi.spyOn(strategy as any, 'connectionState', 'get').mockReturnValue('connected');
      vi.spyOn(strategy as any, 'eventSubClient', 'get').mockReturnValue(mockEventSubClient);
      vi.spyOn(strategy as any, 'eventSubSubscription', 'get').mockReturnValue(mockEventSubSubscription);
      vi.spyOn(strategy as any, 'eventSubSubscription', 'set').mockImplementation(() => {});
      vi.spyOn(strategy as any, 'ircClient', 'get').mockReturnValue(mockIrcClient);
      vi.spyOn(strategy as any, 'restClient', 'get').mockReturnValue(mockRestClient);

      await strategy.subscribeToChat('12345');

      expect(mockEventSubSubscription.create).toHaveBeenCalledWith(
        'channel.chat.message',
        '1',
        { broadcaster_user_id: '12345', user_id: '12345' },
        'sess123'
      );
      expect(mockIrcClient.connect).toHaveBeenCalledWith('testuser', 'test_access_token');
      expect(mockIrcClient.join).toHaveBeenCalledWith('testuser');

      vi.restoreAllMocks();
    });
  });

  describe('unsubscribeFromChannel', () => {
    it('should leave IRC channel', async () => {
      const mockRestClient = {
        get: vi.fn().mockResolvedValue({
          data: [{
            id: '12345',
            login: 'testuser',
            display_name: 'TestUser',
            type: '',
            broadcaster_type: '',
            description: '',
            profile_image_url: '',
            offline_image_url: '',
            view_count: 0,
            created_at: '2024-01-01T00:00:00Z',
          }],
        }),
      };

      const mockIrcClient = {
        leave: vi.fn(),
      };

      vi.spyOn(strategy as any, 'connectionState', 'get').mockReturnValue('connected');
      vi.spyOn(strategy as any, 'ircClient', 'get').mockReturnValue(mockIrcClient);
      vi.spyOn(strategy as any, 'restClient', 'get').mockReturnValue(mockRestClient);

      await strategy.unsubscribeFromChannel('12345');

      expect(mockIrcClient.leave).toHaveBeenCalledWith('testuser');

      vi.restoreAllMocks();
    });

    it('should handle channel not found gracefully', async () => {
      const mockRestClient = {
        get: vi.fn().mockResolvedValue({ data: [] }),
      };

      vi.spyOn(strategy as any, 'connectionState', 'get').mockReturnValue('connected');
      vi.spyOn(strategy as any, 'ircClient', 'get').mockReturnValue({ leave: vi.fn() });
      vi.spyOn(strategy as any, 'restClient', 'get').mockReturnValue(mockRestClient);

      await expect(strategy.unsubscribeFromChannel('nonexistent')).resolves.not.toThrow();

      vi.restoreAllMocks();
    });
  });

  describe('Event Handling', () => {
    it('should emit chat events from IRC', (done) => {
      const mockIrcClient = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        isConnected: () => true,
        join: vi.fn(),
        on: vi.fn((event: string, handler: Function) => {
          if (event === 'chat') {
            setTimeout(() => {
              handler({
                channel: '#test',
                content: 'Test message',
                displayName: 'TestUser',
                userId: '123',
              });
            }, 0);
          }
        }),
      };

      vi.spyOn(strategy as any, 'connectionState', 'get').mockReturnValue('connected');
      vi.spyOn(strategy as any, 'ircClient', 'get').mockReturnValue(mockIrcClient);
      vi.spyOn(strategy as any, 'ircClient', 'set').mockImplementation(() => {});

      strategy.on('chat', (chatData) => {
        expect(chatData.content).toBe('Test message');
        expect(chatData.displayName).toBe('TestUser');
        done();
      });

      strategy.connect = vi.fn().mockImplementation(async () => {
        (strategy as any).setConnectionState('connected');
      });

      strategy.connect();

      vi.restoreAllMocks();
    });
  });

  describe('Health Status', () => {
    it('should update health status after connection', async () => {
      const mockEventSubClient = {
        getSessionId: () => 'sess123',
      };

      const mockIrcClient = {
        isConnected: () => true,
      };

      vi.spyOn(strategy as any, 'eventSubClient', 'get').mockReturnValue(mockEventSubClient);
      vi.spyOn(strategy as any, 'ircClient', 'get').mockReturnValue(mockIrcClient);
      vi.spyOn(strategy as any, 'connectionState', 'get').mockReturnValue('connected');

      const status = strategy.getHealthStatus();

      expect(status.platform).toBe('twitch');
      expect(status.state).toBe('connected');
      expect(status.eventsub.connected).toBe(true);
      expect(status.eventsub.sessionId).toBe('sess123');
      expect(status.irc.connected).toBe(true);

      vi.restoreAllMocks();
    });
  });
});
