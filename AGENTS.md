# Project: Streaming Enhancement Sweet v3

## Documentation Hub
Read these files for complete context:
- @docs/WORKFLOW.md - AI-assisted development methodology and file structure
- @docs/PLAN.md - Current feature being implemented

## Tech Stack

### Server Daemon
- Language: TypeScript (Node.js)
- Framework: Express + WebSocket
- Architecture: Event-driven
- Purpose: Core server providing streaming data, API for CLI/Web clients

### CLI
- Language: Go
- Framework: Cobra (spf13/cobra)
- Requirements: Cross-platform only, no platform-specific dependencies
- Purpose: CLI client for managing server-daemon and viewing streams

### Web UI
- Language/Framework: Svelte (latest)
- Purpose: Web interface for managing server-daemon and viewing streams

## Project Structure
```
project-root/
├── server-daemon/      # TypeScript server (Express + WS)
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
- Controllers/Services/Repositories/Infrastructure separation

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

## Module Communication

### Interfaces
- **CLI ↔ Server**: HTTP/WebSocket API (port TBD)
- **Web UI ↔ Server**: HTTP/WebSocket API (port TBD)
- **Server → Twitch/Kick**: OAuth + REST API

### Data Flow
1. CLI/Web client sends requests to server-daemon
2. Server-daemon communicates with Twitch/Kick APIs via OAuth
3. Server-daemon broadcasts stream data to connected clients via WebSocket
4. CLI displays stream information, Web UI shows dashboard

## OAuth Integration
- Twitch API: OAuth 2.0 with access tokens
- Kick API: OAuth 2.0 with access tokens
- Users register apps in their dev consoles
- Tokens stored securely in local configuration

## Development Guidelines

### Server Daemon (Option C Structure)
```
server-daemon/
├── controllers/       # HTTP/WebSocket request handlers
├── services/          # Business logic, stream processing, event management
├── repositories/      # External API interactions (Twitch, Kick)
└── infrastructure/    # Server setup, OAuth, configuration, logging
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
- OAuth flow testing with mock credentials
- Cross-platform CLI testing