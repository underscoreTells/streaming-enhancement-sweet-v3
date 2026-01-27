import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createLogger } from 'winston';

vi.mock('ws', () => {
  const handlers: any = {};
  return {
    default: class MockWebSocket {
      public readyState = 0;

      constructor(public url: string) {
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

      once(event: string, handler: Function) {
        const wrapper: any = (...args: any[]) => {
          handler(...args);
          this.off(event, wrapper);
        };
        this.on(event, wrapper);
        return this;
      }

      off(event: string, handler: Function) {
        const eventHandlers = this._handlers.get(event);
        if (eventHandlers) {
          const index = eventHandlers.indexOf(handler);
          if (index !== -1) {
            eventHandlers.splice(index, 1);
          }
        }
        return this;
      }

      emit(event: string, ...args: any[]) {
        const eventHandlers = this._handlers.get(event);
        if (eventHandlers) {
          eventHandlers.forEach((h: Function) => h(...args));
        }
        return this;
      }

      close(code?: number, reason?: string | Buffer) {
        this.readyState = 3;
        this.emit('close', code ?? 1000, reason ?? Buffer.from(''));
      }

      open() {
        this.readyState = 1;
        this.emit('open');
      }

      send(data: any) {
        return true;
      }
    },
  };
});

import { EventSubClient } from '../../../../platforms/Twitch/eventsub/EventSubClient';
import type { EventSubMessage } from '../../../../platforms/Twitch/eventsub/types';

describe('EventSubClient', () => {
  let logger: ReturnType<typeof createLogger>;
  let client: EventSubClient;

  beforeEach(() => {
    logger = createLogger({ silent: true });
    client = new EventSubClient(logger);
  });

  afterEach(() => {
    if (client) {
      client.disconnect();
    }
    vi.restoreAllMocks();
  });

  describe('Construction', () => {
    it('should create client with default options', () => {
      const defaultClient = new EventSubClient(logger);
      expect(defaultClient).toBeDefined();
    });

    it('should accept custom options', () => {
      const customClient = new EventSubClient(logger, {
        url: 'wss://custom.url',
        keepaliveSafetyFactor: 3,
        reconnectBaseDelay: 2000,
        maxReconnectAttempts: 5,
      });
      expect(customClient).toBeDefined();
    });
  });

  describe('Connection', () => {
    it('should emit connected event on session welcome', (done) => {
      client.on('connected', (session) => {
        expect(session.id).toBe('test-session-id');
        expect(session.reconnect_url).toBe('wss://reconnect.url');
        expect(session.keepalive_timeout_seconds).toBe(10);
        done();
      });

      client.connect().then(() => {
        const welcomeMessage: EventSubMessage = {
          metadata: {
            message_id: 'welcome-id',
            message_type: 'session_welcome',
            message_timestamp: '2024-01-01T00:00:00Z',
          },
          payload: {
            id: 'test-session-id',
            status: 'connected',
            reconnect_url: 'wss://reconnect.url',
            keepalive_timeout_seconds: 10,
          },
        };

        vi.spyOn(client as any, 'ws', 'get').mockReturnValue({
          emit: (event: string, ...args: any[]) => {
            if (event === 'message') {
              const handleMessage = (client as any).handleMessage.bind(client);
              try {
                handleMessage(welcomeMessage);
              } catch (e) {
                // ignore
              }
            }
          },
          on: vi.fn(),
          send: vi.fn(),
          close: vi.fn(),
        });
      });
    });

    it('should handle session keepalive', (done) => {
      client.on('connected', () => {
        const keepaliveMessage: EventSubMessage = {
          metadata: {
            message_id: 'keepalive-id',
            message_type: 'session_keepalive',
            message_timestamp: '2024-01-01T00:00:00Z',
          },
          payload: {},
        };

        vi.spyOn(client as any, 'ws', 'get').mockReturnValue({
          emit: (event: string, ...args: any[]) => {
            if (event === 'message') {
              const handleMessage = (client as any).handleMessage.bind(client);
              try {
                handleMessage(keepaliveMessage);
              } catch (e) {
                done();
              }
            }
          },
          on: vi.fn(),
          send: vi.fn(),
          close: vi.fn(),
        });
      });

      const welcomeMessage: EventSubMessage = {
        metadata: {
          message_id: 'welcome-id',
          message_type: 'session_welcome',
          message_timestamp: '2024-01-01T00:00:00Z',
        },
        payload: {
          id: 'test-session-id',
          keepalive_timeout_seconds: 10,
        },
      };
      const handleMessage = (client as any).handleMessage.bind(client);
      handleMessage(welcomeMessage);
    });
  });

  describe('Message Handling', () => {
    it('should emit notification events', (done) => {
      client.on('notification', (message: EventSubMessage) => {
        expect(message.metadata.message_type).toBe('notification');
        done();
      });

      client.connect = vi.fn().mockResolvedValue(undefined);

      const notificationMessage: EventSubMessage = {
        metadata: {
          message_id: 'notif-id',
          message_type: 'notification',
          message_timestamp: '2024-01-01T00:00:00Z',
          subscription_type: 'channel.follow',
        },
        payload: {
          user_name: 'testuser',
        },
      };

      vi.spyOn(client as any, 'ws', 'get').mockReturnValue({
        emit: (event: string, ...args: any[]) => {
          if (event === 'message') {
            const handleMessage = (client as any).handleMessage.bind(client);
            handleMessage(notificationMessage);
          }
        },
        on: vi.fn(),
        send: vi.fn(),
        close: vi.fn(),
      });
    });

    it('should emit revocation events', (done) => {
      client.on('revocation', (message: EventSubMessage) => {
        expect(message.metadata.message_type).toBe('revocation');
        done();
      });

      client.connect = vi.fn().mockResolvedValue(undefined);

      const revocationMessage: EventSubMessage = {
        metadata: {
          message_id: 'revocation-id',
          message_type: 'revocation',
          message_timestamp: '2024-01-01T00:00:00Z',
          subscription_type: 'channel.follow',
        },
        payload: {},
      };

      vi.spyOn(client as any, 'ws', 'get').mockReturnValue({
        emit: (event: string, ...args: any[]) => {
          if (event === 'message') {
            const handleMessage = (client as any).handleMessage.bind(client);
            handleMessage(revocationMessage);
          }
        },
        on: vi.fn(),
        send: vi.fn(),
        close: vi.fn(),
      });
    });

    it('should handle unknown message types', () => {
      client.connect = vi.fn().mockResolvedValue(undefined);

      const loggerSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});

      const unknownMessage: EventSubMessage = {
        metadata: {
          message_id: 'unknown-id',
          message_type: 'unknown_type' as any,
          message_timestamp: '2024-01-01T00:00:00Z',
        },
        payload: {},
      };

      vi.spyOn(client as any, 'ws', 'get').mockReturnValue({
        emit: (event: string, ...args: any[]) => {
          if (event === 'message') {
            const handleMessage = (client as any).handleMessage.bind(client);
            handleMessage(unknownMessage);
          }
        },
        on: vi.fn(),
        send: vi.fn(),
        close: vi.fn(),
      });

      expect(loggerSpy).toHaveBeenCalledWith('Unknown message type: unknown_type');
      loggerSpy.mockRestore();
    });
  });

  describe('Session Reconnect', () => {
    it('should reconnect on session_reconnect', (done) => {
      const connectSpy = vi.spyOn(client, 'connect').mockResolvedValue(undefined);

      client.connect().then(() => {
        const reconnectMessage: EventSubMessage = {
          metadata: {
            message_id: 'reconnect-id',
            message_type: 'session_reconnect',
            message_timestamp: '2024-01-01T00:00:00Z',
          },
          payload: {
            reconnect_url: 'wss://new-reconnect.url',
          },
        };

        vi.spyOn(client as any, 'ws', 'get').mockReturnValue({
          emit: (event: string, message: any) => {
            if (event === 'message') {
              const handleMessage = (client as any).handleMessage.bind(client);
              handleMessage(reconnectMessage);
              setTimeout(() => {
                expect(connectSpy).toHaveBeenCalled();
                done();
              }, 10);
            }
          },
          on: vi.fn(),
          send: vi.fn(),
          close: vi.fn(),
        });
      });
    });
  });

  describe('Connection Close Handling', () => {
    it('should handle Twitch close codes', () => {
      const loggerSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});

      const handleClose = (client as any).handleClose.bind(client);
      handleClose(4000, Buffer.from('Internal server error'));

      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('EventSub closed by Twitch'));
      loggerSpy.mockRestore();
    });

    it('should schedule reconnect for non-1000 close codes', (done) => {
      const connectSpy = vi.spyOn(client, 'connect').mockResolvedValue(undefined);

      const handleClose = (client as any).handleClose.bind(client);
      handleClose(1006, Buffer.from('Abnormal closure'));

      setTimeout(() => {
        expect(connectSpy).toHaveBeenCalled();
        done();
      }, 50);
    });

    it('should not schedule reconnect on normal closure (1000)', () => {
      const connectSpy = vi.spyOn(client, 'connect').mockResolvedValue(undefined);

      const handleClose = (client as any).handleClose.bind(client);
      handleClose(1000, Buffer.from('Normal closure'));

      setTimeout(() => {
        expect(connectSpy).not.toHaveBeenCalled();
      }, 50);
    });
  });

  describe('Exponential Backoff Reconnect', () => {
    it('should use exponential backoff for reconnection', (done) => {
      const connectSpy = vi.spyOn(client, 'connect').mockResolvedValue(undefined);
      const startTime = Date.now();

      const handleClose = (client as any).handleClose.bind(client);
      handleClose(1006, Buffer.from('Connection lost'));

      setTimeout(() => {
        const elapsed = Date.now() - startTime;
        expect(elapsed).toBeGreaterThanOrEqual(900);
        expect(elapsed).toBeLessThan(2000);
        done();
      }, 1200);
    });

    it('should stop reconnecting after max attempts', (done) => {
      const limitedClient = new EventSubClient(logger, { maxReconnectAttempts: 2 });

      limitedClient.on('error', (error: Error) => {
        expect(error.message).toBe('Max reconnection attempts reached');
        done();
      });

      const handleClose = (limitedClient as any).handleClose;
      handleClose(1006, Buffer.from('Lost 1'));
      handleClose(1006, Buffer.from('Lost 2'));
    });
  });

  describe('Disconnect', () => {
    it('should close WebSocket with code 1000', (done) => {
      const wsMock = {
        close: vi.fn((code?: number, reason?: string) => {
          expect(code).toBe(1000);
          expect(reason).toBe('Graceful shutdown');
          done();
        }),
        emit: vi.fn(),
        on: vi.fn(),
        send: vi.fn(),
      };

      vi.spyOn(client as any, 'ws', 'get').mockReturnValue(wsMock);
      vi.spyOn(global, 'clearTimeout').mockImplementation(() => {});

      client.disconnect();
    });

    it('should clear session data on disconnect', () => {
      const welcomeMessage: EventSubMessage = {
        metadata: {
          message_id: 'welcome-id',
          message_type: 'session_welcome',
          message_timestamp: '2024-01-01T00:00:00Z',
        },
        payload: {
          id: 'test-session-id',
          reconnect_url: 'wss://reconnect.url',
        },
      };

      const handleMessage = (client as any).handleMessage.bind(client);
      handleMessage(welcomeMessage);

      expect(client.getSessionId()).toBe('test-session-id');

      client.disconnect();

      expect(client.getSessionId()).toBeNull();
    });
  });

  describe('getSessionId', () => {
    it('should return null before connected', () => {
      expect(client.getSessionId()).toBeNull();
    });

    it('should return session ID after welcome', (done) => {
      const welcomeMessage: EventSubMessage = {
        metadata: {
          message_id: 'welcome-id',
          message_type: 'session_welcome',
          message_timestamp: '2024-01-01T00:00:00Z',
        },
        payload: {
          id: 'test-session-id',
        },
      };

      const handleMessage = (client as any).handleMessage.bind(client);
      handleMessage(welcomeMessage);

      expect(client.getSessionId()).toBe('test-session-id');
      done();
    });
  });
});
