/**
 * Platform Strategy Interfaces
 *
 * Separated concerns: OAuth, WebSocket, REST
 * Each platform strategy implements all three interfaces
 */

export { PlatformOAuthStrategy } from './PlatformOAuthStrategy';
export { PlatformWebSocketStrategy } from './PlatformWebSocketStrategy';
export { PlatformRestStrategy } from './PlatformRestStrategy';
