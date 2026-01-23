# Shared Data Models Architecture

## Overview

The Shared Data Models feature provides unified, platform-agnostic data types for streaming data across Twitch, Kick, and YouTube. It enables platform strategies to translate platform-specific API responses into normalized adapters that hide platform complexity from downstream code.

## Type System

### Layer 1: Platform-Specific Base Types
Raw types matching platform API structures:
- `TwitchStream`, `KickStream`, `YouTubeStream`
- `TwitchUser`, `KickUser`, `YouTubeUser`
- `TwitchChatMessage`, `KickChatMessage`, `YouTubeChatMessage`
- `TwitchEvent`, `KickEvent`, `YouTubeEvent`

**Design Principle**: Disciplined, NO optional field soup

### Layer 2: Adapters (Translation Layer)
Interfaces that normalize platform data:
- `StreamAdapter`, `UserAdapter`, `ChatMessageAdapter`, `EventAdapter`
- Methods: `getPlatform()`, `getId()`, `getTitle()`, `getCategory()`, etc.

**Benefits**: Downstream code NEVER switches on platform

### Layer 3: Unified Wrappers
Cross-platform session grouping:
- `Stream`: Multi-stream session with `commonId`, `obsStartTime`, `streams: Map<Platform, StreamAdapter>`
- `PlatformStreamRecord`: Database storage for platform stream data
- `StreamService`: Interface for database operations

### Layer 4: Matchers and Integrations
- `StreamMatcher`: Groups historical streams by overlap percentage (85-90% threshold)
- `ObsWebSocketClient`: Thin wrapper around ws library for OBS connection
- `ObsStreamDetector`: Service layer with state machine for stream lifecycle detection

## Key Innovations

### NO Optional Field Soup
**Problem**: Union types with optional fields are hard to use (`stream.twitchId | stream.kickId`)

**Solution**: Platform-specific subtypes + adapters that normalize access

**Result**: Type-safe, no `?? stream.twitchId` checks needed

### Adapter/Translator Pattern
- Platform-specific complexity hidden behind adapter methods
- Downstream code never knows which platform
- Easy to add new platforms (add platform type + adapter + translator)

### OBS-Driven Lifecycle
- `Stream.obsStartTime` from OBS WebSocket (source of truth)
- Platforms added as they come online via adapters
- Stream closed when OBS stops (not when all platforms stop)

### Stream Matching (Historical Data)
- Historical streams matched by 85-90% overlap percentage
- Groups multi-platform sessions into unified `Stream` objects
- Conservative matching: if unsure, create separate Streams
- Supports splitting: extract non-matching platforms into new Streams

## Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Platform Strategies                      │
│                  (server-daemon/platforms/)                 │
└───────────────────┬─────────────────────────────────────────┘
                    │ API Responses
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                       Converters                            │
│          TwitchConverter, KickConverter, YouTubeConverter     │
└───────────────────┬─────────────────────────────────────────┘
                    │ Platform Types
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                       Translators                           │
│          createStreamAdapter, createUserAdapter, etc.        │
└───────────────────┬─────────────────────────────────────────┘
                    │ Adapters
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                        Adapters                             │
│    StreamAdapter, UserAdapter, ChatMessageAdapter, etc.     │
└───────────────────┬─────────────────────────────────────────┘
                    │ Unified Interface
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                   Business Logic                            │
│   Matcher, OBS Integration, StreamService, etc.             │
└───────────────────┬─────────────────────────────────────────┘
```

## Flow Diagrams

### API Response → Adapter Usage

```typescript
// 1. Fetch from API
const apiResponse = await twitchApi.getStreams(userId);

// 2. Convert to platform type
const twitchStream = TwitchConverter.convertFromAPI(apiResponse);

// 3. Create adapter (hides platform complexity)
const adapter = createStreamAdapter(twitchStream);

// 4. Use adapter (platform-agnostic)
console.log(adapter.getTitle());
console.log(await adapter.getCategory());

// 5. Access platform-specific features
if (adapter.hasFeature('twitchChannelPoints')) {
  const points = adapter.getFeature('twitchChannelPoints');
  console.log(`Channel points: ${points?.current}`);
}
```

### Historical Stream Matching

```typescript
// 1. Fetch historical streams from all platforms
const twitchHistory = await twitchApi.getPastStreams(userId);
const kickHistory = await kickApi.getPastStreams(userId);
const youtubeHistory = await youtubeApi.getPastStreams(userId);

// 2. Match streams by overlap percentage
const matcher = createStreamMatcher(0.85);
const sessions = await matcher.matchAllPlatformStreams(
  streamService,
  twitchHistory,
  kickHistory,
  youtubeHistory
);

// 3. Process unified Stream objects
for (const session of sessions) {
  console.log(`Session: ${session.getCommonId()}`);
  console.log(`  OBS Start: ${session.getObsStartTime()}`);
  
  const platforms = await session.getPlatforms();
  for (const [platform, adapter] of platforms) {
    console.log(`  ${platform}: ${adapter.getTitle()}`);
  }
}
```

### OBS Stream Lifecycle

```typescript
const client = new ObsWebSocketClient();
const detector = new ObsStreamDetector(client, streamService, {
  onStreamStart: async (startTime) => {
    // CreateStream called by detector
    console.log('Stream started!', startTime);
  },
  onStreamStop: async (endTime) => {
    // updateStreamEnd called by detector
    console.log('Stream stopped!', endTime);
  }
});

await client.connect('ws://localhost:4455', 'password');

// State transitions: offline → starting → live → stopping → offline
// With reconnecting: offline → ... → live → reconnecting → live
```

## Design Decisions

### Why Separate StreamService Interface?

**Decision**: Created `StreamService` interface for database operations instead of concrete implementation.

**Reasoning**:
- Separates concerns: matcher logic vs data persistence
- Enables different database implementations (SQLite, PostgreSQL, etc.)
- Allows mocking for tests
- Database schema implementation deferred to server-daemon

### Why 85-90% Overlap Threshold?

**Decision**: Conservative threshold for stream matching.

**Reasoning**:
- Original approach (10-min window) forced too many matches together
- 85-90% ensures streams truly belong together
- Example: 2-hour Twitch + 30-min Kick overlap → separate Streams (25%)
- Example: 2-hour Twitch + 1.9-hour Kick overlap → same Stream (90%)
- Ambiguous cases (<85%) create separate Streams (better than inaccurate matches)

### Why Lazy Loading for Stream Platforms?

**Decision**: `Stream.getPlatforms()` is async and caches results.

**Reasoning**:
- Not all operations need platform data
- Reduces memory overhead for large stream lists
- StreamService integration handles the loading
- Cache can be invalidated when platforms change

### Why Custom obs-websocket-js Replacement?

**Decision**: Created thin wrapper around `ws` library instead of using `obs-websocket-js`.

**Reasoning**:
- `obs-websocket-js`: Deprecated/unmaintained, large dependency footprint
- Custom wrapper: Lightweight (~180 lines), just what we need
- Type-safe: Full TypeScript control
- Extensible: Easy to add OBS protocol features as needed

## Trade-offs

### Performance vs Maintainability

**Choice**: Adapter pattern adds method call overhead (~1-2μs per call)

**Benefit**: Cleaner code, easier to extend, type-safe

**Impact**: Negligible for streaming use cases (not real-time critical path)

### Memory vs Convenience

**Choice**: Separate PlatformStreamRecord storage + lazy loading

**Benefit**: Reduced memory usage, flexible database schema

**Impact**: Slight complexity in lazy loading implementation

### Simplicity vs Accuracy (Stream Matching)

**Choice**: Conservatives 85-90% threshold over aggressive matching

**Benefit**: Fewer inaccurate groupings, easier manual correction

**Impact**: May create more Streams than necessary (user can merge manually in UI)

## Extensibility

### Adding a New Platform

1. Create platform-specific types (`MixerStream`, `MixerUser`, etc.)
2. Create converter (`MixerConverter`)
3. Create adapters (`MixerStreamAdapter`, `MixerUserAdapter`, etc.)
4. Add to translators (`createStreamAdapter()`, `createUserAdapter()`)
5. Add platform enum value
6. Update exports

### Adding a New Platform-Specific Feature

1. Add feature data to platform type
2. Implement `hasFeature()` in adapter
3. Implement `getFeature()` in adapter
4. Update FeatureData type if needed

### Adding New Event Types

1. Map platform event to unified event type in converter
2. Create platform-specific event adapter
3. Add to EventTranslator factory

## Integration Points

### Server-Daemon Integration

```typescript
// In platform strategy (e.g., TwitchStrategy)
class TwitchStrategy implements PlatformStrategy {
  async getStream(userId: string): Promise<StreamAdapter> {
    const apiResponse = await this.twitchApi.getStreams(userId);
    const stream = TwitchConverter.convertFromAPI(apiResponse);
    return createStreamAdapter(stream, this.categoryCache);
  }
}

// In StreamEventService
async handleOBSStreamStart(startTime: Date): Promise<void> {
  const commonId = this.generateCommonId();
  await this.streamService.createStream(commonId, startTime);
}
```

### Web UI Integration

```typescript
// Web UI uses adapters for display
function StreamCard({ stream }: { stream: Stream }) {
  const platforms = useStreamPlatforms(stream.getCommonId());

  return (
    <div>
      <h3>Stream Started: {stream.getObsStartTime()}</h3>
      {platforms.map(({ platform, adapter }) => (
        <div key={platform}>
          <h4>{adapter.getTitle()}</h4>
          <p>Category: {adapter.getCategory()}</p>
        </div>
      ))}
    </div>
  );
}
```

### CLI Integration

```typescript
// CLI uses StreamMatcher for historical data reconstruction
async function matchHistoricalData() {
  const matcher = createStreamMatcher(0.85);
  const sessions = await matcher.matchAllPlatformStreams(
    streamService,
    await twitchService.getPastStreams(),
    await kickService.getPastStreams(),
    await youtubeService.getPastStreams()
  );

  console.log(`Found ${sessions.length} sessions`);
}
```

## Notes

- All code is in TypeScript (strict mode)
- ESLint + Prettier for code formatting
- No emojis in log messages (see `AGENTS.md`)
- Test coverage: 95%+ (221 tests)
- External dependencies: `uuid`, `ws` (dev dep only)

## Related Documentation

- `docs/architecture/adapter-pattern.md` - Adapter pattern details
- `docs/architecture/obs-websocket-integration.md` - OBS WebSocket details
- `docs/architecture/stream-field-mapping.md` - Field mapping reference
- `docs/phase-plans/` - Detailed implementation plans
- `docs/research/API-RESEARCH.md` - API field documentation
