# Phase 7: YouTubeStrategy Integration

## Overview
Wire all components together in YouTubeStrategy facade with proper initialization and lifecycle management.

## Tasks
- [ ] Update YouTubeStrategy connect() method to initialize REST client
- [ ] Update YouTubeStrategy connect() to initialize SSE/polling client
- [ ] Set up event forwarding from SSE client to YouTubeStrategy
- [ ] Set up event forwarding from event handler to YouTubeStrategy
- [ ] Implement subscribeToChannel(channelId, username) - resolve via REST, then connect chat
- [ ] Implement subscribeToChat(channelId) - start SSE/polling connection
- [ ] Implement unsubscribeFromChannel(channelId) - stop chat and monitors
- [ ] Complete REST strategy methods (get, post, put, delete) using RestClient
- [ ] Update YouTubeStrategy disconnect() to clean up all connections
- [ ] Start BroadcastLifecycleMonitor when subscribed
- [ ] Start StreamHealthMonitor when subscribed
- [ ] Add error handling for component initialization failures
- [ ] Update factory.ts to export YouTubeStrategy
- [ ] Expand YouTubeStrategy.test.ts with integration tests
- [ ] Test full connect/disconnect lifecycle
- [ ] Test subscribe/unsubscribe flow
- [ ] Test error handling for component failures
- [ ] Mock all dependencies for isolated testing
- [ ] Run npm test to verify all tests pass (including Phases 1-6)
- [ ] Verify Phase 7 tests pass before proceeding to Phase 8

## Files to Create/Modify
- `packages/server-daemon/platforms/YouTube/YouTubeStrategy.ts` (MODIFY)
- `packages/server-daemon/platforms/YouTube/factory.ts` (MODIFY)
- `packages/server-daemon/platforms/YouTube/index.ts` (MODIFY)
- `packages/server-daemon/__tests__/platforms/YouTube/YouTubeStrategy.test.ts` (MODIFY - add integration tests)

## Acceptance Criteria
- [ ] connect() initializes all components successfully
- [ ] subscribeToChannel() resolves channel and starts chat
- [ ] Chat messages are received and processed through event handler
- [ ] Broadcast lifecycle monitoring starts and detects stream start/end
- [ ] Stream health monitoring starts and detects health issues
- [ ] unsubscribeFromChannel() stops all monitoring and connections
- [ ] disconnect() cleans up all resources
- [ ] Error handling prevents crashes on component failures
- [ ] YouTubeStrategy is properly exported from factory and index
- [ ] **Unit and integration tests created and passing**
- [ ] **Full lifecycle verified in tests**
- [ ] **npm test completes with no failures (including all previous phases)**

## Dependencies
- Requires: All previous phases (1-6) completed and tests passing
