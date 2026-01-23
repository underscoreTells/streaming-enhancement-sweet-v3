# Phase Plan - Status: Complete ✅
# Phase 6: CLI Start Command

## Overview
Extract and enhance the existing CLI start command logic (`src/index.ts:53-113`) into a dedicated `StartCommand` class that encapsulates initialization sequence, proper error handling with exit codes, and integrates with DaemonApp and ShutdownHandler.

## Current State Analysis
- **Existing implementation**: Inline start command in `src/index.ts:53-113` (61 lines)
- **Functionality**: Parses CLI args, loads config, creates logger, initializes db/keystore, creates server, attaches routes, starts server, registers signal handlers
- **Missing features**:
  - No separation of concerns (inline code in index.ts)
  - No proper exit codes (always exits 1 on any error)
  - Not testable (inline code with process.exit)
  - No DaemonApp integration (Phase 5)
  - No ShutdownHandler integration (Phase 4)
  - No graceful shutdown timeout support

## Architecture Decisions

### Class Structure
```typescript
interface StartCommandDeps {
  configPath?: string;
  port?: string;
  logLevel?: string;
}

class StartCommand {
  constructor(options: StartCommandDeps);
  execute(): Promise<void>;
  getCommand(): Command;
}
```

### Initialization Sequence (execute())
1. Load config (using configPath or default)
2. Override config with CLI flags (port, log-level)
3. Validate config
4. Create logger from config
5. Initialize database (exit code 2 on error)
6. Initialize keystore (exit code 2 on error)
7. Create OAuthCredentialsRepository + OAuthStateManager
8. Create DaemonApp with dependencies
9. Start daemon (exit code 3 on error)
10. Add health check route
11. Create ShutdownHandler (server, db, logger, timeout)
12. Register shutdown handlers (SIGTERM/SIGINT)
13. Log success

### Exit Codes
- **0**: Success (handled by ShutdownHandler)
- **1**: Configuration error
- **2**: Initialization error (database/keystore)
- **3**: Server startup error

---

## Task Breakdown (15 tasks)

### Phase 1: Core Implementation (Tasks 1-8)

**Task 1**: Create `StartCommand` class file
- File: `packages/server-daemon/src/cli/StartCommand.ts`
- Define `StartCommandDeps` interface
- Create class with constructor, private fields, exports
- Import dependencies from infrastructure, daemon, controllers

**Task 2**: Implement `execute()` method - Config & Logger
- Store CLI options (configPath, port, logLevel) in constructor
- Load config using `loadConfig(configPath)`
- Override `config.server.port` if port provided (parse as int)
- Override `config.logging.level` if logLevel provided (validate enum)
- Create logger using `LoggerFactory.create(config.logging, 'daemon')`
- Set up DaemonState internal state (logger, database, etc.)

**Task 3**: Implement `execute()` method - Initialization
- Initialize database:
  - `new DatabaseConnection(config.database.path, config.database.migrationsDir || '', logger)`
  - `await db.initialize()`
  - Store in DaemonState
- Initialize keystore:
  - `new KeystoreManager(undefined, logger)`
  - Store in DaemonState
- Create OAuthCredentialsRepository and OAuthStateManager
- Wrap in try-catch, throw descriptive errors for exit code 2

**Task 4**: Implement `execute()` method - DaemonApp
- Create DaemonApp with dependencies:
  ```typescript
  const daemonApp = new DaemonApp({
    config,
    logger,
    database: db,
    keystore,
    oauthStateManager
  });
  ```
- Call `daemonApp.start()` (throws on error for exit code 3)
- Log "Starting daemon..."
- Wrap in try-catch, cleanup database on error

**Task 5**: Implement `execute()` method - Health Check & Shutdown
- After daemonApp.start() succeeds, call `daemonApp.addHealthCheckRoute()`
- Get server reference: `const server = daemonApp.getServer()`
- Create ShutdownHandler:
  ```typescript
  const shutdownHandler = new ShutdownHandler({
    server,
    database: db,
    logger
  }, config.server.shutdownTimeout);
  ```
- Call `shutdownHandler.register()` to set up SIGTERM/SIGINT handlers
- Log startup success with port, PID, health check URL

**Task 6**: Implement `getCommand()` method
- Create Commander Command instance
- Set name: 'start'
- Set description: 'Start daemon server'
- Add options:
  - `--port <number>`: Server port (default: 3000)
  - `--config <path>`: Path to config file
  - `--log-level <level>`: Log level (error, warn, info, debug, default: info)
- Add action handler that calls `execute()` with CLI options
- Return the Command object

**Task 7**: Implement error handling and exit codes
- Wrap entire execute() in try-catch
- Handle config errors (ZodError, file not found): Exit code 1
  - Log "Configuration error: {error}"
  - Close database if open
  - process.exit(1)
- Handle initialization errors (database, keystore): Exit code 2
  - Log "Initialization error: {error}"
  - Close database if open
  - process.exit(2)
- Handle startup errors (daemonApp.start()): Exit code 3
  - Log "Failed to start daemon: {error}"
  - Close database if open
  - process.exit(3)
- Handle unexpected errors: Exit code 1 (default)

**Task 8**: Implement cleanup helper method
- Private method `cleanup()`
- Close database if open (try-catch)
- Clear all DaemonState references
- Log cleanup errors but continue

### Phase 2: Refactor CLI Entry Point (Tasks 9-11)

**Task 9**: Update `src/index.ts` to use StartCommand
- Remove inline start command (lines 53-113)
- Remove inline gracefulShutdown function (lines 16-44) - moved to ShutdownHandler
- Remove global variables (daemonServer, dbConnection, loggerInstance)
- Import `StartCommand`
- Create Commander program with name, description, version
- Add start command: `program.addCommand(new StartCommand(options).getCommand())`
- Parse process.argv: `program.parse(process.argv)`

**Task 10**: Ensure proper module resolution
- Update imports in index.ts
- Verify all paths are correct after refactoring
- Add shebang `#!/usr/bin/env node` at top of index.ts (if not present)

**Task 11**: Test CLI manually
- Build project: `npm run build`
- Test help: `./dist/index.js start --help`
- Test start with defaults: `./dist/index.js start`
- Test start with port: `./dist/index.js start --port 4000`
- Test start with config: `./dist/index.js start --config /path/to/config.json`
- Test start with log level: `./dist/index.js start --log-level debug`
- Test invalid config (should exit code 1)
- Test graceful shutdown with SIGTERM/SIGINT

### Phase 3: Testing (Tasks 12-15)

**Task 12**: Create test file structure
- File: `packages/server-daemon/__tests__/cli/StartCommand.test.ts`
- Set up mocks for:
  - loadConfig (returns mock config)
  - LoggerFactory.create (returns mock logger)
  - DatabaseConnection (mock initialize, close)
  - KeystoreManager (mock)
  - DaemonApp (mock start, stop, getServer)
  - ShutdownHandler (mock register)
- Mock process.exit to prevent actual termination
- Use beforeEach/afterEach hooks

**Task 13**: Test CLI argument parsing
- Test default port (3000)
- Test custom port override
- Test custom config path
- Test log level override
- Test invalid log level (should fail)

**Task 14**: Test initialization sequence
- Test config loading and override
- Test database initialization
- Test keystore initialization
- Test DaemonApp creation and start
- Test health check route registration
- Test ShutdownHandler creation and registration
- Test startup logging

**Task 15**: Test error handling and exit codes
- Test config error → exit code 1
- Test database error → exit code 2
- Test keystore error → exit code 2
- Test daemon start error → exit code 3
- Test cleanup on error (database closed)
- Test unexpected error → exit code 1

---

## Files to Create
- `packages/server-daemon/src/cli/StartCommand.ts` (~180 lines)
- `packages/server-daemon/src/cli/index.ts` (export StartCommand)
- `packages/server-daemon/__tests__/cli/StartCommand.test.ts` (~250 lines)

## Files to Modify
- `packages/server-daemon/src/index.ts` (remove ~98 lines, add ~20 lines for StartCommand usage)

## Dependencies
- `Command` from `commander`
- `loadConfig`, `LoggerFactory` from `infrastructure/config`
- `DatabaseConnection` from `infrastructure/database/Database.ts`
- `KeystoreManager` from `infrastructure/keystore/KeystoreManager.ts`
- `OAuthCredentialsRepository` from `infrastructure/database/OAuthCredentialsRepository.ts`
- `DaemonApp` from `daemon/DaemonApp.ts`
- `ShutdownHandler` from `daemon/ShutdownHandler.ts`
- `OAuthStateManager` from `infrastructure/server/OAuthStateManager.ts`

## Acceptance Criteria
- `StartCommand` class exists in `src/cli/StartCommand.ts`
- `execute()` method implements full initialization sequence
- `getCommand()` method returns Commander.js Command object
- Proper exit codes implemented (0, 1, 2, 3)
- `src/index.ts` uses StartCommand instead of inline logic
- All unit tests pass (20-25 tests)
- ESLint passes with no errors
- TypeScript compilation succeeds
- Manual testing: `streaming-daemon start --help` works
- Manual testing: `streaming-daemon start` with various options works
- Manual testing: Graceful shutdown works (SIGTERM/SIGINT)
- Manual testing: Health check endpoint accessible at startup

## Notes

### Why StartCommand handles initialization logic
- Clean separation: CLI layer knows about CLI args, config loading
- DaemonApp focuses on orchestration, not initialization
- Testability: Can mock initialization components independently
- Reusability: StartCommand can be extended for other CLI commands

### Why ShutdownHandler takes server/db/logger (not DaemonApp)
- Phase 4 plan uses individual components
- StartCommand owns database and keystore references
- DaemonApp.getServer() provides server reference
- Cleaner dependency graph (no circular DaemonApp ↔ ShutdownHandler)

### Why exit codes are explicit
- Clear error categorization for users and automation
- Enables proper error handling in scripts
- Consistent with daemon best practices
- Configuration (1) → Initialization (2) → Startup (3) flow

### Why cleanup on error
- Prevents database lock issues on restart
- Ensures clean state even on failure
- Best-effort: Log errors but continue with exit

### Integration with previous phases
- **Phase 3 (HealthCheck)**: Used via `daemonApp.addHealthCheckRoute()`
- **Phase 4 (ShutdownHandler)**: Created and registered after daemon starts
- **Phase 5 (DaemonApp)**: Used for server orchestration and health check

### Migration from inline code
- Lines 16-44 (gracefulShutdown) → ShutdownHandler (Phase 4)
- Lines 59-96 (startup) → DaemonApp (Phase 5)
- Lines 53-113 (start command) → StartCommand (Phase 6)
- Only commander setup remains in index.ts

## Open Questions
1. Should StartCommand log config values (port, log level) for visibility?
   - **Recommendation**: Yes, log config on startup for debugging
2. Should shutdown timeout be configurable via CLI flag?
   - **Decision**: No, use config value (separation of concerns)
3. Should StartCommand export daemon state for testing?
   - **Decision**: No, use internal state and mocks for testing

## Future Enhancements
- Additional CLI commands (stop, status, restart, logs)
- Daemon status command (check if running via PID file)
- Log file rotation status command
- Config validation command (dry-run)
