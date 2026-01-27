import { Logger } from 'winston';
import type { EventSubMessage } from './types';
import { EventType } from './types';

export type EventSubHandlerFn = (message: EventSubMessage) => void;

export class EventSubHandler {
  private handlers = new Map<EventType, EventSubHandlerFn>();

  constructor(private logger: Logger) {}

  register(eventType: EventType, handler: EventSubHandlerFn): void {
    this.handlers.set(eventType, handler);
  }

  handle(message: EventSubMessage): void {
    const subscriptionType = message.metadata.subscription_type;

    if (subscriptionType && this.handlers.has(subscriptionType as EventType)) {
      const handler = this.handlers.get(subscriptionType as EventType)!;
      handler(message);
    } else if (subscriptionType) {
      this.logger.debug(`No handler registered for event type: ${subscriptionType}`);
    }
  }
}

export function createEventHandlers(logger: Logger): Map<EventType, EventSubHandlerFn> {
  const handlers = new Map<EventType, EventSubHandlerFn>();

  handlers.set(EventType.StreamOnline, (message: EventSubMessage) => {
    const payload = message.payload as any;
    logger.debug('Stream online event', { payload });
  });

  handlers.set(EventType.StreamOffline, (message: EventSubMessage) => {
    const payload = message.payload as any;
    logger.debug('Stream offline event', { payload });
  });

  handlers.set(EventType.ChannelUpdate, (message: EventSubMessage) => {
    const payload = message.payload as any;
    logger.debug('Channel update event', { payload });
  });

  handlers.set(EventType.ChatMessage, (message: EventSubMessage) => {
    const payload = message.payload as any;
    logger.debug('Chat message event', { payload });
  });

  handlers.set(EventType.Subscribe, (message: EventSubMessage) => {
    const payload = message.payload as any;
    logger.debug('Subscribe event', { payload });
  });

  handlers.set(EventType.SubscriptionMessage, (message: EventSubMessage) => {
    const payload = message.payload as any;
    logger.debug('Subscription message event', { payload });
  });

  handlers.set(EventType.SubscriptionGift, (message: EventSubMessage) => {
    const payload = message.payload as any;
    logger.debug('Subscription gift event', { payload });
  });

  handlers.set(EventType.RewardRedemption, (message: EventSubMessage) => {
    const payload = message.payload as any;
    logger.debug('Reward redemption event', { payload });
  });

  handlers.set(EventType.Follow, (message: EventSubMessage) => {
    const payload = message.payload as any;
    logger.debug('Follow event', { payload });
  });

  return handlers;
}
