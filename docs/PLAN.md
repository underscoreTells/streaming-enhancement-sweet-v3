# PLAN.md

## Project Overview
Local analytics & integration tool for livestreamers (Twitch, Kick, YouTube). Provides !commands, points rewards, TTS, OBS integration via CLI, Web UI, and Streamdeck interfaces. Daemon (Express + WebSocket + SQLite) with strategy pattern for platforms.

## Current Feature
**Feature**: Daemon Server Core
**Status**: Complete - All 10 phases implemented
**Completion Date**: 2026-01-22

**Full Implementation Plan**: @docs/feature-plans/daemon-server-core.md

### Completed Phases
- ✅ Phase 1: Configuration & Schema Updates
- ✅ Phase 2: Logger Factory
- ✅ Phase 3: Health Check Service
- ✅ Phase 4: Shutdown Handler
- ✅ Phase 5: Daemon App Orchestrator
- ✅ Phase 6: CLI Start Command
- ✅ Phase 8: Health Check Endpoint Integration

### Next Phase
**Phase 9: OAuth Integration Testing** - Comprehensive integration tests for OAuth flows (planned, not yet implemented)
**Phase 10: Documentation & Final Polish** - Complete documentation and validation

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

## Recent Fixes

### Linux Secret Service Keystore Fix ✅
**Status**: Complete
**Implementation Plan**: @docs/fixes/native-keystore-linux-secret-service.md
**Completed**: 2026-01-19

Fixed Linux Secret Service password storage by adding `sync-secret-service` feature flag to keyring crate dependency. All 265 tests now passing (was 262/265).

## Recently Completed Features

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
- Feature: Twitch platform strategy (depends on OAuth flow completion)
- Feature: Kick platform strategy
- Feature: YouTube platform strategy
- Feature: OBS WebSocket integration (ObsService)
- Feature: Local TTS integration (TtsService)
- Feature: Analytics data collection & persistence (polling APIs)

## Module Backlog
- Feature: Sandboxed !command execution (CommandExecutionService)
- Feature: Points rewards integration
- Feature: Advanced analytics computations (UI layer)