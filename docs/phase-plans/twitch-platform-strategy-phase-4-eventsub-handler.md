# Phase 4: EventSub Event Handler

## Overview
Create EventSubHandler with map-based handler registration, where EventType enum values directly map to handler functions.

## Tasks
- [ ] Define EventType enum with EventSub subscription_type strings
- [ ] Create EventSubHandler with handlers Map
- [ ] Implement register(eventType, handler) method
- [ ] Implement handle(message) method using map lookup
- [ ] Create handler functions for stream events: channel.stream.online, channel.stream.offline, channel.update
- [ ] Create handler for chat events: channel.chat.message
- [ ] Create handlers for subscription events: channel.subscribe, channel.subscription.message, channel.subscription.gift
- [ ] Create handler for channel points: channel.channel_points_custom_reward_redemption.add
- [ ] Create handler for engagement: channel.follow
- [ ] Register all handlers in TwitchStrategy or initialization code
- [ ] Each handler uses TwitchConverter and TwitchEventAdapter
- [ ] Emits unified events to TwitchStrategy EventEmitter

## Files to Create
- `packages/server-daemon/platforms/Twitch/eventsub/EventSubHandler.ts`

## Files to Modify
- `packages/server-daemon/platforms/Twitch/eventsub/types.ts` (add EventType enum)
- `packages/server-daemon/platforms/Twitch/eventsub/EventSubClient.ts` (connect handler)
- `packages/server-daemon/platforms/Twitch/TwitchStrategy.ts` (register handlers)

## Acceptance Criteria
- [ ] EventType enum uses actual Twitch subscription_type strings
- [ ] EventSubHandler has Map<EventType, HandlerFunction>
- [ ] register(eventType, fn) adds handler to map
- [ ] handle(message) looks up and executes by subscription_type
- [ ] 8 handler functions created
- [ ] Handlers registered during TwitchStrategy initialization
- [ ] Uses TwitchConverter and TwitchEventAdapter
- [ ] Emits events to TwitchStrategy EventEmitter
- [ ] Adding new event: Add to enum + Create handler + Register (~5 lines)

## Dependencies
- Phase 3: EventSubClient
- Shared models: TwitchConverter, TwitchEventAdapter
