# Feature Plan: Kick Platform Strategy

## Overview

Complete Kick platform integration using **only Pusher WebSocket** for real-time event delivery (chat, follows, subscriptions, bans, etc.). Implements unified interfaces for OAuth, WebSocket, and REST API. Establishes patterns for YouTube platform strategy.

## Architecture Decision

**Kick uses Pusher WebSocket for ALL events** (unlike Twitch's dual EventSub+IRC system).
- Chat events: `chatrooms.{id}.v2` channel
- Channel events: `channel.{id}` channel
- No HTTP webhook system used (unlike the official Kick webhook API)

---

## Scope & Deliverables

**Completed Features (Pre-requisites)**
- ✅ Shared data models (Kick adapters, converters)
- ✅ OAuth flow and keystore (KickOAuth with PKCE)
- ✅ Daemon Server Core

**Feature Deliverables**
- [ ] KickStrategy implementing all three platform interfaces
- [ ] Pusher WebSocket client (auto-region detection, retry logic)
- [ ] Map-based event handler (19+ event types)
- [ ] Minimal REST client (getUser only, rate-limited)

---

## Component Structure

```
packages/server-daemon/platforms/Kick/
├── KickStrategy.ts              # Main facade (implement 3 interfaces)
├── websocket/
│   ├── PusherWebSocket.ts       # WebSocket client (Pusher protocol)
│   └── types.ts                 # WebSocket message types
├── event/
│   ├── KickEventHandler.ts      # Map-based event handler
│   └── types.ts                 # Event type enums and interfaces
├── rest/
│   ├── RestClient.ts            # REST API client (minimal)
│   ├── getUser.ts               # User lookup by username
│   └── types.ts                 # REST response types
├── KickOAuth.ts                 # Existing (OAuth with PKCE)
├── http.ts                      # Existing (HTTP client)
├── factory.ts                   # Existing (update exports)
└── index.ts                     # Existing (update exports)
```

---

## Phases

- Phase 1: KickStrategy Main Facade
- Phase 2: Pusher WebSocket Client
- Phase 3: Event Handler (Map-Based)
- Phase 4: REST API Client (Minimal)
- Phase 5: KickStrategy Integration
- Phase 6: Unit Tests

---

## Dependencies

### External Libraries
- `ws` - WebSocket library (already installed for Twitch)

### Internal Dependencies
- ✅ `shared/models/src/adapters/Kick*` - All Kick adapters exist
- ✅ `shared/models/src/converters/KickConverter.ts` - Converter exists
- ✅ `KickOAuth.ts` - OAuth with PKCE exists
- ✅ `interfaces/` - Platform strategy interfaces exist
- ✅ `infrastructure/database/OAuthCredentialsRepository.ts` - For token lookups

### Research Documentation
- @docs/research/API-RESEARCH.md - Complete REST API field documentation
- Community research on Kick Pusher events (reverse-engineered)

---

## Files Summary

### New Files (~14)
**Kick Strategy Core (1)**
- `Kick/KickStrategy.ts`

**Pusher WebSocket (2)**
- `Kick/websocket/PusherWebSocket.ts`
- `Kick/websocket/types.ts`

**Event Handler (2)**
- `Kick/event/KickEventHandler.ts`
- `Kick/event/types.ts`

**REST Client (3)**
- `Kick/rest/RestClient.ts`
- `Kick/rest/getUser.ts`
- `Kick/rest/types.ts`

**Tests (4)**
- `__tests__/platforms/Kick/PusherWebSocket.test.ts`
- `__tests__/platforms/Kick/KickEventHandler.test.ts`
- `__tests__/platforms/Kick/RestClient.test.ts`
- `__tests__/platforms/Kick/KickStrategy.test.ts`

### Modified Files (~2)
- `Kick/factory.ts` - Export KickStrategy
- `Kick/index.ts` - Export KickStrategy and submodules

---

## Event Types Implementation

### Phase 1 Events (9 Must-Have - Implement Immediately)

**Channel Events (`channel.{id}`)**
| Pusher Event | Description | Adapter |
|--------------|-------------|---------|
| `FollowersUpdated` | Follower count updated | KickEventAdapter (follow) |
| `StreamerIsLive` | Streamer went live | KickStreamAdapter (stream online) |
| `StopStreamBroadcast` | Stream stopped | KickStreamAdapter (stream offline) |
| `ChannelSubscriptionEvent` | Subscription occurred | KickEventAdapter (subscribe) |
| `LuckyUsersWhoGotGiftSubscriptionsEvent` | Gifted subscriptions | KickEventAdapter (sub gift) |

**Chatroom Events (`chatrooms.{id}.v2`)**
| Pusher Event | Description | Adapter |
|--------------|-------------|---------|
| `ChatMessageEvent` | Chat message sent | KickChatMessageAdapter |
| `UserBannedEvent` | User banned | KickEventAdapter (ban) |
| `GiftedSubscriptionsEvent` | Subscription gifted | KickEventAdapter (sub gift) |
| `SubscriptionEvent` | Subscription event | KickEventAdapter (subscribe) |

### Phase 2 Events (10 Nice-to-Have - Future Implementation)

| Pusher Event | Description | Priority |
|--------------|-------------|----------|
| `StreamHostEvent` | Stream hosted (raid) | NICE-TO-HAVE |
| `MessageDeletedEvent` | Message deleted | NICE-TO-HAVE |
| `PinnedMessageCreatedEvent` | Message pinned | NICE-TO-HAVE |
| `UserUnbannedEvent` | User unbanned | NICE-TO-HAVE |
| `PollUpdateEvent` | Poll updated | NICE-TO-HAVE |
| `ChatroomUpdatedEvent` | Chatroom settings updated | NICE-TO-HAVE |
| `ChatroomClearEvent` | Chat cleared | NICE-TO-HAVE |
| `GiftsLeaderboardUpdated` | Gifts leaderboard updated | NICE-TO-HAVE |
| `ChatMoveToSupportedChannelEvent` | Host event (raid-like) | NICE-TO-HAVE |

---

## Key Implementation Details

### WebSocket Connection
- **Pusher Service**: `wss://ws-us2.pusher.com/app/{app_key}`
- **Channels**:
  - `channel.{id}` - Channel events
  - `chatrooms.{id}.v2` - Chatroom events
- **Region Detection**: Auto-detect (ws-us2, ws-eu1, ws-as1) → fallback to ws-us2
- **Retry Logic**: Exponential backoff 1s → 30s cap, 5 max retries
- **Message Rate Limit**: 5 messages/second outgoing

### REST API Rate Limiting
- **Default**: 1 request/second
- **HTTP 429**: Wait 5 seconds before retry
- **5xx Errors**: Exponential backoff, max 3 retries
- **Endpoints** (reverse-engineered):
  - `GET /api/v2/channels/{username}` → Channel data
  - `GET /api/v2/channels/{channel}/livestream` → Livestream data

### Event Handling
- Map-based handler pattern (no switch statements)
- Use `shared/models/src/adapters/Kick*` for conversions
- Emit unified Event types from KickStrategy
- Easy to add new events: enum entry + handler function + register()

---

## Comparison with Twitch

| Aspect | Twitch | Kick |
|--------|--------|------|
| **Event System** | EventSub WebSocket (events) + IRC WebSocket (chat) | Pusher WebSocket (events + chat) |
| **WebSocket Connection** | 2 connections (EventSub + IRC) | 1 connection (Pusher) |
| **Event Types** | EventSub (official, documented) | Pusher (reverse-engineered, volatile) |
| **Rate Limits** | Documented | No documented limits (use conservative approach) |
| **Handler Pattern** | Map-based EventSubHandler | Map-based KickEventHandler (same) |

---

## Current Phase

- Status: Not Started

---

## Completed Phases
(None)
