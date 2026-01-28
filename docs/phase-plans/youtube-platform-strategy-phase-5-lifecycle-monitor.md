# Phase 5: Broadcast Lifecycle Monitor

## Overview
Implement polling monitor for YouTube broadcast lifecycle state changes (stream start/end detection).

## Tasks
- [ ] Create BroadcastLifecycleMonitor.ts class
- [ ] Implement startMonitoring(broadcastId) method
- [ ] Set up polling interval (15-30 seconds default)
- [ ] Poll liveBroadcasts.list endpoint for lifecycle status
- [ ] Track previous lifecycle state to detect changes
- [ ] Detect transition to 'live' state → emit stream online event
- [ ] Detect transition to 'complete' state → emit stream offline event
- [ ] Implement stopMonitoring() method to clear interval
- [ ] Handle broadcast ID not found (404) scenario
- [ ] Add configuration for poll interval and number of retries
- [ ] Emit lifecycle state change events
- [ ] Create BroadcastLifecycleMonitor.test.ts with comprehensive unit tests
- [ ] Test polling at configured interval
- [ ] Test state transitions and event emission
- [ ] Test stopMonitoring cleanup
- [ ] Mock API responses for different lifecycle states
- [ ] Run npm test to verify all tests pass (including Phases 1-4)
- [ ] Verify Phase 5 tests pass before proceeding to Phase 6

## Files to Create/Modify
- `packages/server-daemon/platforms/YouTube/monitor/BroadcastLifecycleMonitor.ts` (CREATE)
- `packages/server-daemon/platforms/YouTube/monitor/index.ts` (CREATE)
- `packages/server-daemon/__tests__/platforms/YouTube/BroadcastLifecycleMonitor.test.ts` (CREATE)

## Acceptance Criteria
- [ ] Polling runs at configured interval
- [ ] Broadcast lifecycle state is tracked correctly
- [ ] Stream online event emitted when state transitions to 'live'
- [ ] Stream offline event emitted when state transitions to 'complete'
- [ ] Monitoring stops cleanly when stopMonitoring() called
- [ ] Errors are logged and don't crash the monitor
- [ ] **Unit tests created and passing**
- [ ] **State transitions verified in tests**
- [ ] **npm test completes with no failures (including all previous phases)**

## Dependencies
- Requires: Phase 2 completed and tests passing
- Requires: Phase 4 completed and tests passing
