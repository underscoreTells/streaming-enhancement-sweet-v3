# Installation Guide

## Prerequisites

- Node.js 18 or later
- npm or pnpm package manager
- For Linux: DBus Secret Service (libsecret-1-0) for native keystore

## Global Installation

Install the daemon globally for use as a command-line tool:

```bash
npm install -g @streaming-enhancement/server-daemon
```

Verify installation:

```bash
streaming-daemon --version
```

## Development Installation

For development or contributing:

```bash
# Clone repository
git clone https://github.com/your-org/streaming-enhancement-sweet.git
cd streaming-enhancement-sweet/packages/server-daemon

# Install dependencies
npm install

# Build project
npm run build

# Link globally (optional)
npm link
```

## First-Time Setup

### 1. Create Config File

The daemon will use default config on first run. To customize, create a config file:

**Windows:**
```bash
mkdir %APPDATA%\streaming-enhancement
notepad %APPDATA%\streaming-enhancement\config.json
```

**macOS/Linux:**
```bash
mkdir -p ~/.config/streaming-enhancement
nano ~/.config/streaming-enhancement/config.json
```

Example config:
```json
{
  "server": {
    "port": 3000,
    "host": "127.0.0.1"
  },
  "logging": {
    "level": "info"
  }
}
```

See [configuration guide](./configuration.md) for all options.

### 2. Initialize Database

The daemon will automatically create the database on first run. No manual initialization needed.

Database will be created at:
- Windows: `%LOCALAPPDATA%\streaming-enhancement\database.db`
- macOS: `~/Library/Application Support/streaming-enhancement/database.db`
- Linux: `~/.local/share/streaming-enhancement/database.db`

### 3. Verify Installation

Start the daemon:

```bash
streaming-daemon start
```

Verify health check:

```bash
curl http://localhost:3000/status
```

Expected response:
```json
{
  "status": "healthy",
  "components": {
    "server": { "status": "healthy", "uptime": 1234, "port": 3000 },
    "database": { "status": "healthy", "open": true },
    "keystore": { "status": "healthy", "type": "native", "isFallback": false }
  },
  "version": "0.1.0"
}
```

### 4. Stop Daemon

Press `Ctrl+C` in the terminal where daemon is running, or send SIGTERM:

```bash
pkill -TERM streaming-daemon
```

## Systemd Service (Linux)

For running daemon as a system service:

1. Create service file:

```bash
sudo nano /etc/systemd/system/streaming-daemon.service
```

2. Add service configuration:

```ini
[Unit]
Description=Streaming Enhancement Daemon
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/home/your-username
ExecStart=/usr/local/bin/streaming-daemon start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

3. Enable and start service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable streaming-daemon
sudo systemctl start streaming-daemon
sudo systemctl status streaming-daemon
```

## Launchd Service (macOS)

For running daemon as a macOS user service:

1. Create plist file:

```bash
nano ~/Library/LaunchAgents/com.streaming-enhancement.daemon.plist
```

2. Add service configuration:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.streaming-enhancement.daemon</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/streaming-daemon</string>
    <string>start</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
</dict>
</plist>
```

3. Load service:

```bash
launchctl load ~/Library/LaunchAgents/com.streaming-enhancement.daemon.plist
launchctl start com.streaming-enhancement.daemon
```

## Uninstallation

### Remove Global Package

```bash
npm uninstall -g @streaming-enhancement/server-daemon
```

### Remove Config and Data

**Windows:**
```bash
rmdir /s %APPDATA%\streaming-enhancement
rmdir /s %LOCALAPPDATA%\streaming-enhancement
```

**macOS/Linux:**
```bash
rm -rf ~/.config/streaming-enhancement
rm -rf ~/.local/share/streaming-enhancement
rm -rf ~/.local/state/streaming-enhancement
rm -rf ~/Library/Application\ Support/streaming-enhancement
rm -rf ~/Library/Logs/streaming-enhancement
```

### Remove Systemd Service (Linux)

```bash
sudo systemctl stop streaming-daemon
sudo systemctl disable streaming-daemon
sudo rm /etc/systemd/system/streaming-daemon.service
sudo systemctl daemon-reload
```

### Remove Launchd Service (macOS)

```bash
launchctl unload ~/Library/LaunchAgents/com.streaming-enhancement.daemon.plist
rm ~/Library/LaunchAgents/com.streaming-enhancement.daemon.plist
```

## Troubleshooting

### Installation Issues

**Error: "EACCES: permission denied"**

Run with `sudo` (for global npm install):
```bash
sudo npm install -g @streaming-enhancement/server-daemon
```

Or use `npx` without global install:
```bash
npx @streaming-enhancement/server-daemon start
```

**Error: "command not found: streaming-daemon"**

Check npm global bin path:
```bash
npm config get prefix
```

Add to PATH (Linux/macOS):
```bash
export PATH=$PATH:/usr/local/bin
```

Or use `npx` instead:
```bash
npx @streaming-enhancement/server-daemon start
```

### Runtime Issues

See [troubleshooting guide](./troubleshooting.md) for common issues.
