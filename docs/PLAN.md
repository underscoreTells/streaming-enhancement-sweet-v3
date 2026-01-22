# PLAN.md

## Project Overview
Local analytics & integration tool for livestreamers (Twitch, Kick, YouTube). Provides !commands, points rewards, TTS, OBS integration via CLI, Web UI, and Streamdeck interfaces. Daemon (Express + WebSocket + SQLite) with strategy pattern for platforms.

## Current Feature
**Feature**: Shared Data Models
**Status**: In Progress - Phases 1-6 Complete, 6 of 13 phases complete (46%)
**Estimated Effort**: 85-105 hours

**Full Implementation Plan**: @docs/feature-plans/shared-data-models.md

**Research References:**
- @docs/research/API-RESEARCH.md - Complete REST API field documentation
- @docs/research/twitch-websocket-apis-research.md - Twitch EventSub + IRC WebSocket
- @docs/research/obs-websocket-protocol.md - OBS WebSocket protocol (NEW)

**Key Innovations:**
- Minimal platform-specific types (NO optional field soup)
- Adapter/translator layer hides platform complexity
- Separated static vs live data (Stream vs StreamStats)
- Unified Stream & User wrappers for cross-platform scenarios
- OBS-driven stream lifecycle via WebSocket integration
 - Stream matching for late data reconstruction (+/- 10 min window)

### Overview
Create unified, platform-agnostic data types for streaming data across Twitch (EventSub + IRC WebSocket), Kick (REST + Webhooks), and YouTube (REST + Server-Stream chat). This is a foundational feature for all platform strategies.

### Platform Capabilities Summary

| Platform | REST API | Real-Time Events | Real-Time Chat | Protocol |
|----------|----------|------------------|----------------|----------|
| **Twitch** | ✅ Helix API | ✅ EventSub WebSocket | ✅ IRC WebSocket | wss:// |
| **Kick** | ✅ @docs.kick.com | ✅ Webhooks | ✅ Webhooks | HTTPS |
| **YouTube** | ✅ Data API v3 | ⚠️ Limited (Polling) | ✅ Server-Stream HTTP | HTTP/gRPC |

### Completed Phases (1-6)
1. **✅ Phase 1: Module Structure Setup** - TypeScript, Vitest, build scripts
2. **✅ Phase 2: Platform-Specific Base Types** - Platform, Stream, User types
3. **✅ Phase 3: Live Data Types** - StreamStats interface
4. **✅ Phase 4: Converter Layer** - TwitchConverter, KickConverter, YouTubeConverter
5. **✅ Phase 5: Adapter Interfaces** - StreamAdapter, UserAdapter, ChatMessageAdapter, EventAdapter
6. **✅ Phase 6: Adapter Implementations** - Concrete adapters + unified Stream/User wrappers

### Remaining Phases (7-13)
7. **Phase 7: Translator Layer** - Create adapters from platform types
8. **Phase 8: Category Cache Implementation** - InMemoryCategoryCache, DatabaseCategoryCache
9. **Phase 9: Stream Matcher** - Stream matching for late data reconstruction
10. **Phase 10: User Matcher** - Cross-platform user linking framework
11. **Phase 11: OBS WebSocket Integration** - ObsWebSocketClient, ObsStreamDetector
12. **Phase 12: Integration Tests** - End-to-end testing
13. **Phase 13: Documentation** - Architecture docs, field mapping tables

### Key Deliverables (So Far)
- ✅ Complete type definitions with @docs/research/API-RESEARCH.md field mappings
- ✅ Platform data converters (Twitch, Kick, YouTube)
- ✅ Adapter interfaces and implementations (Stream, User, ChatMessage, Event)
- ✅ Unified Stream and User wrapper types
- ✅ 87 unit tests passing (including converter and adapter tests)
- ⏳ 100% test coverage for validators (in progress)
- ⏳ Comprehensive documentation (Phase 13)

---

## Recent Fixes

### Linux Secret Service Keystore Fix ✅
**Status**: Complete
**Implementation Plan**: @docs/fixes/native-keystore-linux-secret-service.md
**Completed**: 2026-01-19

Fixed Linux Secret Service password storage by adding `sync-secret-service` feature flag to keyring crate dependency. All 265 tests now passing (was 262/265).

## Recently Completed Features

### Daemon Server Core ✅
**Status**: Complete - All 10 phases implemented
**Completion Date**: 2026-01-22
**Implementation Plan**: @docs/feature-plans/daemon-server-core.md

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
- **Feature: Shared Data Models** (CURRENT - prerequisite for all platform strategies)
- Feature: Twitch platform strategy (EventSub WebSocket + IRC WebSocket)
- Feature: Kick platform strategy (REST API + Webhooks)
- Feature: YouTube platform strategy (REST API + Server-Stream chat)
- Feature: OBS WebSocket integration (ObsService)
- Feature: Local TTS integration (TtsService)
- Feature: Analytics data collection & persistence (polling APIs)

## Module Backlog
- Feature: Sandboxed !command execution (CommandExecutionService)
- Feature: Points rewards integration
- Feature: Advanced analytics computations (UI layer)