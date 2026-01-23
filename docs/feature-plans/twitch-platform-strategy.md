# Feature Plan: Twitch Platform Strategy

## Overview

Complete Twitch platform integration implementing unified interfaces for OAuth, WebSocket (EventSub + IRC), and REST API. Establishes patterns for Kick and YouTube strategies.

## Scope & Deliverables

**Completed Features (Pre-requisites)**
- ✅ Shared data models (adapters, converters)
- ✅ OAuth flow and keystore
- ✅ Daemon Server Core

**Feature Deliverables**
- [ ] Separate interfaces: PlatformOAuthStrategy, PlatformWebSocketStrategy, PlatformRestStrategy
- [ ] TwitchStrategy implementing all three interfaces
- [ ] EventSub WebSocket client (leverages ws library)
- [ ] Map-based EventSub event handler (8 event types)
- [ ] IRC WebSocket client (send + receive chat)
- [ ] REST API client with rate limiting (getUser endpoints)
- [ ] Unit tests (>90% coverage)

## Architecture

### Component Structure
```
packages/server-daemon/platforms/
├── interfaces/
│   ├── PlatformOAuthStrategy.ts      # OAuth flow interface
│   ├── PlatformWebSocketStrategy.ts  # WebSocket connections
│   └── PlatformRestStrategy.ts       # REST API
├── Twitch/
│   ├── TwitchStrategy.ts             # Main facade
│   ├── auth/
│   │   └── TwitchOAuth.ts            # Existing
│   ├── eventsub/
│   │   ├── EventSubClient.ts         # WebSocket client
│   │   ├── EventSubSubscription.ts   # Subscription management
│   │   ├── EventSubHandler.ts        # Map-based handler
│   │   └── types.ts                  # EventSub types
│   ├── irc/
│   │   ├── IrcClient.ts              # IRC WebSocket
│   │   ├── IrcMessageParser.ts       # IRC parsing
│   │   └── types.ts                  # IRC types
│   ├── rest/
│   │   ├── RestClient.ts             # REST client
│   │   ├── getUser.ts                # User lookup
│   │   └── types.ts                  # REST types
│   ├── http.ts                       # Existing
│   ├── factory.ts                    # Existing
│   └── index.ts
├── PlatformStrategy.ts               # Reference interfaces
└── index.ts
```

### Key Decisions

- **Separate interfaces**: OAuth, WebSocket, REST implemented independently
- **ws library**: Handles WebSocket connections (add as dependency)
- **EventSub handler**: Map-based registration (no giant switch statement)
- **Two WebSocket clients**: EventSub for events, IRC for chat (send + receive)
- **Minimal REST**: getUser() for username→user_id resolution only
- **Extensibility**: Add new EventSub event in ~5 lines (enum + handler + register)

### Data Flow
```
DaemonApp → TwitchStrategy → EventSubClient → EventSubHandler → Shared models
                                  ↓
                            IrcClient → Chat messages → Shared models
                                  ↓
                            RestClient → getUser() → user_id
```

## Phases

- Phase 1: Define Platform Interfaces
- Phase 2: TwitchStrategy Main Facade
- Phase 3: EventSub WebSocket Client
- Phase 4: EventSub Event Handler
- Phase 5: IRC WebSocket Client
- Phase 6: REST API Client (Minimal)
- Phase 7: TwitchStrategy Integration
- Phase 8: Unit Tests

## Dependencies

### External Libraries
- `ws` - WebSocket library (add to package.json)
- Node.js EventEmitter - Already used

### Internal Dependencies
- Shared models (complete): TwitchConverter, TwitchEventAdapter, TwitchChatMessageAdapter, TwitchUserAdapter
- OAuth infrastructure (complete): TwitchOAuth, KeystoreManager, OAuthCredentialsRepository
- Daemon Server Core (complete): Logger

### Research Documentation
- @docs/research/twitch-websocket-apis-research.md
- @docs/research/API-RESEARCH.md
- @shared/models/README.md

## Files Summary

### New Files (~20 files)
**Interfaces (4)**
- interfaces/PlatformOAuthStrategy.ts
- interfaces/PlatformWebSocketStrategy.ts
- interfaces/PlatformRestStrategy.ts
- interfaces/index.ts

**TwitchStrategy Core (1)**
- Twitch/TwitchStrategy.ts

**EventSub (4)**
- Twitch/eventsub/EventSubClient.ts
- Twitch/eventsub/EventSubSubscription.ts
- Twitch/eventsub/EventSubHandler.ts
- Twitch/eventsub/types.ts

**IRC (3)**
- Twitch/irc/IrcClient.ts
- Twitch/irc/IrcMessageParser.ts
- Twitch/irc/types.ts

**REST (3)**
- Twitch/rest/RestClient.ts
- Twitch/rest/getUser.ts
- Twitch/rest/types.ts

**Tests (8)**
- __tests__/platforms/Twitch/**/*.test.ts

**Dependencies (1)**
- package.json (add ws)

### Modified Files (~5)
- platforms/PlatformStrategy.ts
- platforms/Twitch/TwitchOAuth.ts
- platforms/Twitch/index.ts
- platforms/Twitch/http.ts
- platforms/Twitch/factory.ts

## Current Phase

- Status: In Progress
- Active Phase Plan: @docs/phase-plans/twitch-platform-strategy-phase-2-facade.md

## Completed Phases

- ✅ Phase 1: Define Platform Interfaces - @docs/archive/phase-plans/twitch-platform-strategy-phase-1-interfaces.md (2026-01-23)
