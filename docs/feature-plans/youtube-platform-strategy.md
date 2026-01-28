# Feature Plan: YouTube Platform Strategy

## Overview

Complete YouTube platform integration implementing unified interfaces for OAuth, HTTP API (REST + SSE streaming), and broadcast monitoring. Establishes the final core platform strategy (after Twitch and Kick).

## Architecture Decision

**YouTube uses Server-Sent Events (SSE) for real-time chat**, not WebSocket like Twitch/Kick.
- **Primary**: `liveChat.messages.streamList` - Real-time SSE stream for chat
- **Fallback**: `liveChat.messages.list` - Traditional HTTP polling if streaming fails
- **Broadcast Monitoring**: Polling `liveBroadcasts.list` for stream lifecycle events
- **Health Monitoring**: Polling `liveStreams.list` for stream health/diagnostics

---

## Scope & Deliverables

**Completed Features (Pre-requisites)**
- ✅ Shared data models (YouTubeConverter, YouTube adapters for Stream, Chat, Event, User)
- ✅ OAuth flow and keystore (YouTubeOAuth with offline access)
- ✅ Daemon Server Core

**Feature Deliverables**
- [ ] YouTubeStrategy implementing all three platform interfaces
- [ ] YouTubeLiveChatSSEClient (real-time server-sent events with fallback polling)
- [ ] Map-based YouTube chat event handler (6 chat event types)
- [ ] REST API client for YouTube Data API v3 (streams, videos, broadcasts, channels)
- [ ] BroadcastLifecycleMonitor (polling for stream state changes)
- [ ] StreamHealthMonitor (polling for stream health status)
- [ ] Unit tests (>90% coverage)

---

## Component Structure

```
packages/server-daemon/platforms/
├── interfaces/
│   ├── PlatformOAuthStrategy.ts       # Existing
│   ├── PlatformWebSocketStrategy.ts   # We'll adapt for SSE
│   └── PlatformRestStrategy.ts        # Existing
├── YouTube/
│   ├── YouTubeStrategy.ts             # Main facade (implement 3 interfaces)
│   ├── sse/
│   │   ├── YouTubeLiveChatSSEClient.ts  # SSE streaming client
│   │   ├── YouTubeChatPollingClient.ts  # HTTP polling fallback
│   │   └── types.ts                     # SSE/polling types
│   ├── event/
│   │   ├── YouTubeEventHandler.ts       # Map-based event handler
│   │   └── types.ts                     # Event type enums and interfaces
│   ├── rest/
│   │   ├── RestClient.ts                # REST API client
│   │   ├── getChannel.ts                # Channel lookup by username/handle
│   │   ├── getLiveStream.ts             # Get live stream data
│   │   ├── getLiveBroadcast.ts          # Get broadcast data
│   │   ├── getVideo.ts                  # Get video data
│   │   └── types.ts                     # REST response types
│   ├── monitor/
│   │   ├── BroadcastLifecycleMonitor.ts # Polling for lifecycle events
│   │   └── StreamHealthMonitor.ts       # Polling for health status
│   ├── YouTubeOAuth.ts                  # Existing
│   ├── http.ts                          # Existing
│   ├── factory.ts                       # Update exports
│   └── index.ts                         # Update exports
```

---

## Phases

- Phase 1: YouTubeStrategy Main Facade
- Phase 2: REST API Client (YouTube Data API v3)
- Phase 3: LiveChat SSE Client (Real-time streaming + fallback polling)
- Phase 4: Chat Event Handler (All 6 chat event types)
- Phase 5: Broadcast Lifecycle Monitor (Stream state polling)
- Phase 6: Stream Health Monitor (Health status polling)
- Phase 7: YouTubeStrategy Integration
- Phase 8: Unit Tests

---

## Dependencies

### External Libraries
- No new dependencies (Node.js fetch or axios-like HTTP client needed)
- Node.js EventEmitter - Already used

### Internal Dependencies
- ✅ `shared/models/src/adapters/YouTube*` - All YouTube adapters exist
- ✅ `shared/models/src/converters/YouTubeConverter.ts` - Converter exists
- ✅ `YouTubeOAuth.ts` - OAuth with offline access exists
- ✅ `interfaces/` - Platform strategy interfaces exist
- ✅ `infrastructure/database/OAuthCredentialsRepository.ts` - For token lookups

### Research Documentation
- @docs/research/API-RESEARCH.md - Complete REST API field documentation
- YouTube Live Streaming API official documentation
- Comprehensive chat event research via explore agent

---

## Files Summary

### New Files (~20)

**YouTube Strategy Core (1)**
- `YouTube/YouTubeStrategy.ts`

**SSE Streaming Client (3)**
- `YouTube/sse/YouTubeLiveChatSSEClient.ts`
- `YouTube/sse/YouTubeChatPollingClient.ts`
- `YouTube/sse/types.ts`

**Event Handler (2)**
- `YouTube/event/YouTubeEventHandler.ts`
- `YouTube/event/types.ts`

**REST Client (6)**
- `YouTube/rest/RestClient.ts`
- `YouTube/rest/getChannel.ts`
- `YouTube/rest/getLiveStream.ts`
- `YouTube/rest/getLiveBroadcast.ts`
- `YouTube/rest/getVideo.ts`
- `YouTube/rest/types.ts`

**Monitors (2)**
- `YouTube/monitor/BroadcastLifecycleMonitor.ts`
- `YouTube/monitor/StreamHealthMonitor.ts`

**Tests (6)**
- `__tests__/platforms/YouTube/YouTubeLiveChatSSEClient.test.ts`
- `__tests__/platforms/YouTube/YouTubeEventHandler.test.ts`
- `__tests__/platforms/YouTube/RestClient.test.ts`
- `__tests__/platforms/YouTube/BroadcastLifecycleMonitor.test.ts`
- `__tests__/platforms/YouTube/StreamHealthMonitor.test.ts`
- `__tests__/platforms/YouTube/YouTubeStrategy.test.ts`

### Modified Files (~2)
- `YouTube/factory.ts` - Export YouTubeStrategy
- `YouTube/index.ts` - Export YouTubeStrategy and submodules

---

## Chat Event Types Implementation

### All 6 Chat Message Types (Must-Have - Implement in Phase 4)

| Message Type | Adapter | Description |
|--------------|---------|-------------|
| `textMessageEvent` | YouTubeChatMessageAdapter | Regular chat message |
| `superChatEvent` | YouTubeEventAdapter | Super Chat (paid message) |
| `superStickerEvent` | YouTubeEventAdapter | Super Sticker purchase |
| `memberMilestoneChatEvent` | YouTubeEventAdapter | Membership milestone |
| `sponsorOnlyGiftPaidEvent` | YouTubeEventAdapter | Gifted membership |
| `tombstone` | YouTubeChatMessageAdapter | Deleted/blocked message |

---

## Broadcast Lifecycle Events (Phase 5)

Polling every 15-30 seconds to detect state changes.

**Lifecycle States:**
- `created` - Broadcast created but incomplete settings
- `ready` - Settings complete, can transition to testing/live
- `testStarting` - Transitioning to testing
- `testing` - Broadcast only visible to broadcaster
- `liveStarting` - Transitioning to live
- `live` - Broadcast is active/visible (emit stream online event)
- `complete` - Broadcast is finished (emit stream offline event)

**Event Mapping:**
- `testStarting` → `testing` → `liveStarting` → `live` → Stream started
- `live` → `complete` → Stream ended

---

## Stream Health Events (Phase 6)

Polling every 30-60 seconds for health status changes.

**Stream Status:**
- `active` - Receiving data via stream
- `created` - No valid CDN settings yet
- `error` - Error condition exists
- `inactive` - Not receiving data
- `ready` - Has valid CDN settings

**Health Status:**
- `good` - No configuration issues
- `ok` - No error-level issues
- `bad` - Has error-level issues (emit warning event)
- `noData` - No health status data available

---

## Key Implementation Details

### SSE Streaming Connection
- **Endpoint**: `GET https://www.googleapis.com/youtube/v3/live/messages/streamList`
- **Parameters**:
  - `liveChatId` (required) - Live chat ID from video/broadcast
  - `part` (required) - `snippet,authorDetails`
  - `maxResults` (optional, default: 500) - Initial history size (0-2000)
- **Flow**:
  1. Establish SSE connection with `Accept: text/event-stream`
  2. Receive initial chat history (buffer of recent messages)
  3. Server pushes new messages as they arrive
  4. Each data chunk contains `nextPageToken` for resume capability
  5. Connection closed by server after inactivity (typically 2-3 hours)
  6. Reconnect with `pageToken` to resume from last message
- **Fallback**: If SSE fails, switch to `list` polling with `pollingIntervalMillis` (typically 5-10s)

### REST API Rate Limiting
- **Default**: 1 request/second
- **YouTube Quota**: 10,000 units/day standard quota
  - `liveChat.messages.list/streamList`: ~5 units/request
  - `videos.list`: ~1 unit/request
  - `channels.list`: ~1 unit/request
  - `liveBroadcasts.list`: ~1 unit/request
  - `liveStreams.list`: ~1 unit/request
- **HTTP 429**: Wait 5 seconds before retry
- **HTTP 401**: Token expired, refresh OAuth token
- **5xx Errors**: Exponential backoff, max 3 retries

### REST API Endpoints (YouTube Data API v3)
- **Channels**: `GET /youtube/v3/channels` - Channel profile information
- **Videos**: `GET /youtube/v3/videos` - Video details (including liveStreamingDetails)
- **LiveBroadcasts**: `GET /youtube/v3/liveBroadcasts` - Broadcast lifecycle state
- **LiveStreams**: `GET /youtube/v3/liveStreams` - Stream health/status
- **LiveChatMessages**: `GET /youtube/v3/liveChat/messages` - Chat (list/streamList)

### Event Handling
- Map-based handler pattern (no switch statements)
- Use `shared/models/src/adapters/YouTube*` for conversions
- Emit unified Event types from YouTubeStrategy
- Easy to add new events: enum entry + handler function + register()

### OAuth Integration
- Use `YouTubeOAuth` with offline access (`access_type=offline`, `prompt=consent`)
- Store refresh tokens to get new access tokens
- Handle token refresh on 401 errors

---

## Comparison with Twitch and Kick

| Aspect | Twitch | Kick | YouTube |
|--------|--------|------|---------|
| **Event System** | EventSub WebSocket (events) + IRC WebSocket (chat) | Pusher WebSocket (events + chat) | SSE Streaming (chat) + Polling (broadcast/health) |
| **Connections** | 2 connections (EventSub + IRC) | 1 connection (Pusher) | 1 SSE connection + polling intervals |
| **Event Types** | 20+ EventSub events + chat | 19+ Pusher events | 6 chat events + 8 lifecycle states + 5 health statuses |
| **Rate Limits** | Documented (WebSockets: 800 msgs/min, API: 800/min) | No documented limits (conservative) | 10,000 quota units/day (API), no HTTP limit for SSE |
| **Handler Pattern** | Map-based EventSubHandler + IRC parser | Map-based KickEventHandler | Map-based YouTubeEventHandler + Lifecycle monitor |
| **Latency** | Low (real-time WebSocket) | Low (real-time WebSocket) | Medium (SSE streaming - low latency, polling - higher latency) |
| **Fallback** | Auto-reconnect WebSocket | Auto-reconnect WebSocket | Polling fallback if SSE fails |

---

## Current Phase

- Status: Not Started

---

## Completed Phases

(None)
