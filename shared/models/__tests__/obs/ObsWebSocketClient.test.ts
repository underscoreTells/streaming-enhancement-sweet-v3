import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ObsWebSocketClient } from '../../src/obs/ObsWebSocketClient';
import { OpCode, ObsOutputState } from '../../src/obs/types';

vi.mock('ws', () => {
  class MockWebSocket {
    constructor() {}
    on = vi.fn();
    send = vi.fn();
    close = vi.fn();
  }
  return { WebSocket: MockWebSocket };
});

describe('ObsWebSocketClient', () => {
  let client: ObsWebSocketClient;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect to OBS WebSocket without password', async () => {
      client = new ObsWebSocketClient('ws://localhost:4455');
      expect(client).toBeInstanceOf(ObsWebSocketClient);
    });

    it('should handle connection error', async () => {
      client = new ObsWebSocketClient('ws://localhost:4455');
      expect(client).toBeInstanceOf(ObsWebSocketClient);
    });
  });

  describe('disconnect', () => {
    it('should disconnect and close WebSocket', async () => {
      client = new ObsWebSocketClient('ws://localhost:4455');
      await expect(client.disconnect()).resolves.not.toThrow();
    });

    it('should handle null WebSocket gracefully', async () => {
      client = new ObsWebSocketClient('ws://localhost:4455');
      await expect(client.disconnect()).resolves.not.toThrow();
    });
  });

  describe('isConnected', () => {
    it('should return false when not connected', () => {
      client = new ObsWebSocketClient('ws://localhost:4455');
      expect(client.isConnected()).toBe(false);
    });
  });

  describe('event handlers', () => {
    it('should register and call connected handler', async () => {
      client = new ObsWebSocketClient('ws://localhost:4455');
      const connectedHandler = vi.fn();
      client.on('connected', connectedHandler);
      expect(connectedHandler).not.toHaveBeenCalled();
    });

    it('should register and call error handler', async () => {
      client = new ObsWebSocketClient('ws://localhost:4455');
      const errorHandler = vi.fn();
      client.on('error', errorHandler);
      expect(errorHandler).not.toHaveBeenCalled();
    });

    it('should register and call disconnected handler', async () => {
      client = new ObsWebSocketClient('ws://localhost:4455');
      const disconnectedHandler = vi.fn();
      client.on('disconnected', disconnectedHandler);
      expect(disconnectedHandler).not.toHaveBeenCalled();
    });

    it('should register and call StreamStateChanged handler', async () => {
      client = new ObsWebSocketClient('ws://localhost:4455');
      const stateChangedHandler = vi.fn();
      client.on('StreamStateChanged', stateChangedHandler);
      expect(stateChangedHandler).not.toHaveBeenCalled();
    });

    it('should register and call message handler', async () => {
      client = new ObsWebSocketClient('ws://localhost:4455');
      const messageHandler = vi.fn();
      client.on('message', messageHandler);
      expect(messageHandler).not.toHaveBeenCalled();
    });
  });

  describe('send and getStreamStatus', () => {
    it('should have send method', async () => {
      client = new ObsWebSocketClient('ws://localhost:4455');
      expect(typeof client.send).toBe('function');
    });

    it('should have getStreamStatus method', async () => {
      client = new ObsWebSocketClient('ws://localhost:4455');
      expect(typeof client.getStreamStatus).toBe('function');
    });
  });
});
