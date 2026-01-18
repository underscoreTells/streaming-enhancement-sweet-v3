# Feature Plan: OAuth Flow & Keystore

## Overview
Implement secure OAuth 2.0 token management for streaming platforms (Twitch, Kick, YouTube) with platform-specific keystore storage using Rust + napi-rs bindings, strategy pattern abstraction, and encrypted file fallback.

## Scope & Deliverables
- [ ] Rust native keystore binding package: `@streaming-enhancement/keystore-native`
- [ ] Keystore strategy pattern implementation with platform-specific strategies
- [ ] Encrypted file fallback (AES-256-GCM)
- [ ] Twitch OAuth implementation (as proof of concept before Kick/YouTube)
- [ ] HTTP OAuth endpoints for token management
- [ ] CLI commands for OAuth credential and token management
- [ ] Install script with Rust compilation support
- [ ] Comprehensive tests for all components

## Architecture
**Pattern details**: @architecture/keystore-strategy-pattern.md

### Project Structure
```
packages/
├── keystore-native/
│   ├── src/
│   │   ├── lib.rs
│   │   ├── platform/windows.rs
│   │   ├── platform/macos.rs
│   │   ├── platform/linux.rs
│   │   └── crypto.rs
│   ├── npm/
│   ├── Cargo.toml
│   └── package.json
└── server-daemon/
    ├── infrastructure/keystore/
    │   ├── strategies/
    │   │   ├── KeystoreStrategy.ts
    │   │   ├── WindowsKeystoreStrategy.ts
    │   │   ├── MacosKeystoreStrategy.ts
    │   │   ├── LinuxKeystoreStrategy.ts
    │   │   └── EncryptedFileStrategy.ts
    │   └── KeystoreManager.ts
    ├── infrastructure/database/
    │   ├── schema.ts
    │   └── migrations/
    ├── platforms/Twitch/
    │   ├── TwitchOAuth.ts
    │   └── TwitchStrategy.ts
    └── controllers/OAuthController.ts
```

### Token Storage
- **Keystore entry**: `service='streaming-enhancement'`, `account='oauth:{platform}:{username}'`
- **TokenSet structure**:
  ```typescript
  interface TokenSet {
    access_token: string;
    refresh_token?: string;
    expires_at: Date;
    refresh_at: Date;  // 5 min before expires_at
    scope: string[];
  }
  ```

### Client Credentials Storage
- SQLite `oauth_credentials` table:
  ```sql
  CREATE TABLE oauth_credentials (
    platform TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    client_secret TEXT NOT NULL,
    scopes TEXT,
    created_at TIMESTAMP
  );
  ```

## Implementation Phases

### Phase 1: Rust Native Binding
**Dependencies**: `napi`, `napi-derive`, `serde`
**Package**: `@streaming-enhancement/keystore-native`
**Status**: ✅ Complete

- [x] Initialize Rust project with napi-rs
- [x] Configure Cargo.toml with platform-specific dependencies
- [x] Configure napi-rs to generate TypeScript bindings
- [x] Implement Windows Credential Manager binding (`src/platform/windows.rs`)
  - Use `windows-rs` crate (v0.58)
  - `set_password()`, `get_password()`, `delete_password()`, `is_available()`
- [x] Implement macOS Keychain binding (`src/platform/macos.rs`)
  - Use `security-framework` crate (v2.11)
  - `set_password()`, `get_password()`, `delete_password()`, `is_available()`
- [x] Implement Linux Secret Service binding (`src/platform/linux.rs`)
  - Use `keyring` crate (v3.5) - better API compatibility than libsecret-sys
  - `set_password()`, `get_password()`, `delete_password()`, `is_available()`
  - Pattern matching on `keyring::Error::NoEntry` for reliable error detection
- [x] Implement encryption utilities for fallback (`src/platform/fallback.rs`)
  - AES-256-GCM encryption
  - Platform-specific key storage paths
  - Key generation and management
- [x] Write unit tests for each platform (22 tests total)
  - Windows: 9 tests
  - macOS: 9 tests
  - Linux: 9 tests (with conditional skip when Secret Service unavailable)
  - Fallback: 13 tests (including encryption verification and persistence)
- [x] Configure `build.rs` for conditional compilation
- [ ] Package and publish to npm (or build into monorepo)
  - Requires npm for TypeScript generation
  - Release build successful with cargo

**Output**: ✅ Native Node.js addon with TypeScript type definitions (ready for npm packaging)

**Notes**:
- Critical bugs fixed during development:
  - Use-after-free in Windows Credential Manager (temporary HSTRING released before CredWriteW)
  - Fragile error handling in Linux keystore (string matching replaced with pattern matching)
- All tests passing
- Release build completed successfully

---

### Phase 2: Keystore Strategy Pattern
**Dependencies**: `@streaming-enhancement/keystore-native`

- [ ] Define `KeystoreStrategy` interface:
  ```typescript
  interface KeystoreStrategy {
    setPassword(service: string, account: string, password: string): Promise<void>;
    getPassword(service: string, account: string): Promise<string | null>;
    deletePassword(service: string, account: string): Promise<boolean>;
    isAvailable(): boolean;
  }
  ```
- [ ] Implement `WindowsKeystoreStrategy`
  - Wrap native Windows binding
  - Handle errors gracefully
- [ ] Implement `MacosKeystoreStrategy`
  - Wrap native macOS binding
  - Handle errors gracefully
- [ ] Implement `LinuxKeystoreStrategy`
  - Wrap native Linux binding
  - Handle errors gracefully
- [ ] Implement `EncryptedFileStrategy` (fallback)
  - Use Node.js `crypto` module with AES-256-GCM
  - Store key in `~/.config/streaming-enhancement/file.key` (mode 0600)
  - Store encrypted data in `~/.local/share/streaming-enhancement/keystore.json` (mode 0600)
  - Create directories with mode 0700 if needed
- [ ] Implement `KeystoreManager`
  - Auto-detect platform using `process.platform`
  - Try native keystore strategy first
  - Fall back to `EncryptedFileStrategy` if native unavailable
  - Provide status method (which strategy in use, available or not)
- [ ] Add availability check on server startup
  - Log which keystore strategy is active
  - Warn if only fallback available

**Output**: TypeScript strategy pattern with platform detection and automatic fallback

---

### Phase 3: Database Schema
**Dependencies**: `better-sqlite3`

- [ ] Define SQLite schema with `oauth_credentials` table
- [ ] Implement migration system
- [ ] Create initial migration:
  ```sql
  CREATE TABLE oauth_credentials (
    platform TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    client_secret TEXT NOT NULL,
    scopes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX idx_oauth_credentials_platform ON oauth_credentials(platform);
  ```
- [ ] Add CRUD operations:
  - `addCredential(platform, clientId, clientSecret, scopes)`
  - `getCredential(platform)`
  - `updateCredential(platform, clientId, clientSecret, scopes)`
  - `deleteCredential(platform)`
  - `listCredentials()`
- [ ] Add validation:
  - Platform must be valid (twitch, kick, youtube)
  - client_id and client_secret required
- [ ] Write unit tests for CRUD operations

**Output**: Database schema and migration system with OAuth credential management

---

### Phase 4: OAuth Base Layer
**Location**: `packages/server-daemon/platforms/`

- [ ] Define `TokenSet` interface:
  ```typescript
  export interface TokenSet {
    access_token: string;
    refresh_token?: string;
    expires_at: Date;
    refresh_at: Date;
    scope: string[];
  }
  ```
- [ ] Define base `PlatformStrategy` interface with OAuth methods:
  ```typescript
  interface PlatformStrategy {
    startOAuth(username: string): Promise<string>;
    handleCallback(code: string, state: string): Promise<TokenSet>;
    getAccessToken(username: string): Promise<TokenSet>;
    refreshToken(username: string): Promise<TokenSet>;
  }
  ```
- [ ] Implement base `OAuthFlow` class:
  - Start OAuth (generate auth URL with state)
  - Start short-lived HTTP server on random port for redirect
  - Serve "Ok" HTML page on callback
  - Handle OAuth callback (exchange code for tokens)
  - Store tokens via KeystoreManager
  - Get access token (with refresh on 401)
  - Refresh token logic
- [ ] Add state generation and validation (CSRF protection)
- [ ] Add refresh timing logic:
  - Calculate `refresh_at` as `expires_at - 5 minutes`
  - If no `expires_at`, use default (24 hours)
- [ ] Implement "Ok" HTML page template:
  ```html
  <!DOCTYPE html>
  <html>
  <head><title>OAuth Callback Received</title></head>
  <body>
    <h1>Ok</h1>
    <p>OAuth callback received successfully. You can close this window.</p>
    <script>window.close();</script>
  </body>
  </html>
  ```

**Output**: Base OAuth infrastructure reusable by all platforms

---

### Phase 5: Twitch OAuth
**Location**: `packages/server-daemon/platforms/Twitch/`

- [ ] Implement `TwitchOAuth` class extending `OAuthFlow`
- [ ] Define Twitch OAuth endpoints:
  - Authorize: `https://id.twitch.tv/oauth2/authorize`
  - Token: `https://id.twitch.tv/oauth2/token`
- [ ] Define required scopes:
  - `channel:read:subscriptions`
  - `chat:read`
  - `chat:edit`
  - `bits:read`
- [ ] Implement `startOAuth()`:
  - Generate state (random string)
  - Build auth URL with client_id, redirect_uri, scopes, state
  - Start HTTP server
  - Return auth URL
- [ ] Implement `handleCallback()`:
  - Validate state
  - Exchange code for tokens using POST to token endpoint
  - Parse token response
  - Calculate `expires_at` and `refresh_at`
  - Store tokens via KeystoreManager: `service='streaming-enhancement'`, `account='oauth:twitch:{username}'`
  - Return TokenSet
- [ ] Implement `getAccessToken()`:
  - Retrieve token from keystore
  - Check `refresh_at` vs `now`
  - If expired, call `refreshToken()`
  - Return token
- [ ] Implement `refreshToken()`:
  - Retrieve token from keystore
  - Use refresh_token to get new access token
  - Store new TokenSet with updated timestamps
  - Return new token
- [ ] Add error handling for OAuth failures
- [ ] Write unit tests with mock HTTP server

**Output**: Complete Twitch OAuth flow implementation

---

### Phase 6: HTTP Endpoints
**Location**: `packages/server-daemon/controllers/OAuthController.ts`

- [ ] Implement `OAuthController` class
- [ ] `GET /oauth/start/:platform/:username`
  - Validate platform (twitch, kick, youtube)
  - Retrieve client credentials from database
  - Start OAuth flow for platform
  - Return auth URL
- [ ] `GET /oauth/callback/:platform/:state`
  - Validate platform and state
  - Handle OAuth callback
  - Exchange code for tokens
  - Store tokens in keystore
  - Serve "Ok" HTML page
- [ ] `POST /oauth/credentials/:platform`
  - Validate platform
  - Add/update client credentials in database
  - Return success
- [ ] `GET /oauth/status/:platform/:username`
  - Check if token exists in keystore
  - Return token status (valid, expired, not found)
  - Return expires_at if available
- [ ] `DELETE /oauth/:platform/:username`
  - Delete token from keystore
  - Return success
- [ ] Add request validation middleware
- [ ] Add error handling for OAuth failures

**Output**: REST API for OAuth token management

---

### Phase 7: CLI Commands
**Location**: `client/cmd/oauth/`

- [ ] Implement `oauth add` command:
  - Usage: `cli oauth add <platform> --client-id <id> --client-secret <secret> --scopes <scopes>`
  - Validate platform (twitch, kick, youtube)
  - Send POST request to `/oauth/credentials/:platform`
  - Display success/error message
- [ ] Implement `oauth start` command:
  - Usage: `cli oauth start <platform> <username>`
  - Send GET request to `/oauth/start/:platform/:username`
  - Receive auth URL
  - Open browser with auth URL
  - Wait for callback (poll or listen for WebSocket event)
  - Display success message
- [ ] Implement `oauth status` command:
  - Usage: `cli oauth status <platform> <username>`
  - Send GET request to `/oauth/status/:platform/:username`
  - Display token status
- [ ] Implement `oauth revoke` command:
  - Usage: `cli oauth revoke <platform> <username>`
  - Send DELETE request to `/oauth/:platform/:username`
  - Display success message
- [ ] Add help text for all commands
- [ ] Add error handling for network failures

**Output**: CLI interface for OAuth management

---

### Phase 8: Install Script
**Location**: `install.sh`

- [ ] Check for `cargo --version`
- [ ] Install rustup if not present:
  - Detect OS (Linux/Mac: curl, Windows: download exe)
  - Run installer
  - Set PATH
- [ ] Navigate to `packages/keystore-native/`
- [ ] Build native module for current platform:
  - Run `npm install` (napi-rs builds prebuilt binaries)
  - Or run `cargo build --release` and copy to npm/
- [ ] Navigate to root
- [ ] Install Node.js dependencies: `pnpm install`
- [ ] Initialize SQLite database:
  - Create `~/.local/share/streaming-enhancement/database.db`
  - Run migrations
- [ ] Verify installations:
  - Check native module loads successfully
  - Check database initialized
  - Check keystore available
- [ ] Provide clear error messages for missing dependencies
- [ ] Add --help flag for troubleshooting

**Output**: Cross-platform install script with Rust compilation

---

### Phase 9: Testing
**Test plans**: @tests/keystore-tests.md, @tests/oauth-integration-tests.md

### Unit Tests

- [ ] Test keystore strategies:
  - Mock native keystore for testing
  - Test platform detection in KeystoreManager
  - Test EncryptedFileStrategy encryption/decryption
  - Test error handling when keystore unavailable
- [ ] Test database operations:
  - Test CRUD for oauth_credentials
  - Test validation rules
  - Test migration execution
- [ ] Test OAuthFlow base class:
  - Mock HTTP server for callbacks
  - Test state validation
  - Test token storage and retrieval
- [ ] Test TwitchOAuth:
  - Mock Twitch OAuth API responses
  - Test auth URL generation
  - Test token exchange
  - Test token refresh logic

### Integration Tests

- [ ] Test complete OAuth flow:
  - Start OAuth → receive auth URL
  - Mock callback → receive and store tokens
  - Retrieve token → valid
  - Force expiry → refresh token
  - Revoke token → deleted
- [ ] Test HTTP endpoints:
  - Mock server and database
  - Test all endpoints with valid/invalid input
  - Test error responses
- [ ] Test keystore fallback:
  - Simulate unavailable native keystore
  - Verify EncryptedFileStrategy used
  - Verify tokens encrypted correctly

### Cross-Platform Testing

- [ ] Test on Windows (Credential Manager)
- [ ] Test on macOS (Keychain)
- [ ] Test on Linux (Secret Service)
- [ ] Test fallback to encrypted file

**Output**: Comprehensive test coverage

---

## Open Questions

1. **Pre-compiled binaries**: Should we package pre-compiled binaries for each platform in the npm package, or rely entirely on the install script for compilation?
   - **Default**: Use install script for compilation
   - **Alternative**: Pre-compile with GitHub Actions, include in package as optional dependency

2. **Default token expiration**: What should be the default token expiration time for platforms that don't return `expires_at`?
   - **Default**: 24 hours
   - **Alternative**: 1 hour (more conservative)

3. **Concurrent OAuth flows**: Should we support concurrent OAuth flows (multiple users authorizing same platform simultaneously)?
   - **Default**: Single flow per platform for now
   - **Alternative**: Use unique state per user, support multiple simultaneous flows

4. **Token refresh retry logic**: What happens if token refresh fails?
   - **Default**: Return error, require re-authentication
   - **Alternative**: Retry N times before giving up

## Dependencies

### Rust (packages/keystore-native/)
- `napi` v3.8.2 - Node.js bindings framework
- `napi-derive` v3.5.1 - Macro for deriving bindings
- `serde` v1.0 - Serialization
- `serde_json` v1.0 - JSON handling
- `thiserror` v1.0 - Error handling
- `aes-gcm` v0.10 - AES-256-GCM encryption (fallback)
- `sha2` v0.10 - SHA-256 hashing (fallback)
- `tempfile` v3.13 - Temporary files for testing
- `windows-rs` v0.58 - Windows Credential Manager API (optional, Windows-only)
- `security-framework` v2.11 - macOS Security.framework (optional, macOS-only)
- `keyring` v3.5 - Linux Secret Service abstraction (optional, Linux-only)

### TypeScript (packages/server-daemon/)
- `@streaming-enhancement/keystore-native` - Our native binding
- `express` - HTTP server
- `better-sqlite3` - SQLite database
- `axios` or `node-fetch` - HTTP client for OAuth APIs
- `crypto` (Node.js built-in) - For encrypted file fallback

### Go (client/)
- `cobra` - CLI framework
- Standard library HTTP client

## References

- **Architecture**: @architecture/keystore-strategy-pattern.md
- **Security**: @architecture/oauth-security-model.md
- **Module Plan**: @docs/module-plans/module-server-daemon.md
- **Tests**: @tests/keystore-tests.md, @tests/oauth-integration-tests.md
- **API**: @api/oauth-endpoints.md

## Progress
- ✅ Phase 1: Rust Native Binding - Complete
  - All platform implementations working
  - 22 unit tests passing
  - Release build successful
  - Bugs fixed: Use-after-free (Windows), fragile error handling (Linux)
- ⏸️ Phase 2: Keystore Strategy Pattern - Not started
- ⏸️ Phase 3: Database Schema - Not started
- ⏸️ Phase 4: OAuth Base Layer - Not started
- ⏸️ Phase 5: Twitch OAuth - Not started
- ⏸️ Phase 6: HTTP Endpoints - Not started
- ⏸️ Phase 7: CLI Commands - Not started
- ⏸️ Phase 8: Install Script - Not started
- ⏸️ Phase 9: Testing - Partial (Unit Tests complete for Phase 1)

## Completion Criteria
- [ ] All phases implemented
- [x] All unit tests passing (Phase 1 complete)
- [ ] All integration tests passing
- [x] Cross-platform testing completed (Phase 1 - Linux, Windows, macOS fallback tested)
- [ ] Install script tested on all platforms
- [x] Documentation updated
- [ ] API endpoints tested and documented
- [ ] CLI commands tested

When complete, move this file to `archive/feature-plans/oauth-flow-keystore.md`