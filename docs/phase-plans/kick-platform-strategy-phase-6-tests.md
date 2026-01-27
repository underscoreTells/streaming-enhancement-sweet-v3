# Phase 6: Unit Tests

## Overview
Comprehensive unit tests for all Kick Platform Strategy components to ensure reliability and maintainability.

## Tasks
- [ ] Test Pusher WebSocket client:
  - Connection lifecycle (connect, disconnect, reconnect)
  - Region detection and fallback logic
  - Message parsing for all 9 must-have event types
  - Retry logic (exponential backoff with max 5 retries, 30s cap)
  - Rate limiting (5 messages/sec enforcement)
  - Channel subscription and unsubscription
  - Error handling for connection failures
- [ ] Test Kick event handler:
  - Event registration (Map pattern)
  - Handler invocation for all 9 must-have event types
  - Event conversion using Kick adapters
  - Error handling for malformed/unknown events
  - Dispatch method routing
- [ ] Test REST client:
  - getUser() success cases (various usernames)
  - getUser() failure cases (404, network errors)
  - Rate limiting (1 req/sec enforcement)
  - HTTP 429 backoff handling (5s wait)
  - Exponential backoff on 5xx errors (max 3 retries)
  - Timeout handling
- [ ] Test KickStrategy integration:
  - Full connect/disconnect lifecycle
  - Subscribe/unsubscribe flow with multiple channels
  - OAuth method delegation (startOAuth, handleCallback, getAccessToken, refreshToken)
  - REST method delegation (get, post, put, delete)
  - Health status reporting accuracy
  - Connection state transition events
  - Event emission to unified Event types
  - Error handling at strategy level
- [ ] Add stub for Pusher WebSocket in tests
- [ ] Add mocks for Kick adapters
- [ ] Ensure >90% code coverage

## Files to Create/Modify
- `packages/server-daemon/__tests__/platforms/Kick/PusherWebSocket.test.ts`
- `packages/server-daemon/__tests__/platforms/Kick/KickEventHandler.test.ts`
- `packages/server-daemon/__tests__/platforms/Kick/RestClient.test.ts`
- `packages/server-daemon/__tests__/platforms/Kick/KickStrategy.test.ts`

## Acceptance Criteria
- [ ] >90% code coverage across all Kick components
- [ ] All event handlers tested with sample data for each event type
- [ ] WebSocket connection lifecycle tested including retry logic
- [ ] REST client rate limiting tested with timing assertions
- [ ] Integration tests for end-to-end subscribe flow
- [ ] Health status reporting tested for all component states
- [ ] Error paths tested (network failures, malformed data, unknown events)
- [ ] Mocks/stubs properly isolate components from external dependencies
- [ ] Tests run successfully with npm test

## Dependencies
- Requires: Phase 5 (KickStrategy complete)
- Depends on: vitest (testing framework), all previous phases

## Implementation Notes
- Use vitest for testing (consistent with existing codebase)
- Mock ws() library for WebSocket client tests
- Mock Kick adapters to test handler integration without adapter complexity
- Use vi.useFakeTimers() for testing rate limiting and backoff logic
- Follow existing test patterns from TwitchStrategy tests
- Test coverage: `npm run test:coverage`
