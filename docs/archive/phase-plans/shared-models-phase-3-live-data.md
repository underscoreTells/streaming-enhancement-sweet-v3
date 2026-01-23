# Phase 3: Live Data Types - ARCHIVED ✅

**Status**: Complete ✅
**Completion Date**: During initial phases 1-6 batch

## Overview
Define StreamStats interface for live/dynamic stream data (viewer count, follower count, uptime) sent separately from static stream metadata.

---

## Completed Tasks

### Task 1: Created StreamStats interface
```typescript
export interface StreamStats {
  streamId: string;              // From adapter.getId()
  viewerCount: number;           // Current viewer count
  followerCount: number;         // Follower count
  subscriberCount: number | null;// YouTube subscriber count (null on other platforms)
  uptime: number | null;         // Seconds since stream started
  timestamp: Date;               // When stats were captured
}
```

### Task 2: Updated Stream.ts exports
```typescript
export interface TwitchStream { /* no viewerCount */ }
export interface KickStream { /* no viewerCount */ }
export interface YouTubeStream { /* no viewerCount */ }

// StreamStats exported separately in StreamStats.ts
```

### Task 3: Created validator for StreamStats
```typescript
export function validateStreamStats(stats: unknown): stats is StreamStats {
  return (
    typeof stats === 'object' &&
    stats !== null &&
    'streamId' in stats && typeof stats.streamId === 'string' &&
    'viewerCount' in stats && typeof stats.viewerCount === 'number' &&
    'followerCount' in stats && typeof stats.followerCount === 'number' &&
    'subscriberCount' in stats && (stats.subscriberCount === null || typeof stats.subscriberCount === 'number') &&
    'uptime' in stats && (stats.uptime === null || typeof stats.uptime === 'number') &&
    'timestamp' in stats && stats.timestamp instanceof Date
  );
}
```

### Task 4: Created helper functions
```typescript
export function createStreamStats(
  streamId: string,
  viewerCount: number,
  followerCount: number,
  subscriberCount: number | null,
  uptime: number | null,
  timestamp: Date = new Date()
): StreamStats;

export function isYouTubeStats(stats: StreamStats): boolean {
  return stats.subscriberCount !== null;
}
```

---

## Files Created
- `shared/models/src/StreamStats.ts`
- `shared/models/__tests__/StreamStats.test.ts`

---

## Tests Written
- StreamStats creation and validation (12 tests)
- Platform-specific stats detection (3 tests)
- Edge cases: null values, invalid types (5 tests)

---

## Notes

### Separation of Static and Live Data

**Why Not Include viewerCount in Stream?**
Problem:
```typescript
interface Stream {
  viewerCount: number;  // Changes every second
  followerCount: number;  // Changes frequently
}
```

Solution:
```typescript
interface Stream {
  // Static metadata only (title, category, etc.)
  // Changes rarely (maybe every few minutes)
}

interface StreamStats {
  viewerCount: number;  // Sent every 1-5 seconds via WebSocket
  followerCount: number;  // Sent every 1-5 seconds
  timestamp: Date;  // For time-series analytics
}
```

### Use Cases

**Initial Stream Creation**:
```typescript
// Static metadata (from API)
const stream: Stream = {
  title: 'Test Stream',
  category: 'Just Chatting',
  // ... other static fields
};

// Live stats (polled every few seconds)
const stats: StreamStats = {
  streamId: stream.id,
  viewerCount: 150,
  followerCount: 1000,
  subscriberCount: null,
  uptime: 3600,
  timestamp: new Date()
};
```

**Storage in Database**:
- Platform streams table: Store static metadata once
- Stream stats table: Append new stats row every 1-5 seconds

### Why subscriberCount is null on non-YouTube platforms
- Twitch/Kick APIs provide viewer count and follower count
- YouTube API provides subscriber count (channel metric)
- Other platforms don't have an equivalent, so nullable

---

## Files Modified
- `shared/models/src/index.ts` (added StreamStats export)

---

## Acceptance Criteria Met
- ✅ StreamStats interface defined correctly
- ✅ Validator works for all field types
- ✅ Helper functions create valid StreamStats
- ✅ TypeScript compilation succeeds
- ✅ All unit tests pass (20 tests)

---

## Integration with Other Phases
- **Phase 2**: Complements PlatformStream types (static data)
- **Phase 6**: StreamAdapter won't include StreamStats (sent separately)
- **Platform strategies**: Will poll APIs for stats and send via WebSocket
- **Analytics feature**: Will use StreamStats for time-series charts
