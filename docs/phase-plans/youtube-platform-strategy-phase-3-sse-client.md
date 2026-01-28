# Phase 3: LiveChat SSE Client (Real-time + Fallback)

## Overview
Implement SSE streaming client for real-time chat with HTTP polling fallback connection.

## Tasks
- [ ] Create YouTubeLiveChatSSEClient.ts for SSE streaming
- [ ] Implement SSE connection establishment with `Accept: text/event-stream`
- [ ] Implement message parsing for SSE data chunks
- [ ] Extract nextPageToken for resume capability
- [ ] Implement automatic reconnection with resume token
- [ ] Implement connection lifecycle (connecting, connected, disconnected, error)
- [ ] Create YouTubeChatPollingClient.ts for HTTP polling fallback
- [ ] Implement polling loop using liveChat.messages.list
- [ ] Use pollingIntervalMillis from API response (typically 5-10s)
- [ ] Implement fallback logic: try SSE first, switch to polling on failure
- [ ] Emit 'connected', 'disconnected', 'error', 'message' events
- [ ] Create types.ts with SSE message and polling types
- [ ] Create YouTubeLiveChatSSEClient.test.ts with comprehensive unit tests
- [ ] Mock SSE server for connection testing
- [ ] Test reconnection and resume token logic
- [ ] Test fallback to polling
- [ ] Run npm test to verify all tests pass (including Phases 1-2)
- [ ] Verify Phase 3 tests pass before proceeding to Phase 4

## Files to Create/Modify
- `packages/server-daemon/platforms/YouTube/sse/YouTubeLiveChatSSEClient.ts` (CREATE)
- `packages/server-daemon/platforms/YouTube/sse/YouTubeChatPollingClient.ts` (CREATE)
- `packages/server-daemon/platforms/YouTube/sse/types.ts` (CREATE)
- `packages/server-daemon/platforms/YouTube/sse/index.ts` (CREATE)
- `packages/server-daemon/__tests__/platforms/YouTube/YouTubeLiveChatSSEClient.test.ts` (CREATE)

## Acceptance Criteria
- [ ] SSE client connects to liveChat.messages.streamList endpoint
- [ ] Real-time messages are received and emitted
- [ ] Resume token is tracked for reconnection
- [ ] Automatic reconnection works after server disconnect
- [ ] Fallback to polling works when SSE fails
- [ ] Polling client uses correct interval
- [ ] Connection state events are emitted correctly
- [ ] Both clients emit consistent message events
- [ ] **Unit tests created and passing**
- [ ] **Reconnection logic verified in tests**
- [ ] **npm test completes with no failures (including all previous phases)**

## Dependencies
- Requires: Phase 2 completed and tests passing
- Requires: YouTube OAuth access token for authentication
