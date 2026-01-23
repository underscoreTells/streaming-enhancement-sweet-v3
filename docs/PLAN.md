# PLAN.md

## Project Overview
Local analytics & integration tool for livestreamers (Twitch, Kick, YouTube). Provides !commands, points rewards, TTS, OBS integration via CLI, Web UI, and Streamdeck interfaces. Daemon (Express + WebSocket + SQLite) with strategy pattern for platforms.

## Current Feature
**Feature**: Twitch Platform Strategy
**Status**: In Progress (Planning complete)

### Overview
Complete Twitch platform integration implementing unified interfaces for OAuth, WebSocket (EventSub + IRC), and REST API. Establishes patterns for Kick and YouTube platform strategies.

### Implementation
@docs/feature-plans/twitch-platform-strategy.md

### Current Phase
**Phase**: Phase 6 - REST API Client (Minimal)
**Status**: In Progress

### Completed Phases
- ✅ Phase 1: Define Platform Interfaces - @docs/phase-plans/twitch-platform-strategy-phase-1-interfaces.md
- ✅ Phase 2: TwitchStrategy Main Facade - @docs/phase-plans/twitch-platform-strategy-phase-2-facade.md
- ✅ Phase 3: EventSub WebSocket Client - @docs/phase-plans/twitch-platform-strategy-phase-3-eventsub-client.md
- ✅ Phase 4: EventSub Event Handler - @docs/phase-plans/twitch-platform-strategy-phase-4-eventsub-handler.md
- ✅ Phase 5: IRC WebSocket Client - @docs/phase-plans/twitch-platform-strategy-phase-5-irc-client.md

### Platform Capabilities Summary

| Platform | REST API | Real-Time Events | Real-Time Chat | Protocol |
|----------|----------|------------------|----------------|----------|
| **Twitch** | ✅ Helix API | ✅ EventSub WebSocket | ✅ IRC WebSocket | wss:// |
| **Kick** | ✅ @docs.kick.com | ✅ Webhooks | ✅ Webhooks | HTTPS |
| **YouTube** | ✅ Data API v3 | ⚠️ Limited (Polling) | ✅ Server-Stream HTTP | HTTP/gRPC |

---

## Recently Completed Features

### Shared Data Models ✅
**Status**: Complete - All phases implemented
**Completion Date**: 2026-01-22

**Implemented Phases**:
- ✅ Phases 1-7 (types, adapters, translators)
- ⏭️ Phase 8 (Category Cache - removed, UI handles it)
- ✅ Phase 9 (Stream Matcher)
- ⏭️ Phase 10 (User Matcher - removed, manual linking only)
- ✅ Phase 11 (OBS WebSocket Integration)
- ✅ Phase 12 (Integration Tests)
- ✅ Phase 13 (Documentation)

**Key Deliverables**:
- Complete type definitions with @docs/research/API-RESEARCH.md field mappings
- Platform data converters (Twitch, Kick, YouTube)
- Adapter interfaces and implementations (Stream, User, ChatMessage, Event)
- Unified Stream and User wrapper types
- Stream matching for late data reconstruction (85-90% overlap threshold)
- OBS WebSocket integration (ObsWebSocketClient + ObsStreamDetector)
- 221 unit + integration tests (95%+ coverage)

**Notes**:
- ObsWebSocketClient: Thin wrapper around ws library (not obs-websocket-js)
- ObsStreamDetector: Service layer with state machine for stream lifecycle
- Stream matching handles historical data reconstruction with conservative threshold
- Category cache deferred to UI layer (category_id → name resolution)
- User matcher removed (cross-platform chatter linking infeasible without identity verification)
- Platform streams stored separately (PlatformStreamRecord) with lazy loading
- StreamService interface for database operations (concrete implementation in server-daemon)

**Documentation**:
- Architecture: @docs/architecture/shared-data-models.md
- Field Mapping: @docs/architecture/stream-field-mapping.md
- Summary: @docs/archive/shared-data-models-summary.md
- README: @shared/models/README.md

---

### Daemon Server Core ✅
**Status**: Complete - All phases implemented
**Completion Date**: 2026-01-22

### Completed Phases
- ✅ Phase 1: Configuration & Schema Updates
- ✅ Phase 2: Logger Factory
- ✅ Phase 3: Health Check Service
- ✅ Phase 4: Shutdown Handler
- ✅ Phase 5: Daemon App Orchestrator
- ✅ Phase 6: CLI Start Command
- ✅ Phase 8: Health Check Endpoint Integration
- ✅ Phase 10: Documentation & Final Polish

### Deferred Work
- ⏭️ Phase 9: OAuth Integration Testing (deferred - OAuth already has 252 comprehensive unit tests)

### Overview
Create executable daemon server with initialization orchestration, health checks, graceful shutdown, and CLI foundation for future administrative commands (similar to tailscaled). This feature provides the foundation for running the streaming enhancement service as a proper daemon process.

### Key Components
- **CLI Command**: `streaming-daemon start [--port PORT] [--config PATH] [--log-level LEVEL]`
- **Health Check**: GET /status (localhost only) with component-level status
- **Graceful Shutdown**: SIGTERM/SIGINT handlers with configurable timeout (default 10s)
- **Logging**: Console + rotating file, same level for both
- **Config Overrides**: CLI flags override config file values
- **Exit Codes**: 0 (success), 1 (config error), 2 (init error), 3 (startup error)

### Dependencies
- `commander` ^11.1.0 - CLI framework
- `winston-daily-rotate-file` ^5.0.0 - Rotating file logging

---

### OAuth Flow & Keystore Abstraction ✅
**Status**: Complete (Phases 1-8)
**Implementation Plan**: @docs/archive/feature-plans/oauth-flow-keystore.md
**Completed**: 2026-01-19

All OAuth flow phases complete (1-8). 252/252 unit tests passing. Daemon server integration moved to Daemon Server Core feature.

Key achievements:
- ✅ Rust native keystore binding (Windows, macOS, Linux) with encrypted file fallback
- ✅ Keystore strategy pattern with platform detection
- ✅ SQLite database schema with migrations (oauth_credentials table)
- ✅ OAuth base abstraction with concurrent flow support
- ✅ Twitch OAuth implementation
- ✅ Kick OAuth implementation with PKCE
- ✅ YouTube OAuth implementation with offline access
- ✅ HTTP endpoints for token management (5 REST endpoints)

### Notes
- This feature is a prerequisite for Twitch, Kick, and YouTube platform strategies
- Database uses WAL mode for better concurrency
- Proxy pattern ensures single writer via async-mutex
- Scopes stored as comma-separated string, returned as string[] to consumers
- Kick OAuth uses PKCE (Proof Key for Code Exchange) with code_verifier and code_challenge
- YouTube OAuth uses offline access with refresh tokens via access_type=offline and prompt=consent

## Current Module
**Module**: server-daemon
**Details**: See @docs/module-plans/module-server-daemon.md

## Upcoming in This Module
- Feature: Kick platform strategy (REST API + Webhooks)
- Feature: YouTube platform strategy (REST API + Server-Stream chat)
- Feature: OBS WebSocket integration (ObsService beyond shared/models)
- Feature: Local TTS integration (TtsService)
- Feature: Analytics data collection & persistence (polling APIs)

## Module Backlog
- Feature: Sandboxed !command execution (CommandExecutionService)
- Feature: Points rewards integration
- Feature: Advanced analytics computations (UI layer)

## Research References
- @docs/research/API-RESEARCH.md - Complete REST API field documentation
- @docs/research/twitch-websocket-apis-research.md - Twitch EventSub + IRC WebSocket
- @docs/research/obs-websocket-protocol.md - OBS WebSocket protocol (901 lines)
