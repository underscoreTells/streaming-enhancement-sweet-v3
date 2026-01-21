# Phase 2: Logger Factory

## Status: pending

## Phase Scope
Create centralized logger factory with console + rotating file logging support, then update all hardcoded loggers to use it.

## Architecture Decisions
- **Log format**: Human-readable `[timestamp] [level] message metadata`
- **Service name**: `SES` (Streaming Enhancement Sweet) for log filenames
- **Fallback chain**: Configured directory → Install directory → Current working directory → Console-only
- **Stack traces**: Included via `format.errors({ stack: true })`, visible at debug level
- **Log file pattern**: `SES-YYYY-MM-DD.log`
- **Symlink**: `SES-current.log` → latest daily log
- **Concurrency**: Winston handles concurrent writes (no mutex needed)
- **Config loading**: `Config.ts` keeps minimal console logger (no LoggerFactory)

## Part 1: LoggerFactory Implementation (Commit 1)

### Tasks
- [ ] Create `infrastructure/config/LoggerFactory.ts`
  - Implement `createLogger(config: LoggingConfig, context?: string): winston.Logger`
  - Implement human-readable format: `[timestamp] [level] message metadata`
  - Implement fallback chain for log directory:
    - Try configured directory
    - Fallback to install directory (platform-specific)
    - Fallback to current working directory
    - Fall back to console-only if all fail
  - Implement ISO 8601 timestamp format
  - Implement stack trace handling via `format.errors({ stack: true })`
  - Create log directory if missing with `fs.mkdirSync(dir, { recursive: true })`
  - Add symlink `SES-current.log` → latest daily log
  - Console transport at `config.level`
  - DailyRotateFile transport with:
    - `datePattern: 'YYYY-MM-DD'`
    - `maxFiles: config.maxFiles` (default 7)
    - `maxSize: config.maxSize` (default '20m')
    - `level: config.level`
- [ ] Create `__tests__/infrastructure/config/LoggerFactory.test.ts`
  - Test logger creation with full config (console + file)
  - Test logger with no directory (console only)
  - Test log level filtering (error, warn, info, debug)
  - Test ISO 8601 timestamp format
  - Test error stack traces at debug level
  - Test log directory creation
  - Test fallback chain (configured → install → cwd → console)
  - Use temp directory for file tests
  - Clean up temp directories after tests
- [ ] Update `infrastructure/config/index.ts`
  - Add `export { LoggerFactory } from './LoggerFactory'`
- [ ] Run tests: `npm test -- --run LoggerFactory`
- [ ] Commit: "Add centralized LoggerFactory with console and rotating file transport for SES logging"

## Part 2: Update Hardcoded Loggers (Commit 2)

### Database Components
- [ ] Update `infrastructure/database/Database.ts`
  - Accept optional `logger?: winston.Logger` in constructor
  - Use passed logger, fall back to minimal console logger
  - Remove hardcoded `winston.createLogger()` at top
  - Update `initialize()`, `getPath()`, `close()`, `raw()`, `rawExec()`, `transaction()` to use logger
- [ ] Update `infrastructure/database/OAuthCredentialsRepository.ts`
  - Accept `logger: winston.Logger` in constructor
  - Remove hardcoded logger at top
  - Update all methods to use constructor logger
- [ ] Update `infrastructure/database/migrations/MigrationRunner.ts`
  - Accept `logger: winston.Logger` in constructor
  - Remove hardcoded logger at top
  - Update all methods to use constructor logger

### Keystore Components
- [ ] Update `infrastructure/keystore/KeystoreManager.ts`
  - Accept `logger: winston.Logger` in constructor
  - Remove hardcoded logger at top
  - Update all methods to use constructor logger
- [ ] Update `infrastructure/keystore/strategies/WindowsKeystoreStrategy.ts`
  - Accept `logger: winston.Logger` in constructor
  - Remove hardcoded logger at top
  - Update all methods to use constructor logger
- [ ] Update `infrastructure/keystore/strategies/MacosKeystoreStrategy.ts`
  - Accept `logger: winston.Logger` in constructor
  - Remove hardcoded logger at top
  - Update all methods to use constructor logger
- [ ] Update `infrastructure/keystore/strategies/LinuxKeystoreStrategy.ts`
  - Accept `logger: winston.Logger` in constructor
  - Remove hardcoded logger at top
  - Update all methods to use constructor logger

### OAuth/Platform Components
- [ ] Update `platforms/OAuthFlow.ts`
  - Accept `logger: winston.Logger` in constructor
  - Remove hardcoded logger at top
  - Update all methods to use constructor logger
- [ ] Update `platforms/Twitch/TwitchOAuth.ts`
  - Accept `logger: winston.Logger` in constructor
  - Remove hardcoded logger at top
  - Update all methods to use constructor logger
- [ ] Update `platforms/Kick/KickOAuth.ts`
  - Accept `logger: winston.Logger` in constructor
  - Remove hardcoded logger at top
  - Update all methods to use constructor logger
- [ ] Update `platforms/YouTube/YouTubeOAuth.ts`
  - Accept `logger: winston.Logger` in constructor
  - Remove hardcoded logger at top
  - Update all methods to use constructor logger

### Orchestration Layer
- [ ] Update `controllers/OAuthController.ts`
  - Already accepts logger in constructor
  - Ensure it's passed from caller (not created internally)
- [ ] Update `src/index.ts`
  - Replace `createLogger()` with `LoggerFactory.create(config.logging)`
  - Create logger instance after config loading
  - Pass logger to all components:
    - DatabaseConnection
    - KeystoreManager
    - DaemonServer
    - OAuthController
  - Replace `console.error()` calls with logger
  - Update `gracefulShutdown()` to use logger

### Test Updates
- [ ] Update `__tests__/infrastructure/database/Database.test.ts`
  - Pass logger instance to Database constructor
  - Use minimal logger config for tests
- [ ] Update `__tests__/infrastructure/database/OAuthCredentialsRepository.test.ts`
  - Pass logger instance to repository constructor
- [ ] Update `__tests__/infrastructure/database/MigrationRunner.test.ts`
  - Pass logger instance to MigrationRunner constructor
- [ ] Update `__tests__/infrastructure/keystore/KeystoreManager.test.ts`
  - Pass logger instance to KeystoreManager constructor
- [ ] Update `__tests__/controllers/OAuthController.test.ts`
  - Pass logger instance to controller constructor
- [ ] Update `__tests__/platforms/OAuthFlow.test.ts`
  - Pass logger instance to OAuthFlow constructor
- [ ] Update `__tests__/platforms/Twitch/TwitchOAuth.test.ts`
  - Pass logger instance to TwitchOAuth constructor
- [ ] Update `__tests__/platforms/Kick/KickOAuth.test.ts`
  - Pass logger instance to KickOAuth constructor
- [ ] Update `__tests__/platforms/YouTube/YouTubeOAuth.test.ts`
  - Pass logger instance to YouTubeOAuth constructor

### Final Verification
- [ ] Run all tests: `npm test -- --run`
- [ ] Run lint: `npm run lint`
- [ ] Build project: `npm run build`
- [ ] Commit: "Update all hardcoded loggers to use centralized LoggerFactory (excluding Config.ts minimal logger)"

## Files to Create
- `docs/phase-plans/phase-2-logger-factory.md` (this file)
- `packages/server-daemon/infrastructure/config/LoggerFactory.ts`
- `packages/server-daemon/__tests__/infrastructure/config/LoggerFactory.test.ts`

## Files to Modify
- `docs/WORKFLOW.md` (add Phase Planning section)
- `docs/feature-plans/daemon-server-core.md` (Phase 2 section, add link)
- `packages/server-daemon/infrastructure/config/index.ts` (export LoggerFactory)

## Files to Modify (Part 2: Hardcoded Loggers)
- `packages/server-daemon/infrastructure/database/Database.ts`
- `packages/server-daemon/infrastructure/database/OAuthCredentialsRepository.ts`
- `packages/server-daemon/infrastructure/database/migrations/MigrationRunner.ts`
- `packages/server-daemon/infrastructure/keystore/KeystoreManager.ts`
- `packages/server-daemon/infrastructure/keystore/strategies/WindowsKeystoreStrategy.ts`
- `packages/server-daemon/infrastructure/keystore/strategies/MacosKeystoreStrategy.ts`
- `packages/server-daemon/infrastructure/keystore/strategies/LinuxKeystoreStrategy.ts`
- `packages/server-daemon/platforms/OAuthFlow.ts`
- `packages/server-daemon/platforms/Twitch/TwitchOAuth.ts`
- `packages/server-daemon/platforms/Kick/KickOAuth.ts`
- `packages/server-daemon/platforms/YouTube/YouTubeOAuth.ts`
- `packages/server-daemon/controllers/OAuthController.ts`
- `packages/server-daemon/src/index.ts`

## Test Files to Modify (Part 2)
- `packages/server-daemon/__tests__/infrastructure/database/Database.test.ts`
- `packages/server-daemon/__tests__/infrastructure/database/OAuthCredentialsRepository.test.ts`
- `packages/server-daemon/__tests__/infrastructure/database/MigrationRunner.test.ts`
- `packages/server-daemon/__tests__/infrastructure/keystore/KeystoreManager.test.ts`
- `packages/server-daemon/__tests__/controllers/OAuthController.test.ts`
- `packages/server-daemon/__tests__/platforms/OAuthFlow.test.ts`
- `packages/server-daemon/__tests__/platforms/Twitch/TwitchOAuth.test.ts`
- `packages/server-daemon/__tests__/platforms/Kick/KickOAuth.test.ts`
- `packages/server-daemon/__tests__/platforms/YouTube/YouTubeOAuth.test.ts`

## Dependencies
- None for Part 1 (standalone factory)
- Part 2 depends on Part 1 completion
