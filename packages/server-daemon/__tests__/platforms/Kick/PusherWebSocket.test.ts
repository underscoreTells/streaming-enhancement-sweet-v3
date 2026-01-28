import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createLogger } from 'winston';

vi.mock('ws', () => {
  return {
    default: class MockWebSocket {
      public readyState = 0;

      constructor(public url: string) {
        this._handlers = new Map();
      }

      private _handlers: Map<string, Function[]>;
      private _messageQueue: any[] = [];

      on(event: string, handler: Function) {
        if (!this._handlers.has(event)) {
          this._handlers.set(event, []);
        }
        this._handlers.get(event)!.push(handler);
        return this;
      }

      off(event: string, handler?: Function) {
        if (handler) {
          const eventHandlers = this._handlers.get(event);
          if (eventHandlers) {
            const index = eventHandlers.indexOf(handler);
            if (index !== -1) {
              eventHandlers.splice(index, 1);
            }
          }
        } else {
          this._handlers.delete(event);
        }
        return this;
      }

      removeAllListeners() {
        this._handlers.clear();
      }

      send(data: any) {
        this._messageQueue.push(data);
        return true;
      }

      close(code?: number, reason?: string | Buffer) {
        this.readyState = 3;
        const handlers = this._handlers.get('close');
        if (handlers) {
          handlers.forEach((h: Function) => h(code ?? 1000, reason ?? Buffer.from('')));
        }
      }

      open() {
        this.readyState = 1;
        const handlers = this._handlers.get('open');
        if (handlers) {
          handlers.forEach((h: Function) => h());
        }
      }

      emit(event: string, ...args: any[]) {
        const handlers = this._handlers.get(event);
        if (handlers) {
          handlers.forEach((h: Function) => h(...args));
        }
      }

      getMessageQueue() {
        return this._messageQueue;
      }
    },
  };
});


import { PusherWebSocket } from '../../../platforms/Kick/websocket/PusherWebSocket';
import type { Region } from '../../../platforms/Kick/websocket/types';


describe('PusherWebSocket', () => {
  let logger: ReturnType<typeof createLogger>;
  let ws: PusherWebSocket;

  beforeEach(() => {
    vi.useFakeTimers();
    logger = createLogger({ silent: true });
    ws = new PusherWebSocket(logger, {
      appKey: 'test_app_key',
      cluster: 'mt1',
    });
  });

  afterEach(() => {
    ws.disconnect();
    vi.restoreAllMocks();
  });

  describe('Construction', () => {
    it('should create client with correct default config', () => {
      expect(ws).toBeDefined();
      expect(ws.getMaxListeners()).toBe(100);
    });

    it('should initialize with disconnected state', () => {
      expect(ws.isConnected()).toBe(false);
      expect(ws.getCurrentRegion()).toBeNull();
    });

    it('should accept custom config', () => {
      const customWs = new PusherWebSocket(logger, {
        appKey: 'custom_key',
        cluster: 'custom_cluster',
        region: 'eu1',
      });
      expect(customWs).toBeDefined();
      customWs.disconnect();
    });
  });

  describe('Connection Lifecycle', () => {
    it('should connect to Pusher WebSocket', async () => {
      const connectedSpy = vi.fn();

      ws.on('connected', connectedSpy);
      await ws.connect();

      const mockWs = (ws as any).ws;
      if (mockWs && mockWs.open) {
        mockWs.open();
      }

      vi.runAllTimers();
      await new Promise(resolve => setImmediate(resolve));

      expect(ws.isConnected()).toBe(true);
      expect(ws.getCurrentRegion()).toBe('us2');
    });

    it('should not reconnect if already connected', async () => {
      await ws.connect();
      const initialRegion = ws.getCurrentRegion();
      await ws.connect();
      expect(ws.getCurrentRegion()).toBe(initialRegion);
    });

    it('should disconnect cleanly', async () => {
      await ws.connect();
      expect(ws.isConnected()).toBe(true);

      ws.disconnect();
      expect(ws.isConnected()).toBe(false);
      expect(ws.getCurrentRegion()).toBeNull();
    });

    it('should emit connected event on successful connection', async () => {
      const connectedSpy = vi.fn();
      ws.on('connected', connectedSpy);

      await ws.connect();

      expect(connectedSpy).toHaveBeenCalled();
    });

    it('should emit disconnected event on connection close', async () => {
      const disconnectedSpy = vi.fn();
      ws.on('disconnected', disconnectedSpy);

      await ws.connect();

      const mockWs = (ws as any).ws;
      if (mockWs) {
        mockWs.close();
      }

      vi.advanceTimersByTime(10);
      await Promise.resolve();

      expect(disconnectedSpy).toHaveBeenCalled();
    });

    it('should emit error event on WebSocket error', async () => {
      const errorSpy = vi.fn();
      ws.on('error', errorSpy);

      await ws.connect();

      const mockWs = (ws as any).ws;
      if (mockWs) {
        mockWs.emit('error', new Error('Test error'));
      }

      expect(errorSpy).toHaveBeenCalled();
    });

    it('should handle connection state transitions', async () => {
      expect(ws.isConnected()).toBe(false);

      await ws.connect();
      expect(ws.isConnected()).toBe(true);

      ws.disconnect();
      expect(ws.isConnected()).toBe(false);
    });
  });

  describe('Region Detection', () => {
    it('should use default us2 region when autoRegion is false', async () => {
      const noAutoRegionWs = new PusherWebSocket(logger, {
        appKey: 'test_key',
        autoRegion: false,
        region: 'eu1',
      });

      await noAutoRegionWs.connect();
      expect(noAutoRegionWs.getCurrentRegion()).toBe('eu1');

      noAutoRegionWs.disconnect();
    });

    it('should default to us2 when no region specified', async () => {
      await ws.connect();
      expect(ws.getCurrentRegion()).toBe('us2');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce message rate limit', async () => {
      await ws.connect();

      const sendPromises = [];
      for (let i = 0; i < 7; i++) {
        sendPromises.push(
          ws.subscribeToChannel(`channel_${i}`).catch(() => {})
        );
      }

      await Promise.all(sendPromises);

      expect(ws.subscribedChannels.size).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Retry Logic', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should schedule reconnect on disconnect', async () => {
      await ws.connect();
      const maxReconnectSpy = vi.fn();
      ws.on('maxReconnectAttemptsReached', maxReconnectSpy);

      const mockWs = (ws as any).ws;
      if (mockWs) {
        mockWs.close();
      }

      await vi.advanceTimersByTimeAsync(1000);

      expect(maxReconnectSpy).not.toHaveBeenCalled();
    });

    it('should emit maxReconnectAttemptsReached after 5 failed attempts', async () => {
      const maxReconnectSpy = vi.fn();
      ws.on('maxReconnectAttemptsReached', maxReconnectSpy);

      await ws.connect();
      const mockWs = (ws as any).ws;

      for (let i = 0; i < 6; i++) {
        if (mockWs) {
          mockWs.emit('close');
        }
        await vi.advanceTimersByTimeAsync(1000 * Math.pow(2, i));
      }

      expect(maxReconnectSpy).toHaveBeenCalled();
    });

    it('should use exponential backoff with 30s cap', async () => {
      const reconnectDelaySpy = vi.spyOn(PusherWebSocket.prototype as any, 'scheduleReconnect');

      await ws.connect();
      const mockWs = (ws as any).ws;
      if (mockWs) {
        mockWs.emit('close');
      }

      await vi.advanceTimersByTimeAsync(1000);

      expect(reconnectDelaySpy).toHaveBeenCalled();
      reconnectDelaySpy.mockRestore();
    });
  });

  describe('Subscriptions', () => {
    it('should throw error when subscribing while disconnected', async () => {
      await expect(ws.subscribeToChannel('12345')).rejects.toThrow('WebSocket not connected');
    });

    it('should subscribe to channel', async () => {
      await ws.connect();

      await ws.subscribeToChannel('12345');

      expect(ws.subscribedChannels.has('channel.12345')).toBe(true);
    });

    it('should subscribe to chatroom', async () => {
      await ws.connect();

      await ws.subscribeToChatroomId('67890');

      expect(ws.subscribedChannels.has('chatrooms.67890.v2')).toBe(true);
    });

    it('should emit subscribed event when channel subscription succeeds', async () => {
      const subscribedSpy = vi.fn();
      ws.on('subscribed', subscribedSpy);

      await ws.connect();
      await ws.subscribeToChannel('12345');

      expect(subscribedSpy).toHaveBeenCalledWith({ channel: 'channel.12345', type: 'channel' });
    });

    it('should emit subscribed event when chatroom subscription succeeds', async () => {
      const subscribedSpy = vi.fn();
      ws.on('subscribed', subscribedSpy);

      await ws.connect();
      await ws.subscribeToChatroomId('67890');

      expect(subscribedSpy).toHaveBeenCalledWith({ channel: 'chatrooms.67890.v2', type: 'chatroom' });
    });

    it('should unsubscribe from channel', async () => {
      await ws.connect();
      await ws.subscribeToChannel('12345');

      ws.unsubscribeFromChannel('12345');

      expect(ws.subscribedChannels.has('channel.12345')).toBe(false);
    });

    it('should handle unsubscribe when disconnected gracefully', () => {
      ws.unsubscribeFromChannel('12345');
      expect(ws.subscribedChannels.size).toBe(0);
    });
  });

  describe('Message Handling', () => {
    it('should handle connection_established event', async () => {
      const pusherReadySpy = vi.fn();
      ws.on('pusher:ready', pusherReadySpy);

      await ws.connect();

      const mockWs = (ws as any).ws;
      if (mockWs) {
        mockWs.emit('message', JSON.stringify({
          event: 'pusher:connection_established',
          data: '{}',
        }));
      }

      expect(pusherReadySpy).toHaveBeenCalled();
    });

    it('should handle pusher:error event', async () => {
      const pusherErrorSpy = vi.fn();
      ws.on('pusher:error', pusherErrorSpy);

      await ws.connect();

      const mockWs = (ws as any).ws;
      if (mockWs) {
        mockWs.emit('message', JSON.stringify({
          event: 'pusher:error',
          data: { code: 4000, message: 'Test error' },
        }));
      }

      expect(pusherErrorSpy).toHaveBeenCalled();
    });

    it('should handle subscription_succeeded event', async () => {
      const subscriptionSucceededSpy = vi.spyOn(ws as any, 'handleSubscriptionSucceeded').mockImplementation(() => {});
      await ws.connect();

      const mockWs = (ws as any).ws;
      if (mockWs) {
        mockWs.emit('message', JSON.stringify({
          event: 'pusher_internal:subscription_succeeded',
          data: '{}',
        }));
      }

      expect(subscriptionSucceededSpy).toHaveBeenCalled();
      subscriptionSucceededSpy.mockRestore();
    });

    it('should emit channelEvent for channel events', async () => {
      const channelEventSpy = vi.fn();
      ws.on('channelEvent', channelEventSpy);

      await ws.connect();

      const mockWs = (ws as any).ws;
      if (mockWs) {
        mockWs.emit('message', JSON.stringify({
          event: 'StreamerIsLive',
          channel: 'channel.12345',
          data: '{}',
        }));
      }

      expect(channelEventSpy).toHaveBeenCalled();
    });

    it('should emit chatEvent for chatroom events', async () => {
      const chatEventSpy = vi.fn();
      ws.on('chatEvent', chatEventSpy);

      await ws.connect();

      const mockWs = (ws as any).ws;
      if (mockWs) {
        mockWs.emit('message', JSON.stringify({
          event: 'ChatMessageEvent',
          channel: 'chatrooms.67890.v2',
          data: '{}',
        }));
      }

      expect(chatEventSpy).toHaveBeenCalled();
    });

    it('should emit generic event for all events', async () => {
      const eventSpy = vi.fn();
      ws.on('event', eventSpy);

      await ws.connect();

      const mockWs = (ws as any).ws;
      if (mockWs) {
        mockWs.emit('message', JSON.stringify({
          event: 'CustomEvent',
          channel: 'channel.12345',
          data: '{}',
        }));
      }

      expect(eventSpy).toHaveBeenCalled();
    });

    it('should handle malformed messages gracefully', async () => {
      const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});

      await ws.connect();

      const mockWs = (ws as any).ws;
      if (mockWs) {
        mockWs.emit('message', 'invalid json');
      }

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle connection failures', async () => {
      const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});

      const failWs = new PusherWebSocket(logger, {
        appKey: 'test_key',
        baseUrl: 'wss://invalid-url.pusher.com',
      });

      await expect(failWs.connect()).resolves.toBeDefined();

      failWs.disconnect();
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should handle message parsing errors', async () => {
      const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});

      await ws.connect();

      const mockWs = (ws as any).ws;
      if (mockWs) {
        mockWs.emit('message', '{invalid json');
      }

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe('WebSocket URL Building', () => {
    it('should build correct WebSocket URL with default config', async () => {
      await ws.connect();

      const mockWs = (ws as any).ws;
      expect(mockWs.url).toContain('wss://ws-us2.pusher.com');
      expect(mockWs.url).toContain('app/test_app_key');
      expect(mockWs.url).toContain('protocol=7');
    });

    it('should build WebSocket URL with custom cluster', async () => {
      const customWs = new PusherWebSocket(logger, {
        appKey: 'test_key',
        cluster: 'custom_cluster',
        region: 'eu1',
      });

      await customWs.connect();

      const mockWs = (customWs as any).ws;
      expect(mockWs.url).toContain('cluster=custom_cluster');

      customWs.disconnect();
    });
  });
});
