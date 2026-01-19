# PLAN.md

## Project Overview
Local analytics & integration tool for livestreamers (Twitch, Kick, YouTube). Provides !commands, points rewards, TTS, OBS integration via CLI, Web UI, and Streamdeck interfaces. Daemon (Express + WebSocket + SQLite) with strategy pattern for platforms.

## Current Feature
**Feature**: OAuth Flow & Keystore Abstraction
**Status**: Complete ✅ (Phases 1-8)

**Full Implementation Plan**: @docs/feature-plans/oauth-flow-keystore.md

### Feature Complete ✅
OAuth Flow & Keystore Abstraction complete (Phases 1-8). Daemon server integration moved to **Daemon Server Core** feature (see @docs/module-plans/module-server-daemon.md).

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
- [x] Remove handleOAuthCallback method from OAuthFlow base class (platform-specific implementations handle callbacks directly)
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
- All 19 PKCEManager tests passing (174 total tests: 155 Phase 5 + 19 PKCEManager)
- All 33 KickOAuth tests passing (207 total tests: 155 Phase 5 + 19 PKCEManager + 33 KickOAuth)
- TypeScript compilation successful
- ESLint passing with no errors
- PKCEManager implements thread-safe verifier storage with async-mutex
- PKCEManager includes 10 minute TTL with 5 minute cleanup interval for automatic verifier cleanup
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
- Native fetch API used (Node.js 21+)
- Redirect URI configurable via OAuthConfig

### Completed: Phase 8 - HTTP Endpoints Implementation ✅
All tasks complete:
- [x] Create DaemonServer class for Express server
- [x] Implement OAuthStateManager for state → username tracking (5-minute TTL, mutex for thread safety)
- [x] Create OAuthController with 5 REST API endpoints
- [x] Implement GET /oauth/start/:platform/:username - Generate auth URL with state
- [x] Implement GET /oauth/callback/:platform/:state - Handle OAuth callback, return HTML
- [x] Implement POST /oauth/credentials/:platform - Add/update OAuth client credentials
- [x] Implement GET /oauth/status/:platform/:username - Return token status
- [x] Implement DELETE /oauth/:platform/:username - Revoke token
- [x] Make OAuthFlow.generateAuthorizationUrl async for Kick PKCE support
- [x] Add handleOAuthCallback method to all platform OAuth classes
- [x] Write OAuthController unit tests (24 tests)
- [x] Remove .optional() from OAuthConfig in schema (always provided by default config)
- [x] Fix platforms/index.ts duplicate exports (rename to platform-specific names)
- [x] Update PLAN.md upon completion

**Status**: Phase 8 complete ✅
- All 97 OAuth-related tests passing (233 Phase 7 + 97 Phase 8 new OAuth-related tests)
- TypeScript compilation successful
- ESLint passing with no errors
- DaemonServer class with start(), stop(), attachRoutes() methods
- OAuthStateManager stores state → username mapping with 5-minute TTL
- OAuthStateManager uses mutex for thread-safe operations
- OAuthController implements all 5 required endpoints
- Platform-specific OAuth classes all support handleOAuthCallback
- KickOAuth uses PKCE with code_verifier and code_challenge
- YouTubeOAuth uses offline access for refresh tokens
- HTML callback template with platform-specific colors and logos
- CORS enabled for localhost:3000
- JSON and URL-encoded request body parsing
- Zod validation for platform and credentials parameters

### OAuth Feature Complete ✅
All OAuth flow phases complete (1-8). Daemon server integration moved to **Daemon Server Core** feature.

### Dependencies
- Rust: `napi`, `napi-derive`, `serde`, `windows-rs` (Windows), `security-framework` (macOS), `keyring` (Linux)
- TypeScript: `winston`, `@streaming-enhancement/keystore-native`, `vitest`, `typescript`, `better-sqlite3`, `zod`, `async-mutex`

### Notes
- This feature is a prerequisite for Twitch, Kick, and YouTube platform strategies
- Phase 1, 2, 3, 4, 5, 6, 7, and 8 complete: Keystore, database, OAuth base abstraction, Twitch OAuth, Kick OAuth with PKCE, YouTube OAuth, HTTP endpoints ready
- Feature complete ✅ - Daemon server integration moved to Daemon Server Core feature
- Database uses WAL mode for better concurrency
- Proxy pattern ensures single writer via async-mutex
- Scopes stored as comma-separated string, returned as string[] to consumers
- Phase 3 merged to main on 2024-12-17
- Phase 4 completed on 2026-01-19
- Phase 5 completed on 2026-01-19
- Phase 6 completed on 2026-01-19
- Phase 7 completed on 2026-01-19
- Phase 8 completed on 2026-01-19
- OAuth base layer supports concurrent flows and platform-specific callback styling
- HTML template uses inline SVG logos for professional appearance (Twitch purple, Kick green, YouTube red)
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