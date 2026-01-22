# Troubleshooting Guide

Common issues and solutions for the streaming daemon.

## Port Already in Use

### Symptoms

```
Error: listen EADDRINUSE: address already in use :::3000
```

### Solutions

**1. Find process using port:**

```bash
# Linux/macOS
lsof -i :3000

# Windows
netstat -ano | findstr :3000
```

**2. Kill process:**

```bash
# Linux/macOS
kill -9 <PID>

# Windows
taskkill /PID <PID> /F
```

**3. Use different port:**

```bash
streaming-daemon start --port 4000
```

**4. Configure port in config:**

```json
{
  "server": {
    "port": 4000
  }
}
```

## Database Locked

### Symptoms

```
Error: Database is locked
Error: SQLITE_BUSY: database is locked
```

### Solutions

**1. Find zombie processes:**

```bash
ps aux | grep streaming-daemon
```

**2. Kill zombie processes:**

```bash
pkill -9 streaming-daemon
```

**3. Check database file:**

```bash
# Linux/macOS
ls -la ~/.local/share/streaming-enhancement/database.db

# Windows
dir %LOCALAPPDATA%\streaming-enhancement\database.db
```

**4. Remove lock file (if exists):**

Sometimes a `.lock` or `-journal` file remains:

```bash
rm ~/.local/share/streaming-enhancement/database.db-wal
rm ~/.local/share/streaming-enhancement/database.db-shm
```

## Keystore Unavailable

### Symptoms

```
WARNING: Keystore unavailable, using encrypted-file fallback
```

### Solutions

**Linux: Install libsecret**

```bash
# Ubuntu/Debian
sudo apt-get install libsecret-1-dev

# Fedora/RHEL
sudo dnf install libsecret-devel

# Arch
sudo pacman -S libsecret
```

**macOS: Check Keychain access**

macOS Keychain should work automatically. If failing:

```bash
# Check Keychain
security list-keychains

# Reset Keychain (last resort)
security unlock-keychain ~/Library/Keychains/login.keychain
```

**Windows: Credential Manager**

Windows Credential Manager should work automatically. If failing:

1. Open "Credential Manager" (credmgr)
2. Check permissions
3. Run daemon as Administrator

**Use encrypted-file fallback (acceptable):**

The encrypted-file fallback is secure (AES-256-GCM). Configure explicitly:

```json
{
  "keystore": {
    "type": "encrypted-file"
  }
}
```

## Health Check Returns 403 Forbidden

### Symptoms

```bash
curl http://localhost:3000/status
# Response: 403 Forbidden
```

### Cause

Default binding is `127.0.0.1` (localhost only). Request from different IP is blocked.

### Solutions

**1. Ensure request from localhost:**

```bash
curl http://127.0.0.1:3000/status
```

**2. Check server.host config:**

```bash
cat ~/.config/streaming-enhancement/config.json | grep host
```

**3. Enable remote access (use with caution):**

```json
{
  "server": {
    "host": "0.0.0.0"
  }
}
```

**Important**: Configure firewall rules to restrict access.

## OAuth Flow Fails

### Symptoms

```
Error: OAuth credentials not found
Error: Invalid state parameter
Error: Authorization code invalid
```

### Solutions

**1. Add OAuth credentials first:**

```bash
curl -X POST http://localhost:3000/oauth/credentials/twitch \
  -H "Content-Type: application/json" \
  -d '{"client_id":"your_id","client_secret":"your_secret"}'
```

**2. Verify redirect_uri matches:**

Check config file:

```json
{
  "oauth": {
    "redirect_uri": "http://localhost:3000/callback"
  }
}
```

Must match your Twitch/Kick/YouTube developer console settings.

**3. Clear OAuth state and retry:**

```bash
# State expires after use, no manual clear needed
# Restart daemon to clear any stuck states
```

**4. Check logs for detailed error:**

```bash
# Start with debug logging
streaming-daemon start --log-level debug
```

## Daemon Won't Start

### Symptoms

```
Failed to start daemon: [error]
Exit code 1, 2, or 3
```

### Solutions

**1. Check config file syntax:**

```bash
# Validate JSON
cat ~/.config/streaming-enhancement/config.json | jq '.'

# Or use online JSON validator
```

**2. Check log files:**

```bash
# Linux/macOS
tail -f ~/.local/state/streaming-enhancement/logs/streaming-daemon.log

# Windows PowerShell
Get-Content $env:LOCALAPPDATA\streaming-enhancement\logs\streaming-daemon.log -Wait
```

**3. Validate config options:**

Check port range (1-65535), log level (error, warn, info, debug):

```json
{
  "server": {
    "port": 3000
  },
  "logging": {
    "level": "info"
  }
}
```

**4. Check database path permissions:**

```bash
# Linux/macOS
ls -la ~/.local/share/streaming-enhancement/

# Ensure directory is writable
chmod 755 ~/.local/share/streaming-enhancement/
```

## Performance Issues

### Symptoms

- Slow OAuth flows
- High memory usage
- Slow health check responses

### Solutions

**1. Check database size:**

```bash
ls -lh ~/.local/share/streaming-enhancement/database.db
```

Large database (>100MB) may indicate missing cleanup.

**2. Check log rotation:**

Ensure `maxFiles` and `maxSize` are reasonable:

```json
{
  "logging": {
    "maxFiles": 7,
    "maxSize": "20m"
  }
}
```

**3. Profile with debug logging:**

```bash
streaming-daemon start --log-level debug
```

Check for repeated operations, slow queries, or memory leaks.

## Migration Issues

### Old Version → New Version

### Symptoms

Config format changes or database schema errors after upgrade.

### Solutions

**1. Backup before upgrade:**

```bash
# Backup config
cp ~/.config/streaming-enhancement/config.json ~/config.backup.json

# Backup database
cp ~/.local/share/streaming-enhancement/database.db ~/database.backup.db
```

**2. Use default config (new fields optional):**

New config fields have defaults. Old configs should still work:

```json
{
  "server": {
    "port": 3000
    // New fields optional: host, shutdownTimeout, healthCheckPath
  }
}
```

**3. Check upgrade notes:**

Review release notes for breaking changes.

## Getting Help

### Collect Diagnostic Information

Before reporting issues, collect:

**1. Daemon version:**

```bash
streaming-daemon --version
```

**2. Config file:**

```bash
# Remove sensitive data (client secrets)
cat ~/.config/streaming-enhancement/config.json
```

**3. Log output:**

```bash
tail -100 ~/.local/state/streaming-enhancement/logs/streaming-daemon.log
```

**4. System info:**

```bash
# OS and version
uname -a

# Node.js version
node --version

# npm version
npm --version
```

### Report Issues

Report issues at:
- GitHub Issues: https://github.com/your-org/streaming-enhancement-sweet/issues

Include:
- Daemon version
- OS and Node.js version
- Steps to reproduce
- Expected vs actual behavior
- Log output (sanitized)

## Debug Mode

Enable detailed logging for troubleshooting:

```bash
streaming-daemon start --log-level debug
```

Debug output includes:
- Config loading
- Component initialization
- Database queries
- OAuth flow details
- Health check results

## Clean Reinstall

If all else fails, do a clean reinstall:

```bash
# 1. Stop daemon
pkill -9 streaming-daemon

# 2. Uninstall
npm uninstall -g @streaming-enhancement/server-daemon

# 3. Remove config and data
rm -rf ~/.config/streaming-enhancement
rm -rf ~/.local/share/streaming-enhancement
rm -rf ~/.local/state/streaming-enhancement

# 4. Reinstall
npm install -g @streaming-enhancement/server-daemon

# 5. Test with defaults
streaming-daemon start
```
