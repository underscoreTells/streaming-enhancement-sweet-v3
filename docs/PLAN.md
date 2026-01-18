# PLAN.md

## Project Overview
Local analytics & integration tool for livestreamers (Twitch, Kick, YouTube). Provides !commands, points rewards, TTS, OBS integration via CLI, Web UI, and Streamdeck interfaces. Daemon (Express + WebSocket + SQLite) with strategy pattern for platforms.

## Current Feature
**Feature**: OAuth Flow & Keystore Abstraction
**Status**: In Progress

**Full Implementation Plan**: @docs/feature-plans/oauth-flow-keystore.md

### Current Phase
**Phase 1: Rust Native Binding** - Build `@streaming-enhancement/keystore-native` package

### Tasks (Phase 1)
- [x] Initialize Rust project with napi-rs
- [x] Configure Cargo.toml with platform-specific dependencies
- [x] Configure napi-rs to generate TypeScript bindings
- [x] Implement Windows Credential Manager binding
- [x] Implement macOS Keychain binding
- [x] Implement Linux Secret Service binding (using keyring crate v3.5)
- [x] Implement encryption utilities for fallback (AES-256-GCM)
- [ ] Write unit tests for each platform
- [ ] Build native addon and generate Node.js bindings

### Dependencies
- Rust: `napi`, `napi-derive`, `serde`, `windows-rs` (Windows), `security-framework` (macOS), `libsecret-sys` (Linux)

### Notes
- This feature is a prerequisite for Twitch, Kick, and YouTube platform strategies
- After Phase 1 complete: Move to Phase 2 (Keystore Strategy Pattern)
- Install script will handle Rust compilation for end users

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