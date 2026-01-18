# Test Plan: OAuth Integration

## Scope
Integration tests for OAuth flow, HTTP endpoints, and CLI commands across all platforms.

## Test Environment
- Node.js LTS
- TypeScript
- Jest or Vitest (test framework)
- MSW (Mock Service Worker) for HTTP mocking
- Supertest for HTTP endpoint testing
- Test HTTP server for OAuth callbacks

## Integration Tests

### OAuth Flow (End-to-End)

#### Complete Flow Test
- [ ] Test start OAuth → receive auth URL
- [ ] Test mock callback → tokens stored in keystore
- [ ] Test token retrieved from keystore
- [ ] Test token refresh when expired
- [ ] Test token deletion/revoke
- [ ] Test error handling for invalid state

#### Twitch OAuth Flow
- [ ] Test auth URL generation (correct endpoint, scopes, redirect_uri)
- [ ] Test callback handling (valid state, valid code)
- [ ] Test code exchange for tokens
- [ ] Test token storage with correct service/account naming
- [ ] Test refresh_at calculation (5 minutes before expires_at)
- [ ] Test error handling for invalid client credentials
- [ ] Test error handling for OAuth server errors
- [ ] Test error handling for network failures

#### Token Refresh Test
- [ ] Test token refresh succeeds before expiry
- [ ] Test token refresh fails after expiry (re-auth required)
- [ ] Test token refresh updates keystore with new tokens
- [ ] Test token refresh handles refresh_token rotation
- [ ] Test concurrent refresh requests don't cause duplicate writes

### HTTP Endpoints (OAuthController)

#### POST /oauth/credentials/:platform
- [ ] Test add credentials with valid data
- [ ] Test update existing credentials
- [ ] Test validation: platform must be valid (twitch, kick, youtube)
- [ ] Test validation: client_id required
- [ ] Test validation: client_secret required
- [ ] Test validation: scopes optional
- [ ] Test error handling for invalid platform (400 Bad Request)
- [ ] Test error handling for missing fields (400 Bad Request)
- [ ] Test response includes platform and created_at

#### GET /oauth/start/:platform/:username
- [ ] Test start OAuth with valid platform and username
- [ ] Test returns auth URL in response
- [ ] Test state parameter is unique
- [ ] Test HTTP server starts on random port
- [ ] Test redirect_uri matches localhost
- [ ] Test validation: platform must be valid (400)
- [ ] Test validation: username required (400)
- [ ] Test error handling if credentials not found (404)
- [ ] Test error handling for invalid platform (400)

#### GET /oauth/callback/:platform/:state
- [ ] Test callback with valid state and code
- [ ] Test exchanges code for tokens
- [ ] Test stores tokens in keystore
- [ ] Test serves "Ok" HTML page
- [ ] Test validates state parameter (CSRF protection)
- [ ] Test error handling for invalid state (400)
- [ ] Test error handling for missing code (400)
- [ ] Test error handling for exchange failure (500)
- [ ] Test HTTP server closes after serving response

#### GET /oauth/status/:platform/:username
- [ ] Test status when token exists and valid
- [ ] Test status when token exists but expired
- [ ] Test status when token not found (404)
- [ ] Test validation: platform must be valid (400)
- [ ] Test validation: username required (400)
- [ ] Test response includes expires_at if available

#### DELETE /oauth/:platform/:username
- [ ] Test delete existing token
- [ ] Test delete non-existent token (404)
- [ ] Test validation: platform must be valid (400)
- [ ] Test validation: username required (400)

### Mock OAuth Server

#### Setup
- [ ] Create mock Twitch OAuth server using MSW
- [ ] Mock authorize endpoint (returns state)
- [ ] Mock token endpoint (returns tokens)
- [ ] Mock refresh endpoint (returns new tokens)
- [ ] Mock error responses (invalid client, invalid code, server error)

#### Mock Responses
- [ ] Mock successful token response with expires_in
- [ ] Mock successful token response without expires_in (default 24h)
- [ ] Mock error response: invalid_client
- [ ] Mock error response: invalid_grant
- [ ] Mock error response: server_error

### CLI Commands (testing via HTTP client mocking)

#### cli oauth add <platform>
- [ ] Test add with all flags (client-id, client-secret, scopes)
- [ ] Test add with required flags only
- [ ] Test validation: invalid platform (error message)
- [ ] Test validation: missing client-id (error message)
- [ ] Test validation: missing client-secret (error message)
- [ ] Test success message displayed
- [ ] Test error handling for network failure

#### cli oauth start <platform> <username>
- [ ] Test start with valid platform and username
- [ ] Test auth URL displayed
- [ ] Test browser opens with auth URL (mock verify)
- [ ] Test waits for callback (timeout after 60s)
- [ ] Test success message when callback received
- [ ] Test validation: invalid platform (error message)
- [ ] Test validation: missing username (error message)
- [ ] Test error handling if credentials not found
- [ ] Test error handling for callback timeout

#### cli oauth status <platform> <username>
- [ ] Test status when token valid
- [ ] Test status when token expired
- [ ] Test status when token not found
- [ ] Test validation: invalid platform
- [ ] Test validation: missing username

#### cli oauth revoke <platform> <username>
- [ ] Test revoke existing token
- [ ] Test revoke non-existent token (error message)
- [ ] Test validation: invalid platform
- [ ] Test validation: missing username

### Concurrency Tests

- [ ] Test multiple concurrent OAuth requests don't conflict
- [ ] Test multiple concurrent token refresh requests don't duplicate
- [ ] Test multiple clients can authorize different users

### Error Handling Tests

- [ ] Test network timeout during code exchange (retry logic)
- [ ] Test OAuth server returns 500 error (user-friendly message)
- [ ] Test KeystoreManager unavailable during storage (graceful failure)
- [ ] Test database unavailable during credential lookup (graceful failure)

## Mock HTTP Server for OAuth Callbacks

### Setup
- [ ] Create test HTTP server on random port
- [ ] Serve "Ok" HTML page
- [ ] Emit event when callback received
- [ ] Clean up server after tests

### Usage
```typescript
const mockServer = createMockOAuthServer();
await mockServer.start();
const state = 'test-state';
// Trigger callback
mockServer.emitCallback(platform, state, { code: 'auth-code' });
await mockServer.waitForCallback();
await mockServer.stop();
```

## Test Configuration

```typescript
vitest.config.ts:
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html']
    }
  }
})
```

## Test Files Structure

```
packages/server-daemon/__tests__/
├── endpoints/
│   └── OAuthController.test.ts
├── platforms/
│   └── Twitch/
│       ├── TwitchOAuth.test.ts
│       └── TwitchStrategy.integration.test.ts
├── integration/
│   └── oauth-flow.test.ts
└── setup.ts
```

## Test Data

### Valid Credentials
```json
{
  "platform": "twitch",
  "client_id": "test-client-id",
  "client_secret": "test-client-secret",
  "scopes": ["channel:read:subscriptions", "chat:read", "chat:edit"]
}
```

### Valid Token Response
```json
{
  "access_token": "test-access-token",
  "refresh_token": "test-refresh-token",
  "expires_in": 3600,
  "scope": ["channel:read:subscriptions", "chat:read", "chat:edit"]
}
```

## References
- **Feature Plan**: @docs/feature-plans/oauth-flow-keystore.md
- **Test Plan**: @tests/keystore-tests.md
- **API**: @api/oauth-endpoints.md
- **Architecture**: @architecture/oauth-security-model.md