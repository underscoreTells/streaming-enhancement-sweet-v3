# Phase 7: TwitchStrategy Integration

## Overview
Complete TwitchStrategy implementation by integrating EventSub, IRC, and REST clients, implementing WebSocket and REST interfaces.

## Tasks
- [ ] Implement PlatformWebSocketStrategy.connect() method (starts EventSub + IRC)
- [ ] Implement PlatformWebSocketStrategy.disconnect() method (graceful shutdown)
- [ ] Implement PlatformWebSocketStrategy.subscribeToChannel(channelId, username) method
- [ ] Implement subscribeToChat(channelId) helper (joins IRC channel, subscribes EventSub chat)
- [ ] Implement PlatformRestStrategy.getUser(username) method
- [ ] Implement getUsers(usernames[]) method
- [ ] Implement getUsersById(userIds[]) method
- [ ] Wire up EventSubClient connection/disconnection
- [ ] Wire up IrcClient connection/disconnection
- [ ] Wire up RestClient for all REST methods
- [ ] Add connection health checks
- [ ] Emit connection state changes via EventEmitter

## Files to Modify
- `packages/server-daemon/platforms/Twitch/TwitchStrategy.ts`

## Acceptance Criteria
- [ ] All interface methods implemented
- [ ] connect() starts EventSubClient and IrcClient
- [ ] disconnect() gracefully shuts down both clients
- [ ] subscribeToChannel(username) resolves user_id via REST, creates EventSub subscriptions, joins IRC
- [ ] subscribeToChat(channelId) creates EventSub chat sub + joins IRC channel
- [ ] REST methods delegate to RestClient
- [ ] Connection state changes emit events (connecting, connected, disconnected)
- [ ] Health checks report status of EventSub, IRC, and REST
- [ ] TypeScript compilation passes

## Dependencies
- Phases 3, 4, 5, 6: All components complete
- Phase 2: TwitchStrategy facade
