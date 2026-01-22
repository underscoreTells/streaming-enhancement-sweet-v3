# Phase 8: Health Check Endpoint Integration

## Overview
Integrate HealthCheck service from Phase 3 with DaemonServer to expose a `/status` endpoint that returns component-level health information for monitoring and debugging. Server will bind to localhost by default for network-level security.

## Current State Analysis
- **Phase 3**: HealthCheck service created (checks server, database, keystore)
- **Phase 5**: DaemonApp has `addHealthCheckRoute()` method (planned, not yet tested)
- **Missing**:
  - Actual HTTP route registration on DaemonServer
  - Server host configuration (bind address)
  - Integration testing of endpoint
  - Error handling for route

## Architecture Decisions

### Server Binding Strategy
```typescript
// In ServerConfigSchema
server: {
  host: z.string().default('127.0.0.1'),  // Bind to localhost only by default
  port: z.number().int().min(1).max(65535).default(3000),
  ...
}

// In DaemonServer.start()
this.server = this.app.listen(this.port, this.host, ...);
```

**Security model:**
- Default: `127.0.0.1` - Only accepts connections from local machine
- Optional: `0.0.0.0` - Accepts from any address (for remote monitoring)
- No fragile IP parsing needed at route level

### Route Structure
```typescript
// In DaemonApp.addHealthCheckRoute()
server.getApp().get(config.server.healthCheckPath, (req, res) => {
  try {
    const health = healthCheck.getStatus();
    res.json(health);
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Health Check Response
```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "components": {
    "server": { "status": "healthy", "uptime": 12345, "port": 3000 },
    "database": { "status": "healthy", "path": "/path/to/db", "open": true },
    "keystore": { "status": "healthy", "type": "windows", "isFallback": false }
  },
  "version": "0.1.0"
}
```

---

## Task Breakdown (13 tasks)

### Phase 1: Server Host Configuration (Tasks 1-3)

**Task 1**: Update config schema for host
- File: `packages/server-daemon/infrastructure/config/schemas.ts`
- Add `host: z.string().default('127.0.0.1')` to `ServerConfigSchema`
- Update `getDefaultConfig()` in Config.ts to include default host
- Document: `0.0.0.0` allows remote access (use with caution)

**Task 2**: Update DaemonServer to use host
- File: `packages/server-daemon/infrastructure/server/DaemonServer.ts`
- Add `private host: string` field
- Store host from config in constructor
- Update `start()` to use `this.app.listen(this.port, this.host, ...)`
- Update `getPort()` to return `this.port`
- Add `getHost()` method returning `this.host`

**Task 3**: Update logging with host info
- Update startup log to include host: `Daemon server listening on {host}:{port}`
- If host is `127.0.0.1`, log warning about remote access

### Phase 2: Health Check Route Implementation (Tasks 4-7)

**Task 4**: Add getApp() method to DaemonServer
- Add `getApp(): Express` method
- Returns internal `this.app` instance
- Allows DaemonApp to register routes directly

**Task 5**: Implement health check route in DaemonApp
- In `addHealthCheckRoute()` method
- Create HealthCheck instance: `new HealthCheck(server, database, keystore, logger)`
- Use `config.server.healthCheckPath` instead of hardcoded `/status`
- Register GET route: `server.getApp().get(path, handler)`
- Wrap handler in try-catch for error handling
- Return health status JSON on success
- Return 500 on unexpected errors

**Task 6**: Add error handling to route
- Catch any errors in HealthCheck.getStatus()
- Log errors with logger
- Return 500 status with error message
- Don't expose internal error details

**Task 7**: Update logging for route registration
- Log route registration with path: "Health check endpoint registered at {path}"
- Include host/port info: "Accessible at http://{host}:{port}{path}"

### Phase 3: Testing (Tasks 8-11)

**Task 8**: Update unit tests for DaemonServer
- Test server binds to correct host
- Test getHost() returns correct value
- Test startup logging includes host info

**Task 9**: Create integration test file
- File: `packages/server-daemon/__tests__/integration/health-check-integration.test.ts`
- Set up full daemon startup (using StartCommand or manual setup)
- Use supertest for HTTP requests
- Test both localhost and 0.0.0.0 binding

**Task 10**: Test successful health check
- Start daemon with host: '127.0.0.1'
- Request GET /status from localhost
- Verify 200 status
- Verify JSON structure matches HealthStatus interface
- Verify component status values
- Test with host: '0.0.0.0' for remote access

**Task 11**: Test error scenarios
- Test with unhealthy database (simulate db closed)
- Test with keystore unavailable
- Verify status reflects component states
- Test graceful degradation
- Test route returns 500 on internal errors

### Phase 4: Manual Testing & Validation (Tasks 12-13)

**Task 12**: Test health check endpoint manually
- Start daemon: `./dist/index.js start --port 3000`
- Verify binding to 127.0.0.1 (check with `netstat -an | grep 3000`)
- Curl localhost: `curl http://localhost:3000/status`
- Verify JSON response format

**Task 13**: Test with custom host
- Start daemon with config: `server.host: '0.0.0.0'`
- Verify binding to all interfaces
- Test from different machine on network (if available)
- Verify health check accessible remotely

---

## Files to Create
- `packages/server-daemon/__tests__/integration/health-check-integration.test.ts` (~150 lines)

## Files to Modify
- `packages/server-daemon/infrastructure/config/schemas.ts` (add host to ServerConfigSchema)
- `packages/server-daemon/infrastructure/config/Config.ts` (update default config)
- `packages/server-daemon/infrastructure/server/DaemonServer.ts` (add host, getApp, getHost)
- `packages/server-daemon/src/daemon/DaemonApp.ts` (implement addHealthCheckRoute)

## Dependencies
- HealthCheck from `daemon/HealthCheck.ts`
- Express from `express`
- supertest (dev dependency, for integration tests)

## Acceptance Criteria
- Server binds to `127.0.0.1` by default (localhost only)
- GET /status endpoint returns health status JSON
- Host configurable via `server.host` config option
- HealthCheck service properly integrated
- Health check path configurable via `config.server.healthCheckPath`
- All integration tests pass (10-15 tests)
- ESLint passes, TypeScript compiles
- Manual testing: `curl http://localhost:3000/status` works
- Manual testing: With `host: '0.0.0.0'`, remote access works

## Notes

### Why bind to 127.0.0.1 by default
- **Network-level security**: Remote machines can't even connect
- **No fragile IP parsing**: No need to check req.ip at route level
- **Defense in depth**: Works even if reverse proxy misconfigured
- **Simple**: Standard practice for local services

### Why 0.0.0.0 is an option
- **Remote monitoring**: Nagios, Prometheus, etc. can check health
- **Docker/port forwarding**: Allows external access to containerized daemon
- **Explicit choice**: User must opt-in, aware of security implications

### Health check path
- Already exists in config as `server.healthCheckPath`
- Default: '/status'
- Allows customizing if path conflicts with other routes

### Caching behavior
- HealthCheck has 5-second cache (from Phase 3)
- Prevents excessive database/keystore checks
- Trade-off: Slightly stale data vs performance
