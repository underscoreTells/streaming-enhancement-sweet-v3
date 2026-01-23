import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createLogger } from 'winston';
import { IrcClient } from '../../../../platforms/Twitch/irc/IrcClient';

vi.mock('ws', () => ({
  default: class MockWebSocket {
    public readyState = 0;
    private handlers: Map<string, Function[]> = new Map();

    constructor(public url: string) {}

    on(event: string, handler: Function) {
      if (!this.handlers.has(event)) {
        this.handlers.set(event, []);
      }
      this.handlers.get(event)!.push(handler);
    }

    emit(event: string, ...args: any[]) {
      const handlers = this.handlers.get(event);
      if (handlers) {
        handlers.forEach(h => h(...args));
      }
    }

    open() {
      this.readyState = 1;
      this.emit('open');
    }

    send(data: string) {
      return true;
    }

    close(code?: number, reason?: string | Buffer) {
      this.readyState = 3;
      this.emit('close', code ?? 1000, reason ?? Buffer.from(''));
    }
  },
}));

describe('IrcClient', () => {
  let logger: ReturnType<typeof createLogger>;
  let client: IrcClient;

  beforeEach(() => {
    logger = createLogger({ silent: true });
    client = new IrcClient(logger);
  });

  afterEach(() => {
    if (client) {
      client.disconnect();
    }
    vi.restoreAllMocks();
  });

  describe('Construction', () => {
    it('should create client with default options', () => {
      const defaultClient = new IrcClient(logger);
      expect(defaultClient).toBeDefined();
      expect(defaultClient.isConnected()).toBe(false);
    });

    it('should accept custom options', () => {
      const customClient = new IrcClient(logger, {
        url: 'wss://custom.irc.server',
        nick: 'testuser',
        token: 'test_token',
        reconnectBaseDelay: 2000,
        maxReconnectAttempts: 5,
      });
      expect(customClient).toBeDefined();
    });

    it('should default to wss://irc-ws.chat.twitch.tv:443', () => {
      const defaultClient = new IrcClient(logger);
      expect(defaultClient.isConnected()).toBe(false);
    });
  });

  describe('Connection', () => {
    it('should connect and send authentication', async () => {
      let wsInstance: any = null;
      vi.doMock('ws', () => ({
        default: class MockWebSocket {
          public readyState = 0;
          private handlers: Map<string, Function[]> = new Map();

          constructor(public url: string) {}

          on(event: string, handler: Function) {
            if (!this.handlers.has(event)) {
              this.handlers.set(event, []);
            }
            this.handlers.get(event)!.push(handler);
          }

          emit(event: string, ...args: any[]) {
            const handlers = this.handlers.get(event);
            if (handlers) {
              handlers.forEach(h => h(...args));
            }
          }

          send(data: string) {
            expect(data).toMatch(/PASS oauth:/);
            expect(data).toMatch(/NICK/);
            return true;
          }

          close(_: number, __: string | Buffer) {
            this.emit('close', 1000, Buffer.from(''));
            this.readyState = 3;
          }
        },
      }));

      await client.connect('testuser', 'oauth_token');
    });

    it('should emit connected event after 376 message', (done) => {
      client.on('connected', () => {
        expect(client.isConnected()).toBe(true);
        done();
      });

      client.connect = vi.fn().mockResolvedValue(undefined);

      const ws: any = { send: vi.fn(), close: vi.fn(), readyState: 1 };
      vi.spyOn(client as any, 'ws', 'get').mockReturnValue(ws);

      const message376 = ':tmi.twitch.tv 376 testuser :End of /MOTD command';
      const handleMessage = (client as any).handleMessage.bind(client);
      handleMessage({ command: '376', params: ['testuser', 'End of /MOTD command'], raw: message376 });
    });

    it('should emit raw message events', (done) => {
      client.on('raw', (message: any) => {
        expect(message.command).toBe('001');
        expect(message.params[0]).toBe('testuser');
        done();
      });

      client.connect = vi.fn().mockResolvedValue(undefined);

      const ws: any = { send: vi.fn(), close: vi.fn(), readyState: 1 };
      vi.spyOn(client as any, 'ws', 'get').mockReturnValue(ws);

      const message001 = ':tmi.twitch.tv 001 testuser :Welcome, GLHF!';
      const handleMessage = (client as any).handleMessage.bind(client);
      handleMessage({ command: '001', params: ['testuser', 'Welcome, GLHF!'], raw: message001 });
    });
  });

  describe('PING/PONG', () => {
    it('should respond to PING with PONG', () => {
      client.connect = vi.fn().mockResolvedValue(undefined);

      const ws: any = { send: vi.fn(() => true), close: vi.fn(), readyState: 1 };
      vi.spyOn(client as any, 'ws', 'get').mockReturnValue(ws);

      const handleMessage = (client as any).handleMessage.bind(client);
      handleMessage({ command: 'PING', params: ['tmi.twitch.tv'], raw: 'PING :tmi.twitch.tv' });

      expect(ws.send).toHaveBeenCalledWith('PONG tmi.twitch.tv\r\n');
    });
  });

  describe('PRIVMSG', () => {
    it('should emit chat event for PRIVMSG', (done) => {
      client.on('chat', (chatData: any) => {
        expect(chatData.channel).toBe('#testchannel');
        expect(chatData.content).toBe('Hello, world!');
        expect(chatData.displayName).toBe('TestUser');
        expect(chatData.userId).toBe('12345');
        done();
      });

      client.connect = vi.fn().mockResolvedValue(undefined);

      const ws: any = { send: vi.fn(), close: vi.fn(), readyState: 1 };
      vi.spyOn(client as any, 'ws', 'get').mockReturnValue(ws);

      const message = '@badge-info=;badges=;color=#00FF00;display-name=TestUser;user-id=12345; :testuser!testuser@testuser.tmi.twitch.tv PRIVMSG #testchannel :Hello, world!';
      const handleMessage = (client as any).handleMessage.bind(client);
      handleMessage({
        command: 'PRIVMSG',
        params: ['#testchannel', 'Hello, world!'],
        tags: {
          'display-name': 'TestUser',
          'user-id': '12345',
          color: '#00FF00',
        },
        raw: message,
      });
    });
  });

  describe('NOTICE', () => {
    it('should handle login unsuccessful NOTICE', () => {
      const loggerSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
      const disconnectSpy = vi.spyOn(client, 'disconnect').mockImplementation(() => {});

      const handleMessage = (client as any).handleMessage.bind(client);
      handleMessage({
        command: 'NOTICE',
        params: ['*', 'Login unsuccessful'],
        raw: ':tmi.twitch.tv NOTICE * :Login unsuccessful',
      });

      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('authentication failed'));
      expect(disconnectSpy).toHaveBeenCalled();

      loggerSpy.mockRestore();
      disconnectSpy.mockRestore();
    });

    it('should handle normal NOTICE messages', () => {
      const loggerSpy = vi.spyOn(logger, 'debug').mockImplementation(() => {});

      const handleMessage = (client as any).handleMessage.bind(client);
      handleMessage({
        command: 'NOTICE',
        params: ['#testchannel', 'Test notice message'],
        raw: ':tmi.twitch.tv NOTICE #testchannel :Test notice message',
      });

      expect(loggerSpy).toHaveBeenCalledWith('IRC NOTICE:', 'Test notice message');

      loggerSpy.mockRestore();
    });
  });

  describe('JOIN/LEAVE', () => {
    it('should join channel', () => {
      client.connect = vi.fn().mockResolvedValue(undefined);

      const ws: any = { send: vi.fn(() => true), close: vi.fn(), readyState: 1 };
      vi.spyOn(client as any, 'ws', 'get').mockReturnValue(ws);
      vi.spyOn(client as any, 'connected', 'get').mockReturnValue(true);
      vi.spyOn(client as any, 'authenticated', 'get').mockReturnValue(true);

      client.join('testchannel');

      expect(ws.send).toHaveBeenCalledWith('JOIN #testchannel\r\n');
    });

    it('should join channel with # prefix', () => {
      client.connect = vi.fn().mockResolvedValue(undefined);

      const ws: any = { send: vi.fn(() => true), close: vi.fn(), readyState: 1 };
      vi.spyOn(client as any, 'ws', 'get').mockReturnValue(ws);
      vi.spyOn(client as any, 'connected', 'get').mockReturnValue(true);
      vi.spyOn(client as any, 'authenticated', 'get').mockReturnValue(true);

      client.join('#testchannel');

      expect(ws.send).toHaveBeenCalledWith('JOIN #testchannel\r\n');
    });

    it('should warn when trying to join while not connected', () => {
      const loggerSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});

      client.join('testchannel');

      expect(loggerSpy).toHaveBeenCalledWith('IRC not connected or authenticated, cannot join channel');

      loggerSpy.mockRestore();
    });

    it('should leave channel', () => {
      client.connect = vi.fn().mockResolvedValue(undefined);

      const ws: any = { send: vi.fn(() => true), close: vi.fn(), readyState: 1 };
      vi.spyOn(client as any, 'ws', 'get').mockReturnValue(ws);
      vi.spyOn(client as any, 'connected', 'get').mockReturnValue(true);

      client.leave('testchannel');

      expect(ws.send).toHaveBeenCalledWith('PART #testchannel\r\n');
    });

    it('should leave channel with # prefix', () => {
      client.connect = vi.fn().mockResolvedValue(undefined);

      const ws: any = { send: vi.fn(() => true), close: vi.fn(), readyState: 1 };
      vi.spyOn(client as any, 'ws', 'get').mockReturnValue(ws);
      vi.spyOn(client as any, 'connected', 'get').mockReturnValue(true);

      client.leave('#testchannel');

      expect(ws.send).toHaveBeenCalledWith('PART #testchannel\r\n');
    });

    it('should warn when trying to leave while not connected', () => {
      const loggerSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});

      client.leave('testchannel');

      expect(loggerSpy).toHaveBeenCalledWith('IRC not connected, cannot leave channel');

      loggerSpy.mockRestore();
    });
  });

  describe('Send Message', () => {
    it('should send PRIVMSG to channel', () => {
      client.connect = vi.fn().mockResolvedValue(undefined);

      const ws: any = { send: vi.fn(() => true), close: vi.fn(), readyState: 1 };
      vi.spyOn(client as any, 'ws', 'get').mockReturnValue(ws);
      vi.spyOn(client as any, 'connected', 'get').mockReturnValue(true);
      vi.spyOn(client as any, 'authenticated', 'get').mockReturnValue(true);

      client.sendMessage('testchannel', 'Test message');

      expect(ws.send).toHaveBeenCalledWith('PRIVMSG #testchannel :Test message\r\n');
    });

    it('should warn when trying to send while not connected', () => {
      const loggerSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});

      client.sendMessage('testchannel', 'Test message');

      expect(loggerSpy).toHaveBeenCalledWith('IRC not connected or authenticated, cannot send message');

      loggerSpy.mockRestore();
    });
  });

  describe('Disconnect', () => {
    it('should disconnect cleanly', () => {
      client.connect = vi.fn().mockResolvedValue(undefined);

      const ws: any = { send: vi.fn(), close: vi.fn(), readyState: 1 };
      vi.spyOn(client as any, 'ws', 'get').mockReturnValue(ws);

      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      client.disconnect();

      expect(ws.close).toHaveBeenCalledWith(1000, 'Graceful shutdown');
      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(client.isConnected()).toBe(false);

      clearTimeoutSpy.mockRestore();
    });

    it('should clear reconnect timer', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      client.disconnect();

      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });

    it('should reset connection state', () => {
      client.connect = vi.fn().mockResolvedValue(undefined);

      vi.spyOn(client as any, 'connected', 'set');
      vi.spyOn(client as any, 'authenticated', 'set');

      client.disconnect();

      expect(client.isConnected()).toBe(false);
    });
  });

  describe('Reconnection', () => {
    it('should schedule reconnect on abnormal close', () => {
      client.connect = vi.fn().mockResolvedValue(undefined);

      const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
        return fn();
      });

      const onClose = (client as any).onClose.bind(client);
      onClose(1006, Buffer.from('Abnormal closure'));

      expect(setTimeoutSpy).toHaveBeenCalled();

      setTimeoutSpy.mockRestore();
    });

    it('should stop reconnecting after max attempts', () => {
      const clientWithMaxAttempts = new IrcClient(logger, { maxReconnectAttempts: 2 });
      const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});

      const onClose = (clientWithMaxAttempts as any).onClose.bind(clientWithMaxAttempts);
      onClose(1006, Buffer.from('Lost'));
      onClose(1006, Buffer.from('Lost'));
      onClose(1006, Buffer.from('Lost'));

      expect(errorSpy).toHaveBeenCalledWith('IRC max reconnect attempts reached (2)');

      errorSpy.mockRestore();
    });

    it('should not reconnect on normal closure (1000)', () => {
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation(() => 123 as any);

      const onClose = (client as any).onClose.bind(client);
      onClose(1000, Buffer.from('Normal closure'));

      expect(setTimeoutSpy).not.toHaveBeenCalled();

      setTimeoutSpy.mockRestore();
    });

    it('should use exponential backoff', () => {
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation(() => 123 as any);

      const onClose = (client as any).onClose.bind(client);
      onClose(1006, Buffer.from('Lost'));

      const delay = setTimeoutSpy.mock.calls[0][1] as number;
      expect(delay).toBeGreaterThan(900);
      expect(delay).toBeLessThan(2500);

      setTimeoutSpy.mockRestore();
    });
  });

  describe('isConnected', () => {
    it('should return false before connection', () => {
      expect(client.isConnected()).toBe(false);
    });

    it('should return true after successful connection', () => {
      vi.spyOn(client as any, 'connected', 'get').mockReturnValue(true);
      vi.spyOn(client as any, 'authenticated', 'get').mockReturnValue(true);

      expect(client.isConnected()).toBe(true);
    });

    it('should return false when connected but not authenticated', () => {
      vi.spyOn(client as any, 'connected', 'get').mockReturnValue(true);
      vi.spyOn(client as any, 'authenticated', 'get').mockReturnValue(false);

      expect(client.isConnected()).toBe(false);
    });
  });
});
