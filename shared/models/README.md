# @streaming-enhancement/shared-models

Unified, platform-agnostic data types for streaming data across Twitch, Kick, and YouTube.

## Overview

This package provides the core data modeling layer for the Streaming Enhancement Sweet v3 project:

- Platform-specific types (TwitchStream, KickStream, YouTubeStream, etc.)
- Adapter interfaces and implementations (StreamAdapter, UserAdapter, ChatMessageAdapter, etc.)
- Translator factory functions for creating adapters
- Stream matching logic for historical data reconstruction
- OBS WebSocket integration (ObsWebSocketClient, ObsStreamDetector)

## Installation

```bash
pnpm install
```

For use in other packages (workspace):

```json
{
  "dependencies": {
    "@streaming-enhancement/shared-models": "workspace:*"
  }
}
```

## Quick Start

### Using Adapters

```typescript
import { createStreamAdapter } from '@streaming-enhancement/shared-models';
import { TwitchConverter } from '@streaming-enhancement/shared-models';

// Convert API response to platform type
const apiResponse = await twitchApi.getStreams(userId);
const twitchStream = TwitchConverter.convertFromAPI(apiResponse);

// Create adapter (platform-agnostic access)
const adapter = createStreamAdapter(twitchStream);

// Use adapter (same API for all platforms)
console.log(adapter.getTitle());
console.log(await adapter.getCategory());

// Platform-specific features
if (adapter.hasFeature('twitchChannelPoints')) {
  const points = adapter.getFeature('twitchChannelPoints');
  console.log(`Channel points: ${points?.current}`);
}
```

### Stream Matching

```typescript
import { createStreamMatcher } from '@streaming-enhancement/shared-models';

// Match historical streams by overlap percentage
const matcher = createStreamMatcher(0.85);
const sessions = await matcher.matchAllPlatformStreams(
  streamService,
  twitchHistory,
  kickHistory,
  youtubeHistory
);

// Process matched sessions
for (const session of sessions) {
  console.log(`Session: ${session.getCommonId()}`);
  console.log(`  OBS Start: ${session.getObsStartTime()}`);

  const platforms = await session.getPlatforms();
  for (const [platform, adapter] of platforms) {
    console.log(`  ${platform}: ${adapter.getTitle()}`);
  }
}
```

### OBS Integration

```typescript
import { ObsWebSocketClient, ObsStreamDetector } from '@streaming-enhancement/shared-models';

const client = new ObsWebSocketClient();
const detector = new ObsStreamDetector(client, streamService, {
  onStreamStart: async (startTime) => {
    console.log('Stream started!', startTime);
  },
  onStreamStop: async (endTime) => {
    console.log('Stream stopped!', endTime);
  }
});

await client.connect('ws://localhost:4455', 'password');
```

## API Reference

### Types

#### Platform Stream Types
- `TwitchStream` - Twitch live stream data
- `KickStream` - Kick live stream data
- `YouTubeStream` - YouTube live stream data
- `PlatformStream` - Union type of all platform streams

#### Platform User Types
- `TwitchUser` - Twitch user account data
- `KickUser` - Kick user account data
- `YouTubeUser` - YouTube channel/user data

#### Unified Stream Types
- `Stream` - Multi-platform stream session with lazy loading
- `StreamData` - Database DTO for Stream
- `PlatformStreamRecord` - Database record for platform stream data

### Interfaces

#### StreamService
Interface for database operations on Stream objects:

```typescript
interface StreamService {
  createStream(commonId: string, obsStartTime: Date): Promise<void>;
  getStream(commonId: string): Promise<Stream | null>;
  getOrCreateStream(commonId: string, obsStartTime: Date): Promise<Stream>;
  updateStreamEnd(commonId: string, obsEndTime: Date): Promise<void>;
  deleteStream(commonId: string): Promise<void>;
  createPlatformStream(commonId: string, platformStream: PlatformStream): Promise<PlatformStreamRecord>;
  getPlatformStreams(commonId: string): Promise<PlatformStreamRecord[]>;
  removePlatformFromStream(commonId: string, platform: Platform): Promise<void>;
  getStreamWithPlatforms(commonId: string): Promise<Stream>;
}
```

#### ObsWebSocketClient
Thin wrapper around WebSocket for OBS connection:

```typescript
interface ObsWebSocketClient {
  connect(url: string, password?: string): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  on(event: string, handler: Function): void;
  send(request: ObsRequestMessage): Promise<ObsResponseMessage>;
  getStreamStatus(): Promise<ObsStreamStatus>;
}
```

### Adapters

#### StreamAdapter
Unified interface for accessing stream data across platforms:

```typescript
interface StreamAdapter {
  getPlatform(): 'twitch' | 'kick' | 'youtube';
  getId(): string;
  getTitle(): string;
  getCategory(): Promise<string>;
  getThumbnail(): string | null;
  getTags(): string[];
  hasFeature(feature: string): boolean;
  getFeature(feature: string): FeatureData | null;
  toStorage(): object;
}
```

#### UserAdapter
Unified interface for accessing user data across platforms:

```typescript
interface UserAdapter {
  getPlatform(): 'twitch' | 'kick' | 'youtube';
  getId(): string;
  getUsername(): string;
  getDisplayName(): string;
  getAvatar(): string | null;
  getBio(): string | null;
  getCreatedAt(): Date | null;
  hasFeature(feature: string): boolean;
  getFeature(feature: string): FeatureData | null;
  toStorage(): object;
}
```

#### ChatMessageAdapter
Unified interface for accessing chat message data across platforms:

```typescript
interface ChatMessageAdapter {
  getPlatform(): 'twitch' | 'kick' | 'youtube';
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
  getFeature(feature: string): FeatureData | null;
  toStorage(): object;
}
```

#### EventAdapter
Unified interface for accessing event data across platforms:

```typescript
interface EventAdapter {
  getPlatform(): 'twitch' | 'kick' | 'youtube';
  getEventId(): string;
  getType(): EventType;
  getTimestamp(): Date;
  getUserId(): string;
  getUsername(): string;
  getDisplayName(): string;
  getChannelId(): string;
  getData(): Record<string, unknown>;
  getFeature(feature: string): FeatureData | null;
  toStorage(): object;
}
```

### Translators

Factory functions for creating adapters:

- `createStreamAdapter(platformStream, cache?)` - Create stream adapter
- `createUserAdapter(platformUser)` - Create user adapter
- `createChatMessageAdapter(platformChatMessage)` - Create chat message adapter
- `createEventAdapter(platformEvent)` - Create event adapter

### Matchers

- `createStreamMatcher(thresholdPercent?)` - Create stream matcher instance

#### Stream Matcher API

```typescript
interface StreamMatcher {
  matchAllPlatformStreams(
    streamService: StreamService,
    twitchStreams: PlatformStream[],
    kickStreams: PlatformStream[],
    youtubeStreams: PlatformStream[]
  ): Promise<Stream[]>;

  matchNewPlatformStreams(
    streamService: StreamService,
    existingStreams: Stream[],
    newPlatformStreams: PlatformStream[]
  ): Promise<{
    addedToExisting: Map<string, PlatformStreamRecord[]>;
    newStreams: Stream[];
  }>;

  splitStream(
    streamService: StreamService,
    stream: Stream
  ): Promise<Stream[]>;

  calculateOverlapPercent(streamA: DateRange, streamB: DateRange): number;
}
```

### OBS WebSocket

- `ObsWebSocketClient` - WebSocket client for OBS
- `ObsStreamDetector` - Stream lifecycle detector with state machine

## Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run integration tests only
pnpm test -- --run integration
```

## Architecture

For detailed architecture documentation, see:
- `docs/architecture/shared-data-models.md` - Architecture overview
- `docs/architecture/adapter-pattern.md` - Adapter pattern details
- `docs/architecture/obs-websocket-integration.md` - OBS WebSocket details

## Field Mapping

For API field mappings to platform types, see:
- `docs/architecture/stream-field-mapping.md` - Stream field mappings
- `docs/research/API-RESEARCH.md` - Complete API field documentation

## Notes

- All code is in TypeScript (strict mode)
- Test coverage: 95%+ (221 tests)
- Zero external runtime dependencies (only `uuid` and `ws` as transitive dependencies)
- No emojis in log messages

## License

MIT
