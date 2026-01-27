import { Logger } from 'winston';
import type { 
  CreateSubscriptionRequest, 
  SubscriptionData 
} from './types';

export interface EventSubSubscriptionOptions {
  clientId: string;
  accessToken: string;
}

export class EventSubSubscriptionManager {
  private readonly baseUrl = 'https://api.twitch.tv/helix/eventsub/subscriptions';

  constructor(
    private logger: Logger,
    private options: EventSubSubscriptionOptions
  ) {}

  async create(
    type: string,
    version: string,
    condition: Record<string, string>,
    sessionId: string
  ): Promise<SubscriptionData> {
    const request: CreateSubscriptionRequest = {
      type,
      version,
      condition,
      transport: {
        method: 'websocket',
        session_id: sessionId,
      },
    };

    this.logger.debug('Creating EventSub subscription', { type, condition });

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Client-ID': this.options.clientId,
        'Authorization': `Bearer ${this.options.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create subscription: ${response.status} ${errorText}`);
    }

    const result = await response.json() as { data: SubscriptionData[] };
    return result.data[0];
  }

  async delete(subscriptionId: string): Promise<void> {
    this.logger.debug('Deleting EventSub subscription', { subscriptionId });

    const response = await fetch(
      `${this.baseUrl}?id=${subscriptionId}`,
      {
        method: 'DELETE',
        headers: {
          'Client-ID': this.options.clientId,
          'Authorization': `Bearer ${this.options.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete subscription: ${response.status} ${errorText}`);
    }
  }
}
