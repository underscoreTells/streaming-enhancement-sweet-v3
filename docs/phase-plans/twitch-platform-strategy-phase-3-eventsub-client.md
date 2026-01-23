# Phase 3: EventSub WebSocket Client

## Overview
Create EventSub WebSocket client leveraging ws library for connection handling, with keepalive tracking, reconnection, and subscription management.

## Tasks
- [ ] Add ws library to package.json as dependency
- [ ] Create EventSubClient class wrapping ws WebSocket
- [ ] Implement connection lifecycle (connect, session_welcome, session_keepalive)
- [ ] Implement PING/PONG using ws autoPong (default) + timeout monitoring
- [ ] Create EventSubSubscription class for REST API subscription calls
- [ ] Implement subscription creation, deletion (via Helix API)
- [ ] Add reconnection logic with exponential backoff
- [ ] Handle session_reconnect messages
- [ ] Handle Twitch close codes 4000-4007 appropriately
- [ ] Track keepalive_timeout_seconds from session_welcome

## Files to Create
- `packages/server-daemon/platforms/Twitch/eventsub/EventSubClient.ts`
- `packages/server-daemon/platforms/Twitch/eventsub/EventSubSubscription.ts`
- `packages/server-daemon/platforms/Twitch/eventsub/types.ts`

## Files to Modify
- `packages/server-daemon/package.json` (add ws dependency)
- `packages/server-daemon/platforms/Twitch/TwitchStrategy.ts` (integrate EventSubClient)

## Acceptance Criteria
- [ ] ws added to dependencies and npm install succeeds
- [ ] Connects to wss://eventsub.wss.twitch.tv/ws
- [ ] Session ID captured from session_welcome
- [ ] session_keepalive messages tracked with timer
- [ ] session_reconnect triggers graceful reconnection to new URL
- [ ] Close codes 4000-4007 handled per Twitch spec
- [ ] Exponential backoff for unplanned disconnects
- [ ] Subscriptions created via Helix API with session_id
- [ ] Uses ws autoPong (no manual PONG handling)

## Dependencies
- Phase 2: TwitchStrategy facade
- Research: @docs/research/twitch-websocket-apis-research.md
