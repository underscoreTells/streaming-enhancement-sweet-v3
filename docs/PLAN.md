# PLAN.md

## Project Overview
Local analytics & integration tool for livestreamers (Twitch, Kick, YouTube). Provides !commands, points rewards, TTS, OBS integration via CLI, Web UI, and Streamdeck interfaces. Daemon (Express + WebSocket + SQLite) with strategy pattern for platforms.

## Current Feature
**Feature**: OAuth Flow & Keystore Abstraction
**Status**: In Progress (Phase 5: Twitch OAuth Implementation)

**Full Implementation Plan**: @docs/feature-plans/oauth-flow-keystore.md

### Current Phase
**Phase 5: Twitch OAuth Implementation** - Platform-specific OAuth implementation for Twitch

### Completed: Phase 1 - Rust Native Binding ✅
All tasks complete:
- [x] Initialize Rust project with napi-rs
- [x] Configure Cargo.toml with platform-specific dependencies
- [x] Configure napi-rs to generate TypeScript bindings
- [x] Implement Windows Credential Manager binding
- [x] Implement macOS Keychain binding
- [x] Implement Linux Secret Service binding (using keyring crate v3.5)
- [x] Implement encryption utilities for fallback (AES-256-GCM)
- [x] Write unit tests for each platform
- [x] Build native addon and generate Node.js bindings

**Status**: Phase 1 complete ✅
- All 22 unit tests passing
- Release build successful
- Critical bugs fixed (use-after-free, fragile error handling)

### Completed: Phase 2 - Keystore Strategy Pattern ✅
All tasks complete:
- [x] Define `KeystoreStrategy` interface
- [x] Implement `WindowsKeystoreStrategy`
- [x] Implement `MacosKeystoreStrategy`
- [x] Implement `LinuxKeystoreStrategy`
- [x] Implement `EncryptedFileStrategy` (fallback)
- [x] Implement `KeystoreManager` with platform detection

**Status**: Phase 2 complete ✅
- All 12 unit tests passing
- TypeScript compilation successful
- Platform detection working
- Fallback to encrypted file working
- Winston logging configured (no emojis)
- Error codes defined and used

### Completed: Phase 3 - Database Schema ✅
All tasks complete:
- [x] Define SQLite schema with `oauth_credentials` table
- [x] Implement migration system with timestamp-based naming
- [x] Add CRUD operations for credentials
- [x] Add Zod config validation
- [x] Implement DatabaseConnection class
- [x] Implement DatabaseProxy with async-mutex write serialization
- [x] Implement OAuthCredentialsRepository with scope validation
- [x] Add DatabaseFactory for dependency injection
- [x] Write comprehensive unit tests (83 tests passing)
- [x] Implement file permissions (0600/0700)
- [x] Add Winston logging (no emojis)

**Status**: Phase 3 complete ✅
- All 83 unit tests passing
- TypeScript compilation successful
- Database tables created with proper schema
- Migrations run automatically on initialization
- Repository validates platforms via Zod
- Proxy serializes writes with async-mutex
- Zod config validation working
- ESLint passing with no errors

### Completed: Phase 4 - OAuth Base Layer ✅
All tasks complete:
- [x] Define `TokenSet` interface with serialization helpers
- [x] Define base `PlatformStrategy` interface with OAuth methods
- [x] Implement base `OAuthFlow` class
- [x] Add state generation and validation (CSRF protection with crypto.randomBytes)
- [x] Implement "Authentication Complete" HTML page template for OAuth callbacks
- [x] Add OAuth error handling with error codes and type guards
- [x] Implement token refresh logic with 5-minute buffer
- [x] Add并发流 support via async-mutex
- [x] Write comprehensive unit tests (45 tests passing)
- [x] Create mock utilities for testing
- [x] Platform-specific HTML template with inline SVG logos

**Status**: Phase 4 complete ✅
- All 45 unit tests passing (132 total including previous phases)
- TypeScript compilation successful
- ESLint passing with no errors
- Token serialization/deserialization working
- State generation secure and unique
- Refresh timing calculation accurate
- HTML template renders correctly for all platforms
- Concurrent OAuth flows supported

### Next: Phase 5 Tasks
- [ ] Implement Twitch specific OAuth endpoints
- [ ] Create TwitchStrategy class extending OAuthFlow
- [ ] Implement Twitch token exchange API calls
- [ ] Implement Twitch refresh token flow
- [ ] Add Twitch-specific configuration validation
- [ ] Add Twitch OAuth credentials to database schema
- [ ] Write Twitch OAuth integration tests
- [ ] Test with Twitch sandbox environment
- [ ] Add Twitch-specific error handling
- [ ] Update PLAN.md upon completion

### Dependencies
- Rust: `napi`, `napi-derive`, `serde`, `windows-rs` (Windows), `security-framework` (macOS), `keyring` (Linux)
- TypeScript: `winston`, `@streaming-enhancement/keystore-native`, `vitest`, `typescript`, `better-sqlite3`, `zod`, `async-mutex`

### Notes
- This feature is a prerequisite for Twitch, Kick, and YouTube platform strategies
- Phase 1, 2, 3, and 4 complete: Keystore, database, and OAuth base abstraction ready for platform implementations
- Phase 5 in progress: Twitch OAuth implementation
- Install script will handle Rust compilation for end users
- Database uses WAL mode for better concurrency
- Proxy pattern ensures single writer via async-mutex
- Scopes stored as comma-separated string, returned as string[] to consumers
- Phase 3 merged to main on 2024-12-17
- Phase 4 completed on 2025-01-19
- OAuth base layer supports concurrent flows and platform-specific callback styling
- HTML template uses inline SVG logos for professional appearance (Twitch purple, Kick green, YouTube red)

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