# Phase 2: Pusher WebSocket Client

## Overview
Create WebSocket client using Pusher protocol for Kick's real-time event delivery (chat, follows, subscriptions, stream status).

## Tasks
- [ ] Create `PusherWebSocket.ts` client class
- [ ] Implement auto-region detection (ws-us2, ws-eu1, ws-as1 → fallback to ws-us2)
- [ ] Connect to Pusher WebSocket service (`wss://ws-us2.pusher.com/app/...`)
- [ ] Subscribe to two channel types:
  - `channel.{id}` - Channel events (followers, subscriptions, stream status)
  - `chatrooms.{id}.v2` - Chatroom events (messages, bans, polls)
- [ ] Handle connection lifecycle (connect, disconnect, reconnect)
- [ ] Implement retry logic: exponential backoff 1s → 30s cap, 5 max retries
- [ ] Parse incoming JSON messages
- [ ] Emit events to handlers (channel events and chat events)
- [ ] Add rate limiting for message sending: 5 messages/second max
- [ ] Define TypeScript types for WebSocket messages and events

## Files to Create/Modify
- `packages/server-daemon/platforms/Kick/websocket/PusherWebSocket.ts`
- `packages/server-daemon/platforms/Kick/websocket/types.ts`

## Acceptance Criteria
- [ ] WebSocket connects to correct endpoint based on region auto-detection
- [ ] Subscribes to both channel and chatroom channels successfully
- [ ] Handles disconnection and reconnection with exponential backoff (1s → 30s, 5 max retries)
- [ ] Rate limits outgoing messages to 5/second with queue/buffer
- [ ] Emits 'event' for incoming messages with event type and payload
- [ ] Emits 'channelEvent' for channel-level events
- [ ] Emits 'chatEvent' for chatroom events
- [ ] Handles connection errors and emits appropriate error events
- [ ] TypeScript types defined for all message formats
- [ ] Graceful shutdown on disconnect

## Dependencies
- Requires: Phase 1 (KickStrategy base structure)
- Depends on: `ws` library (already installed)

## Implementation Notes
- Use similar pattern to Twitch IrcClient but adapted for Pusher protocol
- Channel subscription: Pusher uses subscribe events, not simple connection
- Auto-region detection can be based on latency or geolocation API
