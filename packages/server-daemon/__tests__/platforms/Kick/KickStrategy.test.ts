import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createLogger } from 'winston';
import type { TokenSet } from '../../../platforms/types';

const { MockPusherWebSocket, MockRestClient } = vi.hoisted(() => {
  class MockPusherWebSocket {
    public connected = false;

    constructor() {
      this._handlers = new Map();
    }

    private _handlers: Map<string, Function[]>;

    on(event: string, handler: Function) {
      if (!this._handlers.has(event)) {
        this._handlers.set(event, []);
      }
      this._handlers.get(event)!.push(handler);
      return this;
    }

    emit(event: string, ...args: any[]) {
      const handlers = this._handlers.get(event);
      if (handlers) {
        handlers.forEach((h: Function) => h(...args));
      }
    }

    async connect() {
      this.connected = true;
      setTimeout(() => this.emit('connected'), 0);
    }

    disconnect() {
      this.connected = false;
    }

    isConnected() {
      return this.connected;
    }

    getCurrentRegion() {
      return 'us2';
    }

    async subscribeToChannel(channelId: string) {
      this.emit('subscribed', { channel: `channel.${channelId}`, type: 'channel' });
    }

    async subscribeToChatroomId(chatroomId: string) {
      this.emit('subscribed', { channel: `chatrooms.${chatroomId}.v2`, type: 'chatroom' });
    }

    unsubscribeFromChannel(channelId: string) {
      this.emit('unsubscribed', { channel: `channel.${channelId}` });
    }
  }

  class MockRestClient {
    async get(endpoint: string, params?: any) {
      if (endpoint === '/api/v2/channels/testuser') {
        return {
          id: 12345,
          username: 'testuser',
          display_name: 'Test User',
        };
      }
      if (endpoint === '/api/v2/channels/user1') {
        return {
          id: '11111',
          username: 'user1',
          display_name: 'User 1',
        };
      }
      if (endpoint === '/api/v2/channels/user2') {
        return {
          id: '22222',
          username: 'user2',
          display_name: 'User 2',
        };
      }
      if (endpoint === '/api/v2/channels/nonexistent') {
        return null;
      }
      return {};
    }

    async post(endpoint: string, data?: any) {
      return { success: true };
    }

    async put(endpoint: string, data?: any) {
      return { updated: true };
    }

    async delete(endpoint: string) {
      return { deleted: true };
    }
  }

  return { MockPusherWebSocket, MockRestClient };
});

vi.mock('../../../platforms/Kick/websocket/PusherWebSocket', () => ({
  PusherWebSocket: MockPusherWebSocket,
}));

vi.mock('../../../platforms/Kick/rest/RestClient', () => ({
  RestClient: MockRestClient,
}));

import { KickStrategy } from '../../../platforms/Kick/KickStrategy';
import { KickOAuth } from '../../../platforms/Kick/KickOAuth';

describe('KickStrategy', () => {
  let logger: ReturnType<typeof createLogger>;
  let mockKickOAuth: KickOAuth;
  let strategy: KickStrategy;

  class MockKickOAuth implements Partial<KickOAuth> {
    async startOAuth(username: string): Promise<string> {
      return `https://kick.com/oauth2/authorize?client_id=test_client_id&redirect_uri=http://localhost:3000/callback&response_type=code&state=test_state`;
    }

    async handleCallback(code: string, state: string): Promise<TokenSet> {
      return {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        expires_in: 3600,
        scope: ['channel:read', 'chat:read'],
      };
    }

    async getAccessToken(username: string): Promise<TokenSet> {
      return {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        expires_in: 3600,
        scope: ['channel:read', 'chat:read'],
      };
    }

    async refreshToken(username: string): Promise<TokenSet> {
      return {
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
        expires_in: 7200,
        scope: ['channel:read', 'chat:read'],
      };
    }
  }

  beforeEach(() => {
    logger = createLogger({ silent: true });

    mockKickOAuth = new MockKickOAuth() as KickOAuth;

    strategy = new KickStrategy(logger, mockKickOAuth, {
      pusherAppKey: 'test_app_key',
      pusherCluster: 'mt1',
      baseUrl: 'https://kick.com',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Construction', () => {
    it('should create strategy with correct platform', () => {
      expect(strategy.platform).toBe('kick');
    });

    it('should initialize with disconnected state', () => {
      expect(strategy.getConnectionState()).toBe('disconnected');
    });

    it('should have correct initial health status', () => {
      const status = strategy.getHealthStatus();

      expect(status.platform).toBe('kick');
      expect(status.state).toBe('disconnected');
      expect(status.websocket.connected).toBe(false);
      expect(status.websocket.region).toBeNull();
      expect(status.websocket.appKey).toBe('test_app_key');
      expect(status.rest.baseUrl).toBe('https://kick.com');
    });

    it('should limit maxListeners', () => {
      const newStrategy = new KickStrategy(logger, mockKickOAuth, {
        pusherAppKey: 'test_key',
      });

      expect(newStrategy.getMaxListeners()).toBe(100);
    });

    it('should use default config when not provided', () => {
      const defaultStrategy = new KickStrategy(logger, mockKickOAuth);
      const status = defaultStrategy.getHealthStatus();

      expect(status.websocket.appKey).toBe('eb1d5f283081a78b932c');
      expect(status.rest.baseUrl).toBe('https://kick.com');
    });
  });

  describe('Connection State', () => {
    it('should emit connectionStateChanged', async () => {
      const stateChanges: any[] = [];
      strategy.on('connectionStateChanged', ({ oldState, newState }) => {
        stateChanges.push({ oldState, newState });
      });

      await strategy.connect();

      expect(stateChanges.length).toBeGreaterThan(0);
      expect(stateChanges[0].oldState).toBe('disconnected');
      expect(stateChanges[0].newState).toBe('connecting');
      expect(stateChanges.some((s: any) => s.newState === 'connected')).toBe(true);
    });

    it('should transition to connected state on successful connection', async () => {
      await strategy.connect();

      expect(strategy.getConnectionState()).toBe('connected');
    });

    it('should emit connectionStateChanged on connect', async () => {
      const stateChanges: any[] = [];
      strategy.on('connectionStateChanged', (change) => {
        stateChanges.push(change);
      });

      await strategy.connect();

      expect(stateChanges.length).toBeGreaterThan(0);
      expect(stateChanges.some((c: any) => c.newState === 'connected')).toBe(true);
    });
  });

  describe('disconnect', () => {
    it('should disconnect and set state to disconnected', async () => {
      await strategy.connect();
      expect(strategy.getConnectionState()).toBe('connected');

      await strategy.disconnect();

      expect(strategy.getConnectionState()).toBe('disconnected');
    });

    it('should clean up all clients', async () => {
      await strategy.connect();
      await strategy.disconnect();

      expect(strategy.getConnectionState()).toBe('disconnected');
    });

    it('should emit connectionStateChanged on disconnect', async () => {
      const stateChanges: any[] = [];
      strategy.on('connectionStateChanged', (change) => {
        stateChanges.push(change);
      });

      await strategy.connect();
      await strategy.disconnect();

      expect(stateChanges.some((c: any) => c.newState === 'disconnected')).toBe(true);
    });
  });

  describe('OAuth Methods', () => {
    it('should delegate startOAuth to oauth', async () => {
      const result = await strategy.startOAuth('testuser');

      expect(result).toContain('https://kick.com/oauth2/authorize');
      expect(result).toContain('client_id=test_client_id');
    });

    it('should delegate handleCallback to oauth', async () => {
      const tokens = await strategy.handleCallback('auth_code', 'state');

      expect(tokens.access_token).toBe('test_access_token');
      expect(tokens.refresh_token).toBe('test_refresh_token');
      expect(tokens.expires_in).toBe(3600);
      expect(tokens.scope).toEqual(['channel:read', 'chat:read']);
    });

    it('should delegate getAccessToken to oauth', async () => {
      const tokens = await strategy.getAccessToken('testuser');

      expect(tokens.access_token).toBe('test_access_token');
      expect(tokens.refresh_token).toBe('test_refresh_token');
    });

    it('should delegate refreshToken to oauth', async () => {
      const tokens = await strategy.refreshToken('test_user');

      expect(tokens.access_token).toBe('new_access_token');
      expect(tokens.refresh_token).toBe('new_refresh_token');
      expect(tokens.expires_in).toBe(7200);
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
      await strategy.connect();

      const result = await strategy.get('/api/v2/channels/testuser');

      expect(result).toEqual({
        id: 12345,
        username: 'testuser',
        display_name: 'Test User',
      });
    });

    it('should delegate post to restClient when connected', async () => {
      await strategy.connect();

      const result = await strategy.post('/test', { data: 'test' });

      expect(result).toEqual({ success: true });
    });

    it('should delegate put to restClient when connected', async () => {
      await strategy.connect();

      const result = await strategy.put('/test', { data: 'test' });

      expect(result).toEqual({ updated: true });
    });

    it('should delegate delete to restClient when connected', async () => {
      await strategy.connect();

      const result = await strategy.delete('/test');

      expect(result).toEqual({ deleted: true });
    });
  });

  describe('subscribeToChannel', () => {
    it('should throw error when not connected', async () => {
      await expect(strategy.subscribeToChannel('12345', 'testuser')).rejects.toThrow('Not connected');
    });

    it('should throw error when username not provided', async () => {
      await strategy.connect();

      await expect(strategy.subscribeToChannel('12345')).rejects.toThrow('Username is required');
    });

    it('should subscribe to channel successfully', async () => {
      await strategy.connect();

      await strategy.subscribeToChannel('12345', 'testuser');
    });

    it('should throw error when user not found', async () => {
      await strategy.connect();

      await expect(strategy.subscribeToChannel('12345', 'nonexistent')).rejects.toThrow('User nonexistent not found');
    });

    it('should emit subscribed event', async () => {
      const subscribedSpy = vi.fn();
      strategy.on('subscribed', subscribedSpy);

      await strategy.connect();
      await strategy.subscribeToChannel('12345', 'testuser');

      expect(subscribedSpy).toHaveBeenCalledWith({ channel: 'channel.12345', type: 'channel' });
    });
  });

  describe('subscribeToChat', () => {
    it('should throw error when not connected', async () => {
      await expect(strategy.subscribeToChat('67890')).rejects.toThrow('Not connected');
    });

    it('should subscribe to chatroom successfully', async () => {
      await strategy.connect();

      await strategy.subscribeToChat('67890');
    });

    it('should emit subscribed event for chatroom', async () => {
      const subscribedSpy = vi.fn();
      strategy.on('subscribed', subscribedSpy);

      await strategy.connect();
      await strategy.subscribeToChat('67890');

      expect(subscribedSpy).toHaveBeenCalledWith({ channel: 'chatrooms.67890.v2', type: 'chatroom' });
    });
  });

  describe('unsubscribeFromChannel', () => {
    it('should handle unsubscribe when disconnected gracefully', async () => {
      await expect(strategy.unsubscribeFromChannel('12345')).resolves.not.toThrow();
    });

    it('should unsubscribe from channel when connected', async () => {
      await strategy.connect();
      await strategy.subscribeToChannel('12345', 'testuser');

      await strategy.unsubscribeFromChannel('12345');
    });

    it('should handle errors during unsubscribe gracefully', async () => {
      await strategy.connect();

      await expect(strategy.unsubscribeFromChannel('99999')).resolves.not.toThrow();
    });
  });

  describe('Event Handling', () => {
    it('should handle channel events through eventHandler', async () => {
      const emitSpy = vi.spyOn(strategy, 'emit').mockImplementation(() => {});
      await strategy.connect();

      const mockWs = (strategy as any).websocketClient;
      if (mockWs && mockWs.emit) {
        mockWs.emit('channelEvent', {
          event: 'StreamerIsLive',
          channel: 'channel.12345',
          data: JSON.stringify({
            livestream: {
              id: 'stream123',
              channel_id: '12345',
            },
          }),
        });
      }

      expect(emitSpy).toHaveBeenCalledWith('channelEvent', {
        event: 'StreamerIsLive',
        channel: 'channel.12345',
        data: JSON.stringify({
          livestream: {
            id: 'stream123',
            channel_id: '12345',
          },
        }),
      });
      emitSpy.mockRestore();
    });

    it('should handle chat events through eventHandler', async () => {
      const emitSpy = vi.spyOn(strategy, 'emit').mockImplementation(() => {});
      await strategy.connect();

      const mockWs = (strategy as any).websocketClient;
      if (mockWs && mockWs.emit) {
        mockWs.emit('chatEvent', {
          event: 'ChatMessageEvent',
          channel: 'chatrooms.67890.v2',
          data: JSON.stringify({
            sender: { id: '123', username: 'testuser' },
            content: 'Hello',
          }),
        });
      }

      expect(emitSpy).toHaveBeenCalledWith('chatEvent', {
        event: 'ChatMessageEvent',
        channel: 'chatrooms.67890.v2',
        data: JSON.stringify({
          sender: { id: '123', username: 'testuser' },
          content: 'Hello',
        }),
      });
      emitSpy.mockRestore();
    });

    it('should handle generic events', async () => {
      const emitSpy = vi.spyOn(strategy, 'emit').mockImplementation(() => {});
      await strategy.connect();

      const mockWs = (strategy as any).websocketClient;
      if (mockWs && mockWs.emit) {
        mockWs.emit('event', {
          event: 'CustomEvent',
          channel: 'channel.12345',
          data: '{}',
        });
      }

      expect(emitSpy).toHaveBeenCalledWith('event', {
        event: 'CustomEvent',
        channel: 'channel.12345',
        data: '{}',
      });
      emitSpy.mockRestore();
    });
  });

  describe('Health Status', () => {
    it('should update health status after connection', async () => {
      await strategy.connect();

      const status = strategy.getHealthStatus();

      expect(status.platform).toBe('kick');
      expect(status.state).toBe('connected');
      expect(status.websocket.connected).toBe(true);
      expect(status.websocket.region).toBe('us2');
      expect(status.websocket.appKey).toBe('test_app_key');
      expect(status.rest.baseUrl).toBe('https://kick.com');
    });

    it('should update health status after disconnect', async () => {
      await strategy.connect();
      await strategy.disconnect();

      const status = strategy.getHealthStatus();

      expect(status.state).toBe('disconnected');
      expect(status.websocket.connected).toBe(false);
      expect(status.websocket.region).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors', async () => {
      const errorStrategy = new KickStrategy(logger, mockKickOAuth, {
        pusherAppKey: 'invalid_key',
      });

      await expect(errorStrategy.connect()).resolves.not.toThrow();

      await errorStrategy.disconnect();
    });

    it('should handle subscription errors', async () => {
      await strategy.connect();

      await expect(strategy.subscribeToChannel('invalid', 'invalid')).rejects.toThrow();

      expect(strategy.getConnectionState()).toBe('connected');
    });

    it('should handle REST errors when connected', async () => {
      await strategy.connect();

      await expect(strategy.get('/api/v2/invalid')).resolves.not.toThrow();
    });
  });

  describe('WebSocket Configuration', () => {
    it('should use custom Pusher config when provided', async () => {
      const customStrategy = new KickStrategy(logger, mockKickOAuth, {
        pusherAppKey: 'custom_key',
        pusherCluster: 'custom_cluster',
        baseUrl: 'https://custom.kick.com',
      });

      const status = customStrategy.getHealthStatus();

      expect(status.websocket.appKey).toBe('custom_key');
      expect(status.rest.baseUrl).toBe('https://custom.kick.com');

      await customStrategy.connect();
      await customStrategy.disconnect();
    });

    it('should use default Pusher cluster when not provided', async () => {
      const defaultStrategy = new KickStrategy(logger, mockKickOAuth, {
        pusherAppKey: 'test_key',
      });

      const status = defaultStrategy.getHealthStatus();

      expect(status.rest.baseUrl).toBe('https://kick.com');
    });
  });

  describe('WebSocket Event Handlers Registration', () => {
    it('should register WebSocket event handlers on connect', async () => {
      await strategy.connect();

      const mockWs = (strategy as any).websocketClient;

      expect(mockWs).toBeDefined();
    });
  });

  describe('Multiple Subscriptions', () => {
    it('should support multiple channel subscriptions', async () => {
      await strategy.connect();

      await strategy.subscribeToChannel('12345', 'user1');
      await strategy.subscribeToChannel('67890', 'user2');

      expect(strategy.getConnectionState()).toBe('connected');
    });

    it('should support multiple chat subscriptions', async () => {
      await strategy.connect();

      await strategy.subscribeToChat('chat1');
      await strategy.subscribeToChat('chat2');

      expect(strategy.getConnectionState()).toBe('connected');
    });
  });

  describe('Connection State Transitions', () => {
    it('should handle disconnect -> connect -> disconnect cycle', async () => {
      expect(strategy.getConnectionState()).toBe('disconnected');

      await strategy.connect();
      expect(strategy.getConnectionState()).toBe('connected');

      await strategy.disconnect();
      expect(strategy.getConnectionState()).toBe('disconnected');
    });

    it('should handle multiple connection cycles', async () => {
      for (let i = 0; i < 3; i++) {
        await strategy.connect();
        expect(strategy.getConnectionState()).toBe('connected');

        await strategy.disconnect();
        expect(strategy.getConnectionState()).toBe('disconnected');
      }
    });
  });

  describe('EventEmitter Behavior', () => {
    it('should emit events correctly', async () => {
      const eventSpy = vi.fn();
      strategy.on('testEvent', eventSpy);

      strategy.emit('testEvent', { data: 'test' });

      expect(eventSpy).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should handle multiple event listeners', async () => {
      const spy1 = vi.fn();
      const spy2 = vi.fn();

      strategy.on('testEvent', spy1);
      strategy.on('testEvent', spy2);

      strategy.emit('testEvent', { data: 'test' });

      expect(spy1).toHaveBeenCalled();
      expect(spy2).toHaveBeenCalled();
    });

    it('should handle removing event listeners', async () => {
      const spy = vi.fn();
      strategy.on('testEvent', spy);
      strategy.off('testEvent', spy);

      strategy.emit('testEvent', { data: 'test' });

      expect(spy).not.toHaveBeenCalled();
    });
  });
});
