# Phase 4: Chat Event Handler (All 6 Events)

## Overview
Implement map-based event handler to process all 6 YouTube chat message types and convert to unified models.

## Tasks
- [ ] Create YouTubeEventHandler.ts with Map-based event registration
- [ ] Define YouTubeMessageType enum with all 6 types: textMessageEvent, superChatEvent, superStickerEvent, memberMilestoneChatEvent, sponsorOnlyGiftPaidEvent, tombstone
- [ ] Implement handle(eventType, data) method that routes to appropriate handler
- [ ] Create handler function for textMessageEvent (use YouTubeChatMessageAdapter)
- [ ] Create handler function for superChatEvent (use YouTubeEventAdapter)
- [ ] Create handler function for superStickerEvent (use YouTubeEventAdapter)
- [ ] Create handler function for memberMilestoneChatEvent (use YouTubeEventAdapter)
- [ ] Create handler function for sponsorOnlyGiftPaidEvent (use YouTubeEventAdapter)
- [ ] Create handler function for tombstone (mark message as deleted)
- [ ] Create factory function createEventHandlers(logger) that returns Map of all handlers
- [ ] Ensure handlers emit unified Event types from YouTubeStrategy
- [ ] Create YouTubeEventHandler.test.ts with comprehensive unit tests
- [ ] Test all 6 message types with sample data
- [ ] Verify adapter integration for each event type
- [ ] Test map routing (no switch statements)
- [ ] Run npm test to verify all tests pass (including Phases 1-3)
- [ ] Verify Phase 4 tests pass before proceeding to Phase 5

## Files to Create/Modify
- `packages/server-daemon/platforms/YouTube/event/YouTubeEventHandler.ts` (CREATE)
- `packages/server-daemon/platforms/YouTube/event/types.ts` (CREATE)
- `packages/server-daemon/platforms/YouTube/event/index.ts` (CREATE)
- `packages/server-daemon/__tests__/platforms/YouTube/YouTubeEventHandler.test.ts` (CREATE)

## Acceptance Criteria
- [ ] Map-based handler implementation (no switch statements)
- [ ] All 6 message types are handled correctly
- [ ] Handlers use YouTube adapters from shared/models
- [ ] Unified Event types are emitted
- [ ] Easy to add new events (enum + handler + register)
- [ ] Error handling in handler functions
- [ ] **Unit tests created and passing**
- [ ] **All 6 event types tested with sample data**
- [ ] **npm test completes with no failures (including all previous phases)**

## Dependencies
- Requires: Phase 3 completed and tests passing
- Requires: shared/models adapters (YouTubeChatMessageAdapter, YouTubeEventAdapter)
