# Daemon API Overview

The daemon server provides an HTTP API for managing OAuth flows, checking health status, and (in the future) WebSocket connections for real-time streaming data.

## Base URL

```text
http://localhost:3000
```

Default binding is `127.0.0.1` (localhost). To bind to all interfaces for remote access, configure `server.host` to `0.0.0.0`.

## Endpoints

| Category | Endpoint | Description |
|----------|----------|-------------|
| Health Check | GET /status | Component health status |
| OAuth | POST /oauth/credentials/:platform | Add OAuth client credentials |
| OAuth | GET /oauth/start/:platform/:username | Start OAuth flow |
| OAuth | GET /oauth/callback/:platform | OAuth callback handler |
| OAuth | GET /oauth/status/:platform/:username | Check token status |
| OAuth | DELETE /oauth/:platform/:username | Revoke token and logout |

### Health Check Endpoint

See [health-check.md](./health-check.md) for detailed documentation.

### OAuth Endpoints

See [oauth-endpoints.md](./oauth-endpoints.md) for OAuth API documentation.

## Authentication

### No Authentication Required

All daemon API endpoints are **not authenticated** by default. Security is enforced through:

1. **Localhost Binding**: Default server binds to `127.0.0.1`, only accepting connections from the local machine
2. **OAuth Flow**: Authentication happens through external providers (Twitch, Kick, YouTube)
3. **Token Storage**: Access tokens stored securely in OS-native keystores

### Future: API Authentication

Future versions may add API key authentication for remote monitoring dashboards and CLI clients.

## Error Responses

All endpoints return JSON error responses on failure:

```json
{
  "error": "Error message here"
}
```

HTTP Status Codes:

| Code | Description |
|-------|-------------|
| 200 | Success |
| 400 | Bad Request (invalid parameters) |
| 403 | Forbidden (localhost-only access) |
| 404 | Not Found (invalid endpoint) |
| 500 | Internal Server Error |

## Configuration

API behavior can be configured via the daemon config file:

```json
{
  "server": {
    "port": 3000,
    "host": "127.0.0.1",
    "healthCheckPath": "/status"
  },
  "oauth": {
    "redirect_uri": "http://localhost:3000/callback"
  }
}
```

See [configuration guide](../guides/configuration.md) for full configuration options.

## Future Endpoints

The daemon API will be expanded with future features:

- WebSocket endpoint for real-time streaming data
- TTS (Text-to-Speech) control endpoints
- OBS Studio integration endpoints
- Analytics and metrics endpoints
- Plugin management endpoints

## Example Usage

### Check daemon health

```bash
curl http://localhost:3000/status
```

### Start OAuth flow (Twitch)

```bash
# First, add credentials
curl -X POST http://localhost:3000/oauth/credentials/twitch \
  -H "Content-Type: application/json" \
  -d '{"client_id":"your_client_id","client_secret":"your_client_secret"}'

# Start OAuth flow
curl http://localhost:3000/oauth/start/twitch/your_username

# Response includes auth_url and state
```

### Check OAuth token status

```bash
curl http://localhost:3000/oauth/status/twitch/your_username
```

## Rate Limiting

Currently, there are **no rate limits** on daemon API endpoints. Rate limiting may be added in future versions for production deployments.

## CORS

The daemon server enables CORS for the configured port by default to support web UI development. The origin is dynamically constructed from the `config.server.port` value:

```typescript
const port = config.server.port || 3000;
const origin = `http://localhost:${port}`;
app.use(cors({ origin }));
```

**Fallback behavior**: If `config.server.port` is not set or invalid, it defaults to `3000` for local development. For production, configure CORS origin appropriately in your config or modify the daemon source code.
