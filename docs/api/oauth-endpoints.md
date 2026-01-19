# API Documentation: OAuth Endpoints

## Overview
HTTP endpoints for OAuth token management. All endpoints are served by the server daemon and can be consumed by CLI, Web UI, or other clients.

**Base URL**: `http://localhost:3000` (configurable)

## Authentication
No authentication required for these endpoints. Access restricted to localhost by default.

## Common Response Codes
- `200 OK` - Success
- `400 Bad Request` - Invalid request parameters
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

## Endpoints

### POST /oauth/credentials/:platform
Add or update OAuth client credentials for a platform.

#### Request
**URL Parameters**:
- `platform` (string, required): Platform name (`twitch`, `kick`, `youtube`)

**Request Body**:
```json
{
  "client_id": "your-client-id",
  "client_secret": "your-client-secret",
  "scopes": ["scope1", "scope2"]
}
```

- `client_id` (string, required): OAuth client ID
- `client_secret` (string, required): OAuth client secret
- `scopes` (array of strings, optional): Requested OAuth scopes

#### Response
**200 OK**:
```json
{
  "platform": "twitch",
  "created_at": "2026-01-18T10:00:00.000Z",
  "updated_at": "2026-01-18T10:00:00.000Z"
}
```

**400 Bad Request**:
```json
{
  "error": "Invalid platform. Must be one of: twitch, kick, youtube"
}
```

or

```json
{
  "error": "client_id and client_secret are required"
}
```

#### Example
```bash
curl -X POST http://localhost:3000/oauth/credentials/twitch \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "abc123",
    "client_secret": "xyz789",
    "scopes": ["channel:read:subscriptions", "chat:read"]
  }'
```

---

### GET /oauth/start/:platform/:username
Start OAuth flow for a platform. Generates authorization URL for OAuth callback.

#### Request
**URL Parameters**:
- `platform` (string, required): Platform name (`twitch`, `kick`, `youtube`)
- `username` (string, required): Platform username for authorization

#### Response
**200 OK**:
```json
{
  "auth_url": "https://id.twitch.tv/oauth2/authorize?client_id=abc123&redirect_uri=http://localhost:54321/oauth/callback/twitch/abc123state&response_type=code&scope=channel:read:subscriptions+chat:read&state=abc123state",
  "state": "abc123state"
}
```

**400 Bad Request** (invalid platform):
```json
{
  "error": "Invalid platform. Must be one of: twitch, kick, youtube"
}
```

**404 Not Found** (credentials not found):
```json
{
  "error": "No OAuth credentials configured for platform: twitch"
}
```

#### Example
```bash
curl http://localhost:3000/oauth/start/twitch/streamer123
```

---

### GET /oauth/callback/:platform/:state
Handle OAuth callback from platform. Exchange authorization code for access tokens and store in keystore.

**Note**: This endpoint is called by the user's browser after approving authorization. Returns HTML page.

#### Request
**URL Parameters**:
- `platform` (string, required): Platform name (`twitch`, `kick`, `youtube`)
- `state` (string, required): State parameter for CSRF protection

**Query Parameters**:
- `code` (string, required): Authorization code from OAuth provider
- `error` (string, optional): Error returned by OAuth provider
- `error_description` (string, optional): Error description from OAuth provider

#### Response
**200 OK** (HTML page):
```html
<!DOCTYPE html>
<html>
<head>
  <title>OAuth Callback Received</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 500px; margin: 50px auto; text-align: center; }
    h1 { color: #10b981; }
  </style>
</head>
<body>
  <h1>Ok</h1>
  <p>OAuth callback received successfully.</p>
  <p>Your access tokens have been stored securely.</p>
  <p>You can close this window.</p>
  <script>
    // Attempt to close window after 2 seconds
    setTimeout(() => { window.close(); }, 2000);
  </script>
</body>
</html>
```

**400 Bad Request** (invalid state):
```json
{
  "error": "Invalid state parameter"
}
```

**400 Bad Request** (OAuth error):
```html
...error page with error details...
```

#### Redirect URI Format
The redirect URI for OAuth authorization will be:
```
http://localhost:<configured-port>/oauth/callback/:platform/:state
```

The daemon server (configured in config.json, default port 3000) serves this endpoint.

---

### GET /oauth/status/:platform/:username
Check OAuth token status for a platform and username.

#### Request
**URL Parameters**:
- `platform` (string, required): Platform name (`twitch`, `kick`, `youtube`)
- `username` (string, required): Platform username

#### Response
**200 OK** (token valid):
```json
{
  "username": "streamer123",
  "platform": "twitch",
  "status": "valid",
  "expires_at": "2026-01-18T11:00:00.000Z",
  "refresh_at": "2026-01-18T10:55:00.000Z",
  "scope": ["channel:read:subscriptions", "chat:read"]
}
```

**200 OK** (token expired but refreshable):
```json
{
  "username": "streamer123",
  "platform": "twitch",
  "status": "expired",
  "expires_at": "2026-01-10T11:00:00.000Z",
  "refresh_at": "2026-01-10T10:55:00.000Z",
  "scope": ["channel:read:subscriptions", "chat:read"],
  "refreshable": true
}
```

**404 Not Found** (no token):
```json
{
  "error": "No OAuth token found for platform twitch and username streamer123"
}
```

**400 Bad Request** (invalid platform):
```json
{
  "error": "Invalid platform. Must be one of: twitch, kick, youtube"
}
```

#### Example
```bash
curl http://localhost:3000/oauth/status/twitch/streamer123
```

---

### DELETE /oauth/:platform/:username
Revoke/delete OAuth token for a platform and username.

#### Request
**URL Parameters**:
- `platform` (string, required): Platform name (`twitch`, `kick`, `youtube`)
- `username` (string, required): Platform username

#### Response
**200 OK**:
```json
{
  "message": "OAuth token deleted successfully",
  "platform": "twitch",
  "username": "streamer123"
}
```

**404 Not Found** (no token):
```json
{
  "error": "No OAuth token found for platform twitch and username streamer123"
}
```

**400 Bad Request** (invalid platform):
```json
{
  "error": "Invalid platform. Must be one of: twitch, kick, youtube"
}
```

#### Example
```bash
curl -X DELETE http://localhost:3000/oauth/twitch/streamer123
```

## Error Response Format

All error responses follow this format:

```json
{
  "error": "Human-readable error message"
}
```

## Rate Limiting
No rate limiting currently implemented. Consider adding for production use.

## Security Considerations

### localhost Restriction
Endpoints should only be accessible from localhost. Configure reverse proxy (nginx) with access control for remote access.

### HTTPS
For production deployment, use TLS/SSL to encrypt traffic. Configure reverse proxy to terminate SSL.

### Keystore Security
- Access tokens stored in native OS keystores
- Client credentials stored in SQLite database
- Ensure database file has restricted permissions (mode 0600)

### OAuth Security
- State parameter prevents CSRF attacks
- Redirect URI validation prevents unauthorized redirects
- Scopes are explicitly requested (not overly broad)

## Platform-Specific Details

### Twitch

**OAuth Endpoints**
- Host URL: `https://id.twitch.tv`
- Authorize Endpoint: `https://id.twitch.tv/oauth2/authorize`
- Token Endpoint: `https://id.twitch.tv/oauth2/token`
- Documentation: https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/

**Default Scopes**

| Scope | What it allows |
|-------|----------------|
| `channel:manage:broadcast` | Update stream metadata (title, category, description), manage stream markers and tags |
| `channel:read:subscriptions` | View who subscribed to the channel, subscription count, tier information |
| `chat:read` | Read all chat messages including emotes, badges, user info |
| `chat:edit` | Send chat messages on behalf of user, delete messages, send announcements |
| `bits:read` | View bits information, leaderboards, cheer events |

**OAuth Flow**: Authorization code grant with `response_type=code`

**Required Parameters**:
- `client_id`, `client_secret`
- `redirect_uri`
- `scope` (space-delimited)
- `state` (CSRF protection)

**Token Response**:
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 14399,
  "scope": ["channel:manage:broadcast", ...],
  "token_type": "bearer"
}
```

---

### Kick

**OAuth Endpoints**
- Host URL: `https://id.kick.com` (different from API server)
- Authorize Endpoint: `GET https://id.kick.com/oauth/authorize`
- Token Endpoint: `POST https://id.kick.com/oauth/token`
- Refresh Endpoint: `POST https://id.kick.com/oauth/token`
- Documentation: https://docs.kick.com/getting-started/generating-tokens-oauth2-flow

**Default Scopes**

| Scope | What it allows |
|-------|----------------|
| `user:read` | View basic user info: username, streamer ID, profile information |
| `channel:read` | View channel details: description, category, live status, viewer count |
| `channel:write` | Update stream metadata: title, category, description |
| `events:subscribe` | Receive real-time events: chat messages, follows, subscriptions, raids |
| `chat:write` | Send chat messages (for bots/announcements) |
| `kicks:read` | View KICKs currency information: leaderboards, tipping data |

**OAuth Flow**: OAuth 2.1 with PKCE (Proof Key for Code Exchange)

**Required Parameters**:
- Authorization: `client_id`, `redirect_uri`, `scope`, `state`, `code_challenge`, `code_challenge_method=S256`
- Token exchange: `code`, `client_id`, `client_secret`, `redirect_uri`, `code_verifier`, `grant_type=authorization_code`

**Token Response**:
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": "...",
  "scope": "...",
  "token_type": "Bearer"
}
```

**Note**: Kick requires PKCE. Generate code verifier (random 43-128 chars), create code challenge (SHA256 hash + base64url encode). Include both in authorization flow.

---

### YouTube

**OAuth Endpoints**
- Host URL: `https://oauth2.googleapis.com` (token endpoint) / `https://accounts.google.com` (auth endpoint)
- Authorize Endpoint: `https://accounts.google.com/o/oauth2/v2/auth`
- Token Endpoint: `https://oauth2.googleapis.com/token`
- Discovery Endpoint: `https://accounts.google.com/.well-known/openid-configuration`
- Documentation: https://developers.google.com/youtube/v3/guides/authentication

**Default Scopes**

| Scope | What it allows |
|-------|----------------|
| `https://www.googleapis.com/auth/youtube` | Read and manage your YouTube account (full access) |
| `https://www.googleapis.com/auth/youtube.upload` | Manage your YouTube videos (upload, update, delete) |
| `https://www.googleapis.com/auth/youtube.force-ssl` | Manage your YouTube account (HTTPS only enforcement) |

**OAuth Flow**: Authorization code grant (OpenID Connect compliant)

**Required Parameters**:
- Authorization: `client_id`, `redirect_uri`, `scope`, `state`, `response_type=code`, `access_type=offline` (for refresh token)
- Token exchange: `code`, `client_id`, `client_secret`, `redirect_uri`, `grant_type=authorization_code`

**Token Response**:
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 3600,
  "scope": "https://www.googleapis.com/auth/youtube ...",
  "token_type": "Bearer"
}
```

**Note**: Include `access_type=offline` in authorization request to receive refresh token. Without it, you only get short-lived access token.

## Testing

### Test Credentials (Development)
For testing, use mock OAuth credentials:
- Client ID: `test-client-id`
- Client Secret: `test-client-secret`

### Mock OAuth Server
Use MSW (Mock Service Worker) to mock OAuth endpoints during testing.

## References
- **Feature Plan**: @docs/feature-plans/oauth-flow-keystore.md
- **Test Plan**: @tests/oauth-integration-tests.md
- **Architecture**: @architecture/oauth-security-model.md