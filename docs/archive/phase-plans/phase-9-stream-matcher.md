# Phase Plan - Status: Complete ✅
# Phase 9: Stream Matcher (Revised)

## Overview

Implement stream matching logic for historical data reconciliation with 85-90% overlap threshold. Supports three distinct use cases: first multi-platform auth, new platform added, and splitting existing Streams. Integrated with new StreamService (database access) and lazy-loading Stream class.

**IMPORTANT**: This is a complete rewrite of the stream matcher based on architectural changes:
- **Stream interface**: Changed from inline `streams: Map` to separate `PlatformStreamRecord` storage
- **Matching algorithm**: 85-90% overlap threshold (conservative)
- **Splitting**: Detect and extract non-matching platforms into new Streams

---

## Current State Analysis

- **Completed**: Phases 1-7, 11 (StreamService and Stream class available)
- **Existing types**:
  - `Stream` class (lazy loading, from Phase 11)
  - `PlatformStreamRecord` (storage type, from Phase 11)
  - `StreamService` (database access, from Phase 11)
  - `PlatformStream` types (TwitchStream, KickStream, YouTubeStream)
  - StreamAdapters and translators (from Phase 7)
- **Missing**: Stream matching algorithm with new design

---

## Architecture Decisions

### Design Goals

1. **Conservative matching**: If platform doesn't clearly match (>=85% overlap), create new Stream instead of forcing a match
2. **Split when needed**: If existing Stream has platforms that don't belong, extract them into new Stream
3. **Lazy loading integration**: Work with StreamService and Stream class's lazy platform loading
4. **Historical only**: Matcher is NOT used during live streaming (live platforms add independently)

### StreamMatcher Interface (Revised)

```typescript
export interface StreamMatcher {
  // Use Case 1: First multi-platform auth
  matchAllPlatformStreams(
    streamService: StreamService,
    twitchStreams: TwitchStream[],
    kickStreams: KickStream[],
    youtubeStreams: YouTubeStream[],
    userId: string
  ): Promise<Stream[]>;

  // Use Case 2: New platform added to existing Streams
  matchNewPlatformStreams(
    streamService: StreamService,
    existingStreams: Stream[],
    newPlatformStreams: PlatformStream[]
  ): Promise<{
    addedToExisting: Map<string, PlatformStreamRecord[]>,  // streams enhanced
    newStreams: Stream[]  // new streams created
  }>;

  // Use Case 3: Split existing Streams
  splitStream(
    streamService: StreamService,
    stream: Stream
  ): Promise<Stream[]>;

  // Helpers
  calculateOverlapPercent(streamA: DateRange, streamB: DateRange): number;
  shouldMatch(stream: Stream, platformStream: PlatformStream): boolean;
  detectSplitNeeded(stream: Stream, allPlatformRecords: PlatformStreamRecord[]): boolean;
}

export function createStreamMatcher(thresholdPercent: number = 0.85): StreamMatcher;
```

### StreamService Integration

Matcher delegates all database operations to StreamService:

```typescript
// Create new Stream
const stream = await streamService.createStream(commonId, obsStartTime);

// Add platform to existing Stream
await streamService.createPlatformStream(commonId, platformStream);

// Get existing Streams
const existing = await streamService.getAllStreams(userId);

// Get platforms for a Stream
const platforms = await stream.getPlatforms();  // Lazy loading via StreamService
```

---

## Task Breakdown (22 tasks)

### Phase 1: Helper Functions (Tasks 1-4)

**Task 1**: Create StreamMatcher.ts file
- File: `shared/models/src/matchers/StreamMatcher.ts` (complete rewrite)
- Import StreamService (new dependency)
- Import Stream, PlatformStreamRecord types
- Import PlatformStream types and converters
- Define StreamMatcher interface

**Task 2**: Implement `calculateOverlapPercent()` helper
```typescript
function calculateOverlapPercent(
  streamA: { startTime: Date; endTime: Date },
  streamB: { startTime: Date; endTime: Date }
): number {
  const overlapStart = Math.max(streamA.startTime.getTime(), streamB.startTime.getTime());
  const overlapEnd = Math.min(streamA.endTime.getTime(), streamB.endTime.getTime());
  const overlapMs = Math.max(0, overlapEnd - overlapStart);

  const durationA = streamA.endTime.getTime() - streamA.startTime.getTime();
  const durationB = streamB.endTime.getTime() - streamB.startTime.getTime();
  const shorterDuration = Math.min(durationA, durationB);

  if (shorterDuration === 0) return 0;

  return overlapMs / shorterDuration;
}
```

**Task 3**: Implement `shouldMatch()` helper
```typescript
function shouldMatch(
  stream: Stream,
  platformStream: PlatformStream,
  threshold: number = 0.85
): boolean {
  const streamStart = stream.getObsStartTime();
  const streamEnd = stream.getObsEndTime() || new Date();

  const platformEnd = platformStream as StreamDataWithEndTime;

  const overlapPercent = calculateOverlapPercent(
    { startTime: streamStart, endTime: streamEnd },
    { startTime: platformStream.startTime, endTime: platformEnd.endTime || new Date() }
  );

  return overlapPercent >= threshold;
}
```
- Note: Type guard needed for `endTime` on PlatformStream
- Use threshold parameter (default 0.85)

**Task 4**: Implement `detectSplitNeeded()` helper
```typescript
async function detectSplitNeeded(
  stream: Stream,
  allPlatformRecords: PlatformStreamRecord[],
  threshold: number = 0.85
): Promise<boolean> {
  const streamStart = stream.getObsStartTime();
  const streamEnd = stream.getObsEndTime() || new Date();

  for (const record of allPlatformRecords) {
    const overlapPercent = calculateOverlapPercent(
      { startTime: streamStart, endTime: streamEnd },
      { startTime: record.data.startTime, endTime: record.data.endTime || new Date() }
    );

    if (overlapPercent < threshold) {
      return true;  // This platform doesn't belong
    }
  }

  return false;
}
```

### Phase 2: Use Case 1 - First Multi-Platform Auth (Tasks 5-9)

**Task 5**: Implement `matchAllPlatformStreams()` - Step 1: Flatten input
```typescript
async function matchAllPlatformStreams(
  streamService: StreamService,
  twitchStreams: TwitchStream[],
  kickStreams: KickStream[],
  youtubeStreams: YouTubeStream[],
  userId: string,
  threshold: number = 0.85
): Promise<Stream[]> {
  const allPlatformStreams = [
    ...twitchStreams.map(s => ({ stream: s, platform: 'twitch' as const })),
    ...kickStreams.map(s => ({ stream: s, platform: 'kick' as const })),
    ...youtubeStreams.map(s => ({ stream: s, platform: 'youtube' as const }))
  ];

  // Sort by start time
  allPlatformStreams.sort((a, b) =>
    a.stream.startTime.getTime() - b.stream.startTime.getTime()
  );

  // Continue to grouping...
}
```

**Task 6**: Implement `matchAllPlatformStreams()` - Step 2: Greedy grouping
```typescript
const groups: Array<{ streams: Array<{ stream: PlatformStream; platform: Platform }> }> = [];

for (const item of allPlatformStreams) {
  let matched = false;

  for (const group of groups) {
    const groupStart = group.streams[0].stream.startTime;
    const groupEnd = getMaxEndTime(group.streams);

    const overlapPercent = calculateOverlapPercent(
      { startTime: groupStart, endTime: groupEnd },
      { startTime: item.stream.startTime, endTime: item.stream.endTime || new Date() }
    );

    if (overlapPercent >= threshold) {
      group.streams.push(item);
      matched = true;
      break;
    }
  }

  if (!matched) {
    groups.push({ streams: [item] });
  }
}
```

**Task 7**: Implement `matchAllPlatformStreams()` - Step 3: Create Streams
```typescript
const result: Stream[] = [];

for (const group of groups) {
  // Determine OBS timestamps
  const allStartTimes = group.streams.map(s => s.stream.startTime);
  const allEndTimes = group.streams.map(s => s.stream.endTime).filter(e => e !== null);
  const earliestStart = new Date(Math.min(...allStartTimes.map(d => d.getTime())));
  const latestEnd = allEndTimes.length > 0 ?
    new Date(Math.max(...allEndTimes.map(d => d!.getTime()))) : null;

  // Create Stream wrapper
  const commonId = crypto.randomUUID();
  const stream = await streamService.createStream(commonId, earliestStart);

  // Create PlatformStreamRecords
  for (const item of group.streams) {
    await streamService.createPlatformStream(commonId, item.stream);
  }

  result.push(stream);
}

return result;
```

**Task 8**: Write unit tests for Use Case 1
- Test matching with 85% threshold
- Test no match with <85% overlap
- Test multiple platforms in same Stream
- Test historical data without OBS timestamps

**Task 9**: Write unit tests for edge cases
- Single stream only
- Empty input
- No match for any streams
- All streams overlap (single Stream with all platforms)

### Phase 3: Use Case 2 - New Platform Added (Tasks 10-13)

**Task 10**: Implement `matchNewPlatformStreams()` - Match against existing
```typescript
async function matchNewPlatformStreams(
  streamService: StreamService,
  existingStreams: Stream[],
  newPlatformStreams: PlatformStream[],
  threshold: number = 0.85
): Promise<{
  addedToExisting: Map<string, PlatformStreamRecord[]>,
  newStreams: Stream[]
}> {
  const addedToExisting = new Map<string, PlatformStreamRecord[]>();
  const newStreamPromises: Promise<Stream>[] = [];

  for (const newPlatformStream of newPlatformStreams) {
    let matched = false;

    for (const existingStream of existingStreams) {
      const streamStart = existingStream.getObsStartTime();
      const streamEnd = existingStream.getObsEndTime() || new Date();

      const overlapPercent = calculateOverlapPercent(
        { startTime: streamStart, endTime: streamEnd },
        { startTime: newPlatformStream.startTime, endTime: newPlatformStream.endTime || new Date() }
      );

      // Conservative: Only match if clearly overlapping (>=85%)
      if (overlapPercent >= threshold) {
        await streamService.createPlatformStream(existingStream.getCommonId(), newPlatformStream);

        const commonId = existingStream.getCommonId();
        if (!addedToExisting.has(commonId)) {
          addedToExisting.set(commonId, []);
        }
        addedToExisting.get(commonId)!.push(
          await streamService.createPlatformRecord(commonId, newPlatformStream)
        );

        matched = true;
        break;
      }
    }

    // If no clear match, create new Stream
    if (!matched) {
      const commonId = crypto.randomUUID();
      newStreamPromises.push(
        streamService.createStream(commonId, newPlatformStream.startTime)
          .then(stream => {
            streamService.createPlatformStream(commonId, newPlatformStream);
            return stream;
          })
      );
    }
  }

  const newStreams = await Promise.all(newStreamPromises);

  return { addedToExisting, newStreams };
}
```

**Task 11**: Write unit tests for conservative matching
- Test 85% overlap triggers match
- Test 84% overlap creates new Stream (conservative)
- Test new platform matches multiple Streams
- Test new platform no match creates single new Stream

**Task 12**: Write unit tests for ambiguity scenarios
- Test platform overlaps 50% of existing Stream → creates new Stream
- Test platform overlaps 90% of existing Stream → adds to existing
- Test equal overlap (exactly 85%) → adds to existing

**Task 13**: Write unit tests for edge cases
- Existing Streams list empty → all create new Streams
- New platform streams empty → empty returns
- Existing Stream has no obsEndTime (live)

### Phase 4: Use Case 3 - Splitting Streams (Tasks 14-17)

**Task 14**: Implement `detectSplitNeeded()` with StreamService
```typescript
async function detectSplitNeededWithService(
  stream: Stream,
  streamService: StreamService,
  threshold: number = 0.85
): Promise<boolean> {
  const platformRecords = await stream.getPlatforms();  // Lazy loading

  const streamStart = stream.getObsStartTime();
  const streamEnd = stream.getObsEndTime() || new Date();

  for (const [platform, adapter] of platformRecords.entries()) {
    const platformData = adapter.toStorage() as StreamDataWithEndTime;

    const overlapPercent = calculateOverlapPercent(
      { startTime: streamStart, endTime: streamEnd },
      { startTime: platformData.startTime, endTime: platformData.endTime || new Date() }
    );

    if (overlapPercent < threshold) {
      return true;  // This platform doesn't belong
    }
  }

  return false;
}
```

**Task 15**: Implement `performSplit()` - Extract non-matching
```typescript
async function performSplit(
  streamService: StreamService,
  stream: Stream,
  threshold: number = 0.85
): Promise<Stream[]> {
  const platformRecords = await stream.getPlatforms();  // Lazy as Map<Platform, StreamAdapter>

  // Find split platform
  let splitPlatform: { platform: Platform; adapter: StreamAdapter } | null = null;
  const streamStart = stream.getObsStartTime();
  const streamEnd = stream.getObsEndTime() || new Date();

  for (const [platform, adapter] of platformRecords.entries()) {
    const platformData = adapter.toStorage() as StreamDataWithEndTime;

    const overlapPercent = calculateOverlapPercent(
      { startTime: streamStart, endTime: streamEnd },
      { startTime: platformData.startTime, endTime: platformData.endTime || new Date() }
    );

    if (overlapPercent < threshold) {
      splitPlatform = { platform, adapter };
      break;
    }
  }

  if (!splitPlatform) {
    return [stream];  // No split needed
  }

  // Create new Stream for split platform
  const platformData = splitPlatform.adapter.toStorage() as StreamDataWithEndTime;
  const newCommonId = crypto.randomUUID();
  const newStream = await streamService.createStream(newCommonId, platformData.startTime);

  // Create PlatformStreamRecord for new Stream
  await streamService.createPlatformStream(newCommonId, platformData);

  // Delete old PlatformStreamRecord and create new one (for original stream)
  // This requires getting existing PlatformStreamRecord ID, which might need StreamService method
  await streamService.removePlatformFromStream(stream.getCommonId(), splitPlatform.platform);

  // Determine new obsEndTime for original Stream
  const remainingPlatforms = new Map(platformRecords);
  remainingPlatforms.delete(splitPlatform.platform);

  if (remainingPlatforms.size > 0) {
    const lastPlatform = Array.from(remainingPlatforms.values()).pop()!;
    const lastPlatformData = lastPlatform.toStorage() as StreamDataWithEndTime;
    await streamService.updateStreamEnd(stream.getCommonId(), lastPlatformData.endTime!);
  } else {
    // Original Stream now has no platforms - should we delete it?
    await streamService.deleteStream(stream.getCommonId());
    return [newStream];  // Only return new Stream
  }

  return [stream, newStream];
}
```

**Task 16**: Implement `splitStream()` as main entry point
```typescript
async function splitStream(
  streamService: StreamService,
  stream: Stream,
  threshold: number = 0.85
): Promise<Stream[]> {
  const needsSplit = await detectSplitNeededWithService(stream, streamService, threshold);

  if (!needsSplit) {
    return [stream];  // No change
  }

  return performSplit(streamService, stream, threshold);
}
```

**Task 17**: Write unit tests for splitting
- Test stream with Twitch (14:00-16:00) and Kick (16:05-18:00) → splits into 2
- Test stream with all platforms overlapping → no split
- Test split updates original Stream's obsEndTime correctly
- Test split creates new Stream with correct obsStartTime

### Phase 5: Integration and Factory (Tasks 18-20)

**Task 18**: Implement `createStreamMatcher()` factory
```typescript
export function createStreamMatcher(
  thresholdPercent: number = 0.85
): StreamMatcher {
  return {
    matchAllPlatformStreams: (service, twitch, kick, youtube, userId) =>
      matchAllPlatformStreams(service, twitch, kick, youtube, userId, thresholdPercent),

    matchNewPlatformStreams: (service, existing, newStreams) =>
      matchNewPlatformStreams(service, existing, newStreams, thresholdPercent),

    splitStream: (service, stream) =>
      splitStream(service, stream, thresholdPercent),

    calculateOverlapPercent,
    shouldMatch: (stream, platform) =>
      shouldMatch(stream, platform, thresholdPercent),

    detectSplitNeeded: (stream, records) =>
      detectSplitNeeded(stream, records, thresholdPercent)
  };
}
```

**Task 19**: Create type guard for endTime
```typescript
interface StreamDataWithEndTime {
  startTime: Date;
  endTime?: Date | null;
}

function isStreamWithEndTime(data: PlatformStream): data is StreamDataWithEndTime {
  return 'endTime' in data;
}
```

**Task 20**: Update matchers/index.ts
```typescript
export * from './StreamMatcher';
```

### Phase 6: Unit Tests (Tasks 21-22)

**Task 21**: Create StreamMatcher test file
- File: `shared/models/__tests__/matchers/StreamMatcher.test.ts`
- Mock StreamService, Stream, PlatformStreamRecord
- Set up test data for all 3 use cases

**Task 22**: Write comprehensive tests
- Test helper functions (calculateOverlapPercent, shouldMatch, detectSplitNeeded)
- Test Use Case 1: First multi-platform auth
- Test Use Case 2: New platform added (conservative matching)
- Test Use Case 3: Splitting streams
- Test edge cases: single platform, empty data, no matches
- Test threshold variations (85%, 90%, custom)

---

## Files to Create (Revised)
- `shared/models/src/matchers/StreamMatcher.ts` (~400 lines - complete rewrite)
- `shared/models/src/matchers/index.ts` (~5 lines)
- `shared/models/__tests__/matchers/StreamMatcher.test.ts` (~350 lines)

**Files Removed** (from original plan):
- None (complete new file)

---

## Files to Modify
- `shared/models/src/index.ts` (update matchers export)
- `shared/models/src/stream/index.ts` (add matchers integration if needed)

---

## Dependencies
- **Phase 11 dependencies**: `Stream`, `StreamService`, `PlatformStreamRecord`
- `PlatformStream` types from `./Stream.ts`
- `crypto.randomUUID()`

---

## Acceptance Criteria (Revised)
- `calculateOverlapPercent()` calculates correct overlap for all scenarios
- 85-90% matching threshold works correctly
- Conservative matching: creates new Stream if ambiguous (<85% overlap)
- Split detection works correctly
- Split logic updates obsEndTime for original Stream correctly
- All 3 use cases supported with proper integration
- Works with StreamService and lazy-loading Stream class
- All unit tests pass (30-35 tests)
- TypeScript compilation succeeds

---

## Notes

### Why 85-90% Threshold (Instead of 10-min Window)

**Original approach** (10-min window):
- Aggressive matching: any overlap groups streams together
- Problem: Forces grouping of streams that don't really belong together
- Example: 2-hour Twitch stream with 5-min Kick overlap at end → same Stream

**New approach** (85-90% overlap):
- Conservative: only match if streams very clearly overlap
- Example: 2-hour Twitch with 1.9-hour Kick overlap → same Stream (90%)
- Example: 2-hour Twitch with 30-min Kick overlap → separate Streams (25%)

This aligns with the goal: grouping platforms that truly streamed together, not forcing matches.

### Conservative Matching for Ambiguous Cases

When overlap is 50-84%:
- **Old logic**: Still match (within window)
- **New logic**: Create new Stream instead

This prevents "muddy" Streams where platforms only partially overlapped. Better to have 2 clear Streams than 1 confusing one.

### Splitting vs Re-Running Matcher

**Why split instead of re-run matcher**:
- Existing Stream might have 3 platforms, only 1 needs to move
- Re-running matcher would lose context of original grouping
- Splitting preserves the mostly-correct group and only extracts the outlier

Example:
```
Stream A: Twitch(14:00-16:00), Kick(16:05-18:00)  // Should be 2 Streams
Split → Stream A': Twitch(14:00-16:00), Stream B: Kick(16:05-18:00)
```

### Integration with StreamService

Matcher delegates ALL database operations:
```typescript
// Create Stream
await streamService.createStream(commonId, obsStartTime);

// Add platform to Stream
await streamService.createPlatformStream(commonId, platformStream);

// Remove platform from Stream
await streamService.removePlatformFromStream(commonId, platform);

// Get Stream with platforms
const stream = await streamService.getStreamWithPlatforms(commonId);
```

This separates concerns:
- **Matcher**: Algorithm, logic, decisions
- **StreamService**: Database access, CRUD operations
- **Stream**: Lazy loading, business logic

### Live Streaming: No Matcher Needed

During live streaming:
```
OBS starts → Create Stream
Platform goes live → Create PlatformStreamRecord (independent)
Platform stops → Update PlatformStreamRecord.endTime
OBS stops → Update Stream.obsEndTime
```

Matcher is only for **historical reconciliation**, not live operations.

### Why Historical Data Without OBS Timestamps?

When fetching historical streams before OBS integration existed:
- No obsStartTime from OBS
- Use platform stream's startTime as obsStartTime
- This is a best-effort estimate, not perfect
- User can manually adjust Stream.obsStartTime if needed in UI

---

## Integration with Other Phases
- **Phase 7**: Uses translators to create adapters
- **Phase 11**: Depends on StreamService and Stream class
- **Phase 12**: Integration tests with real StreamService mock
- **Phase 13**: Document matching algorithm, threshold choice

---

## Estimated Effort
10-12 hours (22 tasks, ~750 lines of code + tests)
**Increased from 6-8 hours** due to complete rewrite with new architecture

---

## Risks and Mitigations

### Risk 1: 85-90% threshold too strict
**Mitigation**: Make threshold configurable via `createStreamMatcher(thresholdPercent)`
**Mitigation**: Document trade-offs so users understand decision

### Risk 2: Splitting might cause cascade of splits
**Mitigation**: Only split one platform at a time
**Mitigation**: User can re-run matcher or manually adjust later

### Risk 3: StreamService not fully implemented yet
**Mitigation**: Phase 11 should complete StreamService first in implementation order
**Mitigation**: Can mock StreamService for unit tests

### Risk 4: Edge case: All platforms don't match
**Mitigation**: Creates separate Stream for each platform
**Mitigation**: UI can show "unmatched streams" for manual review

---

## Manual Testing Checklist
- [ ] First multi-platform auth creates correct Stream groupings
- [ ] New platform added matches conservative threshold correctly
- [ ] Splitting separates non-matching platforms correctly
- [ ] obsStartTime/obsEndTime update after split
- [ ] Lazy loading via StreamService works correctly
- [ ] No matcher runs during live streaming (verified in OBS integration)
