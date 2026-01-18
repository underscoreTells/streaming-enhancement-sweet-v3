# Architecture: Platform Strategy Pattern

## Overview
The platform strategy pattern provides a unified interface for interacting with multiple streaming platforms (Twitch, Kick, YouTube) while encapsulating platform-specific OAuth, API, WebSocket, and data translation logic.

## Why This Approach

### Problem Statement
Need to integrate with multiple streaming platforms (Twitch, Kick, YouTube) with:
- Different OAuth implementations
- Different API endpoints and data formats
- Different WebSocket protocols
- Different authentication mechanisms
- Ability to add new platforms without modifying existing code

### Selected Pattern: Strategy Pattern

The strategy pattern is the optimal choice for this project because:
- ✅ Complete platform abstraction (OAuth, API, WebSocket, data translation)
- ✅ Easy to add new platforms (create new strategy)
- ✅ Platform-specific logic encapsulated
- ✅ Unified interface for consuming code
- ✅ Easy testing (mock strategies)
- ✅ Supports multiple platforms simultaneously

## Architecture

### High-Level Diagram
```
┌────────────────────────────────────────────────────┐
│         Server Daemon (server-daemon)               │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │ Controllers  │  │   Services   │  │Strategies │ │
│  │              │  │              │  │           │ │
│  │ StreamCtrl   │  │ StreamEvent  │  │ TwitchStr │ │
│  │ OAuthCtrl    │  │ ObsService   │  │ KickStr   │ │
│  │ ConfigCtrl   │  │ TtsService   │  │ YoutubeStr│ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
│                           │                         │
│                           ▼                         │
└────────────────────────────────────────────────────┘
                           │
                           │ PlatformStrategy interface
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
┌─────────────────┐ ┌─────────────┐ ┌──────────────────┐
│  TwitchStrategy │ │ KickStrategy│ │ YouTubeStrategy  │
│                 │ │             │ │                  │
│  - OAuth flow   │ │ - OAuth     │ │ - OAuth flow     │
│  - REST API     │ │ - REST API  │ │ - REST API       │
│  - WebSocket    │ │ - WebSocket │ │ - WebSocket      │
│  - Translation  │ │ - Translation│ │ - Translation    │
└─────────────────┘ └─────────────┘ └──────────────────┘
         │                 │                 │
         └─────────────────┴─────────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         │                                   │
         ▼                                   ▼
┌─────────────────┐               ┌──────────────────┐
│  Twitch APIs    │               │  External APIs   │
│  (Twitch.tv)    │               │  (Kick.com,      │
│                 │               │   YouTube.com)   │
│  - OAuth        │               │                  │
│  - REST         │               │  - OAuth         │
│  - IRC/WebSocket│               │  - REST          │
└─────────────────┘               │  - WebSocket     │
                                  └──────────────────┘
```

### PlatformStrategy Interface

```typescript
interface PlatformStrategy {
  /**
   * Start OAuth flow for a user
   * @param username Platform username
   * @returns Authorization URL for user to visit
   */
  startOAuth(username: string): Promise<string>;

  /**
   * Handle OAuth callback
   * @param code Authorization code from OAuth provider
   * @param state State parameter for CSRF protection
   * @returns Token set with access token, refresh token, expiration
   */
  handleOAuthCallback(code: string, state: string): Promise<TokenSet>;

  /**
   * Get current access token (with auto-refresh)
   * @param username Platform username
   * @returns Current access token
   */
  getAccessToken(username: string): Promise<string>;

  /**
   * Get stream information
   * @param username Platform username
   * @returns Stream information (normalized)
   */
  getStream(username: string): Promise<Stream>;

  /**
   * Connect to platform WebSocket for real-time data
   * @param username Platform username
   * @param callbacks Callbacks for events (chat, stream status, etc.)
   */
  connectWebSocket(
    username: string,
    callbacks: {
      onChatMessage: (message: ChatMessage) => void;
      onStreamStatusChange: (status: StreamStatus) => void;
      onFollow: (follower: User) => void;
      onEvent: (event: Event) => void;
    }
  ): Promise<void>;

  /**
   * Disconnect WebSocket
   */
  disconnectWebSocket(): Promise<void>;

  /**
   * Get active viewers count
   * @param username Platform username
   * @returns Current viewer count
   */
  getViewerCount(username: string): Promise<number>;

  /**
   * Get chat messages (historical)
   * @param username Platform username
   * @param limit Maximum number of messages to retrieve
   * @returns Array of chat messages
   */
  getChatHistory(username: string, limit: number): Promise<ChatMessage[]>;
}
```

### Component Responsibilities

#### TwitchStrategy
- **OAuth**: OAuth flow implementation (see @docs/feature-plans/oauth-flow-keystore.md)
- **REST API**: Fetch stream info, user profile, channel data
- **WebSocket**: IRC-based WebSocket for chat, PubSub for events
- **Translation**: Convert Twitch-specific formats to normalized types

#### KickStrategy
- **OAuth**: OAuth flow implementation (future)
- **REST API**: Fetch stream info, user profile, channel data
- **WebSocket**: Kick-specific WebSocket protocol
- **Translation**: Convert Kick-specific formats to normalized types

#### YouTubeStrategy
- **OAuth**: OAuth flow implementation (future)
- **REST API**: Fetch stream info, user profile, channel data
- **WebSocket**: YouTube Live Streaming API (via Google APIs)
- **Translation**: Convert YouTube-specific formats to normalized types

### Data Translation (Normalization)

Each strategy translates platform-specific data formats to normalized types:

#### Normalized Types (shared/models/)
```typescript
interface Stream {
  id: string;
  platform: 'twitch' | 'kick' | 'youtube';
  username: string;
  title: string;
  game: string;
  viewerCount: number;
  isLive: boolean;
  startedAt?: Date;
  thumbnailUrl?: string;
}

interface ChatMessage {
  id: string;
  platform: 'twitch' | 'kick' | 'youtube';
  username: string;
  message: string;
  timestamp: Date;
  badges: Badge[];
  emotes: Emote[];
}

interface User {
  id: string;
  platform: 'twitch' | 'kick' | 'youtube';
  username: string;
  displayName: string;
  avatarUrl?: string;
  channelPoints?: number;
}

interface Event {
  id: string;
  platform: 'twitch' | 'kick' | 'youtube';
  type: 'follow' | 'subscription' | 'cheer' | 'raid' | 'host' | 'gift';
  data: any;
  timestamp: Date;
}
```

#### Translation Example

**Twitch format**:
```json
{
  "id": "123456789",
  "user_login": "streamer",
  "user_name": "Streamer",
  "game_id": "509658",
  "game_name": "Just Chatting",
  "title": "Live!",
  "viewer_count": 1000,
  "type": "live",
  "started_at": "2026-01-18T10:00:00Z"
}
```

**Normalized format**:
```typescript
{
  id: "123456789",
  platform: "twitch",
  username: "streamer",
  title: "Live!",
  game: "Just Chatting",
  viewerCount: 1000,
  isLive: true,
  startedAt: new Date("2026-01-18T10:00:00Z")
}
```

## Usage Examples

### Starting OAuth
```typescript
const twitchStrategy = new TwitchStrategy(keystoreManager);
const authUrl = await twitchStrategy.startOAuth('streamer123');
// Returns: "https://id.twitch.tv/oauth2/authorize?..."
```

### Getting Stream Info
```typescript
const twitchStrategy = new TwitchStrategy(keystoreManager);
const stream = await twitchStrategy.getStream('streamer123');
// Returns normalized Stream object
```

### Connecting to WebSocket
```typescript
const twitchStrategy = new TwitchStrategy(keystoreManager);
await twitchStrategy.connectWebSocket('streamer123', {
  onChatMessage: (msg) => console.log(`${msg.username}: ${msg.message}`),
  onStreamStatusChange: (status) => console.log('Status changed:', status),
  onFollow: (follower) => console.log('New follower:', follower.username),
  onEvent: (event) => console.log('Event:', event.type)
});
```

### Multi-Platform Monitoring
```typescript
const strategies = [
  new TwitchStrategy(keystoreManager),
  new KickStrategy(keystoreManager),
  new YouTubeStrategy(keystoreManager)
];

for (const strategy of strategies) {
  await strategy.connectWebSocket('streamer123', callbacks);
}
```

## Testing Strategy

### Unit Tests
- Test each strategy independently with mocked APIs
- Mock OAuth server for OAuth flow tests
- Mock WebSocket server for WebSocket tests
- Test data translation with platform-specific formats

### Integration Tests
- Test OAuth flow end-to-end (with test OAuth app)
- Test WebSocket connection and event handling
- Test data translation with real API responses

### Mock Strategy
Implement `MockPlatformStrategy` for test isolation and unit testing of consumers.

## Benefits

### Open/Closed Principle
- Open for extension: Add new platforms by creating new strategy
- Closed for modification: Existing strategies unchanged

### Single Responsibility
- Each platform implemented in separate class
- OAuth, API, WebSocket, translation cohesive per platform

### Easy Testing
- Mock strategies for unit tests
- Test each platform independently
- Test consumers with mock strategies

### Consistent Interface
- Consumers interact with `PlatformStrategy` interface
- No platform-specific knowledge needed
- Platform agnostic (can add platforms transparently)

## Future Platform Support

Adding a new platform requires:
1. Create `NewPlatformStrategy` class
2. Implement `PlatformStrategy` interface
3. Implement OAuth flow (if applicable)
4. Translate platform-specific data to normalized types
5. Add platform validation in controllers

Example: Adding a hypothetical "StreamingPlatformX"
```typescript
class StreamingPlatformXStrategy implements PlatformStrategy {
  // Implement all interface methods
  // Handle OAuth (if applicable)
  // Translate platform formats to normalized types
}
```

## References
- **Feature Plan**: @docs/feature-plans/oauth-flow-keystore.md
- **Module Plan**: @docs/module-plans/module-server-daemon.md
- **Security**: @architecture/oauth-security-model.md