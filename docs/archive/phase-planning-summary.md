# Phase Planning Summary - Shared Data Models Feature (Updated)

## Created Files

### Remaining Phase Plans (Ready for Implementation)
Located in `docs/phase-plans/`:

1. **phase-7-translator-layer.md** (301 lines)
   - Create factory functions for adapters
   - **Includes**: `createPlatformStreamRecord()` helper (NEW)
   - 18 tasks, 498 lines estimated
   - 6-8 hours estimated

2. **phase-9-stream-matcher.md** (545 lines, NEW VERSION)
   - Historical stream matching with 85-90% overlap threshold
   - **Includes**: Splitting logic, conservative matching, StreamService integration
   - 22 tasks, 750 lines estimated
   - 10-12 hours estimated (INCREASED from 6-8)

3. **phase-11-obs-websocket.md** (754 lines, UPDATED)
   - Thin wrapper around `ws` library + service layer state machine
   - **Includes**: Stream class, StreamService interface, PlatformStreamRecord
   - 28 tasks, 1050 lines estimated
   - 12-14 hours estimated (INCREASED from 10-12)

4. **phase-12-integration-tests.md** (530 lines)
   - End-to-end testing for complete flows
   - 18 tasks, 1150 lines estimated
   - **Needs update** after Phase 9/11 to test StreamService, Stream class
   - 8-10 hours estimated

5. **phase-13-documentation.md** (872 lines)
   - Architecture docs, usage guides, field mapping
   - **Includes**: Database schema, Stream/StreamService architecture, 85-90% matching logic
   - 20 tasks, 2900 lines of documentation
   - **Needs update** after implementation
   - 4-6 hours estimated

**ARCHITECTURE REVISION SUMMARY**: See `ARCHITECTURE-REVISION-SUMMARY.md` for complete details on changes.

**Total Remaining Effort**: 40-50 hours (UP from 34-40 due to StreamService implementation and matcher rewrite)

---

## Archive Files (Completed Phases)

**Shared Data Models - Phase 1-6 Archive:**
- shared-models-phase-1-module-structure.md
- shared-models-phase-2-platform-types.md
- shared-models-phase-3-live-data.md
- shared-models-phase-4-converters.md
- shared-models-phase-5-adapter-interfaces.md
- shared-models-phase-6-adapter-implementations.md
- shared-models-phases-1-6-summary.md

**Daemon Server Core - Archive:**
- phase-4-shutdown-handler.md
- phase-5-daemon-app-orchestrator.md
- phase-6-cli-start-command.md
- phase-8-health-check-integration.md
- phase-9-oauth-integration-testing.md
- phase-10-documentation-final-polish.md

**Phase 9 (Original - Redesigned):**
- phase-9-stream-matcher-original.md (archived original design)

---

## Feature Status

### Shared Data Models Feature
**Status**: Phases 1-6 Complete ✅, Phases 7,9,11-13 Planned 📝
**Completion**: 6 of 9 active phases (67%)
**Estimated Remaining Work**: 40-50 hours (UP from 34-40)

**Completed:**
- ✅ Phase 1: Module Structure Setup
- ✅ Phase 2: Platform-Specific Base Types
- ✅ Phase 3: Live Data Types
- ✅ Phase 4: Converter Layer
- ✅ Phase 5: Adapter Interfaces
- ✅ Phase 6: Adapter Implementations

**Removed/Deferred:**
- ⏭️ Phase 8: Category Cache (Removed - UI handles it)
- ⏭️ Phase 10: User Matcher (Removed - Manual linking only, cross-platform chatter linking infeasible)

**Remaining:**
- 📝 Phase 7: Translator Layer (Plan ready - includes PlatformStreamRecord helper)
- 📝 Phase 9: Stream Matcher (Plan complete rewritten - 85-90% overlap, splitting)
- 📝 Phase 11: OBS WebSocket Integration (Plan updated - Stream/StreamService)
- 📝 Phase 12: Integration Tests (Plan updated - needs StreamService tests)
- 📝 Phase 13: Documentation (Plan updated - database docs need addition)

---

## Major Architecture Changes (Revised Design)

### 1. Stream Interface Change

**OLD:**
```typescript
interface Stream {
  commonId: string;
  obsStartTime: Date;
  obsEndTime: Date | null;
  streams: Map<Platform, StreamAdapter>;  // Problem: Data trapped inline
}
```

**NEW:**
```typescript
// Lazy-loading Stream class
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
}
```

**Benefits:**
- Add platforms to existing Streams without extraction/recreation
- Lazy loading: don't load platforms until needed
- Better separation of concerns

### 2. StreamService Layer

**NEW:** Database access layer (separation of concerns)

```typescript
interface StreamService {
  createStream(commonId: string, obsStartTime: Date): Promise<Stream>;
  getPlatformStreams(commonId: string): Promise<PlatformStreamRecord[]>;
  createPlatformStream(commonId: string, platformStream: PlatformStream): Promise<PlatformStreamRecord>;
  updateStreamEnd(commonId: string, obsEndTime: Date): Promise<void>;
  // ... etc
}
```

**Usage:** Matcher uses StreamService → database. Stream class uses StreamService → lazy load.

### 3. Matching Algorithm: 85-90% Overlap (Conservative)

**OLD:** +/- 10 min window (aggressive)
- Problem: Forces grouping of streams that don't really belong

**NEW:** 85-90% overlap threshold (conservative)
- Benefit: Only group streams that truly streamed together
- Split feature: Separate non-matching platforms into new Streams

**Example:**
```
OLD:
Twitch: 14:00-16:00
Kick: 16:05-18:00  // 5 min overlap → same Stream (bad!)

NEW:
Twitch: 14:00-16:00
Kick: 16:05-18:00  // ~25% overlap → separate Streams (good!)
```

### 4. Use Cases Expanded

**Use Case 1: First Multi-Platform Auth**
- Fetch all platform histories → match all with 85-90% threshold → create Streams + PlatformStreamRecords

**Use Case 2: New Platform Added**
- Fetch new platform history → match against existing Streams (conservative)
- If overlap >=85% → add to existing Stream
- If <85% → create new Stream instead

**Use Case 3: Live Streaming (No Matcher)**
- OBS starts → create Stream wrapper
- Platforms go live → create PlatformStreamRecords independently
- **No matching algorithm running**

**Use Case 4: Splitting (NEW)**
- Existing Stream has platforms that don't belong together (<85% overlap)
- Detect split → extract platform → create new Stream around it

---

## Feature Status

### Shared Data Models Feature
**Status**: Phases 1-6 Complete ✅, Phases 7,9,11-13 Planned 📝
**Completion**: 6 of 9 active phases (67%)
**Estimated Remaining Work**: 34-40 hours

**Completed:**
- ✅ Phase 1: Module Structure Setup
- ✅ Phase 2: Platform-Specific Base Types
- ✅ Phase 3: Live Data Types
- ✅ Phase 4: Converter Layer
- ✅ Phase 5: Adapter Interfaces
- ✅ Phase 6: Adapter Implementations

**Removed/Deferred:**
- ⏭️ Phase 8: Category Cache (Removed - UI will handle)
- ⏭️ Phase 10: User Matcher (Removed - Manual linking only, cross-platform chatter linking infeasible)

**Remaining:**
- 📝 Phase 7: Translator Layer (Plan ready)
- 📝 Phase 9: Stream Matcher (Plan ready)
- 📝 Phase 11: OBS WebSocket Integration (Plan ready)
- 📝 Phase 12: Integration Tests (Plan ready)
- 📝 Phase 13: Documentation (Plan ready)

---

## Next Steps

### Immediate: Phase 7 (Translator Layer)
This phase can start immediately as it:
- Has no dependencies on other unimplemented phases
- Uses only existing code from phases 1-6
- Is straightforward with clear task breakdown

**Implementation Order:**
1. Phase 7 (6-8 hours) - Translator Layer
2. Phase 9 (6-8 hours) - Stream Matcher
3. Phase 11 (10-12 hours) - OBS WebSocket
4. Phase 12 (8-10 hours) - Integration Tests
5. Phase 13 (4-6 hours) - Documentation

---

## Changes from Original Plan

### Removed Phases

**Phase 8: Category Cache** (3-4 hours removed)
- **Decision**: UI will handle category_id → name translation
- **Reasoning**: Cache adds complexity without clear benefit. UI can call platform APIs directly with in-memory caching.

**Phase 10: User Matcher** (4-6 hours removed)
- **Decision**: Manual linking only (streamer-controlled), automatic chatter matching infeasible
- **Reasoning**: Cross-platform chatter linking unreliable without identity verification (OAuth linking, external verification). Discord verification doesn't prove Twitch/Kick/YouTube identity.

### Modified Phase 11 (OBS WebSocket)
- **Change**: Using `ws` library instead of obs-websocket-js
- **Reasoning**: obs-websocket-js is deprecated/unmaintained. Building custom thin wrapper gives full control and reduces dependencies.

---

## Key Design Decisions Recap

### Architecture
- Three-layer system: Platform types → Adapters → Unified wrappers
- Adapter pattern hides platform complexity from downstream code
- ObsWebSocketClient (thin wrapper) + ObsStreamDetector (service layer)

### Data Flow
```
API Response → Converter → PlatformType → Translator → Adapter → Downstream Code
```

### Matching Logic
- Stream matching: +/- 10 min time window + same user ID
- User matching: Manual linking only (deferred automatic matching)
- OBS-driven lifecycle: obsStartTime from OBS events (source of truth)

---

## Documentation Structure

### Phase Plans
- **docs/phase-plans/**: Active phase plans for upcoming work
- **docs/archive/phase-plans/**: Completed phase plans

### Architecture Docs (To be created in Phase 13)
- docs/architecture/shared-data-models.md
- docs/architecture/adapter-pattern.md
- docs/architecture/obs-websocket-integration.md
- docs/architecture/stream-field-mapping.md
- docs/architecture/badge-emote-mapping.md
- docs/architecture/event-type-mapping.md

### Research Docs (Existing)
- @docs/research/API-RESEARCH.md - REST API field documentation
- @docs/research/twitch-websocket-apis-research.md - Twitch EventSub + IRC WebSocket
- @docs/research/obs-websocket-protocol.md - OBS WebSocket protocol

---

## Acceptance Criteria for Remaining Phases

### Phase 7: Translator Layer
- 4 translator files created (Stream, User, ChatMessage, Event)
- All `*FromRaw()` helpers implemented
- 25-30 unit tests passing
- Badge/emote normalization verified

### Phase 9: Stream Matcher
- createStreamMatcher() factory function
- +/- 10 min time window matching
- User ID validation
- New UUID for each matched group
- 15-20 unit tests passing

### Phase 11: OBS WebSocket
- ObsWebSocketClient connects with auth
- Auth string generation (SHA256) correct
- ObsStreamDetector state machine working
- All state transitions trigger callbacks
- 30-35 unit tests passing with mocked ws

### Phase 12: Integration Tests
- 30-40 integration tests passing
- 95%+ coverage for adapters/translators/matchers
- End-to-end chain tested (API → converter → translator → adapter)
- OBS integration tested with mocks

### Phase 13: Documentation
- All architecture docs created
- Field mapping tables reference research docs
- shared/models/README.md with examples
- AGENTS.md updated
- docs/PLAN.md marked complete

---

## Questions Before Implementation

### For Phase 7 (Translator Layer)
- Ready to proceed ✅ (No blocking questions)

### For Phase 9 (Stream Matcher)
- No blocking questions ✅

### For Phase 11 (OBS WebSocket)
- **Q1**: Should we mock `ws` library for tests, or attempt to connect to real OBS?
  - **Recommendation**: Mock ws library for CI/reliability. Optional manual testing with real OBS.

### For Phase 12 (Integration Tests)
- **Q2**: Should integration tests require a test database?
  - **Recommendation**: No - avoid external dependencies. Mock database if needed.

### For Phase 13 (Documentation)
- **Q3**: Who reviews/approves the documentation?
  - **Recommendation**: Quick review before committing. Documentation is part of the phase completion.

---

## Package Updates Needed

### shared/models/package.json
Add dev dependencies (during Phase 11):
```json
{
  "devDependencies": {
    "ws": "^8.16.0",
    "@types/ws": "^8.5.10"
  }
}
```

### shared/models/src/index.ts
Update exports as phases complete (Phase 7, 9, 11):
```typescript
export * from './translators';
export * from './matchers';
export * from './obs';
```

---

## Testing Strategy Recap

### Unit Tests (Existing: 144 tests)
- Phase 2: 37 tests (platform types)
- Phase 3: 20 tests (StreamStats)
- Phase 4: 35 tests (converters)
- Phase 6: 52 tests (adapters)

### Unit Tests (To Add: ~100 tests)
- Phase 7: 25-30 tests (translators)
- Phase 9: 20 tests (stream matcher)
- Phase 11: 30-35 tests (OBS WebSocket)

### Integration Tests (To Add: 30-40)
- Phase 12: End-to-end flows

**Total Test Count Expected**: ~285 tests passing

---

## Migration Path

### After Phase 7 (Translator Layer)
- Platform strategies can use translators instead of manual adapter instantiation
- Simplified code: `createStreamAdapter(APIresponse)` instead of manual conversion chain

### After Phase 9 (Stream Matcher)
- Analytics feature can "Fetch past streams" → call matcher → display grouped results
- UI can show multi-platform stream sessions

### After Phase 11 (OBS WebSocket)
- Daemon can detect OBS stream start/stop automatically
- Stream lifecycle driven by OBS events (source of truth)

### After Phase 13 (Documentation)
- Feature marked complete in PLAN.md
- Platform strategies can reference architecture docs for implementation
- Ready for next feature planning

---

## Success Criteria (Feature-Level)

All phase acceptance criteria must be met, plus:

- ✅ 285+ tests passing
- ✅ 95%+ code coverage
- ✅ TypeScript compilation succeeds
- ✅ ESLint passes with no errors
- ✅ All architecture docs created and reviewed
- ✅ Field mapping tables reference research docs
- ✅ PLAN.md updated marking feature complete
- ✅ AGENTS.md updated with shared/models structure

---

## Dependencies Summary

### Runtime
- `uuid`: ^9.0.0 (existing)
- `ws`: ^8.16.0 (to add in Phase 11)

### Dev
- TypeScript: ^5.8.3 (existing)
- Vitest: ^3.2.4 (existing)
- @vitest/coverage-v8: ^3.2.4 (existing)
- @types/ws: ^8.5.10 (to add in Phase 11)

---

## Notes for Future Features

### Platform Strategies (Next Feature)
- Import shared models: `import { createStreamAdapter, StreamAdapter } from '@streaming-enhancement/shared-models'`
- Use converters to normalize API responses
- Return StreamAdapter instances to callers
- Never expose platform types to downstream code

### Server DB (Future)
- Tables needed: multi_streams, platform_streams, users, platform_users, stream_stats
- Schema already defined in feature-plan/shared-data-models.md lines 821-880

### WebSocket Broadcasting (Future)
- Broadcast StreamAdapter objects as JSON
- Include StreamStats separately for live data
- Consumers can reconstruct adapters from JSON

---

## File Summary

### New Phase Plans Created (5 files, 2835 lines)
- phase-7-translator-layer.md (301 lines)
- phase-9-stream-matcher.md (378 lines)
- phase-11-obs-websocket.md (754 lines)
- phase-12-integration-tests.md (530 lines)
- phase-13-documentation.md (872 lines)

### Archive Files Created (13 files)
- shared-models-phase-[1-6].md (7 files)
- daemon-core-phase-[4,5,6,8,9,10].md (6 files)

### Total Documentation Created: 18 files
