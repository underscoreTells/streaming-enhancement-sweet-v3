# Module: server-daemon

## Overview
Node.js + TypeScript server providing streaming data, analytics persistence, OAuth handling, and API for CLI/Web clients. Event-driven architecture with strategy pattern for multi-platform support.

## Structure
```
server-daemon/
├── controllers/       # HTTP/WebSocket request handlers
├── services/          # Business logic (StreamEvent, Obs, Tts, CommandExecution)
├── platforms/         # Unified strategy facades (Twitch, Kick, YouTube)
└── infrastructure/    # Server setup, database (SQLite), config, logging

shared/models/         # Unified data types (Stream, User, Chat, Event)
```

## Interfaces & Classes

### Controllers
- `StreamController`: Handle stream request/endpoints
- `OAuthController`: Handle OAuth callbacks
- `ConfigController`: CLI/Web client config management

### Services
- `StreamEventService`: Core stream event processing and aggregation
- `ObsService`: OBS WebSocket integration (scene switching, source control)
- `TtsService`: Local text-to-speech service
- `CommandExecutionService`: Sandboxed JS/TS !command execution (future)

### Platforms (Strategy Pattern)
Each platform provides a unified facade that handles API calls, OAuth, WebSocket connections, and data translation internally:

- `TwitchStrategy`: Complete Twitch integration (REST API + WebSocket + data normalization)
- `KickStrategy`: Complete Kick integration (REST API + WebSocket + data normalization)
- `YouTubeStrategy`: Complete YouTube integration (REST API + WebSocket + data normalization)

### Infrastructure
- `DaemonServer`: HTTP/WebSocket server setup
- `Database`: SQLite connection and operations (better-sqlite3)
- `ConfigManager`: Configuration handling (OAuth tokens, settings)
- `Logger`: Structured logging

## Features List

### Core Platform Support
- [ ] Feature: Twitch platform strategy (OAuth + API + data translation)
- [ ] Feature: Kick platform strategy (OAuth + API + data translation)
- [ ] Feature: YouTube platform strategy (OAuth + API + data translation)

### Infrastructure
- [x] Feature: OAuth flow and secure keystore abstraction (Complete ✅)
   - **Implementation**: @docs/archive/feature-plans/oauth-flow-keystore.md
   - **Tests**: @tests/keystore-tests.md
   - **API**: @api/oauth-endpoints.md
   - **Status**: Phases 1-8 complete with 252/252 unit tests passing. Daemon server integration moved to Daemon Server Core feature.
   - **Fix**: Linux Secret Service password storage - see @docs/fixes/native-keystore-linux-secret-service.md (2026-01-19)
- [x] Feature: Daemon Server Core (Complete ✅)
   - **Implementation**: @docs/archive/feature-plans/daemon-server-core.md
   - **Status**: All 10 phases implemented. Core daemon infrastructure complete.
   - **Components**:
     - CLI: StartCommand with proper exit codes
     - Orchestrator: DaemonApp for server lifecycle
     - Health Check: Component-level health monitoring
     - Shutdown Handler: Graceful SIGTERM/SIGINT handling
   - **Tests**: 316 unit tests passing (313 new + 252 existing OAuth tests)
   - **Documentation**: Complete API docs, CLI reference, configuration guide, troubleshooting guide
   - **Completion Date**: 2026-01-22
- [x] Feature: SQLite persistence layer (schema, migrations, operations)
- [ ] Feature: Shared data models (normalized Stream, User, Chat, Event types)
- [ ] Feature: Basic HTTP endpoints (health, config, stream queries)

### Real-time Communication
- [ ] Feature: WebSocket event broadcasting (client registrations and subscriptions)
- [ ] Feature: Stream event aggregation and forwarding
- [ ] Feature: Platform WebSocket connections (Twitch, Kick, YouTube for real-time data)

### Integrations (Services)
- [ ] Feature: OBS WebSocket integration (ObsService)
- [ ] Feature: Local TTS integration (TtsService)
- [ ] Feature: Sandboxed !command execution (CommandExecutionService)

### Analytics Data Collection
- [ ] Feature: API polling system (Twitch + Kick + YouTube)
- [ ] Feature: Data storage in SQLite (raw data points)
- [ ] Feature: Client API for analytics queries

## Design Decisions

- **Platform Architecture**: Strategy pattern - each platform has one unified facade (`TwitchStrategy`, `KickStrategy`, `YouTubeStrategy`) that internally handles API calls, OAuth, WebSocket connections, and data translation. External services only interact with the unified interface.

- **Data Models**: Shared normalized types in `shared/models/` (Stream, User, Chat, Event, etc.) for cross-platform consistency. Each platform strategy translates platform-specific responses to these unified types.

- **Database**: SQLite (better-sqlite3) for local analytics data persistence. Suitable for single-user local application, no external DB dependencies.

- **Analytics Approach**: Poll APIs periodically → Store raw data points in SQLite → UI layer computes analytics (most engaged chatters, viewer retention, user LTV, etc.) on demand.

- **Sandboxed Execution**: JS/TS sandboxing via Node.js for !commands. No custom script interpreters - use existing Node.js runtime with sandboxing.

- **Integrations**: OBS, TTS, and other integrations run as services in the daemon process. Decoupled from main streaming logic but same process for simplicity.

- **Multi-Strategy Support**: Daemon can instantiate multiple platform strategies simultaneously (e.g., `new TwitchStrategy()`, `new KickStrategy()`) for cross-platform monitoring.

- **OAuth Flow**: OAuth is handled locally. The daemon server serves OAuth endpoints for token management and callbacks. OAuth clients (Twitch, Kick, YouTube) redirect to daemon server's callback endpoint, which exchanges authorization codes for tokens and serves a platform-styled HTML "Authentication Complete" page. Access tokens are stored securely in native OS keystores (Windows Credential Manager, macOS Keychain, Linux Secret Service) with encrypted file fallback. Concurrent OAuth flows are supported via async-mutex. See @docs/feature-plans/oauth-flow-keystore.md for implementation details.

- **Client Event Registration**: Clients (CLI, Web UI) register with the daemon via WebSocket to receive real-time stream events, chat messages, and platform-specific updates. The daemon maintains a registry of connected clients and broadcasts events to relevant subscribers.

## Dependencies
- **External Libraries**: Express, ws (WebSocket), better-sqlite3, obs-websocket-js
- **External APIs**: Twitch API, Kick API, YouTube API
- **Needed by**: CLI module, Web UI module

## Completion Date
2026-01-22

## Documentation
- API Overview: @api/daemon-api.md
- Health Check Endpoint: @api/health-check.md
- OAuth Endpoints: @api/oauth-endpoints.md
- CLI Reference: @guides/cli-reference.md
- Configuration Guide: @guides/configuration.md
- Installation Guide: @guides/installation.md
- Troubleshooting Guide: @guides/troubleshooting.md
- Architecture Overview: @architecture/daemon-server-core.md