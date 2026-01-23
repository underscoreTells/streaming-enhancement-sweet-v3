# Phase Plan - Status: Complete ✅
# Phase 9: OAuth Integration Testing

## Overview
Create comprehensive integration tests for the full OAuth flow through the daemon server, covering all OAuth endpoints and verifying that the daemon lifecycle properly initializes and tears down OAuth components.

## Current State Analysis
- **OAuth feature**: Already complete with unit tests (252/252 passing)
- **OAuth endpoints**: Implemented in OAuthController (start, callback, credentials, status, revoke)
- **Daemon infrastructure**: DaemonApp, ShutdownHandler, HealthCheck, StartCommand planned/completed
- **Missing**: End-to-end integration tests combining all components

## Architecture Decisions

### Test Strategy
```typescript
describe('OAuth Integration Tests', () => {
  describe('Full OAuth Flow', () => {
    test('Twitch OAuth flow', async () => {
      // Start daemon
      // Add credentials
      // Start OAuth flow
      // Simulate callback
      // Verify token stored
    });
    // Similar for Kick, YouTube
  });

  describe('Daemon Lifecycle with OAuth', () => {
    test('Startup with valid config', ...);
    test('Startup with missing credentials', ...);
    test('Graceful shutdown preserves tokens', ...);
  });

  describe('Health Check with OAuth', () => {
    test('Health status reflects OAuth components', ...);
  });
});
```

### Test Scenarios
1. **Full OAuth flow** - Add credentials → Start OAuth → Callback → Verify token
2. **Credential management** - Add, list, delete credentials
3. **Status checking** - Verify token status (valid, expired, refreshable)
4. **Error handling** - Invalid credentials, invalid state, expired state
5. **Daemon lifecycle** - Startup, shutdown with OAuth state intact

---

## Task Breakdown (16 tasks)

### Phase 1: Integration Test Setup (Tasks 1-4)

**Task 1**: Create integration test file
- File: `packages/server-daemon/__tests__/integration/oauth-integration.test.ts`
- Set up test framework (Vitest)
- Import dependencies (StartCommand, express, supertest)
- Set up test database (in-memory SQLite)
- Set up mock keystore

**Task 2**: Create helper utilities
- `startTestDaemon()` - Start daemon with test config
- `stopTestDaemon()` - Stop daemon and cleanup
- `createTestDatabase()` - Create in-memory SQLite database
- `createMockKeystore()` - Create keystore with in-memory storage
- `setupOAuthCredentials()` - Helper to add test credentials

**Task 3**: Set up test data
- Define mock OAuth client IDs/secrets for each platform
- Define test usernames
- Define valid scopes for each platform

**Task 4**: Configure test cleanup
- AfterAll: Close database, stop daemon
- AfterEach: Clean up test data, clear keystore

### Phase 2: OAuth Flow Tests (Tasks 5-9)

**Task 5**: Test Twitch OAuth flow
- POST /oauth/credentials/twitch (add client credentials)
- GET /oauth/start/twitch/testuser
- Verify auth_url and state returned
- Simulate callback with mock authorization code
- Verify token stored in keystore
- GET /oauth/status/twitch/testuser (verify valid token)

**Task 6**: Test Kick OAuth flow
- POST /oauth/credentials/kick (add client credentials)
- GET /oauth/start/kick/testuser
- Verify auth_url and state returned (PKCE flow)
- Simulate callback with mock authorization code
- Verify token stored in keystore
- GET /oauth/status/kick/testuser (verify valid token)

**Task 7**: Test YouTube OAuth flow
- POST /oauth/credentials/youtube (add client credentials)
- GET /oauth/start/youtube/testuser (with offline access)
- Verify auth_url and state returned
- Simulate callback with mock authorization code
- Verify refresh token stored in keystore
- GET /oauth/status/youtube/testuser (verify valid token)

**Task 8**: Test credential management
- POST /oauth/credentials/twitch (add credentials)
- POST /oauth/credentials/kick (add credentials)
- Verify both credentials exist in database
- DELETE /oauth/twitch/testuser (revoke token)
- Verify token removed from keystore
- Verify credentials still in database (separate from tokens)

**Task 9**: Test OAuth error scenarios
- GET /oauth/start/invalidplatform (404)
- GET /oauth/callback/twitch/invalidstate (400)
- GET /oauth/callback/twitch/missingcode (400)
- POST /oauth/credentials/twitch (missing client_id, 400)
- POST /oauth/credentials/twitch (missing scopes, 400)

### Phase 3: Daemon Lifecycle Tests (Tasks 10-13)

**Task 10**: Test daemon startup with OAuth
- Start daemon via StartCommand
- Verify OAuth endpoints are accessible
- Verify health check shows healthy status
- Verify keystore initialized correctly

**Task 11**: Test daemon startup without credentials
- Clear database credentials
- Start daemon
- GET /oauth/start/twitch/testuser (should fail - no credentials)
- Verify error message: "OAuth credentials not found"

**Task 12**: Test graceful shutdown preserves tokens
- Start daemon and complete OAuth flow
- Verify token stored in keystore
- Send SIGTERM to daemon
- Verify shutdown completes
- Restart daemon
- GET /oauth/status/twitch/testuser (token still valid)

**Task 13**: Test daemon startup with invalid config
- Config with invalid database path
- Expect exit code 2 (initialization error)
- Verify error logged
- Verify cleanup (no database lock)

### Phase 4: Health Check Integration (Tasks 14-16)

**Task 14**: Test health check with OAuth components
- Complete OAuth flow for one platform
- GET /status
- Verify components.oauth (if added) or verify database/keystore healthy
- Verify status reflects valid tokens

**Task 15**: Test health check with keystore fallback
- Force keystore into fallback mode (encrypted-file)
- Complete OAuth flow
- GET /status
- Verify keystore.status = 'degraded'
- Verify tokens still work

**Task 16**: Test health check with database errors
- Close database connection mid-flight
- GET /status
- Verify database.status = 'unhealthy'
- Verify OAuth endpoints return appropriate errors

---

## Files to Create
- `packages/server-daemon/__tests__/integration/oauth-integration.test.ts` (~400 lines)

## Files to Modify
- None (all new tests)

## Dependencies
- StartCommand from `cli/StartCommand.ts`
- supertest for HTTP requests
- Database in-memory SQLite for testing
- Mock keystore implementation

## Acceptance Criteria
- All OAuth flows tested (Twitch, Kick, YouTube)
- Credential management tested (add, list, delete)
- Error scenarios tested (invalid platform, invalid state, missing code)
- Daemon lifecycle tested with OAuth (startup, shutdown, restart)
- Health check integration tested
- All integration tests pass (20-25 tests)
- ESLint passes, TypeScript compiles

## Notes

### Why integration tests separate from unit tests
- Unit tests already cover OAuth components (252 tests)
- Integration tests verify components work together
- Tests real HTTP requests, not mocked controllers
- Tests full daemon lifecycle

### Why in-memory SQLite
- Fast, no file I/O
- Isolated test data
- No cleanup needed between tests
- Simulates real database behavior

### Why mock keystore
- Avoids native keystore dependencies in tests
- Platform-independent tests
- Faster test execution
- Still tests keystore interface correctly

### Test isolation
- Each test should be independent
- Clean up state between tests
- Use fresh daemon instance per test
- No shared state across tests

### OAuth flow mocking
- Mock authorization code generation (can't call real OAuth servers)
- Mock token exchange (can't call real token endpoints)
- Test keystore storage and retrieval
- Test state management and validation