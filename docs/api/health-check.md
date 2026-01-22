# Health Check Endpoint

## Overview

The health check endpoint provides component-level health status for monitoring and debugging the daemon server.

## Endpoint

```http
GET /status
```

**Note**: By default, the daemon binds to `127.0.0.1` (localhost only). To access from remote machines, configure `server.host` to `0.0.0.0` in your config file.

## Response

```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "components": {
    "server": {
      "status": "healthy",
      "uptime": 12345,
      "port": 3000
    },
    "database": {
      "status": "healthy",
      "path": "/path/to/database.db",
      "open": true
    },
    "keystore": {
      "status": "healthy" | "degraded",
      "type": "windows" | "macos" | "secret-service" | "encrypted-file",
      "isFallback": false
    }
  },
  "version": "0.1.0"
}
```

## Status Values

### Overall Status

- **healthy**: All components are functioning normally
- **degraded**: Some components are using fallback mode (e.g., encrypted-file keystore)
- **unhealthy**: One or more components are not functioning

### Component Status

Each component reports its own status:

| Component | Status | Description |
|-----------|--------|-------------|
| server | healthy | Server is running and accepting connections |
| database | healthy | Database is open and accessible |
| database | unhealthy | Database is closed or inaccessible |
| keystore | healthy | Native keystore is available |
| keystore | degraded | Using encrypted-file fallback mode |
| keystore | unhealthy | Keystore is unavailable |

## Example Requests

### Check health status

```bash
curl http://localhost:3000/status
```

**Response (healthy):**
```json
{
  "status": "healthy",
  "components": {
    "server": {
      "status": "healthy",
      "uptime": 123456,
      "port": 3000
    },
    "database": {
      "status": "healthy",
      "path": "/home/user/.local/share/streaming-enhancement/database.db",
      "open": true
    },
    "keystore": {
      "status": "healthy",
      "type": "secret-service",
      "isFallback": false
    }
  },
  "version": "0.1.0"
}
```

**Response (degraded):**
```json
{
  "status": "degraded",
  "components": {
    "server": { "status": "healthy", "uptime": 123456, "port": 3000 },
    "database": { "status": "healthy", "path": "/path/to/db", "open": true },
    "keystore": {
      "status": "degraded",
      "type": "encrypted-file",
      "isFallback": true
    }
  },
  "version": "0.1.0"
}
```

## Configuration

The health check endpoint path can be configured via `server.healthCheckPath`:

```json
{
  "server": {
    "healthCheckPath": "/health"
  }
}
```

## Security

### Localhost-Only Access

By default, the health check endpoint is only accessible from localhost for security:

```json
{
  "server": {
    "host": "127.0.0.1"
  }
}
```

**Security Benefit**: Prevents unauthorized access from remote machines.

### Remote Access

To enable remote monitoring (use with caution):

```json
{
  "server": {
    "host": "0.0.0.0"
  }
}
```

**Warning**: When binding to `0.0.0.0`, the health check endpoint is accessible from any network interface. Use a firewall to restrict access.

## Troubleshooting

### 403 Forbidden

**Cause**: Requesting from non-localhost address when `server.host` is `127.0.0.1`

**Solution**: Either request from localhost or configure `server.host` to `0.0.0.0`

### Database Unhealthy

**Cause**: Database is closed, corrupted, or locked

**Solution**: Check database file permissions and ensure no zombie daemon processes are running

### Keystore Degraded

**Cause**: Native keystore unavailable, using encrypted-file fallback

**Solution**: Check platform-specific requirements (Secret Service on Linux, Keychain on macOS, Credential Manager on Windows)
