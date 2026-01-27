import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createLogger } from 'winston';
import { EventSubHandler, createEventHandlers } from '../../../../platforms/Twitch/eventsub/EventSubHandler';
import type { EventSubMessage } from '../../../../platforms/Twitch/eventsub/types';
import { EventType } from '../../../../platforms/Twitch/eventsub/types';

describe('EventSubHandler', () => {
  let logger: ReturnType<typeof createLogger>;
  let handler: EventSubHandler;

  beforeEach(() => {
    logger = createLogger({ silent: true });
    handler = new EventSubHandler(logger);
  });

  describe('Registration', () => {
    it('should register event handler', () => {
      const mockHandler = vi.fn();
      handler.register(EventType.StreamOnline, mockHandler);

      const message: EventSubMessage = {
        metadata: {
          message_id: 'test-id',
          message_type: 'notification',
          message_timestamp: '2024-01-01T00:00:00Z',
          subscription_type: EventType.StreamOnline,
        },
        payload: {},
      };

      handler.handle(message);

      expect(mockHandler).toHaveBeenCalledWith(message);
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });

    it('should register multiple event handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      handler.register(EventType.StreamOnline, handler1);
      handler.register(EventType.StreamOffline, handler2);

      const onlineMessage: EventSubMessage = {
        metadata: {
          message_id: 'online-id',
          message_type: 'notification',
          message_timestamp: '2024-01-01T00:00:00Z',
          subscription_type: EventType.StreamOnline,
        },
        payload: {},
      };

      const offlineMessage: EventSubMessage = {
        metadata: {
          message_id: 'offline-id',
          message_type: 'notification',
          message_timestamp: '2024-01-01T00:00:00Z',
          subscription_type: EventType.StreamOffline,
        },
        payload: {},
      };

      handler.handle(onlineMessage);
      handler.handle(offlineMessage);

      expect(handler1).toHaveBeenCalledWith(onlineMessage);
      expect(handler2).toHaveBeenCalledWith(offlineMessage);
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should overwrite existing handler for same event type', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      handler.register(EventType.StreamOnline, handler1);
      handler.register(EventType.StreamOnline, handler2);

      const message: EventSubMessage = {
        metadata: {
          message_id: 'test-id',
          message_type: 'notification',
          message_timestamp: '2024-01-01T00:00:00Z',
          subscription_type: EventType.StreamOnline,
        },
        payload: {},
      };

      handler.handle(message);

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledWith(message);
    });

    it('should handle message without subscription_type', () => {
      const mockHandler = vi.fn();
      handler.register(EventType.StreamOnline, mockHandler);

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const message: EventSubMessage = {
        metadata: {
          message_id: 'test-id',
          message_type: 'notification',
          message_timestamp: '2024-01-01T00:00:00Z',
        },
        payload: {},
      };

      handler.handle(message);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith('No handler registered for event type: undefined');

      consoleWarnSpy.mockRestore();
    });

    it('should debug for unregistered event types', () => {
      handler.register(EventType.StreamOnline, vi.fn());

      const loggerSpy = vi.spyOn(logger, 'debug').mockImplementation(() => {});

      const message: EventSubMessage = {
        metadata: {
          message_id: 'test-id',
          message_type: 'notification',
          message_timestamp: '2024-01-01T00:00:00Z',
          subscription_type: EventType.Subscribe,
        },
        payload: {},
      };

      handler.handle(message);

      expect(loggerSpy).toHaveBeenCalledWith('No handler registered for event type: channel.subscribe');

      loggerSpy.mockRestore();
    });

    it('should debug log for unregistered event types', () => {
      handler.register(EventType.StreamOnline, vi.fn());

      const loggerDebugSpy = vi.spyOn(logger, 'debug').mockImplementation(() => {});

      const message: EventSubMessage = {
        metadata: {
          message_id: 'test-id',
          message_type: 'notification',
          message_timestamp: '2024-01-01T00:00:00Z',
          subscription_type: EventType.Subscribe,
        },
        payload: {},
      };

      handler.handle(message);

      expect(loggerDebugSpy).toHaveBeenCalledWith('No handler registered for event type: channel.subscribe');

      loggerDebugSpy.mockRestore();
    });
  });
});

describe('createEventHandlers', () => {
  let logger: ReturnType<typeof createLogger>;

  beforeEach(() => {
    logger = createLogger({ silent: true });
    handler = new EventSubHandler(logger);
  });

  it('should create handlers for all event types', () => {
    const handlers = createEventHandlers(logger);

    expect(handlers.size).toBe(9);
    expect(handlers.has(EventType.StreamOnline)).toBe(true);
    expect(handlers.has(EventType.StreamOffline)).toBe(true);
    expect(handlers.has(EventType.ChannelUpdate)).toBe(true);
    expect(handlers.has(EventType.ChatMessage)).toBe(true);
    expect(handlers.has(EventType.Subscribe)).toBe(true);
    expect(handlers.has(EventType.SubscriptionMessage)).toBe(true);
    expect(handlers.has(EventType.SubscriptionGift)).toBe(true);
    expect(handlers.has(EventType.RewardRedemption)).toBe(true);
    expect(handlers.has(EventType.Follow)).toBe(true);
  });

  it('should log debug messages for each event type', () => {
    const loggerSpy = vi.spyOn(logger, 'debug').mockImplementation(() => {});
    const handlers = createEventHandlers(logger);

    expect(handlers.size).toBe(9);

    const testTypes = [
      EventType.StreamOnline,
      EventType.StreamOffline,
      EventType.ChannelUpdate,
      EventType.ChatMessage,
      EventType.Subscribe,
      EventType.SubscriptionMessage,
      EventType.SubscriptionGift,
      EventType.RewardRedemption,
      EventType.Follow,
    ];

    testTypes.forEach((eventType, index) => {
      const message: EventSubMessage = {
        metadata: {
          message_id: `test-${index}`,
          message_type: 'notification',
          message_timestamp: '2024-01-01T00:00:00Z',
          subscription_type: eventType,
        },
        payload: { test: 'data' },
      };

      const handler = handlers.get(eventType);
      if (handler) {
        handler(message);
      }
    });

    expect(loggerSpy).toHaveBeenCalledTimes(9);
    loggerSpy.mockRestore();
  });
});
