# Phase 3: Event Handler (Map-Based)

## Overview
Create map-based event handler for processing Pusher WebSocket events and converting them to unified event types using Kick adapters.

## Tasks
- [ ] Create `KickEventHandler.ts` with Map<EventType, Handler> pattern (like EventSubHandler)
- [ ] Define event types enum for Pusher events (19 types total)
- [ ] Implement handler registration method (register(eventType, handler))
- [ ] Implement dispatch method to route events to registered handlers
- [ ] Create handlers for **Phase 1 Must-Have events** (9 total):
  - `ChatMessageEvent` → KickChatMessageAdapter
  - `FollowersUpdated` → KickEventAdapter (follow)
  - `StreamerIsLive` → KickStreamAdapter (stream online)
  - `StopStreamBroadcast` → KickStreamAdapter (stream offline)
  - `ChannelSubscriptionEvent` → KickEventAdapter (subscribe)
  - `LuckyUsersWhoGotGiftSubscriptionsEvent` → KickEventAdapter (sub gift)
  - `UserBannedEvent` → KickEventAdapter (ban)
  - `GiftedSubscriptionsEvent` → KickEventAdapter (sub gift)
  - `SubscriptionEvent` → KickEventAdapter (subscribe)
- [ ] Use Kick adapters from `shared/models/` to convert to unified Event types
- [ ] Define TypeScript types for event interfaces
- [ ] Add error handling for malformed or unknown events

## Files to Create/Modify
- `packages/server-daemon/platforms/Kick/event/KickEventHandler.ts`
- `packages/server-daemon/platforms/Kick/event/types.ts`

## Acceptance Criteria
- [ ] Event handler uses Map-based pattern (no switch statements)
- [ ] Event types enum defines all 19 Pusher event types
- [ ] 9 must-have events registered and processed correctly
- [ ] Events converted to unified Event types using Kick adapters
- [ ] Handlers emit unified events from KickStrategy
- [ ] Easy to add new events: enum entry + handler function + register()
- [ ] Unknown events logged as warnings but don't cause crashes
- [ ] Malformed events logged with appropriate error details
- [ ] TypeScript types defined for all event interfaces

## Dependencies
- Requires: Phase 2 (PusherWebSocket client)
- Depends on: `shared/models/src/adapters/Kick*` adapters

## Implementation Notes
- Follow exact pattern from Twitch EventSubHandler for consistency
- Use factory functions to create handlers (like createEventHandlers())
- Handlers should return void, emit events via provided callback
