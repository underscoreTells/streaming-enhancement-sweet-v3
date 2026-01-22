# Feature Plan: Shared Data Models

## Overview

Create unified, platform-agnostic data types with an adapter/translator pattern for streaming data across Twitch (EventSub + IRC WebSocket), Kick (REST + Webhooks), and YouTube (REST + Server-Stream chat). This is a foundational feature prerequisite for all platform strategies.

**Key Innovations:**
- Minimal shared base types with disciplined platform subtyping - NO optional field soup
- Adapter/Translation layer hides platform complexity - downstream code NEVER switches on platform
- Separated static vs live data - Stream (metadata) vs StreamStats (live data)
- Unified Stream wrapper - every stream (single or multi-platform) wrapped in `Stream` type
- Unified User wrapper - cross-platform user referencing with flexible linking
- OBS-driven lifecycle - Stream start/stop driven by OBS WebSocket events
- Timestamp-based stream matching - +/- 10min window + user ID for late data reconstruction

---

## Research References

This plan is based on comprehensive API research:
- **@docs/research/API-RESEARCH.md** - Complete REST API field documentation (1,812 lines)
- **@docs/research/twitch-websocket-apis-research.md** - Twitch EventSub WebSocket + IRC WebSocket (1,678 lines)
- **@docs/research/obs-websocket-protocol.md** - OBS WebSocket protocol (901 lines)

---

## Platform API Capabilities Summary

| Platform | REST API | Real-Time Events | Real-Time Chat | Protocol |
|----------|----------|------------------|----------------|----------|
| **Twitch** | ✅ Helix API | ✅ EventSub WebSocket | ✅ IRC WebSocket | wss:// |
| **Kick** | ✅ @docs.kick.com | ✅ Webhooks | ✅ Webhooks | HTTPS |
| **YouTube** | ✅ Data API v3 | ⚠️ Limited (Polling) | ✅ Server-Stream HTTP | HTTP/gRPC |

### Key Platform Details
- **Twitch**: EventSub WebSocket (replaced obsolete PubSub, see @docs/research/twitch-websocket-apis-research.md) + IRC WebSocket for chat
- **Kick**: Official documentation at docs.kick.com with OAuth 2.1 + PKCE and webhook events
- **YouTube**: `liveChatMessages.streamList` for real-time chat (server-Sent HTTP/gRPC), polling for stream status/events

---

## Scope & Deliverables

- [x] Document all platform API structures via research docs
- [ ] Define core data types: Stream, User, ChatMessage, Event
- [ ] Define supporting types: Badge, Emote, StreamStats
- [ ] Create adapter/translator layer for platform normalization
- [ ] Create unified wrapper types: Stream, User
- [ ] Implement OBS WebSocket integration (ObsWebSocketClient + ObsStreamDetector)
- [ ] Implement stream matching logic for late data reconstruction
- [ ] Implement user matching framework for cross-platform linking
- [ ] Create shared module structure (`shared/models/`)
- [ ] Write comprehensive unit tests
- [ ] Document field mapping from platform APIs to shared types
- [ ] Update PlatformStrategy interface to reference new types

---

## Directory Structure

```
shared/models/
├── Platform.ts
├── Stream.ts                  # PlatformStream types (TwitchStream, KickStream, YouTubeStream)
├── StreamStats.ts             # Live data
├── User.ts                    # PlatformUser types + User wrapper
├── ChatMessage.ts             # PlatformChatMessage types
├── Event.ts                   # PlatformEvent types
├── Badge.ts
├── Emote.ts
├── adapters/                  # Translation layer
│   ├── StreamAdapter.ts       # Interface + implementation
│   ├── UserAdapter.ts
│   ├── ChatMessageAdapter.ts
│   └── EventAdapter.ts
├── translators/               # Create adapters from platform types
│   ├── StreamTranslator.ts
│   ├── UserTranslator.ts
│   ├── ChatMessageTranslator.ts
│   └── EventTranslator.ts
├── converters/                # API → platform types
│   ├── TwitchConverter.ts
│   ├── KickConverter.ts
│   └── YouTubeConverter.ts
├── matchers/                  # Stream matching for late data
│   ├── StreamMatcher.ts
│   └── UserMatcher.ts         # Cross-platform user matching
├── cache/                     # Dependency-injected caches
│   ├── CategoryCache.ts       # Interface
│   ├── InMemoryCategoryCache.ts
│   └── DatabaseCategoryCache.ts
├── interface.ts               # Common interfaces (FeatureData, etc.)
├── index.ts                   # Barrel export
└── __tests__/
    ├── Stream.test.ts
    ├── User.test.ts
    ├── adapters/
    ├── translators/
    ├── converters/
    ├── matchers/
    └── cache/
```

---

## Complete Type Specifications

### Platform

```typescript
/**
 * Platform type union
 */
export type Platform = 'twitch' | 'kick' | 'youtube';

/**
 * Validates if a string is a valid platform
 */
export function isValidPlatform(value: unknown): value is Platform;

/**
 * Gets human-readable platform name
 */
export function getPlatformName(platform: Platform): string;
```

---

### Platform-Specific Stream Types (Base Types)

Disciplined platform-specific types - NO optional field soup.

```typescript
/**
 * Twitch stream data
 * Field mappings from @docs/research/API-RESEARCH.md lines 52-100
 */
interface TwitchStream {
  platform: Platform.Twitch;
  twitchId: string;              // Stream ID
  username: string;              // Broadcaster username
  title: string;                 // Stream title
  categoryId: string;            // Game/category ID
  tags: string[];                // Stream tags
  isMature: boolean;             // Mature content flag
  language: string;              // ISO 639-1 language code
  thumbnailUrl: string | null;   // Thumbnail URL
  channelPoints: number;         // Twitch channel points
  // NO viewerCount - that's StreamStats (live data)
}

/**
 * Kick stream data
 * Field mappings from @docs.kick.com and API-RESEARCH.md lines 706-738
 */
interface KickStream {
  platform: Platform.Kick;
  kickId: string;                // Stream ID
  username: string;              // Broadcaster username
  title: string;                 // Stream title
  categorySlug: string;          // Category/game slug
  tags: string[];                // Stream tags
  language: string;              // ISO 639-1 language code
  thumbnailUrl: string | null;   // Thumbnail URL
  totalTipsUsd: number;          // Total tips received
}

/**
 * YouTube stream data
 * Field mappings from @docs/research/API-RESEARCH.md lines 889-1015
 */
interface YouTubeStream {
  platform: Platform.YouTube;
  videoId: string;               // Video ID
  channelTitle: string;          // Channel title
  title: string;                 // Stream title
  categoryId: string;            // Category ID
  tags: string[];                // Video tags
  privacyStatus: string;         // Privacy status
  thumbnailUrl: string | null;   // Thumbnail URL
  subscriberCount: number;       // Channel subscriber count
  superChatTotal: number;        // Total Super Chat earnings
}

type PlatformStream = TwitchStream | KickStream | YouTubeStream;
```

---

### Stream Stats (Live Data)

Live/dynamic stream data - sent separately from static metadata.

```typescript
/**
 * Live stream statistics
 * Sent separately from Stream metadata via WebSocket
 */
interface StreamStats {
  streamId: string;              // From adapter.getId()
  viewerCount: number;           // Current viewer count
  followerCount: number;         // Follower count
  subscriberCount: number | null;// YouTube subscriber count (null on other platforms)
  uptime: number | null;         // Seconds since stream started
  timestamp: Date;               // When stats were captured
}
```

---

### Stream Adapter

Translation layer that hides platform differences.

```typescript
/**
 * Stream adapter interface
 * Normalizes platform-specific stream data
 */
interface StreamAdapter {
  // Core static metadata (common to all platforms)
  getPlatform(): Platform;
  getId(): string;                // Platform-specific ID
  getTitle(): string;
  getCategory(): string;          // NORMALIZED via CategoryCache
  getThumbnail(): string | null;
  getTags(): string[];

  // Platform-specific features - DYNAMIC access
  hasFeature(feature: string): boolean;
  getFeature(feature: 'twitchChannelPoints' | 'kickTips' | 'youtubeSuperChat' | 'subscriberCount'): FeatureData | null;

  // Serialization
  toStorage(): object;          // Returns raw PlatformStream for DB
}

/**
 * Feature data type for dynamic feature access
 */
type FeatureData =
  | { current: number }          // Channel points, tips, SuperChat, etc.
  | { total: number }            // Subscriber count, view count
  | { value: number; currency: string; normalizedMicros?: number }  // Monetary amounts
  | object;                      // Other platform-specific features
```

---

### Stream (Unified Wrapper)

Every stream (single or multi-platform) wrapped in unified type.

```typescript
/**
 * Unified stream wrapper
 * Every stream (single or multi-platform) wraps platform data in this type
 */
interface Stream {
  commonId: string;              // UUID generated on OBS stream start
  obsStartTime: Date;            // OBS is source of truth
  obsEndTime: Date | null;       // Null if stream active
  streams: Map<Platform, StreamAdapter>;  // May be empty initially (OBS started, platforms not yet live)
}
```

**Lifecycle**:
- Created on OBS `StreamStateChanged` → `OBS_WEBSOCKET_OUTPUT_STARTED`
- Platforms added as they come online (WebSocket events, etc.)
- Closed on OBS `StreamStateChanged` → `OBS_WEBSOCKET_OUTPUT_STOPPED`

---

### Platform-Specific User Types

```typescript
/**
 * Twitch user data
 * Field mappings from @docs/research/API-RESEARCH.md lines 215-260
 */
interface TwitchUser {
  platform: Platform.Twitch;
  twitchId: string;              // User ID
  username: string;              // Username/login
  displayName: string;           // Display name
  profileImageUrl: string | null;// Profile picture URL
  bio: string | null;            // Bio/description
  createdAt: Date | null;        // Account creation date
}

/**
 * Kick user data
 * Field mappings from @docs/research/API-RESEARCH.md lines 742-764
 */
interface KickUser {
  platform: Platform.Kick;
  kickId: string;                // User ID
  username: string;              // Username
  displayName: string;           // Display name
  avatarUrl: string | null;      // Avatar URL
  bio: string | null;            // Bio
  isVerified: boolean;           // Verification status
  createdAt: Date | null;        // Account creation date
}

/**
 * YouTube user data
 * Field mappings from @docs/research/API-RESEARCH.md lines 1065-1174
 */
interface YouTubeUser {
  platform: Platform.YouTube;
  channelId: string;             // Channel ID
  channelTitle: string;          // Channel title
  customUrl: string | null;      // Custom URL (@handle)
  thumbnailUrl: string | null;   // Thumbnail URL
  description: string | null;    // Channel description
  subscriberCount: number;       // Subscriber count
  videoCount: number;            // Total video count
  viewCount: number;             // Total lifetime views
  createdAt: Date | null;        // Channel creation date
}

type PlatformUser = TwitchUser | KickUser | YouTubeUser;
```

---

### User Adapter

```typescript
/**
 * User adapter interface
 * Normalizes platform-specific user data
 */
interface UserAdapter {
  getPlatform(): Platform;
  getId(): string;                // Platform-specific ID
  getUsername(): string;
  getDisplayName(): string;
  getAvatar(): string | null;
  getBio(): string | null;
  getCreatedAt(): Date | null;

  // Platform-specific features
  hasFeature(feature: string): boolean;
  getFeature(feature: string): FeatureData | null;

  // Serialization
  toStorage(): object;          // Returns raw PlatformUser for DB
}
```

---

### User (Unified Wrapper)

Cross-platform user referencing with flexible linking.

```typescript
/**
 * Unified user wrapper
 * Enables cross-referencing same person across multiple platforms
 */
interface User {
  commonId: string;              // UUID for cross-platform linking
  userId: string;                // Primary identifier (app user's username or chatter identifier)
  username: string;              // Primary username (app user's username or best-match chatter username)
  platforms: Map<Platform, UserAdapter>;  // Platform-specific user data
}
```

**Cross-Platform Linking Logic**:

- **App user (streamer)**: Manually assigned commonId via UI during setup
- **Chatters**: Automatic detection via fuzzy matching (algorithm TBD - complex, figure out later)
  - Real-time linking for obvious matches (exact username or high-confidence matches)
  - Periodic batch processing for fuzzy/marginal matches
  - Matching thresholds configurable

---

### Chat Message (Platform + Adapter)

```typescript
/**
 * Twitch chat message
 * Field mappings from @docs/research/API-RESEARCH.md lines 272-375
 */
interface TwitchChatMessage {
  platform: Platform.Twitch;
  messageId: string;             // Message ID
  userId: string;                // User ID
  username: string;              // Username
  displayName: string | null;    // Display name
  color: string | null;           // Username color (hex)
  message: string;               // Message content
  timestamp: Date;               // Message timestamp
  roomId: string;                // Channel ID
  badges: Badge[];               // User badges
  emotes: Emote[];               // Emotes in message
  bits?: number;                 // Bits amount (if cheer message)
  replyParent?: ReplyParent;     // Reply parent info
}

/**
 * Kick chat message
 * Field mappings from @docs/research/API-RESEARCH.md lines 775-863
 */
interface KickChatMessage {
  platform: Platform.Kick;
  messageId: string;
  userId: string;
  username: string;
  displayName: string | null;
  color: string | null;
  message: string;
  timestamp: Date;
  roomId: string;
  badges: Badge[];
  emotes: Emote[];
}

/**
 * YouTube chat message
 * Field mappings from @docs/research/API-RESEARCH.md lines 1220-1360
 */
interface YouTubeChatMessage {
  platform: Platform.YouTube;
  messageId: string;
  channelId: string;             // Author channel ID
  displayName: string;           // Author display name
  profileImageUrl: string | null;// Author profile image
  message: string;               // Message content
  timestamp: Date;
  liveChatId: string;            // Live chat ID
  badges: Badge[];               // Inferred from authorDetails flags
  superChatDetails?: SuperChatDetails;  // Super Chat info
}

type PlatformChatMessage = TwitchChatMessage | KickChatMessage | YouTubeChatMessage;

/**
 * Chat message adapter interface
 */
interface ChatMessageAdapter {
  getPlatform(): Platform;
  getId(): string;
  getUserId(): string;
  getUsername(): string;
  getDisplayName(): string;
  getColor(): string | null;
  getMessage(): string;
  getTimestamp(): Date;
  getRoomId(): string;
  getBadges(): Badge[];
  getEmotes(): Emote[];
  hasReplyParent(): boolean;
  getFeature(feature: 'bits' | 'superChat' | 'tip'): FeatureData | null;
  toStorage(): object;
}
```

---

### Event (Platform + Adapter)

```typescript
interface TwitchEvent {
  platform: Platform.Twitch;
  eventId: string;
  type: TwitchEventType;
  timestamp: Date;
  userId: string;
  username: string;
  displayName: string | null;
  channelId: string;
  data: TwitchEventData;
}

interface KickEvent {
  platform: Platform.Kick;
  eventId: string;
  type: KickEventType;
  timestamp: Date;
  userId: string;
  username: string;
  displayName: string | null;
  channelId: string;
  data: KickEventData;
}

interface YouTubeEvent {
  platform: Platform.YouTube;
  eventId: string;
  type: YouTubeEventType;
  timestamp: Date;
  channelId: string;
  channelTitle: string;
  data: YouTubeEventData;
}

type PlatformEvent = TwitchEvent | KickEvent | YouTubeEvent;

interface EventAdapter {
  getPlatform(): Platform;
  getId(): string;
  getType(): EventType;
  getTimestamp(): Date;
  getUserId(): string | null;
  getUsername(): string | null;
  getDisplayName(): string | null;
  getData(): EventData;
  toStorage(): object;
}

type EventType =
  | 'follow'
  | 'subscription'
  | 'resubscribe'
  | 'subscription_gift'
  | 'cheer'
  | 'tip'
  | 'raid'
  | 'point_redemption'
  | 'super_chat'
  | 'super_sticker'
  | 'membership';
```

---

### Badge and Emote

```typescript
/**
 * Chat badge
 */
interface Badge {
  id: string;                    // Badge ID
  name: string;                  // Badge name (e.g., 'moderator', 'subscriber')
  url: string | null;            // Badge image URL
  type: BadgeType;               // Badge type
  version?: string;              // Badge version (Twitch sub months)
}

/**
 * Badge types
 */
type BadgeType =
  | 'global'
  | 'channel'
  | 'subscription'
  | 'moderator'
  | 'vip'
  | 'owner'
  | 'bits'
  | 'other';

/**
 * Chat emote
 */
interface Emote {
  id: string;                    // Emote ID
  name: string;                  // Emote text/name (e.g., 'Kappa')
  url: string | null;            // Emote image URL
  positions: [number, number][]; // Character positions in message [start, end]
  type?: EmoteType;              // Emote type
}

/**
 * Emote types
 */
type EmoteType =
  | 'twitch'
  | 'kick'
  | 'youtube'
  | 'bttv'
  | 'ffz'
  | '7tv'
  | 'custom';
```

---

## OBS WebSocket Integration

### ObsWebSocketClient (Layer 1: Minimal Wrapper)

Thin wrapper around WebSocket connection.

```typescript
/**
 * OBS WebSocket client - minimal wrapper
 * Provides connection, auth, and basic request/event handling
 * @docs/research/obs-websocket-protocol.md
 */
interface ObsWebSocketClient {
  connect(url: string, password?: string): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Event handlers
  on(event: 'connected', handler: () => void): void;
  on(event: 'disconnected', handler: () => void): void;
  on(event: 'error', handler: (error: Error) => void): void;
  on(event: 'StreamStateChanged', handler: (event: ObsStreamStateChangedEvent) => void): void;

  // Requests
  send(request: ObsRequest): Promise<ObsResponse>;
  getStreamStatus(): Promise<ObsStreamStatus>;
  startStream(options?: ObsStreamOptions): Promise<void>;
  stopStream(): Promise<void>;
  toggleStream(): Promise<boolean>;
}

interface ObsStreamStateChangedEvent {
  outputActive: boolean;
  outputState: ObsOutputState;
}

type ObsOutputState =
  | 'OBS_WEBSOCKET_OUTPUT_UNKNOWN'
  | 'OBS_WEBSOCKET_OUTPUT_STARTING'
  | 'OBS_WEBSOCKET_OUTPUT_STARTED'
  | 'OBS_WEBSOCKET_OUTPUT_STOPPING'
  | 'OBS_WEBSOCKET_OUTPUT_STOPPED'
  | 'OBS_WEBSOCKET_OUTPUT_RECONNECTING'
  | 'OBS_WEBSOCKET_OUTPUT_RECONNECTED'
  | 'OBS_WEBSOCKET_OUTPUT_PAUSED'
  | 'OBS_WEBSOCKET_OUTPUT_RESUMED';

interface ObsStreamStatus {
  outputActive: boolean;
  outputReconnecting: boolean;
  outputTimecode: string;
  outputDuration: number;        // milliseconds
  outputCongestion: number;      // 0-1
  outputBytes: number;
  outputSkippedFrames: number;
  outputTotalFrames: number;
}
```

### ObsStreamDetector (Layer 2: Service Layer)

Full service layer with state machine for stream lifecycle detection.

```typescript
/**
 * OBS stream detector - service layer
 * Manages stream lifecycle state and emits callbacks
 */
interface ObsStreamDetector {
  connect(url: string, password?: string): Promise<void>;
  disconnect(): Promise<void>;

  onStreamStart(startTime: Date): void;
  onStreamStop(endTime: Date): void;
  onStreamReconnecting(): void;
  onStreamReconnected(): void;

  getStatus(): {
    isStreaming: boolean;
    state: StreamState;
    startTime: Date | null;
    endTime: Date | null;
  };
}

type StreamState = 'offline' | 'starting' | 'live' | 'stopping' | 'reconnecting';

type StreamDetectorCallbacks = {
  onStreamStart?: (startTime: Date) => void;
  onStreamStop?: (endTime: Date) => void;
  onStreamReconnecting?: () => void;
  onStreamReconnected?: () => void;
};
```

### OBS WebSocket Implementation Details

**Connection Flow** (from @docs/research/obs-websocket-protocol.md):

1. Connect to `ws://localhost:4455` (default port)
2. Receive `Hello` message with auth challenge (if password required)
3. Generate auth string: SHA256(password + salt) → base64 → SHA256(base64 + challenge) → base64
4. Send `Identify` with auth string and `eventSubscriptions: 64` (Outputs only)
5. Receive `Identified` → ready for events/requests
6. Poll `GetStreamStatus` for initial state
7. Receive `StreamStateChanged` events for state changes

**Stream is LIVE when**: `outputActive: true AND outputState: 'OBS_WEBSOCKET_OUTPUT_STARTED'`

**Stream is OFFLINE when**: `outputActive: false AND outputState: 'OBS_WEBSOCKET_OUTPUT_STOPPED'`

**Handle intermediate states**: `STARTING`, `STOPPING`, `RECONNECTING` (treat `RECONNECTING` as warning, not offline)

---

## Category Cache (Dependency Injection)

```typescript
/**
 * Category cache interface
 * Resolves category IDs to names with caching
 */
interface CategoryCache {
  getCategory(categoryId: string, platform: Platform): Promise<string>;
  clear(): void;
}

/**
 * In-memory category cache implementation
 */
class InMemoryCategoryCache implements CategoryCache {
  private cache: Map<string, { name: string; timestamp: number }>;
  private ttl: number;  // milliseconds

  async getCategory(categoryId: string, platform: Platform): Promise<string> {
    const key = `${platform}:${categoryId}`;
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.name;
    }

    const name = await this.fetchCategoryName(categoryId, platform);
    this.cache.set(key, { name, timestamp: Date.now() });
    return name;
  }

  private async fetchCategoryName(categoryId: string, platform: Platform): Promise<string> {
    switch (platform) {
      case Platform.Twitch: return fetchTwitchCategory(categoryId);
      case Platform.Kick: return fetchKickCategory(categoryId);
      case Platform.YouTube: return fetchYouTubeCategory(categoryId);
    }
  }
}
```

---

## Stream Matcher (Late Data Reconstruction)

```typescript
/**
 * Stream matcher for late data reconstruction
 * Matches streams across platforms by timestamp and user ID
 */
interface StreamMatcher {
  matchStreams(
    platformA: PlatformStream[],
    platformB: PlatformStream[],
    platformC: PlatformStream[],
    userId: string
  ): Stream[];

  fetchPastStreamsByDateRange(
    platform: Platform,
    startDate: Date,
    endDate: Date,
    userId: string
  ): Promise<PlatformStream[]>;
}
```

**Matching Rules**:
- Time window: +/- 10 minutes of overlap
- Must match user ID (same streamer)
- Group streams that overlap in time into same Stream object
- Assign new UUID commonId when matching historical streams
- OBS timestamps take priority as source of truth for Stream.obsStartTime/obsEndTime

**Use Case**: User clicks "Fetch past streams" button in UI with date range → API fetch → match streams → assign commonId → store in DB

---

## User Matcher (Cross-Platform Linking)

```typescript
/**
 * User matcher for cross-platform linking
 * Links same person across multiple platforms
 */
interface UserMatcher {
  realTimeMatch(platformUsers: PlatformUser[]): User[];  // For obvious matches during chat processing
  batchMatch(allUsers: PlatformUser[]): Promise<User[]>; // For fuzzy matches in background job
}
```

**Note**: Cross-platform user matching is complex and will be designed later. This is a placeholder framework.

---

## WebSocket Messages

```typescript
interface StreamUpdateMessage {
  type: 'stream_update';
  stream: StreamAdapter;  // or serialized JSON
  timestamp: Date;
}

interface StatsUpdateMessage {
  type: 'stats_update';
  streamId: string;
  stats: StreamStats;
  timestamp: Date;
}

interface ViewerCountMessage {
  type: 'viewer_update';
  streamId: string;
  viewerCount: number;
  timestamp: Date;
}
```

---

## Database Schema (Normalized Separate Tables)

```sql
-- Multi-stream sessions (OBS-driven)
CREATE TABLE multi_streams (
  common_id TEXT PRIMARY KEY,
  obs_start_time TEXT NOT NULL,
  obs_end_time TEXT NULL,
  created_at TEXT NOT NULL
);

-- Platform-specific streams (raw storage)
CREATE TABLE platform_streams (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  raw_stream_id TEXT NOT NULL,
  raw_data TEXT NOT NULL,  -- Serialized PlatformStream type
  common_id TEXT NOT NULL,
  FOREIGN KEY (common_id) REFERENCES multi_streams(common_id)
);

CREATE INDEX idx_platform_streams_common_id ON platform_streams(common_id);
CREATE INDEX idx_multi_streams_obs_start_time ON multi_streams(obs_start_time);

-- Cross-platform users
CREATE TABLE users (
  common_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Platform-specific user data (raw storage)
CREATE TABLE platform_users (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  raw_user_id TEXT NOT NULL,
  raw_data TEXT NOT NULL,  -- Serialized PlatformUser type
  common_id TEXT NOT NULL,
  FOREIGN KEY (common_id) REFERENCES users(common_id)
);

CREATE INDEX idx_platform_users_common_id ON platform_users(common_id);
CREATE INDEX idx_platform_users_raw_user_id ON platform_users(raw_user_id);

-- Stream stats (live data)
CREATE TABLE stream_stats (
  id TEXT PRIMARY KEY,
  stream_id TEXT NOT NULL,  -- from adapter.getId()
  viewer_count INTEGER NOT NULL,
  follower_count INTEGER NOT NULL,
  subscriber_count INTEGER NULL,
  uptime INTEGER NULL,
  timestamp TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%s', 'now') || '000000')
);

CREATE INDEX idx_stream_stats_stream_id ON stream_stats(stream_id);
CREATE INDEX idx_stream_stats_timestamp ON stream_stats(timestamp DESC);
```

---

## Implementation Phases Overview

| Phase | Description | Estimated Hours |
|-------|-------------|-----------------|
| 1 | Module Structure Setup | 2-3 |
| 2 | Platform-Specific Base Types | 8-10 |
| 3 | Live Data Types (StreamStats) | 1-2 |
| 4 | Converter Layer | 8-12 |
| 5 | Adapter Interfaces | 3-4 |
| 6 | Adapter Implementations | 12-15 |
| 7 | Translator Layer | 6-8 |
| 8 | Category Cache Implementation | 3-4 |
| 9 | Stream Matcher Implementation | 6-8 |
| 10 | User Matcher Implementation | 4-6 |
| 11 | OBS WebSocket Integration | 10-12 |
| 12 | Integration Tests | 8-10 |
| 13 | Documentation | 4-6 |
| **Total** | | **85-105 hours** |

---

## Success Criteria

- [ ] All platform-specific base types defined with disciplined structure (NO optional field soup)
- [ ] Adapter/translator layer hides platform complexity fully
- [ ] Downstream code NEVER switches on platform
- [ ] Stream and User wrapper types work for single and multi-platform scenarios
- [ ] Stream matching successfully matches historical streams (+/- 10min window)
- [ ] OBS WebSocket integration correctly detects stream lifecycle
- [ ] Category cache resolves category IDs to names with caching
- [ ] 100% test coverage for validators
- [ ] 95%+ test coverage for adapters/translators/matchers
- [ ] Normalized database schema implemented
- [ ] Complete documentation with field mapping references
- [ ] No TypeScript errors in shared models package

---

## Dependencies

### Runtime Dependencies
- TypeScript 5.0+ (strict mode)
- WebSocket (ws) library for OBS WebSocket client
- uuid (or crypto.randomUUID()) for UUID generation

### Dev Dependencies
- Vitest (testing framework)
- @vitest/coverage-v8 (code coverage)

### Workspace Dependencies
- None (shared types, consumed by other packages)

---

## Dependencies on Other Features

**Prerequisite for:**
- Twitch platform strategy
- Kick platform strategy
- YouTube platform strategy
- OBS WebSocket integration (service layer)
- WebSocket Broadcasting feature
- Analytics Data Collection feature

**Follows:**
- Daemon Server Core (@docs/archive/feature-plans/daemon-server-core.md) - provides monorepo structure
- OAuth Flow & Keystore (@docs/archive/feature-plans/oauth-flow-keystore.md) - provides token management

---

## Non-Goals (Out of Scope)

- OBS integration beyond WebSocket client (service layer in server-daemon)
- Database migrations (deferred to server-db schema management)
- Complex cross-platform user matching algorithms (deferred, placeholder framework only)
- Real-time analytics (deferred to analytics feature)
- WebSocket broadcasting (deferred to dedicated feature)

---

## Risks and Mitigations

### Risk 1: Cross-platform user matching is complex and error-prone
**Level**: 🟡 Medium
**Mitigation**: Placeholder framework now; algorithm designed later with iterative testing; configurable thresholds; manual override capability

### Risk 2: OBS WebSocket may disconnect during stream
**Level**: 🟡 Medium
**Mitigation**: Implement reconnection logic; maintain state machine; poll GetStreamStatus on reconnect; treat RECONNECTING state as warning not offline

### Risk 3: Stream matching may incorrectly group different streams
**Level**: 🟢 Low
**Mitigation**: Require both timestamp overlap AND user ID match; short +/- 10min window; allow manual ungrouping in UI; store match confidence score

### Risk 4: Category cache may become stale if platform APIs change
**Level**: 🟢 Low
**Mitigation**: Configurable TTL; fallback to direct API fetch on cache miss; clear cache on error; monitor cache hit rate

### Risk 5: Adapter layer adds performance overhead
**Level**: 🟢 Low
**Mitigation**: Minimal overhead (switch statements only); adapters cache normalized category names; consider inline optimization for hot paths

---

## Testing Strategy

### Unit Tests
- **Coverage Target**: 100% for validators, 95%+ for adapters/translators/matchers
- **Platform Types**: Verify all fields present with correct types
- **Adapters**: Test dynamic feature access by platform
- **Translators**: Test all platform type conversions
- **Matchers**: Test stream matching with overlapping/non-overlapping timestamps
- **OBS Client**: Mock WebSocket for connection/auth/event handling
- **Category Cache**: Test cache hits, misses, TTL expiration

### Integration Tests
- Multi-platform adapter usage
- Stream matcher with mixed platform data
- OBS WebSocket client with state machine
- End-to-end stream lifecycle (start → stats updates → stop)

### Data Validation Tests
- Use actual API response samples from research docs:
  - Twitch streams response (API-RESEARCH.md lines 72-100)
  - Kick webhook payloads
  - YouTube live chat messages (lines 1220-1360)

---

## Migration Path

- No migration needed (new code)
- Future platform strategies will import and use these types
- OBS service in server-daemon will use ObsWebSocketClient
- Analytics service will use StreamStats for live data storage

---

## Documentation Updates

After implementation:
- [ ] Update PLAN.md with this plan's completion status
- [ ] Create docs/architecture/shared-data-models.md
- [ ] Create docs/architecture/adapter-pattern.md
- [ ] Update docs/architecture/platform-strategy-pattern.md to reference shared models
- [ ] Update AGENTS.md with shared/models/ structure
- [ ] Create shared/models/README.md
- [ ] Add quick start examples for adapter usage
- [ ] Document stream matching rules and use cases

---

## Platform Field Mapping Quick Reference

### Stream Fields Across Platforms

| Field | Twitch | Kick | YouTube | Source |
|-------|--------|------|---------|--------|
| id | twitchId | kickId | videoId | API-RESEARCH.md lines 52-100, 706-738, 889-1015 |
| username | username | username | channelTitle | API-RESEARCH.md |
| title | title | title | title | API-RESEARCH.md |
| category | categoryId | categorySlug | categoryId | API-RESEARCH.md |
| tags | tags | tags | tags | API-RESEARCH.md |
| thumbnail | thumbnailUrl | thumbnailUrl | thumbnailUrl | API-RESEARCH.md |

### Chat Message Fields Across Platforms

| Field | Twitch | Kick | YouTube | Source |
|-------|--------|------|---------|--------|
| id | messageId | messageId | messageId | API-RESEARCH.md lines 272-375, 775-863, 1220-1360 |
| userId | userId | userId | channelId | API-RESEARCH.md |
| message | message | content | textMessageDetails.messageText | API-RESEARCH.md |
| timestamp | timestamp | timestamp | publishedAt | API-RESEARCH.md |
| badges | badges | sender.identity.badges | inferred from flags | API-RESEARCH.md |
| emotes | emotes | emotes | stickers/emojis | API-RESEARCH.md |

### OBS Stream State Mapping

| Output State | Stream Status | Action |
|--------------|---------------|--------|
| OBS_WEBSOCKET_OUTPUT_STARTED | LIVE | Trigger onStreamStart |
| OBS_WEBSOCKET_OUTPUT_STOPPED | OFFLINE | Trigger onStreamStop |
| OBS_WEBSOCKET_OUTPUT_STARTING | STARTING | Wait, no action |
| OBS_WEBSOCKET_OUTPUT_STOPPING | STOPPING | Wait, no action |
| OBS_WEBSOCKET_OUTPUT_RECONNECTING | WARN | Trigger onStreamReconnecting |
| OBS_WEBSOCKET_OUTPUT_RECONNECTED | LIVE | Trigger onStreamReconnected |

---

## Summary

This feature creates the foundational data types and adapter/translation layer required by all platform strategies, providing:

1. Disciplined platform-specific types (NO optional field soup)
2. Adapter/translator layer hiding platform complexity from downstream code
3. Separated static metadata vs live data (Stream vs StreamStats)
4. Unified Stream and User wrappers for cross-platform scenarios
5. OBS-driven stream lifecycle via WebSocket integration
6. Stream matching for late data reconstruction (+/- 10min window)
7. Category cache with dependency injection
8. Normalized database schema (separate multi_streams and platform_streams tables)

---

**Status**: Planning Complete - Ready for Implementation
**Estimated Total Effort**: 85-105 hours
**Dependencies**: Daemon Server Core (complete), OAuth Flow (complete)
**Implementation Phases**: 13 phases (see Implementation Phases Overview above)
