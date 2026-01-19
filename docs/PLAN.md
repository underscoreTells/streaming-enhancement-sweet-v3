# PLAN.md

## Project Overview
Local analytics & integration tool for livestreamers (Twitch, Kick, YouTube). Provides !commands, points rewards, TTS, OBS integration via CLI, Web UI, and Streamdeck interfaces. Daemon (Express + WebSocket + SQLite) with strategy pattern for platforms.

## Current Feature
**Feature**: OAuth Flow & Keystore Abstraction
**Status**: In Progress (Phase 2 Complete ✅)

**Full Implementation Plan**: @docs/feature-plans/oauth-flow-keystore.md

### Current Phase
**Phase 3: Database Schema** - SQLite database for OAuth credentials

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

### Next: Phase 3 Tasks
- [ ] Define SQLite schema with `oauth_credentials` table
- [ ] Implement migration system
- [ ] Add CRUD operations for credentials

### Dependencies
- Rust: `napi`, `napi-derive`, `serde`, `windows-rs` (Windows), `security-framework` (macOS), `keyring` (Linux)
- TypeScript: `winston`, `@streaming-enhancement/keystore-native`, `vitest`, `typescript`

### Notes
- This feature is a prerequisite for Twitch, Kick, and YouTube platform strategies
- Phase 1 and Phase 2 complete: Keystore abstraction ready for OAuth implementation
- Install script will handle Rust compilation for end users
- Branch: feature/phase2-keystore-strategy (pushed to remote)

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