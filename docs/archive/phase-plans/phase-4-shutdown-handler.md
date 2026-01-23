# Phase Plan - Status: Complete ✅
# Phase 4: Shutdown Handler

## Overview
Extract and enhance the existing inline shutdown logic (`src/index.ts:16-44`) into a dedicated `ShutdownHandler` class with configurable timeout, double-shutdown prevention, and best-effort error handling.

## Current State Analysis
- **Existing implementation**: Inline shutdown handler in `src/index.ts:16-44` (28 lines)
- **Functionality**: Handles SIGTERM/SIGINT, stops server, closes database
- **Missing features**:
  - No double-shutdown prevention (`isShuttingDown` flag)
  - No configurable timeout for in-flight requests
  - Error handling exits immediately instead of continuing (best-effort)
  - Not testable (inline code, `process.exit` can't be mocked)
  - No separation of concerns

## Architecture Decisions

### Class Structure
```typescript
interface ShutdownDeps {
  server: DaemonServer;
  database: DatabaseConnection;
  logger: Logger;
}

class ShutdownHandler {
  private isShuttingDown: boolean = false;
  private readonly timeout: number;

  constructor(deps: ShutdownDeps, timeout: number = 10000);
  register(): void;
  shutdown(signal?: string): Promise<void>;
  waitForInFlightRequests(): Promise<void>;
}
```

### Shutdown Sequence
1. Check `isShuttingDown` flag → return if true (double-shutdown prevention)
2. Set `isShuttingDown = true`
3. Log "Received {signal}, shutting down..."
4. Stop server (best-effort, continue on error)
5. Wait for timeout (best-effort)
6. Close database (best-effort, continue on error)
7. Log "Shutdown complete"
8. Call `process.exit(0)`

### Error Handling Strategy
- **Best-effort approach**: Wrap each step in individual try-catch blocks
- Log all errors but continue to next step
- Final `process.exit(0)` always happens (outside try-catch)

---

## Task Breakdown (15 tasks)

### Phase 1: Core Implementation (Tasks 1-6)

**Task 1**: Create `ShutdownHandler` class file
- File: `packages/server-daemon/src/daemon/ShutdownHandler.ts`
- Define `ShutdownDeps` interface
- Create class with constructor, private fields, exports

**Task 2**: Implement `shutdown()` method
- Add double-shutdown prevention with `isShuttingDown` flag
- Implement shutdown sequence with individual try-catch blocks
- Call `process.exit(0)` at end

**Task 3**: Implement `waitForInFlightRequests()` method
- Use `setTimeout` to wait for `this.timeout` milliseconds
- Return Promise that resolves after timeout

**Task 4**: Implement `register()` method
- Register SIGTERM handler
- Register SIGINT handler
- Both call `shutdown(signal)`

**Task 5**: Add logging helper method
- Log shutdown messages with signal name if provided

**Task 6**: Update `src/index.ts`
- Remove inline `gracefulShutdown` function (lines 16-44)
- Import `ShutdownHandler`
- Create instance after `server.start()` succeeds
- Call `shutdownHandler.register()`

### Phase 2: Testing (Tasks 7-12)

**Task 7**: Create test file structure
- File: `packages/server-daemon/__tests__/daemon/ShutdownHandler.test.ts`
- Set up mocks for server, database, logger
- Mock `process.exit` to prevent termination
- Use beforeEach/afterEach hooks

**Task 8**: Test `register()` method
- Verify SIGTERM handler registered
- Verify SIGINT handler registered
- Verify shutdown called with signal name

**Task 9**: Test shutdown sequence
- Verify server.stop() called
- Verify database.close() called
- Verify process.exit(0) called
- Use fake timers for timeout

**Task 10**: Test double-shutdown prevention
- Call shutdown twice → verify sequence runs once
- Verify only one process.exit call
- Test signal handlers respect flag

**Task 11**: Test error handling (best-effort)
- Make server.stop() throw → verify database still closes
- Make database.close() throw → verify process.exit still called
- Verify errors are logged

**Task 12**: Test configurable timeout
- Test custom timeout value used
- Test default 10000ms when not specified

### Phase 3: Validation (Tasks 13-15)

**Task 13**: Run all tests and fix issues
**Task 14**: Run linting and type checking
**Task 15**: Update feature plan and archive this phase plan

---

## Files to Create
- `packages/server-daemon/src/daemon/ShutdownHandler.ts` (~150 lines)
- `packages/server-daemon/__tests__/daemon/ShutdownHandler.test.ts` (~300 lines)

## Files to Modify
- `packages/server-daemon/src/index.ts` (remove 28 lines, add ~10 lines)
- `docs/feature-plans/daemon-server-core.md` (update status)

## Dependencies
- `DaemonServer` from `infrastructure/server/DaemonServer.ts`
- `DatabaseConnection` from `infrastructure/database/Database.ts`
- `Logger` from `winston`
- Config `server.shutdownTimeout` from config

## Acceptance Criteria
- `ShutdownHandler` class exists in `src/daemon/ShutdownHandler.ts`
- Shutdown sequence executes in correct order
- Double-shutdown prevention works
- Configurable timeout is respected
- Best-effort error handling (continue on errors)
- `src/index.ts` uses `ShutdownHandler` instead of inline code
- All unit tests pass (15-20 tests)
- ESLint passes with no errors
- TypeScript compilation succeeds
- Manual testing: `SIGTERM` and `SIGINT` trigger graceful shutdown
- Feature plan updated with Phase 4 complete status

## Notes
- Why not keep inline code: Inline code is not testable, lacks double-shutdown prevention, has no timeout, and exits immediately on error
- Why best-effort approach: Ensures graceful shutdown always completes even if one component fails
- Why separate class: Enables unit testing, improves maintainability, follows established architecture pattern
- No OAuthStateManager cleanup needed: It's an in-memory Map with no resources to release
- process.exit mocking: Essential for unit tests; real process.exit terminates the test runner
