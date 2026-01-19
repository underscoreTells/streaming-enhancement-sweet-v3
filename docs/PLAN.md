# PLAN.md

## Project Overview
Local analytics & integration tool for livestreamers (Twitch, Kick, YouTube). Provides !commands, points rewards, TTS, OBS integration via CLI, Web UI, and Streamdeck interfaces. Daemon (Express + WebSocket + SQLite) with strategy pattern for platforms.

## Current Feature
**Feature**: OAuth Flow & Keystore Abstraction
**Status**: In Progress (Phase 7: YouTube OAuth Implementation)

**Full Implementation Plan**: @docs/feature-plans/oauth-flow-keystore.md

### Next Phase
**Phase 6: Kick OAuth Implementation** - Platform-specific OAuth implementation for Kick

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
- [x] Add concurrent stream support via async-mutex
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

### Completed: Phase 5 - Twitch OAuth Implementation ✅
All tasks complete:
- [x] Implement Twitch specific OAuth endpoints
- [x] Create TwitchStrategy class extending OAuthFlow
- [x] Implement Twitch token exchange API calls
- [x] Implement Twitch refresh token flow
- [x] Add Twitch-specific configuration validation
- [x] Write Twitch OAuth integration tests (23 tests passing)
- [x] Add Twitch-specific error handling
- [x] Update PLAN.md upon completion

**Status**: Phase 5 complete ✅
- All 23 unit tests passing (155 total including previous phases)
- TypeScript compilation successful
- ESLint passing with no errors
- TwitchOAuth class implements OAuthFlow base class
- Credentials retrieved from database
- Tokens stored in keystore correctly
- Error handling comprehensive and tested
- Native fetch API used (Node.js 25+)
- Redirect URI configurable via OAuthConfig

### Completed: Phase 6 - Kick OAuth Implementation ✅
All tasks complete:
- [x] Implement PKCEManager standalone class with mutex for thread safety
- [x] Create PKCE utilities (code_verifier generation, code_challenge creation)
- [x] Modify OAuthFlow base class to add handleOAuthCallback method
- [x] Make generateState protected for subclass access
- [x] Make generateAuthorizationUrl accept optional state parameter
- [x] Implement Kick specific OAuth endpoints
- [x] Create KickOAuth class extending OAuthFlow with PKCE support
- [x] Implement Kick token exchange API calls with code_verifier
- [x] Implement Kick refresh token flow
- [x] Add Kick-specific configuration validation
- [x] Write PKCEManager unit tests (19 tests passing)
- [x] Write Kick OAuth integration tests (33 tests passing)
- [x] Add Kick-specific error handling (state required, verifier validation)
- [x] Update PLAN.md upon completion
- [x] Test backward compatibility with TwitchOAuth (23 tests still passing)

**Status**: Phase 6 complete ✅
- All 19 PKCEManager tests passing (122 total platform tests)
- All 33 KickOAuth tests passing (122 total platform tests including all previous)
- TypeScript compilation successful
- ESLint passing with no errors
- PKCEManager implements thread-safe verifier storage with async-mutex
- KickOAuth class extends OAuthFlow base class with PKCE integration
- State parameter validation working (throws error if not provided)
- Code_verifier generation and storage working correctly
- Code_challenge generation using SHA256 hash + base64url encoding
- Token exchange with code_verifier working
- Verifier cleanup after token exchange working
- Backward compatibility with TwitchOAuth maintained (no breaking changes)
- Credentials retrieved from database
- Tokens stored in keystore correctly
- Error handling comprehensive and tested
- Native fetch API used (Node.js 25+)
- Redirect URI configurable via OAuthConfig

### Next: Phase 7 Tasks
- [ ] Implement YouTube specific OAuth endpoints
- [ ] Create YouTubeStrategy class extending OAuthFlow
- [ ] Implement YouTube token exchange API calls
- [ ] Implement YouTube refresh token flow
- [ ] Add YouTube-specific configuration validation
- [ ] Write YouTube OAuth integration tests
- [ ] Test with YouTube sandbox environment
- [ ] Add YouTube-specific error handling
- [ ] Update PLAN.md upon completion

### Dependencies
- Rust: `napi`, `napi-derive`, `serde`, `windows-rs` (Windows), `security-framework` (macOS), `keyring` (Linux)
- TypeScript: `winston`, `@streaming-enhancement/keystore-native`, `vitest`, `typescript`, `better-sqlite3`, `zod`, `async-mutex`

### Notes
- This feature is a prerequisite for Twitch, Kick, and YouTube platform strategies
- Phase 1, 2, 3, 4, and 5 complete: Keystore, database, OAuth base abstraction, and Twitch OAuth ready
- Phase 6 in progress: Kick OAuth implementation
- Install script will handle Rust compilation for end users
- Database uses WAL mode for better concurrency
- Proxy pattern ensures single writer via async-mutex
- Scopes stored as comma-separated string, returned as string[] to consumers
- Phase 3 merged to main on 2024-12-17
- Phase 4 completed on 2026-01-19
- Phase 5 completed on 2026-01-19
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