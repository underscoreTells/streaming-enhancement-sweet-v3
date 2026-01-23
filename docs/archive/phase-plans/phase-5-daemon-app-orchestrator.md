# Phase 5: Daemon App Orchestrator

## Overview
Extract and enhance the existing startup logic (`src/index.ts:59-96`) into a dedicated `DaemonApp` class that orchestrates component initialization, server creation, route attachment, and provides clean start/stop lifecycle management.

## Current State Analysis
- **Existing implementation**: Inline startup logic in `src/index.ts:59-96` (38 lines)
- **Functionality**: Initializes database, keystore, creates server, attaches OAuth routes, starts server, logs startup info
- **Missing features**:
  - No separation of concerns (inline code in CLI handler)
  - Not testable (inline code, tight coupling to CLI)
  - No orchestration layer for future expansion (health check, WebSocket, etc.)
  - Stop/shutdown logic not centralized
  - Health check endpoint registration not implemented yet

## Architecture Decisions

### Class Structure
```typescript
interface DaemonAppDeps {
  config: AppConfig;
  logger: Logger;
  database: DatabaseConnection;
  keystore: KeystoreManager;
  oauthStateManager: OAuthStateManager;
}

class DaemonApp {
  private config: AppConfig;
  private logger: Logger;
  private database: DatabaseConnection;
  private keystore: KeystoreManager;
  private oauthStateManager: OAuthStateManager;
  private server: DaemonServer | null = null;
  private oauthController: OAuthController | null = null;
  private healthCheck: HealthCheck | null = null;

  constructor(deps: DaemonAppDeps);
  start(): Promise<void>;
  stop(): Promise<void>;
  addHealthCheckRoute(): void;
  getServer(): DaemonServer | null;
  getLogger(): Logger;
}
```

### Startup Sequence (start())
1. Create DaemonServer instance (from config)
2. Create OAuthController instance
3. Attach OAuth routes (`/oauth`)
4. Attach error handler
5. Start server (throws on failure)
6. Log startup info (port, PID, health check path)
7. Return success

### Stop Sequence (stop())
1. Log "Stopping daemon..."
2. Stop server (if running)
3. Clear references (server, controllers)
4. Log "Daemon stopped"
5. Return (NOTE: Does not close database or call process.exit - let ShutdownHandler handle full graceful shutdown)

### Health Check Registration (addHealthCheckRoute())
1. Create HealthCheck instance
2. Register GET /status route on server (can be called before or after start())
3. Return (enables calling before or after start())

## Dependencies Flow
```text
CLI (StartCommand)
    └─> DaemonApp
        ├─> DaemonServer
        ├─> OAuthController
        └─> HealthCheck (optional, via addHealthCheckRoute())
```

---

## Task Breakdown (12 tasks)

### Phase 1: Core Implementation (Tasks 1-5)

**Task 1**: Create `DaemonApp` class file
- File: `packages/server-daemon/src/daemon/DaemonApp.ts`
- Define `DaemonAppDeps` interface
- Create class with constructor, private fields, exports
- Import dependencies from infrastructure and controllers

**Task 2**: Implement `start()` method
- Create DaemonServer instance (config.server.port)
- Create OAuthController instance (logger, keystore, credentialRepo, oauthConfig)
- Attach OAuth routes with `server.attachRoutes('/oauth', oauthController.getRouter())`
- Attach error handler with `server.attachErrorHandler()`
- Start server with `await server.start()`
- Log startup info: `Server listening on port {port}, PID: {process.pid}`
- Set `this.server` and `this.oauthController`
- Throw on any error (let caller handle)

**Task 3**: Implement `stop()` method
- Check if server exists, return if not
- Log "Stopping daemon..."
- Call `this.server.stop()` with try-catch
- Clear `this.server` and `this.oauthController` references
- Log "Daemon stopped"
- Note: Do NOT close database or call process.exit (ShutdownHandler handles this)

**Task 4**: Implement `addHealthCheckRoute()` method
- Create HealthCheck instance (server, database, keystore, logger)
- Register GET /status route on server (localhost only)
  - Check req.ip is '127.0.0.1' or '::1' (IPv6 localhost)
  - Return 403 if not localhost
  - Return `healthCheck.getStatus()` JSON if localhost
- Set `this.healthCheck`
- Note: Can be called before or after start(), will register route safely

**Task 5**: Add helper methods
- `getServer()`: Return `this.server` (for testing)
- `getLogger()`: Return `this.logger` (for testing)
- `isStarted()`: Return boolean based on server state

### Phase 2: Refactor CLI (Tasks 6-8)

**Task 6**: Update `src/index.ts` to use DaemonApp
- Remove inline startup logic (lines 59-96)
- Remove daemonServer global variable (now managed by DaemonApp)
- Import `DaemonApp`
- After database/keystore initialization, create DaemonApp instance
- Call `daemonApp.start()` instead of inline logic
- Remove `server.attachRoutes()` and `server.attachErrorHandler()` calls (moved to DaemonApp)
- Keep signal handlers pointing to existing `gracefulShutdown` function

**Task 7**: Update gracefulShutdown to use DaemonApp
- Import DaemonApp instance (need to make it accessible)
- Call `daemonApp.stop()` in gracefulShutdown before database close
- Keep database close and process.exit logic

**Task 8**: Add health check route registration
- After daemonApp.start() succeeds, call `daemonApp.addHealthCheckRoute()`
- Log health check endpoint URL

### Phase 3: Testing (Tasks 9-12)

**Task 9**: Create test file structure
- File: `packages/server-daemon/__tests__/daemon/DaemonApp.test.ts`
- Set up mocks for config, logger, database, keystore, oauthStateManager
- Mock OAuthController and HealthCheck (or use real instances)
- Use beforeEach/afterEach hooks

**Task 10**: Test startup sequence
- Test DaemonServer is created with correct port
- Test OAuthController is created and attached
- Test error handler is attached
- Test server.start() is called
- Test startup info is logged
- Test thrown errors propagate to caller

**Task 11**: Test stop method
- Test server.stop() is called
- Test references are cleared
- Test double-stop is safe (no-op)
- Test errors during stop are handled (best-effort)

**Task 12**: Test health check route registration
- Test health check instance is created
- Test GET /status returns correct JSON
- Test localhost-only restriction (403 on non-localhost)
- Test health status reflects component state
- Test route registration before and after start()

---

## Files to Create
- `packages/server-daemon/src/daemon/DaemonApp.ts` (~120 lines)
- `packages/server-daemon/__tests__/daemon/DaemonApp.test.ts` (~200 lines)

## Files to Modify
- `packages/server-daemon/src/index.ts` (remove ~38 lines, add ~15 lines for DaemonApp usage)
- `packages/server-daemon/src/daemon/index.ts` (add DaemonApp export)

## Dependencies
- `DaemonServer` from `infrastructure/server/DaemonServer.ts`
- `OAuthController` from `controllers/OAuthController.ts`
- `HealthCheck` from `daemon/HealthCheck.ts`
- `DatabaseConnection` from `infrastructure/database/Database.ts`
- `KeystoreManager` from `infrastructure/keystore/KeystoreManager.ts`
- `OAuthStateManager` from `infrastructure/server/OAuthStateManager.ts`
- `AppConfig` from `infrastructure/config/Config.ts`

## Acceptance Criteria
- `DaemonApp` class exists in `src/daemon/DaemonApp.ts`
- `start()` method creates server, attaches routes, starts successfully
- `stop()` method stops server without closing database
- `addHealthCheckRoute()` registers localhost-only health check endpoint
- `src/index.ts` uses DaemonApp instead of inline logic
- All unit tests pass (15-20 tests)
- ESLint passes with no errors
- TypeScript compilation succeeds
- Manual testing: `streaming-daemon start` works as before
- Manual testing: Health check endpoint accessible at `http://localhost:PORT/status`

## Notes

### Why DaemonApp holds references to dependencies
- Enables future features (WebSocket, TTS, OBS integration) to access resources
- Supports clean shutdown (ShutdownHandler can get references from DaemonApp)
- Enables testing (inspect state after start/stop)
- Aligns with lifecycle management pattern (app owns its components)

### Why stop() doesn't close database
- ShutdownHandler orchestrates full graceful shutdown (server → database → exit)
- DaemonApp.stop() is for controlled stop during normal operation
- Separation of concerns: DaemonApp manages server, ShutdownHandler manages full lifecycle
- Prevents double-shutdown issues (stop database once, in correct order)

### Why health check registration is separate method
- Flexibility: Can register before or after start()
- Optional: Can be skipped for testing or minimal daemon modes
- Clear API: Explicit opt-in vs implicit registration
- Follows existing pattern: OAuth routes attached in start(), health check separate

### Why logging in DaemonApp
- DaemonApp is the orchestrator, should report its own lifecycle events
- Consistent with other services (HealthCheck, ShutdownHandler log their own actions)
- CLI can still log higher-level events (daemon started successfully)

### Migration path
- Phase 4 (ShutdownHandler) runs after DaemonApp.start()
- ShutdownHandler receives DaemonApp or references to all components
- Shutdown sequence: Signal → DaemonApp.stop() → database.close() → process.exit(0)
- This ensures all shutdown happens in correct order with proper error handling

## Integration with Other Phases
- **Phase 4 (ShutdownHandler)**: ShutdownHandler will need access to DaemonApp or component references
  - Option 1: Pass DaemonApp instance to ShutdownHandler, call daemonApp.stop()
  - Option 2: Pass individual components (server, database, keystore) as currently planned
- **Phase 6 (CLI Start Command)**: StartCommand will create DaemonApp and call start()
- **Phase 8 (Health Check Integration)**: Health check endpoint will be tested end-to-end

## Open Questions
1. Should ShutdownHandler receive DaemonApp or individual components?
   - **Recommendation**: Individual components (current Phase 4 plan) - cleaner dependency graph
2. Should health check registration be called in start() or by CLI?
   - **Decision**: By CLI - enables testing without health check, explicit control
3. Should DaemonApp export server for direct access?
   - **Decision**: No - use getServer() method for testing only
