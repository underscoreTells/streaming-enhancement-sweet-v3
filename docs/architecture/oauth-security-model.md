# Architecture: OAuth Security Model

## Overview
This document explains the security model for OAuth token storage and handling, including threat analysis, security measures, and best practices implemented in the Streaming Enhancement Sweet v3 application.

## Threat Model

### Attack Surface
The application is a local daemon running on the user's machine with the following threat vectors:

1. **Local unauthorized access** - Other users on the same machine
2. **Malicious software** - Malware running on the same machine
3. **Network attacks** - Remote attackers on the same network
4. **Process list exposure** - Credentials visible in process monitoring tools
5. **Log exposure** - Credentials logged to files or console
6. **Physical access** - Attacker with physical access to machine

### Assets to Protect

#### OAuth Access Tokens
- **Sensitivity**: High - provides access to user's streaming account
- **Lifetime**: Typically 1-24 hours (refreshable)
- **Scope**: Read/write access to user's channel, chat, etc.

#### OAuth Refresh Tokens
- **Sensitivity**: Critical - can obtain new access tokens
- **Lifetime**: Months to years (depends on platform)
- **Scope**: Same as access tokens

#### OAuth Client Credentials (App Secrets)
- **Sensitivity**: Medium - application-specific, not user-specific
- **Lifetime**: Permanent (unless revoked)
- **Scope**: Used to obtain access tokens

## Security Measures

### Token Storage

#### Primary: Native OS Keystores
**Security Level**: Highest

**Windows Credential Manager**
- Encryption: DPAPI (Data Protection API)
- Key derivation: User login password + machine-specific key
- Integration: Windows security policies, Windows Hello
- Protection:
  - ✅ Userspace applications cannot read other users' credentials
  - ✅ Encrypted at rest
  - ✅ Requires user login to decrypt
  - ✅ No credentials in process lists
- **Threat Protection**: Local unauthorized access, process list exposure

**macOS Keychain**
- Encryption: AES-256 (Security.framework)
- Key derivation: User login password
- Integration: Touch ID, Face ID (on supported devices)
- Protection:
  - ✅ Encrypted at rest
  - ✅ Locked when user logs out
  - ✅ Biometric unlock support
  - ✅ No credentials in process lists
- **Threat Protection**: Local unauthorized access, process list exposure

**Linux Secret Service**
- Encryption: AES-256 (Gnome Keyring / KDE Wallet)
- Key derivation: Master password / session key
- Integration: System keyring managers, session locking
- Protection:
  - ✅ Encrypted at rest
  - ✅ Locked by default
  - ✅ Session-specific by default
  - ✅ No credentials in process lists
- **Threat Protection**: Local unauthorized access, process list exposure

#### Secondary: Encrypted File Fallback
**Security Level**: Limited

**Encryption**: AES-256-GCM
- IV size: 96 bits (unique per encryption)
- Auth tag: 128 bits (ensures integrity)
- Key size: 256 bits

**Key Storage**:

| Platform | Location |
|----------|----------|
| Windows | `%APPDATA%\streaming-enhancement\file.key` |
| macOS | `~/Library/Application Support/streaming-enhancement/file.key` |
| Linux | `~/.config/streaming-enhancement/file.key` |

- Permissions: mode 0600 (owner read/write only)
- Key generation: Cryptographically secure random
- Override: Environment variable `STREAMING_ENHANCEMENT_MASTER_KEY`

**Data Storage**:

| Platform | Location |
|----------|----------|
| Windows | `%LOCALAPPDATA%\streaming-enhancement\keystore.json` |
| macOS | `~/Library/Application Support/streaming-enhancement/keystore.json` |
| Linux | `~/.local/share/streaming-enhancement/keystore.json` |

- Permissions: mode 0600 (owner read/write only)
- Format: JSON with encrypted entries
- Atomic writes fsync before close

**Protection**:
- ✅ Encrypted at rest
- ✅ Integrity verified via authentication tag
- ⚠️ Key stored on same filesystem as data (mitigated by file permissions)
- ⚠️ Anyone with root/admin can access (mitigated but cannot be fully prevented)

**Acceptable Use Cases**:
- Development environments
- CI/CD pipelines
- Environments where native keystores unavailable

**Threat NOT Protected Against**:
- ❌ Users with root/administrator access
- ❌ System compromise (key and data on same filesystem)
- ❌ Long-term storage (no key rotation)

### Client Credentials Storage

#### SQLite Database
**Security Level**: Medium

**Storage**: Text in SQLite database

| Platform | Location |
|----------|----------|
| Windows | `%LOCALAPPDATA%\streaming-enhancement/database.db` |
| macOS | `~/Library/Application Support/streaming-enhancement/database.db` |
| Linux | `~/.local/share/streaming-enhancement/database.db` |

- Permissions: mode 0600 (owner read/write only)
- Encryption: None (client credentials less sensitive than user tokens)

**Rationale**: Client credentials are OAuth app secrets, not user-specific. Stored in plaintext because:
1. Less sensitive than user tokens (revocable, rate-limited)
2. Simplifies implementation
3. Consistent with typical OAuth client storage patterns

**Protection**:
- ✅ File permissions restricted to owner
- ⚠️ Plaintext storage (acceptable given sensitivity level)

### OAuth Flow Security

#### CSRF Protection
**State Parameter**: Random string generated per OAuth request
- Generation: Cryptographically secure random (32 bytes)
- Validation: Must match between authorize and callback
- Lifetime: 5 minutes (temporary server timeouts)
- Uniqueness: Unique per request (prevents replay attacks)

#### Redirect URI Validation
- Format: `http://localhost:<random-port>/oauth/callback/:platform/:state`
- Validation: Must match authorized redirect URIs in OAuth app
- Random port: Prevents port conflicts and predictable URIs

#### HTTPS Enforcement
- All OAuth endpoints use HTTPS (twitch.tv, kick.com, youtube.com)
- Transport security enforced by HTTP client

#### Scope Management
- Explicit scope requests (not overly permissive)
- Minimal required scopes:
  - Twitch: `channel:read:subscriptions`, `chat:read`, `chat:edit`, `bits:read`
- User can review scopes during authorization

### Application-Level Security

#### Logging
- No credentials logged to console (sanitized)
- No credentials in log files
- Error messages sanitized before display
- Debug mode optional (not enabled in production)

#### Process List Protection
- Native keystores: No credentials in process lists
- CLI arguments: Credentials not passed as arguments
- Environment variables: Credentials not exposed

#### File Permissions

**Linux/macOS**
- Directories: mode 0700 (owner access only)
- Files: mode 0600 (owner read/write only)

**Windows**
- Owner access only (via NTFS ACLs)

#### Network Access
- Daemon runs on localhost by default
- Optional remote access via reverse proxy (nginx with access control)
- No public exposure by default

## Attack Mitigations

### Attack: Local Unauthorized Access
**Mitigation**: Native OS keystores
- Windows Credential Manager / macOS Keychain / Linux Secret Service
- Requires user login to decrypt
- Separate keystore per user account

### Attack: Malicious Software
**Mitigation**: File permissions + OS integration
- File permissions restricted to owner
- Native keystores require authorization per access (Touch ID, etc.)
- Monitor for unauthorized access attempts (logging)

### Attack: Network Interception
**Mitigation**: HTTPS + localhost binding
- All OAuth communications use HTTPS
- Daemon binds to localhost only
- No network exposure by default

### Attack: Process List Exposure
**Mitigation**: Native keystores
- Credentials not in process lists
- Native API calls hide credentials
- No CLI arguments with sensitive data

### Attack: Log Exposure
**Mitigation**: Sanitized logging
- Credentials redacted from logs
- Error messages sanitized
- Debug mode optional

### Attack: Physical Access
**Mitigation**: Multi-layer security
- Native keystores locked when user logs out
- File permissions prevent access by other users
- Device encryption (full disk encryption recommended)

## Security Best Practices Implemented

### OAuth 2.1 Recommendations
- ✅ State parameter for CSRF protection
- ✅ PKCE (authorization code flow)
  - ⚠️ Note: PKCE not strictly required for client_secret flow (used here)
- ✅ HTTPS for all OAuth communications
- ✅ Explicit scope requests
- ✅ Minimal requested scopes

### OWASP Security Best Practices
- ✅ Secure storage of secrets
- ✅ Input validation on all endpoints
- ✅ CSRF protection
- ✅ Error handling without information leakage
- ✅ No credentials in logs or error messages
- ✅ Proper file permissions

### Platform-Specific Security
**Windows**
- ✅ DPAPI encryption
- ✅ Credential Manager integration
- ✅ UAC elevation support (if needed)

**macOS**
- ✅ Keychain Services
- ✅ Touch ID / Face ID support
- ✅ Sandboxing support

**Linux**
- ✅ libsecret integration
- ✅ Session locking
- ✅ Keyring manager integration

## Limitations and Known Issues

### Encrypted File Fallback Limitations
- Key stored with encrypted data (cannot prevent root access)
- No key rotation (future enhancement)
- Less secure than native keystores

### Client Credentials Storage Limitations
- Stored in plaintext in SQLite
- No encryption (acceptable given sensitivity level)
- File permissions only protection

### Future Enhancements
- Key rotation for encrypted file fallback
- Hardware security module (HSM) support
- YubiKey support for additional authentication
- Audit logging for policy compliance
- Rate limiting for OAuth endpoints
- OAuth 2.1 / OpenID Connect strict mode

## Security Checklist

- [ ] ✅ Native OS keystore storage (Windows/macOS/Linux)
- [ ] ✅ Encrypted file fallback (AES-256-GCM)
- [ ] ✅ State parameter for CSRF protection
- [ ] ✅ HTTPS for all OAuth communications
- [ ] ✅ Explicit scope requests (minimal required)
- [ ] ✅ No credentials in logs or error messages
- [ ] ✅ No credentials in process lists
- [ ] ✅ Proper file permissions (0600/0700)
- [ ] ✅ Localhost-only daemon binding
- [ ] ✅ Redirect URI validation
- [ ] ⚠️ Client credentials plaintext (acceptable sensitivity)
- [ ] ⚠️ Encrypted file fallback key with data (acceptable fallback)

## References
- **Feature Plan**: @docs/feature-plans/oauth-flow-keystore.md
- **Architecture**: @architecture/keystore-strategy-pattern.md
- **Test Plan**: @tests/oauth-integration-tests.md
- **API**: @api/oauth-endpoints.md