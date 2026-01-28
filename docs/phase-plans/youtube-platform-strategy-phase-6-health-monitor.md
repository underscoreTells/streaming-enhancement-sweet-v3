# Phase 6: Stream Health Monitor

## Overview
Implement polling monitor for YouTube stream health status (diagnostic issues, stream status).

## Tasks
- [ ] Create StreamHealthMonitor.ts class
- [ ] Implement startMonitoring(streamId) method
- [ ] Set up polling interval (30-60 seconds default)
- [ ] Poll liveStreams.list endpoint for health status
- [ ] Track streamStatus (active, error, inactive, ready, created)
- [ ] Track healthStatus.status (good, ok, bad, noData)
- [ ] Detect change to 'bad' or 'noData' → emit warning event
- [ ] Detect recovery from 'bad' to 'good' or 'ok' → emit health recovered event
- [ ] Parse configurationIssues array for diagnostic information
- [ ] Implement stopMonitoring() method to clear interval
- [ ] Add configuration for poll interval and health thresholds
- [ ] Create StreamHealthMonitor.test.ts with comprehensive unit tests
- [ ] Test polling at configured interval
- [ ] Test health status tracking and warning emission
- [ ] Test health recovery detection
- [ ] Mock API responses for different health states
- [ ] Run npm test to verify all tests pass (including Phases 1-5)
- [ ] Verify Phase 6 tests pass before proceeding to Phase 7

## Files to Create/Modify
- `packages/server-daemon/platforms/YouTube/monitor/StreamHealthMonitor.ts` (CREATE)
- `packages/server-daemon/platforms/YouTube/monitor/index.ts` (MODIFY - add export)
- `packages/server-daemon/__tests__/platforms/YouTube/StreamHealthMonitor.test.ts` (CREATE)

## Acceptance Criteria
- [ ] Polling runs at configured interval
- [ ] Stream health status is tracked correctly
- [ ] Warning event emitted on health degradation
- [ ] Recovery event emitted on health improvement
- [ ] Configuration issues are included in events
- [ ] Monitoring stops cleanly when stopMonitoring() called
- [ ] **Unit tests created and passing**
- [ ] **Health status transitions verified in tests**
- [ ] **npm test completes with no failures (including all previous phases)**

## Dependencies
- Requires: Phase 2 completed and tests passing
- Requires: Phase 5 completed and tests passing
