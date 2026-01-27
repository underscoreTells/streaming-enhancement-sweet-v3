/**
 * @deprecated Use separate interfaces from @platforms/interfaces
 * - PlatformOAuthStrategy for OAuth operations
 * - PlatformWebSocketStrategy for WebSocket connections
 * - PlatformRestStrategy for REST API calls
 */
import type { PlatformOAuthStrategy, PlatformWebSocketStrategy, PlatformRestStrategy } from './interfaces';

export interface PlatformStrategy extends PlatformOAuthStrategy, PlatformWebSocketStrategy, PlatformRestStrategy {
}