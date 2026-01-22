# Daemon Server Core Architecture

## Overview

The Daemon Server Core is the central orchestrator for the streaming enhancement system. It provides HTTP API endpoints, manages OAuth flows, tracks health status, and ensures graceful shutdown.

## Component Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                        CLI Layer                          │
│  (streaming-daemon start --port 3000)                  │
└─────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   StartCommand                            │
│  - Config loading and CLI parsing                        │
│  - Component initialization                              │
│  - Error handling and exit codes                          │
└─────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   DaemonApp                               │
│  - Server orchestration                                 │
│  - Route attachment (OAuth, health check)               │
│  - Lifecycle management (start/stop)                    │
└─────────┬─────────────────────────────┬─────────────────┘
          │                             │
          ▼                             ▼
┌─────────────────────┐   ┌──────────────────────────────┐
│    DaemonServer     │   │   Services Layer            │
│  - Express app       │   │  - OAuthController          │
│  - HTTP server      │   │  - HealthCheck             │
│  - CORS middleware │   │  - DatabaseConnection      │
│  - Error handler   │   │  - KeystoreManager        │
└─────────┬───────────┘   └──────────┬──────────────────────┘
          │                             │
          ▼                             ▼
┌─────────────────────┐   ┌──────────────────────────────┐
│  Infrastructure     │   │  Data Layer               │
│  - Express          │   │  - SQLite Database         │
│  - Winston Logger   │   │  - OS Native Keystore      │
└─────────────────────┘   └──────────────────────────────┘
```

## Components

### StartCommand

**Responsibility**: CLI command handler

**Location**: `src/cli/StartCommand.ts`

**Key Methods**:
- `execute()`: Full initialization sequence
- `getCommand()`: Commander.js command object
- `initializeComponents()`: Setup database and keystore

**Lifecycle**:
1. Load config (from file or CLI flags)
2. Validate config
3. Create logger
4. Initialize database and keystore
5. Create DaemonApp instance
6. Start daemon
7. Register ShutdownHandler

### DaemonApp

**Responsibility**: Orchestrate server lifecycle

**Location**: `src/daemon/DaemonApp.ts`

**Key Methods**:
- `start()`: Create server, attach routes, start HTTP listener
- `stop()`: Stop HTTP server
- `addHealthCheckRoute()`: Register health check endpoint
- `getServer()`: Get server instance (for ShutdownHandler)

**Dependencies**:
- DaemonServer
- OAuthController
- HealthCheck
- DatabaseConnection
- KeystoreManager

### DaemonServer

**Responsibility**: HTTP server and routing

**Location**: `infrastructure/server/DaemonServer.ts`

**Key Methods**:
- `start()`: Start HTTP listener
- `stop()`: Stop HTTP listener
- `attachRoutes()`: Attach Express router
- `attachErrorHandler()`: Global error handler
- `getApp()`: Get Express app instance
- `getHost()`: Get bind address
- `getPort()`: Get port

**Features**:
- CORS enabled for localhost
- JSON body parsing
- Error handling for Zod validation errors

### HealthCheck

**Responsibility**: Component health monitoring

**Location**: `src/daemon/HealthCheck.ts`

**Key Methods**:
- `getStatus()`: Get overall health status
- `checkServer()`: Verify server is running
- `checkDatabase()`: Verify database is open
- `checkKeystore()`: Verify keystore is available

**Status Levels**:
- `healthy`: All components operational
- `degraded`: Using fallback (e.g., encrypted-file keystore)
- `unhealthy`: One or more components failing

### ShutdownHandler

**Responsibility**: Graceful shutdown orchestration

**Location**: `src/daemon/ShutdownHandler.ts`

**Key Methods**:
- `register()`: Register SIGTERM/SIGINT handlers
- `shutdown()`: Execute shutdown sequence

**Shutdown Sequence**:
1. Check double-shutdown flag (prevent duplicate shutdown)
2. Log shutdown signal
3. Stop HTTP server (best-effort)
4. Wait for in-flight requests (configurable timeout)
5. Close database (best-effort)
6. Log completion
7. Exit with code 0

## Data Flow

### OAuth Flow

1. **Client adds credentials**: `POST /oauth/credentials/twitch`
   - Client credentials stored in database
   - OAuthController validates and saves

2. **Client starts OAuth**: `GET /oauth/start/twitch/username`
   - Daemon generates state (OAuthStateManager)
   - Returns auth_url for user approval

3. **User approves on Twitch/Kick/YouTube**: External flow

4. **Callback received**: `GET /oauth/callback/twitch`
   - Daemon exchanges code for access token
   - Token stored securely in keystore
   - State verified and cleared

5. **Token access**: `GET /oauth/status/twitch/username`
   - Daemon retrieves token from keystore
   - Checks expiration and refresh capability

### Health Check Flow

1. **Request received**: `GET /status`
2. **Localhost validation**: Verify req.ip is 127.0.0.1 or ::1
3. **Component checks**:
   - Server: uptime, port
   - Database: open status
   - Keystore: availability and type
4. **Calculate overall status**: healthy/degraded/unhealthy
5. **Return JSON response**

## Startup Sequence

```text
1. Config loaded (loadConfig)
2. CLI overrides applied (port, log-level, config path)
3. Logger created (LoggerFactory)
4. Database initialized (DatabaseConnection.initialize)
5. Keystore initialized (KeystoreManager)
6. OAuthCredentialRepo created
7. DaemonApp instantiated
8. DaemonServer created
9. OAuthController created
10. Routes attached:
    - /oauth routes (OAuthController.getRouter)
    - Error handler (global middleware)
11. Server started (DaemonServer.start)
12. Health check route registered
13. ShutdownHandler registered (SIGTERM/SIGINT)
```

## Shutdown Sequence

```text
1. Signal received (SIGTERM or SIGINT)
2. Double-shutdown check (return if already shutting down)
3. Log "Received {signal}, shutting down..."
4. Stop server (DaemonServer.stop)
5. Wait for timeout (default 10s, for in-flight requests)
6. Close database (DatabaseConnection.close)
7. Log "Shutdown complete"
8. Exit with code 0
```

## Security Model

### Localhost-Only Access

Default binding: `127.0.0.1` (IPv4). To use IPv6, explicitly set the host to `::1` in the configuration.

**Benefits**:
- No authentication required (network-level security)
- Prevents remote unauthorized access
- Simple for local development

### Remote Access (Optional)

Set `server.host` to `0.0.0.0` to bind to all interfaces:

```json
{
  "server": {
    "host": "0.0.0.0"
  }
}
```

**Warning**: Configure firewall rules to restrict access.

### Keystore Security

Access tokens stored in OS-native keystores:

| Platform | Storage | Security |
|----------|----------|-----------|
| Windows | Windows Credential Manager | Windows DPAPI encryption |
| macOS | Keychain Services | System Keychain encryption |
| Linux | DBus Secret Service | libsecret encryption |

## Error Handling

### Exit Codes

| Code | Meaning | Source |
|-------|---------|--------|
| 0 | Success (graceful shutdown) | ShutdownHandler |
| 1 | Configuration error | StartCommand |
| 2 | Initialization error | StartCommand |
| 3 | Startup error | StartCommand |

### Error Propagation

```text
Config Error (ZodError, file not found)
  └─> StartCommand.handleError()
      └─> Log + Exit Code 1

Initialization Error (database, keystore)
  └─> StartCommand.handleError()
      └─> Log + Cleanup + Exit Code 2

Startup Error (server start failure)
  └─> DaemonApp.start() throws
      └─> StartCommand.handleError()
          └─> Log + Cleanup + Exit Code 3
```

## Future Enhancements

Planned additions to daemon architecture:

- **WebSocket Server**: Real-time streaming data push
- **TTS Service**: Text-to-speech integration
- **OBS Integration**: WebSocket control of OBS Studio
- **Analytics Service**: Store and query stream analytics
- **Plugin System**: Extensible plugin architecture
- **Metrics Endpoint**: Prometheus-compatible metrics
- **PID File Management**: Prevent duplicate daemon instances
