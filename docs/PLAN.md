# PLAN.md

## Project Overview
Local analytics & integration tool for livestreamers (Twitch, Kick, YouTube). Provides !commands, points rewards, TTS, OBS integration via CLI, Web UI, and Streamdeck interfaces. Daemon (Express + WebSocket + SQLite) with strategy pattern for platforms.

## Current Feature
**Feature**: YouTube Platform Strategy
**Status**: **Completed** ✅ | Implementation Complete
**Completion Date**: 2026-01-28

### Overview
Complete YouTube platform integration implementing unified interfaces for OAuth, HTTP API (REST + SSE streaming), and broadcast monitoring. Establishes the final core platform strategy after Twitch and Kick.

### Implementation
@docs/feature-plans/youtube-platform-strategy.md

### Phases
- ✅ Phase 1: YouTubeStrategy Main Facade - @docs/phase-plans/youtube-platform-strategy-phase-1-facade.md
- ✅ Phase 2: REST API Client (YouTube Data API v3) - @docs/phase-plans/youtube-platform-strategy-phase-2-rest-client.md
- ✅ Phase 3: LiveChat SSE Client (Real-time + Fallback) - @docs/phase-plans/youtube-platform-strategy-phase-3-sse-client.md
- ✅ Phase 4: Chat Event Handler (All 6 Events) - @docs/phase-plans/youtube-platform-strategy-phase-4-event-handler.md
- ✅ Phase 5: Broadcast Lifecycle Monitor - @docs/phase-plans/youtube-platform-strategy-phase-5-lifecycle-monitor.md
- ✅ Phase 6: Stream Health Monitor - @docs/phase-plans/youtube-platform-strategy-phase-6-health-monitor.md
- ✅ Phase 7: YouTubeStrategy Integration - @docs/phase-plans/youtube-platform-strategy-phase-7-integration.md
- ✅ Phase 8: Final Validation and Coverage - @docs/phase-plans/youtube-platform-strategy-phase-8-final-validation.md

### Key Deliverables
- ✅ Complete YouTube platform integration with OAuth, REST API, SSE streaming, broadcast monitoring
- ✅ YouTubeStrategy facade implementing all three platform interfaces (OAuth, WebSocket, REST)
- ✅ RestClient with rate limiting, retry logic, and token refresh
- ✅ YouTubeLiveChatSSEClient with automatic reconnection and fallback to HTTP polling
- ✅ YouTubeChatPollingClient for HTTP polling fallback
- ✅ YouTubeEventHandler for all 6 chat event types
- ✅ BroadcastLifecycleMonitor for stream start-end detection
- ✅ StreamHealthMonitor for stream health diagnostics
- ✅ 147+ passing unit tests (comprehensive coverage)
- ✅ Factory pattern exports for easy instantiation

### Platform Capabilities Summary

| Platform | REST API | Real-Time Events | Real-Time Chat | Protocol |
|----------|----------|------------------|----------------|----------|
| **Twitch** | ✅ Helix API | ✅ EventSub WebSocket | ✅ IRC WebSocket | wss:// |
| **Kick** | ✅ Reverse-engineered | ✅ Pusher WebSocket | ✅ Pusher WebSocket | wss:// |
| **YouTube** | ✅ Data API v3 | ✅ SSE Streaming + Polling | ✅ SSE Streaming + Polling | SSE + HTTP |

---

## Recently Completed Features

### Twitch Platform Strategy ✅
**Status**: Complete - All phases implemented
**Completion Date**: 2026-01-23

**Implemented Phases**:
- ✅ Phase 1: Define Platform Interfaces
- ✅ Phase 2: TwitchStrategy Main Facade
- ✅ Phase 3: EventSub WebSocket Client
- ✅ Phase 4: EventSub Event Handler
- ✅ Phase 5: IRC WebSocket Client
- ✅ Phase 6: REST API Client (Minimal)
- ✅ Phase 7: TwitchStrategy Integration
- ✅ Phase 8: Unit Tests

**Key Deliverables**:
- Complete Twitch platform integration with OAuth, EventSub events, IRC chat, and REST API
- Strategy pattern for platform facades
- Map-based event handling for extensibility
- 20+ EventSub event types support
- Comprehensive unit tests

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

**Priority Order: Platforms first, then core features, then integrations**

1. Feature: Kick platform strategy (REST API + Webhooks + data translation)
2. Feature: YouTube platform strategy (REST API + Server-Stream chat + data translation)
3. Feature: Local & Cloud TTS integration (TtsService with provider selection - local TTS + cloud APIs like Google Cloud Speech, Amazon Polly, Azure Speech)
4. Feature: !commands system (CommandExecutionService sandbox + database storage + CLI/Web UI management API + integration triggers for OBS, TTS, scripts)
5. Feature: Custom points & rewards system (Cross-platform points database + redemption logic + webhook/event-driven reward processing + integration with !commands, OBS, TTS, scripts)
6. Feature: OBS WebSocket integration (ObsService beyond shared/models - scene/source control + streaming state management)
7. Feature: Stream Deck plugin & daemon API (HTTP/WebSocket endpoints for Stream Deck plugin + reference plugin implementation)
8. Feature: Nightbot integration (Full Nightbot API access + command sync + data export/import)
9. Feature: Analytics data collection (Polling APIs + raw data storage in SQLite)
10. Feature: Analytics computation backend (Aggregation services for viewer retention, engagement metrics, user LTV, most engaged chatters + query API for frontend)

## Module Backlog
(None - all features organized in upcoming section)

## Research References
- @docs/research/API-RESEARCH.md - Complete REST API field documentation
- @docs/research/twitch-websocket-apis-research.md - Twitch EventSub + IRC WebSocket
- @docs/research/obs-websocket-protocol.md - OBS WebSocket protocol (901 lines)
