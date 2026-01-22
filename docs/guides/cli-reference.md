# CLI Reference

The streaming-daemon command-line interface (CLI) provides commands for starting and managing the daemon server.

## Installation

```bash
npm install -g @streaming-enhancement/server-daemon
```

## Commands

### start

Start the daemon server.

```bash
streaming-daemon start [options]
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--port <number>` | integer | 3000 | Server port (1-65535) |
| `--config <path>` | string | Platform default | Path to config file |
| `--log-level <level>` | string | info | Log level (error, warn, info, debug) |

#### Examples

Start with default settings:

```bash
streaming-daemon start
```

Start on custom port:

```bash
streaming-daemon start --port 4000
```

Start with custom config file:

```bash
streaming-daemon start --config /path/to/config.json
```

Start with debug logging:

```bash
streaming-daemon start --log-level debug
```

Start with all options:

```bash
streaming-daemon start --port 8080 --config /custom/config.json --log-level debug
```

### --help

Display help information:

```bash
streaming-daemon start --help
```

### --version

Display version information:

```bash
streaming-daemon --version
```

## Exit Codes

The daemon process exits with the following codes:

| Code | Meaning | Description |
|-------|---------|-------------|
| 0 | Success | Daemon stopped gracefully (via SIGTERM/SIGINT) |
| 1 | Configuration Error | Invalid config, validation error, or file not found |
| 2 | Initialization Error | Failed to initialize database or keystore |
| 3 | Startup Error | Failed to start server |

### Debugging Exit Codes

**Exit Code 1 (Configuration Error)**

Check your config file:
```bash
# View current config
cat ~/.config/streaming-enhancement/config.json

# Start with debug logging to see validation errors
streaming-daemon start --log-level debug
```

**Exit Code 2 (Initialization Error)**

Check platform dependencies:
- Database path is writable
- Keystore is available (Secret Service on Linux, Keychain on macOS)
- No zombie processes holding database locks

**Exit Code 3 (Startup Error)**

Port may be in use:
```bash
# Check if port is in use
netstat -an | grep 3000

# Try a different port
streaming-daemon start --port 4000
```

## Signal Handling

The daemon handles the following signals for graceful shutdown:

| Signal | Description |
|--------|-------------|
| SIGTERM | Graceful shutdown (e.g., `systemctl stop`) |
| SIGINT | Graceful shutdown (e.g., Ctrl+C) |

**Shutdown Sequence:**
1. Log "Received {signal}, shutting down..."
2. Stop HTTP server
3. Wait for in-flight requests (configurable timeout, default 10s)
4. Close database
5. Log "Shutdown complete"
6. Exit with code 0

## Logging

Logs are written to platform-specific directories:

| Platform | Log Directory |
|----------|---------------|
| Windows | `%LOCALAPPDATA%\streaming-enhancement\logs` |
| macOS | `~/Library/Logs/streaming-enhancement` |
| Linux | `~/.local/state/streaming-enhancement/logs` |

### Log Levels

| Level | Description |
|-------|-------------|
| error | Errors only |
| warn | Warnings and errors |
| info | General info (default) |
| debug | Detailed debug information |

### Viewing Logs

```bash
# View recent logs (Linux/macOS)
tail -f ~/.local/state/streaming-enhancement/logs/streaming-daemon.log

# Windows PowerShell
Get-Content $env:LOCALAPPDATA\streaming-enhancement\logs\streaming-daemon.log -Wait
```

## Future Commands

The following commands are planned for future releases:

| Command | Status | Description |
|---------|--------|-------------|
| `stop` | Planned | Stop running daemon via PID file |
| `status` | Planned | Check if daemon is running |
| `restart` | Planned | Restart daemon |
| `logs` | Planned | View daemon logs |
| `config` | Planned | Manage daemon configuration |
| `version` | Planned | Display version (already available via `--version`) |
