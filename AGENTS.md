# Project: Streaming Enhancement Sweet v3

## Documentation Hub
Read these files for complete context:
- @docs/WORKFLOW.md - AI-assisted development methodology and file structure
- @docs/PLAN.md - Current feature being implemented
- @docs/module-plans/module-server-daemon.md - Server daemon module details
- @docs/feature-plans/daemon-server-core.md - Daemon Server Core feature plan (current)

### Completed Features
- @docs/archive/feature-plans/oauth-flow-keystore.md - OAuth flow & keystore implementation (complete)
- @docs/fixes/native-keystore-linux-secret-service.md - Linux keystore Secret Service fix (complete)

### Documentation Structure
```
docs/
├── module-plans/          # Module overviews & feature tracking
├── feature-plans/         # Detailed feature implementation plans
├── architecture/          # Technical deep-dives & design decisions
├── tests/                 # Test plans
├── api/                   # API documentation
├── archive/               # Completed modules & features
├── PLAN.md                # Current feature (focus tracking)
└── WORKFLOW.md            # Development methodology
```

## Tech Stack

### Server Daemon
- Language: TypeScript (Node.js)
- Framework: Express + WebSocket
- Architecture: Event-driven, Strategy Pattern for platforms
- Database: SQLite (better-sqlite3)
- Scripting: JS/TS sandboxing (Node.js-based)
- Purpose: Core daemon managing streaming platforms, integrations, analytics storage

### CLI
- Language: Go
- Framework: Cobra (spf13/cobra)
- Requirements: Cross-platform only, no platform-specific dependencies
- Purpose: CLI client for managing server-daemon and viewing streams

### Web UI
- Language/Framework: Svelte (latest)
- Purpose: Web interface for managing server-daemon, viewing analytics, managing integrations

### Integration Layer
- OBS WebSocket: OBS Studio integration via obs-websocket-js
- TTS: Local text-to-speech service

## Project Structure
```
project-root/
├── server-daemon/      # TypeScript daemon (Express + WS + SQLite)
│   ├── controllers/    # HTTP/WebSocket handlers
│   ├── services/       # Business logic (Obs, Tts, StreamEvent, etc.)
│   ├── platforms/      # Unified strategy facades (Twitch, Kick, YouTube)
│   └── infrastructure/ # Server setup, database, config, logging
├── shared/             # Shared code across components
│   └── models/         # Unified data types (Stream, User, Chat, Event)
├── cli/                # Go CLI (Cobra)
├── web-ui/             # Svelte web interface
├── docs/               # Documentation
│   ├── PLAN.md         # Current feature
│   └── WORKFLOW.md     # Development方法论
└── AGENTS.md           # This file
```

## Code Conventions

### TypeScript (Server Daemon)
- Use strict mode
- ESLint + Prettier for code formatting
- Async/await for asynchronous operations
- Type annotation for all functions
- Controllers/Services/Platforms/Infrastructure separation
- Strategy Pattern for platform implementations (each in `platforms/`)
- Unified data models in `shared/models/`

### Go (CLI)
- Standard Go formatting (`go fmt`)
- No external C dependencies (CGO)
- Cross-platform libraries only
- Use Cobra for command structure
- Use Viper for configuration management

### Svelte (Web UI)
- TypeScript for type safety
- Component-based architecture
- SvelteKit conventions for routing
- ESLint + Prettier

### Logging (All Components)
- **Never use emojis** in log messages, console.log, console.error, or any logging output
- Use plain text only for logs
- Log messages should be clear, concise, and machine-readable
- Use standard log levels (error, warn, info, debug)
- For warnings: use "WARNING:" prefix instead of emoji
- For errors: use standard error codes/messages instead of emoji indicators
- Examples:
  - Bad: `console.log('✅ Task complete')`
  - Good: `console.log('Task complete')`
  - Bad: `console.warn('⚠️  Warning: file not found')`
  - Good: `console.warn('WARNING: file not found')`

## Module Communication

### Interfaces
- **CLI ↔ Server**: HTTP/WebSocket API (port TBD)
- **Web UI ↔ Server**: HTTP/WebSocket API (port TBD)
- **Server → Twitch/Kick/YouTube**: OAuth + REST API + Websockets
- **Server ↔ OBS**: WebSocket (obs-websocket-js)

### Data Flow
1. CLI/Web client sends requests to server-daemon
2. Server-daemon communicates with Twitch/Kick/YouTube APIs via OAuth (using platform strategies)
3. Server-daemon stores polling data in SQLite for analytics
4. Server-daemon broadcasts stream data to connected clients via WebSocket
5. CLI displays stream information, Web UI computes and shows analytics
6. Integations (OBS, TTS) run as daemon services

## OAuth Integration
- Twitch API: OAuth 2.0 with access tokens
- Kick API: OAuth 2.0 with access tokens
- YouTube API: OAuth 2.0 with access tokens
- Users register apps in their dev consoles
- **Tokens stored** in native OS keystores (Windows Credential Manager, macOS Keychain, Linux Secret Service)
- **Keystore fallback**: Encrypted file (AES-256-GCM) when native unavailable
- **Status**: Complete ✅ (see @docs/archive/feature-plans/oauth-flow-keystore.md)
- **See**: @docs/architecture/keystore-strategy-pattern.md for architecture

## Daemon Server Core (Current Feature)
- **Status**: In Progress (Planning complete, implementation starting)
- **Implementation**: @docs/feature-plans/daemon-server-core.md
- **CLI Command**: `streaming-daemon start [--port PORT] [--config PATH] [--log-level LEVEL]`
- **Health Check**: GET /status (localhost only) with component-level status
- **Graceful Shutdown**: SIGTERM/SIGINT handlers with configurable timeout (default 10s)
- **PID File**: Track running daemon, prevent duplicate instances
- **Exit Codes**: 0 (success), 1 (config error), 2 (init error), 3 (startup error)
- **Dependencies**: commander, winston-daily-rotate-file

## Documentation Workflow
- **After every phase implementation**: Check and update all plan files
  - Update feature plan with phase status (docs/feature-plans/*.md)
  - Update PLAN.md with current phase and completed phases
  - Document any architectural decisions or changes
  - Commit documentation updates along with code changes
- **Before starting next phase**: Verify documentation matches implementation

## Platform-Specific Requirements

### File Paths & Directories
When documenting file/directory locations, specify paths for all supported platforms:
- Windows: Using environment variables (%APPDATA%, %LOCALAPPDATA%)
- macOS: Using ~/Library/ paths
- Linux: Using XDG Base Directory spec paths (~/.config, ~/.local/share)

## Development Guidelines

### Server Daemon Structure
```
server-daemon/
├── src/
│   ├── index.ts              # Main CLI entry point
│   ├── daemon/               # Daemon orchestration
│   │   ├── DaemonApp.ts      # Main daemon orchestrator
│   │   ├── HealthCheck.ts    # Health check service
│   │   ├── ShutdownHandler.ts # Graceful shutdown
│   │   └── PidManager.ts    # PID file management
│   ├── cli/                  # CLI commands
│   │   └── StartCommand.ts   # Start command
│   ├── controllers/          # HTTP/WebSocket request handlers
│   ├── services/             # Business logic (StreamEventService, ObsService, TtsService)
│   ├── platforms/            # Unified strategy facades (TwitchStrategy, KickStrategy, YouTubeStrategy)
│   └── infrastructure/       # Server setup, database (SQLite), OAuth, config, logging
└── __tests__/                # Tests

shared/models/                # Unified data types for cross-platform consistency
```

### CLI Structure
```
cli/
├── cmd/              # Command definitions (Cobra)
├── pkg/              # Public packages
│   ├── client/       # Server-daemon communication
│   ├── oauth/        # OAuth helpers
│   └── ui/           # CLI UI components
└── internal/         # Private packages
```

## Build/Test/Run Commands

### Server Daemon (TypeScript)
- `npm install` - Install dependencies
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm start` - Start daemon (after build)
- `./dist/index.js --help` - View CLI help
- `./dist/index.js start` - Start daemon with defaults

### CLI (Go)
- `go build ./cmd/cli` - Build CLI binary
- `go test ./...` - Run tests
- `go fmt ./...` - Format code
- `./cli` - Run CLI

### Web UI (Svelte)
- `npm install` - Install dependencies
- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run lint` - Run ESLint

## Testing Strategy
- Unit tests for business logic
- Integration tests for API endpoints
- WebSocket connection testing
- OAuth flow testing with mock credentials (part of Daemon Server Core integration tests)
- Cross-platform CLI testing
- Daemon lifecycle testing (startup/shutdown/health checks)
