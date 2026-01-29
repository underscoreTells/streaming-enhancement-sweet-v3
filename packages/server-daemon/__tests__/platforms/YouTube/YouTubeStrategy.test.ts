import { describe, it, expect, beforeEach, vi } from 'vitest';
import { YouTubeStrategy, ConnectionState, YouTubeStrategyConfig, YouTubeHealthStatus } from '../../../platforms/YouTube/YouTubeStrategy';
import { YouTubeOAuth } from '../../../platforms/YouTube/YouTubeOAuth';
import { Logger } from 'winston';
import type { TokenSet } from '../../../platforms/types';

class MockYouTubeOAuth {
  readonly platform = 'youtube';
  async generateAuthorizationUrl(): Promise<{ url: string; state: string }> {
    return { url: 'https://auth.example.com', state: 'test-state' };
  }
  async handleOAuthCallback(): Promise<void> {
    return;
  }
  async getAccessToken(): Promise<TokenSet> {
    return {
      access_token: 'test-token',
      refresh_token: 'test-refresh',
      expires_at: new Date(Date.now() + 3600000),
      refresh_at: new Date(Date.now() + 3000000),
      scope: ['test'],
    };
  }
  async refreshToken(): Promise<TokenSet> {
    return {
      access_token: 'new-token',
      refresh_token: 'new-refresh',
      expires_at: new Date(Date.now() + 3600000),
      refresh_at: new Date(Date.now() + 3000000),
      scope: ['test'],
    };
  }
}

describe('YouTubeStrategy', () => {
  let logger: Logger;
  let mockOAuth: Partial<YouTubeOAuth> & MockYouTubeOAuth;
  let strategy: YouTubeStrategy;

  beforeEach(() => {
    logger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    mockOAuth = new MockYouTubeOAuth();
    strategy = new YouTubeStrategy(logger, mockOAuth as unknown as YouTubeOAuth);
  });

  describe('initialization', () => {
    it('should initialize with correct platform identifier', () => {
      expect(strategy.platform).toBe('youtube');
    });

    it('should start in disconnected state', () => {
      expect(strategy.getConnectionState()).toBe('disconnected');
    });

    it('should accept custom config', () => {
      const customConfig: YouTubeStrategyConfig = {
        broadcastPollInterval: 20000,
        username: 'testuser',
      };
      const customStrategy = new YouTubeStrategy(logger, mockOAuth as unknown as YouTubeOAuth, customConfig);
      expect(customStrategy.getHealthStatus().oauth.username).toBe('testuser');
    });
  });

  describe('connection state management', () => {
    it('should transition to connecting when connect() is called', async () => {
      expect(strategy.getConnectionState()).toBe('disconnected');
      
      const stateChanges: any[] = [];
      strategy.on('connectionStateChanged', (data) => {
        stateChanges.push(data);
      });

      await strategy.connect();
      
      expect(stateChanges).toHaveLength(2);
      expect(stateChanges[0].newState).toBe('connecting');
      expect(stateChanges[0].oldState).toBe('disconnected');
      expect(stateChanges[1].newState).toBe('connected');
      expect(stateChanges[1].oldState).toBe('connecting');
    });

    it('should transition to disconnected when disconnect() is called', async () => {
      await strategy.connect();
      expect(strategy.getConnectionState()).toBe('connected');

      const stateChanges: any[] = [];
      strategy.on('connectionStateChanged', (data) => {
        stateChanges.push(data);
      });

      await strategy.disconnect();
      
      expect(strategy.getConnectionState()).toBe('disconnected');
      expect(stateChanges[0].newState).toBe('disconnecting');
      expect(stateChanges[1].newState).toBe('disconnected');
    });

    it('should handle connection errors', async () => {
      vi.spyOn(logger, 'info').mockImplementationOnce(() => {
        throw new Error('Connection failed');
      });

      await expect(strategy.connect()).rejects.toThrow('Connection failed');
      expect(strategy.getConnectionState()).toBe('error');
    });

    it('should emit connectionStateChanged events', async () => {
      const states: ConnectionState[] = [];
      strategy.on('connectionStateChanged', (data: any) => {
        states.push(data.newState);
      });

      await strategy.connect();
      expect(states).toContain('connecting');
      expect(states).toContain('connected');

      await strategy.disconnect();
      expect(states).toContain('disconnecting');
      expect(states).toContain('disconnected');
    });
  });

  describe('health status', () => {
    it('should return correct health status structure', () => {
      const health = strategy.getHealthStatus();
      
      expect(health).toHaveProperty('platform');
      expect(health).toHaveProperty('state');
      expect(health).toHaveProperty('oauth');
      expect(health).toHaveProperty('rest');
      expect(health).toHaveProperty('sse');
      expect(health).toHaveProperty('monitors');
    });

    it('should report initial health status correctly', () => {
      const health = strategy.getHealthStatus();
      
      expect(health.platform).toBe('youtube');
      expect(health.state).toBe('disconnected');
      expect(health.oauth.initialized).toBe(true);
      expect(health.rest.initialized).toBe(false);
      expect(health.sse.enabled).toBe(true);
      expect(health.sse.connected).toBe(false);
      expect(health.monitors.broadcastLifecycle).toBe(false);
      expect(health.monitors.streamHealth).toBe(false);
    });

    it('should update health status after connect', async () => {
      await strategy.connect();
      const health = strategy.getHealthStatus();
      
      expect(health.state).toBe('connected');
    });

    it('should reflect custom config in health status', () => {
      const customConfig: YouTubeStrategyConfig = {
        sseFallbackPolling: true,
      };
      const customStrategy = new YouTubeStrategy(logger, mockOAuth as unknown as YouTubeOAuth, customConfig);
      const health = customStrategy.getHealthStatus();
      
      expect(health.sse.usingFallback).toBe(false);
    });
  });

  describe('OAuth methods', () => {
    it('should delegate startOAuth to YouTubeOAuth', async () => {
      const result = await strategy.startOAuth('testuser');
      
      expect(result).toBe('https://auth.example.com');
    });

    it('should delegate getAccessToken to YouTubeOAuth', async () => {
      const token = await strategy.getAccessToken('testuser');
      
      expect(token).toHaveProperty('access_token');
      expect(token.access_token).toBe('test-token');
    });

    it('should delegate refreshToken to YouTubeOAuth', async () => {
      const token = await strategy.refreshToken('testuser');
      
      expect(token).toHaveProperty('access_token');
      expect(token.access_token).toBe('new-token');
    });

    it('should handle OAuth callback and return token set', async () => {
      strategy = new YouTubeStrategy(logger, mockOAuth as unknown as YouTubeOAuth, { username: 'test-user' });

      const handleCallbackSpy = vi.spyOn(mockOAuth, 'handleOAuthCallback');

      const tokenSet = await strategy.handleCallback('code123', 'state123');
      expect(tokenSet.access_token).toBe('test-token');
      expect(handleCallbackSpy).toHaveBeenCalledWith('code123', 'state123', 'test-user');

      handleCallbackSpy.mockRestore();
    });

    it('should handle OAuth callback errors', async () => {
      strategy = new YouTubeStrategy(logger, mockOAuth as unknown as YouTubeOAuth, { username: 'test-user' });

      const handleCallbackSpy = vi.spyOn(mockOAuth, 'handleOAuthCallback');
      const error = new Error('Invalid OAuth code');
      handleCallbackSpy.mockRejectedValueOnce(error as never);

      await expect(strategy.handleCallback('invalid-code', 'state123')).rejects.toThrow('Invalid OAuth code');

      handleCallbackSpy.mockRestore();
    });

    it('should throw error when handleCallback called without username', async () => {
      await expect(strategy.handleCallback('code123', 'state123')).rejects.toThrow('Username must be set');
    });
  });

  describe('REST methods (skeletal)', () => {
    it('should reject get when not connected', async () => {
      await expect(strategy.get('/test')).rejects.toThrow('REST client not initialized');
    });

    it('should reject post when not connected', async () => {
      await expect(strategy.post('/test', {})).rejects.toThrow('REST client not initialized');
    });

    it('should reject put when not connected', async () => {
      await expect(strategy.put('/test', {})).rejects.toThrow('REST client not initialized');
    });

    it('should reject delete when not connected', async () => {
      await expect(strategy.delete('/test')).rejects.toThrow('REST client not initialized');
    });
  });

  describe('WebSocket methods (skeletal)', () => {
    it('should reject subscribeToChannel when not connected', async () => {
      await expect(strategy.subscribeToChannel('123')).rejects.toThrow('Not connected');
    });

    it('should reject subscribeToChat when not connected', async () => {
      await expect(strategy.subscribeToChat('123')).rejects.toThrow('Not connected');
    });

    it('should throw error when subscribing to non-existent channel id', async () => {
      await strategy.connect();
      await expect(strategy.subscribeToChannel('123')).rejects.toThrow('Channel 123 not found');
      await strategy.disconnect();
    });
  });
});
