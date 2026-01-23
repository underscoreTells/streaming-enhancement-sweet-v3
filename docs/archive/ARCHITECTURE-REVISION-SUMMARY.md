# Phase Plans Update Summary - Revised Architecture

**Date**: 2026-01-22
**Reason**: Architecture revision based on user feedback on Stream matching and storage model

---

## Major Changes Overview

### Architecture Change: Inline Map → Separate Storage

**OLD Design**:
```typescript
interface Stream {
  commonId: string;
  obsStartTime: Date;
  obsEndTime: Date | null;
  streams: Map<Platform, StreamAdapter>;  // Problem: Data trapped inline
}
```

**NEW Design**:
```typescript
// Stream wrapper (lazy loading)
class Stream {
  constructor(commonId: string, obsStartTime: Date) {}
  async getPlatforms(): Promise<Map<Platform, StreamAdapter>> {
    // Via StreamService (database)
  }
}

// Separate storage
interface PlatformStreamRecord {
  id: string;
  commonId: string;  // References Stream
  platform: Platform;
  data: PlatformStream;
  createdAt: Date;
}

// Database access (separation of concerns)
interface StreamService {
  createStream(commonId: string, obsStartTime: Date): Promise<Stream>;
  getPlatformStreams(commonId: string): Promise<PlatformStreamRecord[]>;
  createPlatformStream(commonId: string, platformStream: PlatformStream): Promise<PlatformStreamRecord>;
  // ... etc
}
```

**Benefits**:
- Can add platforms to existing Streams without extraction/recreation
- Better separation of concerns (matcher → StreamService → database)
- Lazy loading for platform data (don't load until needed)
- Stream lifecycle separated from platform storage

---

## Matching Algorithm Changes

### OLD: 10-Minute Window (Aggressive)
```typescript
// Streams overlap by +/- 10 min → same Stream
Twitch: 14:00-16:00
Kick: 16:05-18:00  // 5 min overlap → same Stream (bad!)
```

### NEW: 85-90% Overlap (Conservative)
```typescript
// Streams must overlap 85-90% → same Stream
Twitch: 14:00-16:00
Kick: 16:05-18:00  // ~25% overlap → separate Streams (good!)

// OR
Twitch: 14:00-16:00
Kick: 14:30-17:40  // ~85% overlap → same Stream (ambiguous but accepted)
```

**Benefits**:
- Better grouping of truly multi-platform streams
- Fewer "muddy" Streams with marginal overlap
- User can manually adjust if needed

---

## Splitting Feature (NEW)

**Use Case**: Existing Stream has platforms that don't belong together

**Example**:
```
Stream 'abc': start=14:00, end=16:00
  Has: TwitchStream(14:00-16:00)
  Has: KickStream(15:55-17:00)  // Problem: Should be separate
```

**Solution**: 
1. Detect split (overlap < 85%)
2. Extract non-matching platform
3. Create new Stream around that platform:
   - Stream 'bca': start=15:55, end=17:00, has KickStream
4. Update original Stream:
   - Stream 'abc': start=14:00, end=16:00, has TwitchStream

**Benefits**:
- Automatically correct mismatched groupings
- User can re-run matcher to fix historical data
- Better data organization

---

## Updated Phase Plans

### Phase 7: Translator Layer (Minor Update)
**Status**: Updated ✅
**Changes**:
- Added `createPlatformStreamRecord()` helper function
- Updated task count: 17 → 18 tasks
- Estimated effort: 6-8 hours (unchanged)

**New Helper**:
```typescript
export function createPlatformStreamRecord(
  commonId: string,
  platformStream: PlatformStream
): PlatformStreamRecord {
  return {
    id: crypto.randomUUID(),
    commonId,
    platform: platformStream.platform,
    data: platformStream,
    createdAt: new Date()
  };
}
```

---

### Phase 9: Stream Matcher ⭐ (Complete Rewrite)
**Status**: Completely rewritten ✅
**Changes**:
- Matching algorithm: 10-min window → 85-90% overlap
- Conservative matching: create new Stream if ambiguous
 NEW)
- Splitting: detect and extract non-matching platforms
- Integration: works with StreamService and lazy-loading Stream class
- Use cases expanded to 3 distinct scenarios

**New Tasks**: 22 tasks (up from 15)
**Estimated effort**: 10-12 hours (up from 6-8)

**Key New Methods**:
```typescript
calculateOverlapPercent(streamA, streamB): number  // 0.0 to 1.0
shouldMatch(stream, platformStream): boolean      // >= 0.85
detectSplitNeeded(stream, allPlatforms): boolean
splitStream(stream, streamService): Promise<Stream[]>
```

---

### Phase 11: OBS WebSocket (Simplified + StreamService Integration)
**Status**: Updated ✅
**Changes**:
- **NEW**: Stream class implementation (lazy loading)
- **NEW**: StreamService interface definition
- **NEW**: PlatformStreamRecord type
- **NEW**: ObsStreamDetector integration with StreamService
- Stream wrapper created on OBS start via StreamService
- Callbacks now pass Stream object instead of Date

**New Files Created**:
```
shared/models/src/stream/
  ├── StreamData.ts       (database DTO)
  ├── PlatformStreamRecord.ts  (storage type)
  ├── Stream.ts          (lazy loading class)
  ├── StreamService.ts   (interface)
  └── index.ts
```

**Updated Callback Interface**:
```typescript
// OLD
onStreamStart?: (startTime: Date) => void;

// NEW
onStreamStart?: (stream: Stream) => void;
```

**New Tasks**: 27 → 28 tasks
**Estimated effort**: 12-14 hours (up from 10-12)

---

### Phase 12: Integration Tests (To Be Updated)
**Status**: Needs update after Phase 9 and 11 implementation
**Changes Needed**:
- Test StreamService operations
- Test Stream lazy loading
- Test splitting scenarios
- Test 85-90% matching threshold
- Test Stream creation from OBS

---

### Phase 13: Documentation (To Be Updated)
**Status**: Needs update after all phases complete
**Changes Needed**:
- Architecture docs for Stream/StreamService/PlatformStreamRecord
- Database schema documentation
- 85-90% matching algorithm explanation
- Splitting logic explanation
- Live vs historical fetch flow diagrams

---

## Implementation Order (Updated)

**Recommended Order**:
1. **Phase 7** - Translator Layer (minor update, quick win)
2. **Phase 11** - OBS WebSocket + StreamService (foundational - Stream/StreamService)
3. **Phase 9** - Stream Matcher (depends on StreamService)
4. **Phase 12** - Integration Tests
5. **Phase 13** - Documentation

**Alternative** (if parallel development preferred):
1. Phase 7
2. Phase 9 (with mocked StreamService)
3. Phase 11
4. Phase 12
5. Phase 13

---

## Database Schema (NEW - For Phase 13 Documentation)

```sql
CREATE TABLE streams (
  common_id TEXT PRIMARY KEY,
  obs_start_time TEXT NOT NULL,  -- ISO 8601 string
  obs_end_time TEXT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE platform_streams (
  id TEXT PRIMARY KEY,
  common_id TEXT NOT NULL,
  platform TEXT NOT NULL,  -- 'twitch' | 'kick' | 'youtube'
  data TEXT NOT NULL,      -- JSON: PlatformStream
  created_at TEXT NOT NULL,
  FOREIGN KEY (common_id) REFERENCES streams(common_id)
);

CREATE INDEX idx_platform_streams_common_id ON platform_streams(common_id);
```

---

## Use Cases Revisited

### Use Case 1: First Multi-Platform Auth
**Flow**:
1. User auths into Twitch + Kick + YouTube simultaneously
2. Fetch all platform histories from APIs
3. Run matcher: match all with 85-90% threshold
4. Create Streams via StreamService
5. Create PlatformStreamRecords for each platform's data
6. Done (one-time operation)

### Use Case 2: New Platform Added
**Flow**:
1. User adds Kick auth after having Twitch auth previously
2. Fetch new Kick history
3. Fetch existing Streams from database
4. Run matcher: compare Kick streams against existing Streams
5. Conservative: if overlap >=85% → add to existing, else create new Stream
6. Insert PlatformStreamRecords accordingly

### Use Case 3: Live Streaming (No Matcher Involved)
**Flow**:
1. OBS starts → ObsStreamDetector creates Stream (no matching!)
2. Twitch goes live → Platform strategy fetches → creates PlatformStreamRecord (independent)
3. Kick goes live → Platform strategy fetches → creates PlatformStreamRecord (independent)
4. Both linked to same Stream by commonId
5. OBS stops → ObsStreamDetector updates Stream.obsEndTime
6. **Key**: No running matching algorithm during live streaming

### Use Case 4: Historical Data Without OBS Timestamps
**Flow**:
1. User fetches past streams from before OBS integration
2. Run matcher on historical platform data
3. Create Streams with obsStartTime = platform stream startTime (best effort)
4. User can manually adjust in UI if needed

---

## Files Modified

### Created
- `docs/phase-plans/phase-7-translator-layer.md` (updated)
- `docs/phase-plans/phase-9-stream-matcher.md` (complete new version)
- `docs/phase-plans/phase-11-obs-websocket.md` (updated)
- `docs/archive/phase-plans/phase-9-stream-matcher-original.md` (archived original)

### To Update (After Implementation)
- `docs/phase-plans/phase-12-integration-tests.md`
- `docs/phase-plans/phase-13-documentation.md`
- `docs/phase-plans/phase-planning-summary.md`

---

## Key Design Decisions (Recap)

| Decision | Choice | Reason |
|----------|--------|--------|
| Storage model | Separate PlatformStreamRecord linked by commonId | Simplifies adding platforms, no extraction needed |
| Matching threshold | 85-90% overlap (conservative) | Avoids "muddy" Streams, user can manually adjust if needed |
| Splitting | Yes - detect and extract non-matching platforms | Automatically corrects mismatched historical data |
| Live streaming matching | No - platforms add independently | OBS drives lifecycle, platforms are independent |
| Database access | StreamService layer (separation of concerns) | Matcher focuses on algorithm, StreamService handles DB |

---

## Tasks Added Across All Phases

### New Components
- **Stream class**: Lazy loading, 70 lines
- **StreamData**: Database DTO, 20 lines
- **PlatformStreamRecord**: Storage type, 25 lines
- **StreamService**: Interface (implementation in server-db), 30 lines

### StreamMatcher Tasks (19 new tasks)
- Overlap calculation
- Split detection
- Split execution
- Conservative matching for Use Case 2
- StreamService integration

### OBS WebSocket Tasks (5 new tasks)
- Stream/StreamService types: 6 tasks
- Updated ObsStreamDetector: 2 tasks (constructor, handleStreamStateChanged)
- Updated callbacks: 1 task

**Total New Tasks**: 19 + 5 = 24 additional tasks across phases

---

## Effort Tracking

| Phase | Original | Revised | Delta |
|-------|----------|---------|-------|
| Phase 7 | 6-8 hours | 6-8 hours | 0 (minor update) |
| Phase 9 | 6-8 hours | 10-12 hours | +4 hours (complete rewrite) |
| Phase 11 | 10-12 hours | 12-14 hours | +2 hours (Stream/StreamService) |
| Phase 12 | 8-10 hours | ~8-10 hours | 0 (to be updated) |
| Phase 13 | 4-6 hours | ~4-6 hours | 0 (to be updated) |
| **Total** | **34-44 hours** | **40-50 hours** | **+6 hours** |

---

## Questions Resolved

### Q: How to add old stream to existing wrapper?
**A**: No longer needed - platforms stored separately. Just insert PlatformStreamRecord with existing commonId.

### Q: Matching always running?
**A**: No - only runs for historical reconciliation (Use Cases 1-2). Live streaming doesn't use matcher.

### Q: Nested streams design?
**A**: Stream wrapper is OBS session-level. Platforms linked via commonId in separate table.

---

## Next Steps

1. ✅ Phase 7 updated - ready for implementation
2. ✅ Phase 9 rewritten - ready for implementation
3. ✅ Phase 11 updated - ready for implementation
4. ⏳ Phase 12 - needs update after Phase 9/11 complete
5. ⏳ Phase 13 - needs update after all phases complete
6. ⏳ phase-planning-summary.md - needs update

---

## User Approvals

All changes based on user feedback:
1. ✅ Use StreamService (Option C)
2. ✅ obsStartTime constructor parameter (Option B)
3. ✅ PlatformStreamRecord created when fetching
4. ✅ 85-90% matching threshold (Option B)
5. ✅ Split existing streams when 85% not met (Option B)
6. ✅ Keep old streams as is when no match (Use Case 3)
7. ✅ Live streams don't use matcher (Use Case 4)
8. ✅ Database schema fresh start (Option A)
9. ✅ Historical data obsStartTime = platform start (Question 3)

---

**Ready for implementation with updated plan files.**
