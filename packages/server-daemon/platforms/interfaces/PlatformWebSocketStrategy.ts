/**
 * Interface for platform WebSocket integration
 * Manages WebSocket connections (EventSub, IRC, etc.)
 */
export interface PlatformWebSocketStrategy {
  /** Platform identifier (e.g., 'twitch', 'kick', 'youtube') */
  readonly platform: string;

  /**
   * Connect to platform WebSocket services
   * Starts EventSub, IRC, or other WebSocket clients
   */
  connect(): Promise<void>;

  /**
   * Disconnect from platform WebSocket services
   * Graceful shutdown of all WebSocket connections
   */
  disconnect(): Promise<void>;

  /**
   * Subscribe to channel events
   * Creates EventSub subscriptions, joins IRC channels, etc.
   */
  subscribeToChannel(channelId: string, username?: string): Promise<void>;

  /**
   * Subscribe to channel chat specifically
   * Joins IRC channel, subscribes to chat events
   */
  subscribeToChat(channelId: string): Promise<void>;

  /**
   * Unsubscribe from channel events
   * Removes EventSub subscriptions, leaves IRC channels
   */
  unsubscribeFromChannel(channelId: string): Promise<void>;
}
