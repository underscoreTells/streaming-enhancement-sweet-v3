# Phase 5: KickStrategy Integration

## Overview
Integrate all components (Pusher WebSocket, event handler, REST client) into the main KickStrategy facade and implement all platform interface methods.

## Tasks
- [ ] Integrate Pusher WebSocket client into KickStrategy
- [ ] Integrate event handler into WebSocket client connection
- [ ] Integrate REST client
- [ ] Implement `connect()`:
  - Initialize Pusher WebSocket client
  - Connect to Pusher service
  - Set up event handlers for WebSocket events
  - Emit connection state changes
- [ ] Implement `disconnect()`:
  - Unsubscribe from all channels
  - Disconnect WebSocket
  - Clean up event handlers
  - Reset clients to null
- [ ] Implement `subscribeToChannel(channelId, username)`:
  - Validate parameters (username mandatory)
  - Use REST client to resolve username → channel_id
  - Subscribe to `channel.{channelId}` via Pusher
  - Subscribe to `chatrooms.{channelId}.v2` via Pusher
  - Handle errors and emit appropriate events
- [ ] Implement `subscribeToChat(channelId)`:
  - Same as subscribeToChannel (Kick uses single WebSocket for both)
  - Validate channelId format
- [ ] Implement `unsubscribeFromChannel(channelId)`:
  - Unsubscribe from channel and chatroom via Pusher
  - Clean up channel-specific state
- [ ] Implement REST methods (get/post/put/delete) delegating to RestClient
- [ ] Update factory.ts to export KickStrategy
- [ ] Update index.ts to export KickStrategy and submodules
- [ ] Add proper logging for all operations

## Files to Create/Modify
- `packages/server-daemon/platforms/Kick/KickStrategy.ts` (modify - add integration logic)
- `packages/server-daemon/platforms/Kick/factory.ts` (modify)
- `packages/server-daemon/platforms/Kick/index.ts` (modify)

## Acceptance Criteria
- [ ] Connect/disconnect lifecycle works end-to-end without errors
- [ ] SubscribeToChannel subscribes to both channel and chatroom
- [ ] SubscribeToChat works as alias to subscribeToChannel
- [ ] Event handlers process events and emit unified Event types
- [ ] REST methods delegate correctly to RestClient with proper error handling
- [ ] All three platform interfaces fully implemented and working
- [ ] Health status returns accurate component states
- [ ] Connection state transitions emit events correctly
- [ ] Proper cleanup on disconnect (no memory leaks)
- [ ] factory.ts and index.ts export all necessary types and classes

## Dependencies
- Requires: Phase 4 (RestClient), Phase 3 (KickEventHandler), Phase 2 (PusherWebSocket)
- Depends on: Phase 1 (KickStrategy base)
- Depends on: interfaces (all three platform interfaces)

## Implementation Notes
- Follow pattern from TwitchStrategy for consistency
- store channel subscriptions to manage cleanup
- Use existing KickOAuth for all OAuth methods
- Ensure proper error handling at all levels
