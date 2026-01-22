# Phase Plan: Shared Data Models - Phase 3 - Live Data Types (StreamStats)

## Phase Overview

**Phase:** 3 of 13
**Title:** Live Data Types (StreamStats)
**Estimated Time:** 1-2 hours
**Status:** Complete

## Objective

Create the `StreamStats` type for live/dynamic stream data that is sent separately from static stream metadata via WebSocket. This provides a clean separation between static metadata (streams) and live data (stats).

---

## Configuration

- **Files to create:** `StreamStats.ts`
- **Location:** `shared/models/src/`
- **Dependencies:** Phase 1 (Module Structure), Phase 2 (Platform-Specific Base Types) complete
- **Followed by:** Phase 4 (Converter Layer)

---

## Dependencies

**Before starting this phase, ensure:**
- ✅ Phase 1 complete (directory structure, package.json, build system)
- ✅ Phase 2 complete (Platform, Stream, User types)

**This phase has no dependencies on other Shared Data Models phases** - it adds a single new type.

---

## Tasks Breakdown

### Task 3.1: Create StreamStats.ts (30 minutes)

Create `shared/models/src/StreamStats.ts` with the StreamStats interface.

**Exact field specifications:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `streamId` | `string` | Yes | Platform-specific stream ID, links to stream via adapter.getId() |
| `viewerCount` | `number` | Yes | Current viewer count |
| `followerCount` | `number` | Yes | Total follower count (0 for YouTube) |
| `subscriberCount` | `number \| null` | No | YouTube subscriber count (null on Twitch/Kick) |
| `uptime` | `number \| null` | No | Stream uptime in seconds (null temporarily before calculated) |
| `timestamp` | `Date` | Yes | When stats were captured (critical for time-series) |

**Key design decisions:**
- No runtime validator function needed (TypeScript types sufficient)
- `followerCount` is required, use `0` for YouTube (YouTube doesn't have followers)
- `subscriberCount` is nullable - only YouTube provides this, Twitch/Kick null
- `uptime` is nullable initially when stream starts, becomes number once calculated
- `timestamp` tracks capture time for time-series analytics

---

### Task 3.2: Update index.ts Barrel Exports (10 minutes)

Update `shared/models/src/index.ts` to export StreamStats.

```typescript
export * from './Platform';
export * from './Stream';
export * from './User';
export * from './StreamStats';
```

---

### Task 3.3: Write Unit Tests (45-60 minutes)

Create `shared/models/__tests__/StreamStats.test.ts` with comprehensive coverage.

**Test scenarios:**

1. **Valid Twitch/Kick stats** (subscriberCount = null)
2. **Valid YouTube stats** (subscriberCount = number, followerCount = 0)
3. **Null uptime scenario** (temporary state before uptime calculated)
4. **Edge cases:**
   - Zero viewer count
   - Zero follower count (YouTube)
   - Large viewer count (stress test)
5. **Type safety:**
   - Verify timestamp is Date object
   - Verify numeric types
   - Verify nullable types can be null

**Mock data examples:**

```typescript
// Twitch/Kick stats
const twitchStats: StreamStats = {
  streamId: '1234567890',
  viewerCount: 14250,
  followerCount: 52300,
  subscriberCount: null,
  uptime: 1800,
  timestamp: new Date('2024-01-15T10:30:00Z')
};

// YouTube stats
const youtubeStats: StreamStats = {
  streamId: 'abc123',
  viewerCount: 8900,
  followerCount: 0,
  subscriberCount: 125000,
  uptime: 2400,
  timestamp: new Date('2024-01-15T10:30:00Z')
};

// Temporary state (null uptime)
const tempStats: StreamStats = {
  streamId: 'xyz789',
  viewerCount: 100,
  followerCount: 1000,
  subscriberCount: null,
  uptime: null,
  timestamp: new Date()
};
```

---

### Task 3.4: Run Build and Tests (10 minutes)

Verify implementation works correctly.

```bash
cd shared/models
pnpm build
pnpm test
```

**Expected results:**
- `pnpm build` generates type declarations for StreamStats
- `pnpm test` passes all tests with 100% coverage
- No TypeScript errors

---

## File-by-File Breakdown

| File | Lines (approx) | Description |
|------|----------------|-------------|
| `src/StreamStats.ts` | 40-50 | StreamStats interface with JSDoc |
| `src/index.ts` | 1 | Add StreamStats export |
| `__tests__/StreamStats.test.ts` | 100-120 | Comprehensive test coverage |
| **Total** | **140-170 lines** | |

---

## Code Examples

### Example: shared/models/src/StreamStats.ts

```typescript
/**
 * Live stream statistics
 * Sent separately from Stream metadata via WebSocket
 *
 * This provides a clean separation between:
 * - Static metadata (Stream types) - channel info, title, category, etc.
 * - Live data (StreamStats) - viewer counts, follower counts, etc.
 *
 * StreamStats are sent frequently via WebSocket for real-time updates.
 * Stored separately in database for time-series analytics.
 */
export interface StreamStats {
  /**
   * Platform-specific stream ID
   * Links this stats record to the corresponding platform stream (via adapter.getId())
   */
  streamId: string;

  /**
   * Current viewer count
   * Updates frequently (every few seconds)
   */
  viewerCount: number;

  /**
   * Total follower count for the channel
   * Updates less frequently than viewerCount
   * Set to 0 for YouTube (YouTube doesn't have followers concept)
   */
  followerCount: number;

  /**
   * Subscriber count
   * Only applicable to YouTube (YouTube API provides this)
   * Null on Twitch and Kick (no subscriber metrics on those platforms)
   */
  subscriberCount: number | null;

  /**
   * Stream uptime in seconds
   * May be temporarily null when stream first starts before calculated
   */
  uptime: number | null;

  /**
   * Timestamp when these stats were captured
   * Critical for time-series analysis and analytics
   */
  timestamp: Date;
}
```

### Example: shared/models/__tests__/StreamStats.test.ts

```typescript
import { describe, it, expect } from 'vitest';
import type { StreamStats } from '../src/StreamStats';

describe('StreamStats', () => {
  describe('Twitch/Kick stats', () => {
    it('accepts valid stats with null subscriberCount', () => {
      const stats: StreamStats = {
        streamId: '1234567890',
        viewerCount: 14250,
        followerCount: 52300,
        subscriberCount: null,
        uptime: 1800,
        timestamp: new Date('2024-01-15T10:30:00Z')
      };

      expect(stats.streamId).toBe('1234567890');
      expect(stats.viewerCount).toBe(14250);
      expect(stats.followerCount).toBe(52300);
      expect(stats.subscriberCount).toBeNull();
      expect(stats.uptime).toBe(1800);
    });

    it('accepts stats with null uptime (temporary state)', () => {
      const stats: StreamStats = {
        streamId: '1234567890',
        viewerCount: 14250,
        followerCount: 52300,
        subscriberCount: null,
        uptime: null,
        timestamp: new Date()
      };

      expect(stats.uptime).toBeNull();
    });

    it('validates all fields are present', () => {
      const timestamp = new Date('2024-01-15T10:30:00Z');
      const stats: StreamStats = {
        streamId: '1234567890',
        viewerCount: 14250,
        followerCount: 52300,
        subscriberCount: null,
        uptime: 1800,
        timestamp
      };

      expect(stats).toBeDefined();
      expect(timestamp).toBeInstanceOf(Date);
    });
  });

  describe('YouTube stats', () => {
    it('accepts valid stats with subscriberCount and zero followers', () => {
      const stats: StreamStats = {
        streamId: 'abc123',
        viewerCount: 8900,
        followerCount: 0,
        subscriberCount: 125000,
        uptime: 2400,
        timestamp: new Date('2024-01-15T10:30:00Z')
      };

      expect(stats.followerCount).toBe(0);
      expect(stats.subscriberCount).toBe(125000);
    });
  });

  describe('type safety', () => {
    it('enforces timestamp is Date object', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const stats: StreamStats = {
        streamId: 'test',
        viewerCount: 100,
        followerCount: 1000,
        subscriberCount: null,
        uptime: 0,
        timestamp: date
      };

      expect(stats.timestamp.getTime()).toBe(date.getTime());
    });

    it('enforces numeric types for counts', () => {
      const stats: StreamStats = {
        streamId: 'test',
        viewerCount: 100,
        followerCount: 1000,
        subscriberCount: null,
        uptime: 0,
        timestamp: new Date()
      };

      expect(typeof stats.viewerCount).toBe('number');
      expect(typeof stats.followerCount).toBe('number');
      expect(typeof stats.uptime).toBe('number');
    });

    it('allows number for subscriberCount (YouTube)', () => {
      const stats: StreamStats = {
        streamId: 'test',
        viewerCount: 100,
        followerCount: 0,
        subscriberCount: 5000,
        uptime: 0,
        timestamp: new Date()
      };

      expect(typeof stats.subscriberCount).toBe('number');
    });
  });

  describe('edge cases', () => {
    it('allows zero viewer count', () => {
      const stats: StreamStats = {
        streamId: 'test',
        viewerCount: 0,
        followerCount: 1000,
        subscriberCount: null,
        uptime: 0,
        timestamp: new Date()
      };

      expect(stats.viewerCount).toBe(0);
    });

    it('allows zero follower count (YouTube)', () => {
      const stats: StreamStats = {
        streamId: 'test',
        viewerCount: 100,
        followerCount: 0,
        subscriberCount: 5000,
        uptime: 0,
        timestamp: new Date()
      };

      expect(stats.followerCount).toBe(0);
    });

    it('handles large viewer counts', () => {
      const stats: StreamStats = {
        streamId: 'test',
        viewerCount: 9999999,
        followerCount: 5000000,
        subscriberCount: null,
        uptime: 7200,
        timestamp: new Date()
      };

      expect(stats.viewerCount).toBe(9999999);
      expect(stats.followerCount).toBe(5000000);
    });

    it('handles null subscriberCount for Twitch/Kick', () => {
      const stats: StreamStats = {
        streamId: 'test',
        viewerCount: 100,
        followerCount: 1000,
        subscriberCount: null,
        uptime: 0,
        timestamp: new Date()
      };

      expect(stats.subscriberCount).toBeNull();
    });

    it('handles null uptime for temporary state', () => {
      const stats: StreamStats = {
        streamId: 'test',
        viewerCount: 100,
        followerCount: 1000,
        subscriberCount: null,
        uptime: null,
        timestamp: new Date()
      };

      expect(stats.uptime).toBeNull();
    });
  });

  describe('timestamp tracking', () => {
    it('captures timestamp when created', () => {
      const before = new Date();
      const stats: StreamStats = {
        streamId: 'test',
        viewerCount: 100,
        followerCount: 1000,
        subscriberCount: null,
        uptime: 0,
        timestamp: new Date()
      };
      const after = new Date();

      expect(stats.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(stats.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('allows custom timestamp', () => {
      const customTime = new Date('2024-01-15T10:30:00Z');
      const stats: StreamStats = {
        streamId: 'test',
        viewerCount: 100,
        followerCount: 1000,
        subscriberCount: null,
        uptime: 0,
        timestamp: customTime
      };

      expect(stats.timestamp.getTime()).toBe(customTime.getTime());
    });
  });
});
```

### Example: shared/models/src/index.ts

```typescript
// Platform types
export * from './Platform';

// Stream types
export * from './Stream';

// User types
export * from './User';

// Live data types
export * from './StreamStats';
```

---

## Edge Cases and Decisions

### 1. Runtime Validation
**Decision:** No runtime validator function needed.

**Rationale:**
- TypeScript types provide compile-time safety
- Runtime validation not needed unless validating untrusted WebSocket messages
- Can add validation later in WebSocket handling layer if needed

### 2. YouTube Follower Count
**Decision:** Use `0` for YouTube, not nullable.

**Rationale:**
- YouTube doesn't have "followers" concept (only subscribers)
- Keeping field as required with semantic default (`0`) clearer than `null`
- Distinguishes "no followers" from "unknown followers"

### 3. Null Uptime
**Decision:** `uptime: number | null` is acceptable.

**Rationale:**
- Temporarily null when stream starts, before uptime calculated
- Becomes non-null after initial calculation
- Clearer than using `-1` or other sentinel values

### 4. Timestamp Format
**Decision:** Use `Date` type, not string.

**Rationale:**
- Better developer experience (methods like `getTime()`, `toISOString()`)
- Converters (Phase 4) handle ISO8601 string parsing
- Database layer handles serialization

---

## Success Criteria

- [ ] `StreamStats.ts` created with all 6 fields
- [ ] All fields have proper JSDoc comments
- [ ] Exported from `index.ts`
- [ ] Unit tests written with 100% coverage
- [ ] Tests cover:
  - [ ] Valid Twitch/Kick stats (subscriberCount = null)
  - [ ] Valid YouTube stats (subscriberCount, followerCount = 0)
  - [ ] Null uptime scenario
  - [ ] Zero values
  - [ ] Large viewer counts
  - [ ] Type safety
  - [ ] Timestamp tracking
- [ ] `pnpm build` succeeds with no errors
- [ ] `pnpm test` passes all tests
- [ ] No TypeScript errors in workspace

---

## Deliverables

1. **Type definition:**
   - `shared/models/src/StreamStats.ts`

2. **Updated exports:**
   - `shared/models/src/index.ts`

3. **Test coverage:**
   - `shared/models/__tests__/StreamStats.test.ts`

4. **Build artifacts:**
   - Type declarations in `shared/models/dist/StreamStats.d.ts`

---

## Notes

- Simple phase - only one interface type
- FollowerCount is required, use `0` for YouTube (no followers on YouTube)
- SubscriberCount is nullable (YouTube only, Twitch/Kick null)
- Uptime is nullable initially (calculated after stream starts)
- Timestamp is required (critical for time-series analytics)
- No runtime validation needed (TypeScript types sufficient)
- StreamStats sent via WebSocket, stored separately in database

---

## Next Steps After This Phase

Once Phase 3 is complete:

1. **Phase 4:** Converter Layer
   - TwitchConverter: API responses → TwitchStream, TwitchUser
   - KickConverter: API responses → KickStream, KickUser
   - YouTubeConverter: API responses → YouTubeStream, YouTubeUser

2. **Phase 5:** Adapter Interfaces
   - StreamAdapter, UserAdapter, ChatMessageAdapter, EventAdapter

3. **Phase 6:** Adapter Implementations + Wrapper Types
   - Adapter implementations for each platform
   - Unified Stream wrapper type
   - Unified User wrapper type

---

## Status

**Ready for implementation**

**Estimated Effort:** 1-2 hours
**Dependencies:** Phase 1 complete, Phase 2 complete
**Followed by:** Phase 4 - Converter Layer
