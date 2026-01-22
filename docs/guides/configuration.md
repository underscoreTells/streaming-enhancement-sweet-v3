# Configuration Guide

The daemon server behavior can be configured via a JSON config file or CLI flags.

## Config File Location

The daemon looks for a config file at platform-specific locations:

| Platform | Path |
|----------|-------|
| Windows | `%APPDATA%\streaming-enhancement\config.json` |
| macOS | `~/.config/streaming-enhancement/config.json` |
| Linux | `~/.config/streaming-enhancement/config.json` |

## Config Options

### Server Configuration

```json
{
  "server": {
    "port": 3000,
    "host": "127.0.0.1",
    "shutdownTimeout": 10000,
    "healthCheckPath": "/status"
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| port | integer | 3000 | Server port (1-65535) |
| host | string | "127.0.0.1" | Bind address. Use "0.0.0.0" for remote access |
| shutdownTimeout | integer | 10000 | Graceful shutdown timeout in milliseconds |
| healthCheckPath | string | "/status" | Health check endpoint path |

### Database Configuration

```json
{
  "database": {
    "path": "/path/to/database.db",
    "migrationsDir": "/path/to/migrations"
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| path | string | Platform-specific | SQLite database file path |
| migrationsDir | string | - | Optional: Path to database migrations directory |

**Default Database Paths:**
- Windows: `%LOCALAPPDATA%\streaming-enhancement\database.db`
- macOS: `~/.local/share/streaming-enhancement/database.db`
- Linux: `~/.local/share/streaming-enhancement/database.db`

### Logging Configuration

```json
{
  "logging": {
    "level": "info",
    "directory": "/path/to/logs",
    "maxFiles": 7,
    "maxSize": "20m"
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| level | string | "info" | Log level: error, warn, info, debug |
| directory | string | Platform-specific | Log directory path |
| maxFiles | integer | 7 | Maximum number of log files to keep |
| maxSize | string | "20m" | Maximum size per log file (e.g., "10m", "100k") |

**Default Log Directories:**
- Windows: `%LOCALAPPDATA%\streaming-enhancement\logs`
- macOS: `~/Library/Logs/streaming-enhancement`
- Linux: `~/.local/state/streaming-enhancement/logs`

### OAuth Configuration

```json
{
  "oauth": {
    "redirect_uri": "http://localhost:3000/callback"
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| redirect_uri | string | `http://localhost:3000/callback` | OAuth callback URL |

**Note**: Register this redirect URI (`http://localhost:3000/callback`) in your Twitch/Kick/YouTube developer console.

### Keystore Configuration

```json
{
  "keystore": {
    "type": "native"
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| type | string | native (auto-detected) | Keystore type: "native" or "encrypted-file" |

**Keystore Strategies:**

| Platform | Native | Fallback |
|----------|--------|----------|
| Windows | Windows Credential Manager | Encrypted file |
| macOS | macOS Keychain | Encrypted file |
| Linux | DBus Secret Service | Encrypted file |

## Example Config File

### Minimal Config (defaults only)

```json
{}
```

All fields use default values.

### Development Config

```json
{
  "server": {
    "port": 3000,
    "host": "127.0.0.1"
  },
  "logging": {
    "level": "debug"
  }
}
```

### Production Config with Custom Paths

```json
{
  "server": {
    "port": 8080,
    "host": "0.0.0.0"
  },
  "database": {
    "path": "/var/lib/streaming-enhancement/database.db"
  },
  "logging": {
    "directory": "/var/log/streaming-enhancement",
    "level": "info",
    "maxFiles": 30,
    "maxSize": "100m"
  },
  "oauth": {
    "redirect_uri": "https://mydomain.com/callback"
  }
}
```

**Note**: For production with `host: "0.0.0.0"`, configure firewall rules to restrict access.

## CLI Override

Any config option can be overridden via CLI flags:

```bash
# Override server port
streaming-daemon start --port 4000

# Override log level
streaming-daemon start --log-level debug

# Use custom config file
streaming-daemon start --config /custom/path/config.json
```

CLI flags take precedence over config file values.

## Validation

The daemon validates config on startup. Invalid config will exit with code 1:

```bash
$ streaming-daemon start
Configuration error: server.port must be between 1 and 65535
```

Common validation errors:

| Error | Solution |
|--------|-----------|
| server.port must be between 1 and 65535 | Use valid port number |
| logging.level must be one of: error, warn, info, debug | Use valid log level |
| Invalid JSON syntax | Check config file for syntax errors |
| Invalid types (e.g., port as string) | Use correct data types |

## Environment Variables

Currently, the daemon does **not** support environment variables for configuration. Use config file or CLI flags.

## Hot Reload

The daemon **does not** support hot config reload. Restart the daemon after changing config:

```bash
# Send SIGTERM for graceful shutdown
pkill -TERM streaming-daemon

# Restart
streaming-daemon start
```
