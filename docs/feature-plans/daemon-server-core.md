# Feature Plan: Daemon Server Core

## Overview
Create executable daemon server with initialization orchestration, health checks, graceful shutdown, PID tracking, and CLI foundation for future administrative commands (similar to tailscaled). This feature provides the foundation for running the streaming enhancement service as a proper daemon process.

## Scope & Deliverables
- [ ] Main entry point with CLI command parser (`streaming-daemon start`)
- [ ] Database/keystore/server initialization orchestration
- [ ] Health check endpoint (`GET /status`) with detailed component status
- [ ] Graceful shutdown (SIGTERM/SIGINT) with configurable timeout
- [ ] PID file tracking for process management
- [ ] Logging (console + rotating file) with configurable level
- [ ] CLI flags override config file values
- [ ] Configuration validation with proper exit codes
- [ ] Integration tests for full daemon lifecycle

## Architecture

### Project Structure
```
packages/server-daemon/
├── src/
│   ├── index.ts                          # Main CLI entry point
│   ├── daemon/
│   │   ├── DaemonApp.ts                  # Main daemon orchestrator
│   │   ├── HealthCheck.ts                # Health check service
│   │   ├── ShutdownHandler.ts           # Graceful shutdown
│   │   └── PidManager.ts                # PID file management
│   ├── cli/
│   │   └── StartCommand.ts              # Start command
│   └── infrastructure/
│       ├── config/
│       │   ├── schemas.ts               # Updated config schemas
│       │   ├── Config.ts                 # Updated Config class
│       │   └── LoggerFactory.ts           # Logger factory
│       └── server/
│           ├── DaemonServer.ts           # Updated to use new config
│           └── OAuthController.ts       # Updated to use new config
└── __tests__/
    ├── daemon/
    │   ├── DaemonApp.test.ts
    │   ├── HealthCheck.test.ts
    │   ├── ShutdownHandler.test.ts
    │   └── PidManager.test.ts
    └── integration/
        └── daemon-integration.test.ts
```

### Exit Codes
- `0` - Success
- `1` - Configuration error
- `2` - Initialization error (database/keystore)
- `3` - Server startup error

### Startup Sequence
1. Parse CLI args
2. Load config file
3. Override config with CLI flags
4. Configure logger (console + rotating file)
5. Check PID file (exit if daemon already running)
6. Write PID file
7. Initialize database (exit on error)
8. Initialize keystore (exit on error)
9. Initialize OAuthStateManager
10. Create/attach DaemonServer with routes
11. Start server
12. Register signal handlers (SIGTERM, SIGINT)

### Graceful Shutdown Sequence
1. Catch SIGTERM/SIGINT
2. Log "Shutting down..."
3. Remove PID file
4. Stop accepting new requests
5. Wait for in-flight requests (timeout: `config.server.shutdownTimeout`)
6. Stop OAuthStateManager → close DB → close server
7. Log "Shutdown complete"
8. Exit code 0

### Health Check Response
```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "components": {
    "server": { "status": "healthy", "uptime": 12345, "port": 3000 },
    "database": { "status": "healthy", "path": "/path/to/db", "connectionCount": 1 },
    "keystore": { "status": "healthy", "type": "windows" | "encrypted-file", "isFallback": false }
  },
  "version": "0.1.0"
}
```

### Platform-Specific Paths
**Config directory**:
- Windows: `%APPDATA%/streaming-enhancement/`
- macOS/Linux: `~/.config/streaming-enhancement/`

**Database directory**:
- Windows: `%LOCALAPPDATA%/streaming-enhancement/`
- macOS/Linux: `~/.local/share/streaming-enhancement/`

**Log directory**:
- Windows: `%LOCALAPPDATA%/streaming-enhancement/logs/`
- macOS: `~/Library/Logs/streaming-enhancement/`
- Linux: `~/.local/state/streaming-enhancement/logs/`

**PID file**:
- Windows: `%LOCALAPPDATA%/streaming-enhancement/daemon.pid`
- macOS/Linux: `~/.local/state/streaming-enhancement/daemon.pid`

## Implementation Phases

### Summary
**Status**: In Progress (2 of 11 phases complete)

This feature creates the daemon server infrastructure needed to run the streaming enhancement service as a proper daemon process with initialization orchestration, health checks, and graceful shutdown.

---

### Phase 1: Configuration & Schema Updates
**Location**: `packages/server-daemon/infrastructure/config/`
**Status**: ✅ Complete

- [x] Install new dependencies:
  ```bash
  npm install commander@^11.1.0 winston-daily-rotate-file@^5.0.0
  npm install --save-dev @types/commander
  ```

- [x] Update `schemas.ts`:
  ```typescript
  export const ServerConfigSchema = z.object({
    port: z.number().int().min(1).max(65535).default(3000),
    shutdownTimeout: z.number().default(10000),
    healthCheckPath: z.string().default('/status'),
  });

  export const LoggingConfigSchema = z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    directory: z.string().optional(),
    maxFiles: z.number().default(7),
    maxSize: z.string().default('20m'),
  });

  export const OAuthConfigSchema = z.object({
    redirect_uri: z.string().url().default('http://localhost:3000/callback'),
  });

  export const AppConfigSchema = z.object({
    server: ServerConfigSchema,
    database: DatabaseConfigSchema,
    keystore: KeystoreConfigSchema.optional(),
    logging: LoggingConfigSchema,
    oauth: OAuthConfigSchema,
  });
  ```

- [x] Update `Config.ts`:
  - Update `getDefaultConfig()` to return new structure
  - Add platform-specific defaults for log directory
  - Add platform-specific defaults for PID file path

- [x] Update `DaemonServer.ts`:
  - Constructor to use `config.server.port` instead of `config.oauth.server_port`

- [x] Update `package.json`:
  - Add `bin` field: `"streaming-daemon": "dist/index.js"`
  - Add dependencies: `commander`, `winston-daily-rotate-file`
  - Add scripts: `"start": "node dist/index.js start"`

- [x] Update `tsconfig.json`:
  - Add `src/**/*` to include array

**Output**: ✅ Updated configuration schema and structure
**Dependencies**: commander ^11.1.0, winston-daily-rotate-file ^5.0.0

---

### Phase 2: Logger Factory
**Location**: `packages/server-daemon/infrastructure/config/LoggerFactory.ts`
**Status**: ✅ Complete

- [x] Create `LoggerFactory` class:
  - `createLogger(config: LoggingConfig, context?: string): winston.Logger`
  - Console transport (using winston console format, no emojis)
  - Rotating file transport (winston-daily-rotate-file)
  - Same log level for both transports

 - [x] Log format:
   - Human-readable: `[timestamp] [level] message metadata`
   - Timestamp: ISO 8601 with milliseconds and UTC timezone (e.g., `2026-01-20T20:44:57.123Z`)
   - Level: error, warn, info, debug
   - Service name: SES (Streaming Enhancement Sweet)
   - Error stack traces for error level

- [x] File rotation:
  - Daily rotation (datePattern: 'YYYY-MM-DD')
  - Keep last `maxFiles` days (default 7)
  - Max file size per day: `maxSize` (default 20m)
  - File naming: `SES-YYYY-MM-DD.log`
  - Symlink: `SES-current.log` → latest daily log
  - Fallback chain: Configured directory → Install directory → Working directory → Console-only

- [x] Write unit tests:
  - Test logger creation with different configs
  - Test log level filtering
  - Test file rotation configuration
  - Test ISO 8601 format
  - Test fallback chain
  - Test directory creation

- [x] Update hardcoded loggers across codebase:
  - Database components (Database.ts, OAuthCredentialsRepository.ts, MigrationRunner.ts)
  - Keystore components (KeystoreManager.ts, 3 strategy files)
  - OAuth/Platform components (OAuthFlow.ts, TwitchOAuth.ts, KickOAuth.ts, YouTubeOAuth.ts)
  - Orchestration layer (OAuthController.ts, src/index.ts)
  - Config.ts keeps minimal console logger for config loading

**Output**: ✅ Logger factory with console + rotating file support, all hardcoded loggers updated
**Dependencies**: winston, winston-daily-rotate-file

---

### Phase 3: PID Manager
**Location**: `packages/server-daemon/src/daemon/PidManager.ts`
**Status**: ⏸️ Not started

- [ ] Create `PidManager` class:
  - Constructor takes `pidFilePath`
  - `checkRunning()`: Check if PID file exists and process is running
  - `writePid(pid: number)`: Write current process PID
  - `removePid()`: Remove PID file
  - `isRunning(pid: number)`: Check if process is running (cross-platform)

- [ ] Error handling:
  - Throw error if PID file exists and process is running
  - Clean up stale PID files
  - Handle permission errors

- [ ] Write unit tests:
  - Test PID file writing/reading
  - Test running process detection
  - Test stale PID file cleanup
  - Test permission error handling

**Output**: ✅ PID file management with duplicate daemon detection
**Dependencies**: None (Node.js built-ins)

---

### Phase 4: Health Check Service
**Location**: `packages/server-daemon/src/daemon/HealthCheck.ts`
**Status**: ⏸️ Not started

- [ ] Create `HealthCheck` class:
  - Constructor takes dependencies: database, keystore
  - `getStatus()`: Returns health status object
  - `checkComponent(component)`: Check specific component
  - `getOverallStatus()`: Aggregate component statuses

- [ ] Component checks:
  - **Server**: Check if server is listening, return uptime and port
  - **Database**: Check if connection is open, return path and connection count
  - **Keystore**: Check keystore availability, return type and fallback status

- [ ] Write unit tests:
  - Test individual component checks
  - Test overall status aggregation
  - Test degraded/unhealthy states
  - Test error handling

**Output**: ✅ Health check service with component-level status

---

### Phase 5: Shutdown Handler
**Location**: `packages/server-daemon/src/daemon/ShutdownHandler.ts`
**Status**: ⏸️ Not started

- [ ] Create `ShutdownHandler` class:
  - Constructor takes: server, database, keystore, pidManager, timeout
  - `register()`: Register SIGTERM/SIGINT handlers
  - `shutdown()`: Execute graceful shutdown
  - `waitForInFlightRequests()`: Wait for in-flight requests with timeout

- [ ] Shutdown sequence:
  1. Log "Shutting down..."
  2. Remove PID file
  3. Stop accepting new requests (server.close())
  4. Wait for in-flight requests (with timeout)
  5. Stop OAuthStateManager
  6. Close database connection
  7. Log "Shutdown complete"
  8. Exit with code 0

- [ ] Write unit tests:
  - Test shutdown sequence order
  - Test timeout handling
  - Test error handling during shutdown

**Output**: ✅ Graceful shutdown handler with configurable timeout

---

### Phase 6: Daemon App Orchestrator
**Location**: `packages/server-daemon/src/daemon/DaemonApp.ts`
**Status**: ⏸️ Not started

- [ ] Create `DaemonApp` class:
  - Constructor takes: config, logger, database, keystore, oauthStateManager
  - `start()`: Start the daemon server
  - `stop()`: Stop the daemon server

- [ ] Startup sequence:
  1. Create DaemonServer instance
  2. Attach OAuthController routes
  3. Attach health check endpoint
  4. Attach error handler
  5. Start server
  6. Log startup info (port, pid, health check path)

- [ ] Write unit tests:
  - Test startup sequence
  - Test server initialization
  - Test route attachment

**Output**: ✅ Daemon orchestrator that coordinates all components

---

### Phase 7: CLI Start Command
**Location**: `packages/server-daemon/src/cli/StartCommand.ts`
**Status**: ⏸️ Not started

- [ ] Create `StartCommand` class using Commander.js:
  - `streaming-daemon start [--port PORT] [--config PATH] [--log-level LEVEL]`
  - Parse CLI arguments
  - Load config file
  - Override config with CLI flags

- [ ] Initialization sequence:
  1. Parse CLI args
  2. Load config file
  3. Override with CLI flags
  4. Validate config (exit with code 1 on error)
  5. Create logger
  6. Check PID file (exit with code 1 if daemon already running)
  7. Write PID file
  8. Initialize database (exit with code 2 on error)
  9. Initialize keystore (exit with code 2 on error)
  10. Initialize OAuthStateManager
  11. Create DaemonApp
  12. Start daemon (exit with code 3 on error)
  13. Register shutdown handlers

- [ ] Error handling:
  - Log errors before exiting
  - Use proper exit codes
  - Remove PID file if startup fails after writing

- [ ] Write unit tests:
  - Test CLI argument parsing
  - Test config override logic
  - Test exit codes for different errors

**Output**: ✅ CLI command to start the daemon
**Dependencies**: commander

---

### Phase 8: Main Entry Point
**Location**: `packages/server-daemon/src/index.ts`
**Status**: ⏸️ Not started

- [ ] Create main entry point:
  ```typescript
  #!/usr/bin/env node

  import { Command } from 'commander';
  import { StartCommand } from './cli/StartCommand';

  const program = new Command();

  program
    .name('streaming-daemon')
    .description('Streaming Enhancement Daemon')
    .version('0.1.0');

  // Register start command
  const startCommand = new StartCommand();
  program.addCommand(startCommand.getCommand());

  program.parse(process.argv);
  ```

- [ ] Update `tsconfig.json`:
  - Add `src/**/*` to include array

- [ ] Build and test:
  - `npm run build`
  - `./dist/index.js --help`
  - `./dist/index.js start --help`

**Output**: ✅ Executable CLI entry point for daemon

---

### Phase 9: Health Check Endpoint Integration
**Location**: `packages/server-daemon/src/daemon/DaemonApp.ts`, `infrastructure/server/DaemonServer.ts`
**Status**: ⏸️ Not started

- [ ] Integrate HealthCheck with DaemonServer:
  - Add health check service to DaemonServer
  - Register GET /status route
  - Return health status JSON response
  - Only allow requests from localhost

- [ ] Update DaemonApp to pass HealthCheck to DaemonServer

- [ ] Write integration tests:
  - Test health check endpoint
  - Test localhost-only restriction
  - Test component status accuracy

**Output**: ✅ HTTP health check endpoint with component-level status

---

### Phase 10: OAuth Integration Testing
**Location**: `packages/server-daemon/__tests__/integration/daemon-integration.test.ts`
**Status**: ⏸️ Not started

- [ ] Write integration tests for full OAuth flow:
  - Start daemon
  - Test GET /oauth/start/:platform/:username
  - Test GET /oauth/callback/:platform/:state
  - Test POST /oauth/credentials/:platform
  - Test GET /oauth/status/:platform/:username
  - Test DELETE /oauth/:platform/:username
  - Stop daemon gracefully

- [ ] Test daemon lifecycle:
  - Test startup with valid config
  - Test startup with invalid config (exit code 1)
  - Test startup with database init error (exit code 2)
  - Test graceful shutdown
  - Test PID file management

- [ ] Test health check integration:
  - Test /status endpoint returns correct data
  - Test health status reflects actual component state

**Output**: ✅ Integration tests covering full daemon lifecycle

---

### Phase 11: Documentation & Final Polish
**Location**: Documentation files
**Status**: ⏸️ Not started

- [ ] Update API documentation:
  - Document health check endpoint
  - Document CLI commands and flags
  - Document exit codes
  - Document configuration options

- [ ] Update PLAN.md:
  - Mark Daemon Server Core feature complete
  - Update next feature

- [ ] Update module-plan:
  - Mark Daemon Server Core feature complete
  - Update features list

- [ ] Run final tests:
  - All unit tests passing
  - All integration tests passing
  - ESLint passing
  - TypeScript compilation successful

**Output**: ✅ Complete documentation and polished implementation

---

## Testing Strategy

### Unit Tests
- **PidManager**: Test PID file management, duplicate detection, cleanup
- **HealthCheck**: Test component checks, status aggregation
- **ShutdownHandler**: Test shutdown sequence, timeout handling
- **DaemonApp**: Test startup, route attachment, orchestration
- **StartCommand**: Test CLI parsing, config override, error handling
- **LoggerFactory**: Test logger creation, rotation config

### Integration Tests
- **Daemon Lifecycle**: Test full startup/shutdown sequence
- **OAuth Flow**: Test OAuth endpoints through daemon server
- **Health Check**: Test health check endpoint accuracy
- **Error Scenarios**: Test various failure modes (database, keystore, port conflicts)

### Cross-Platform Testing
- Test on Windows, macOS, Linux
- Verify platform-specific paths work correctly
- Test PID file management on each platform

## Dependencies

### New Dependencies
- `commander` ^11.1.0 - CLI framework
- `winston-daily-rotate-file` ^5.0.0 - Rotating file logging

### Existing Dependencies
- `winston` - Logging
- `express` - HTTP server
- `better-sqlite3` - Database
- `@streaming-enhancement/keystore-native` - Native keystore
- `zod` - Schema validation

## Open Questions

1. **Health check authentication**: Should we require authentication for the health check endpoint?
   - **Default**: No, but only allow requests from localhost

2. **Default log level**: What should be the default log level?
   - **Default**: `info` (balances verbosity and noise)

3. **Shutdown timeout**: What should be the default graceful shutdown timeout?
   - **Default**: 10 seconds (configurable)

4. **PID file behavior**: Should we auto-clean stale PID files on startup?
   - **Default**: Yes, if the process is not running

## References

- **Module Plan**: @docs/module-plans/module-server-daemon.md
- **OAuth Feature**: @docs/archive/feature-plans/oauth-flow-keystore.md
- **API**: @api/oauth-endpoints.md

## Progress
- ✅ Phase 1: Configuration & Schema Updates - Complete
- ✅ Phase 2: Logger Factory - Complete
- ⏸️ Phase 3: PID Manager - Not started
- ⏸️ Phase 4: Health Check Service - Not started
- ⏸️ Phase 5: Shutdown Handler - Not started
- ⏸️ Phase 6: Daemon App Orchestrator - Not started
- ⏸️ Phase 7: CLI Start Command - Not started
- ✅ Phase 8: Main Entry Point - Complete
- ⏸️ Phase 9: Health Check Endpoint Integration - Not started
- ⏸️ Phase 10: OAuth Integration Testing - Not started
- ⏸️ Phase 11: Documentation & Final Polish - Not started

## Completion Criteria
- [ ] All 11 phases implemented
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Cross-platform testing completed (Windows, macOS, Linux)
- [ ] Documentation updated
- [ ] CLI command working: `streaming-daemon start --help`
- [ ] Health check endpoint accessible: `GET /status`
- [ ] Graceful shutdown working (SIGTERM/SIGINT)
- [ ] PID file management working

When complete, move this file to `archive/feature-plans/daemon-server-core.md`
