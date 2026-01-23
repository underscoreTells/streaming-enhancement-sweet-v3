# Phase 9: Stream Matcher (Revised) - ARCHIVED (to be replaced)

**Status**: Planning Complete - Ready for Implementation
**Changes from Original**: Complete rewrite of matching algorithm per user feedback

**Key Changes**:
- Matching threshold: 85-90% overlap (instead of 10-min window)
- Conservative matching: Create new Stream if ambiguous
- Split logic: Extract non-matching platforms, create new Streams
- Integrated with new StreamService and lazy-loading Stream class
- Supports 3 distinct use cases

---

## Overview (Revised)

### Important: Phase 9 Has Been Redesigned

This phase plan has been completely rewritten based on architectural changes:
- **Stream interface**: Changed from inline `streams: Map` to separate `PlatformStreamRecord` storage
- **Matching algorithm**: 85-90% overlap threshold (conservative)
- **Splitting**: Detect and extract non-matching platforms into new Streams
- **Integration**: Works with StreamService (database access) and lazy-loading Stream class

**See**: `docs/phase-plans/phase-9-stream-matcher revised.md` for the updated plan.

---

## New Integration Points

### StreamService (New - Required for Matcher)

```typescript
interface StreamService {
  createStream(commonId: string, obsStartTime: Date): Promise<Stream>;
  getStream(commonId: string): Promise<Stream>;
  updateStreamEnd(commonId: string, obsEndTime: Date): Promise<void>;
  createPlatformStream(commonId: string, platformStream: PlatformStream): Promise<PlatformStreamRecord>;
  getPlatformStreams(commonId: string): Promise<PlatformStreamRecord[]>;
  getStreamWithPlatforms(commonId: string): Promise<Stream>;
}
```

### Stream Class (New - Lazy Loading)

```typescript
class Stream {
  constructor(
    private commonId: string,
    private obsStartTime: Date
  ) {}

  getCommonId(): string;
  getObsStartTime(): Date;
  getObsEndTime(): Date | null;

  async getPlatforms(): Promise<Map<Platform, StreamAdapter>> {
    // Via StreamService
  }
}
```

### PlatformStreamRecord (New)

```typescript
interface PlatformStreamRecord {
  id: string;
  commonId: string;
  platform: Platform;
  data: PlatformStream;
  createdAt: Date;
}
```

---

## Use Cases (Updated)

### Use Case 1: First Multi-Platform Auth
User auths into Twitch + Kick + YouTube simultaneously with existing stream history:
- Fetch all platform histories
- Run matcher with 85-90% threshold
- Create Streams + PlatformStreamRecords
- Done (one-time operation)

### Use Case 2: New Platform Added
User adds Kick auth after having Twitch auth previously:
- Fetch Kick history
- Fetch existing Streams from database
- Run matcher: Compare Kick streams against existing Streams
- Conservative approach: If Kick doesn't clearly match (>=85%), create new Stream instead
- Insert PlatformStreamRecords accordingly

### Use Case 3: Splitting Existing Streams
Existing Stream has platforms that shouldn't be grouped:
- Detect split: Check if any platforms don't meet 85% overlap threshold
- If split needed: Extract non-matching platform, create new Stream around it
- Original Stream obsEndTime updated to platform's end time
- New Stream obsStartTime = platform's start time

### Live Streaming (No Matcher Needed)
- OBS starts → Create Stream wrapper
- Platform goes live → Create PlatformStreamRecord (independent)
- No matching algorithm running
- Platforms exist in separate Streams unless manually grouped

---

## Matching Algorithm (85-90% Overlap)

### Overlap Calculation

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

  return overlapMs / shorterDuration;
}
```

### Matching Threshold

```typescript
function shouldMatch(existingStream: Stream, newPlatformStream: PlatformStream): boolean {
  // Get timestamps from Stream or existing platforms
  const streamStart = existingStream.obsStartTime;
  const streamEnd = existingStream.obsEndTime || new Date();  // Use now if still live

  const overlapPercent = calculateOverlapPercent(
    { startTime: streamStart, endTime: streamEnd },
    { startTime: newPlatformStream.startTime, endTime: newPlatformStream.endTime || new Date() }
  );

  return overlapPercent >= 0.85;  // 85% threshold
}
```

### Splitting Logic

```typescript
function detectSplitNeeded(stream: Stream, allPlatformStreams: PlatformStreamRecord[]): boolean {
  const threshold = 0.85;

  for (const platformRecord of allPlatformStreams) {
    const overlapPercent = calculateOverlapPercent(
      { startTime: stream.obsStartTime, endTime: stream.obsEndTime || new Date() },
      { startTime: platformRecord.data.startTime, endTime: platformRecord.data.endTime || new Date() }
    );

    if (overlapPercent < threshold) {
      return true;  // This platform doesn't belong in this Stream
    }
  }

  return false;
}

function performSplit(
  stream: Stream,
  platformRecords: PlatformStreamRecord[],
  streamService: StreamService
): Promise<Stream[]> {
  // Find platform that causes the split
  const splitPlatform = platformRecords.find(record => {
    const overlapPercent = calculateOverlapPercent(...);
    return overlapPercent < 0.85;
  })!;

  // Extract platform records for original stream
  const originalPlatforms = platformRecords.filter(record => record.id !== splitPlatform.id);

  // Update original Stream's obsEndTime
  const lastOriginalPlatform = originalPlatforms[originalPlatforms.length - 1];
  await streamService.updateStreamEnd(
    stream.getCommonId(),
    lastOriginalPlatform.data.endTime!
  );

  // Create new Stream for split platform
  const newStream = await streamService.createStream(
    crypto.randomUUID(),
    splitPlatform.data.startTime
  );

  // Update PlatformStreamRecord's commonId
  // (Need to re-create with new commonId or update DB)

  return [stream, newStream];
}
```

---

## ARCHIVE NOTE

This is the original Phase 9 plan that has been superseded by the revised design.
Keep for reference of what was originally planned.

See `phase-9-stream-matcher.md` for the complete rewrite.
