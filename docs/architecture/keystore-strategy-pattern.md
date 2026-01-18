# Architecture: Secure Keystore Strategy Pattern

## Overview
The keystore architecture provides secure storage for OAuth access tokens using native OS keystores (Windows Credential Manager, macOS Keychain, Linux Secret Service) with an encrypted file fallback for compatibility and test environments.

## Why This Approach

### Problem Statement
OAuth access tokens need secure storage that:
- Protects tokens from unauthorized access
- Integrates with OS security mechanisms
- Works across Windows, macOS, and Linux
- Provides a fallback when native keystores unavailable
- Doesn't expose credentials in process lists or logs

### Alternatives Considered and Rejected

#### Option: keytar (atom/node-keytar)
- ✅ Mature cross-platform solution
- ❌ **Archived in December 2022** - no longer maintained
- ❌ Security vulnerabilities won't be patched
- ❌ Native modules may not build on new Node.js versions
- **Decision**: Rejected due to lack of maintenance

#### Option: cross-keychain
- ✅ Actively maintained (2025)
- ✅ TypeScript with strategy pattern
- ✅ Native OS backend with fallbacks
- ✅ CLI tool included
- ❌ Only 5 stars - insufficient community adoption
- ❌ New project, untested in production
- ❌ Extra dependency layer
- **Decision**: Rejected due to low adoption and lack of track record

#### Option: Encrypted file only
- ✅ Simple implementation
- ✅ No native dependencies
- ❌ **Less secure** - encryption key stored with encrypted data
- ❌ No OS integration (no Touch ID, Windows Hello)
- ❌ Requires manual key management
- ❌ Not a true secure keystore
- **Decision**: Rejected as primary storage, used as fallback only

#### Option: Build custom Rust + napi-rs binding
- ✅ **Most secure** - native OS keystore integration
- ✅ Cross-platform (Windows, macOS, Linux)
- ✅ Memory-safe Rust
- ✅ Type-safe TypeScript bindings
- ✅ Full control over implementation
- ✅ No credentials in process lists
- ✅ Strategy pattern for testing and flexibility
- ⚠️ Requires Rust toolchain for building
- ✅ Install script handles compilation
- **Decision**: ✅ **ACCEPTED**

## Architecture

### High-Level Diagram
```
┌─────────────────────────────────────────────────────┐
│           Application Layer                          │
│  (TwitchStrategy, KickStrategy, YouTubeStrategy)     │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│          KeystoreManager                              │
│  - Platform detection                                │
│  - Strategy selection                                │
│  - Fallback handling                                 │
└──────────────────────┬──────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
┌──────────────┐ ┌──────────┐ ┌──────────────────┐
│   Native     │ │  Native  │ │   Native         │
│   Windows    │ │  macOS   │ │   Linux          │
│   Strategy   │ │  Strategy│ │   Strategy       │
└──────┬───────┘ └────┬─────┘ └────────┬─────────┘
       │              │                 │
       └──────────────┼─────────────────┘
                      │
                      ▼
         ┌────────────────────────────┐
         │   @streaming-enhancement/   │
         │      keystore-native        │
         │   (Rust + napi-rs binding)  │
         └────────────────────────────┘
                    │
                    │ (fallback)
                    ▼
         ┌────────────────────────────┐
         │  EncryptedFileStrategy      │
         │  (AES-256-GCM encryption)   │
         └────────────────────────────┘
```

### Component Responsibilities

#### KeystoreStrategy (Interface)
```typescript
interface KeystoreStrategy {
  setPassword(service: string, account: string, password: string): Promise<void>;
  getPassword(service: string, account: string): Promise<string | null>;
  deletePassword(service: string, account: string): Promise<boolean>;
  isAvailable(): boolean;
}
```

Defines the contract for all keystore implementations. Enables testing with mock strategies.

#### Platform-Specific Strategies
- **WindowsKeystoreStrategy**: Wraps Windows Credential Manager API
- **MacosKeystoreStrategy**: Wraps macOS Keychain Security.framework
- **LinuxKeystoreStrategy**: Wraps Linux Secret Service (libsecret)

Each strategy delegates to the Rust native binding for secure operations.

#### EncryptedFileStrategy (Fallback)
- Uses AES-256-GCM encryption
- Stores encryption key in `~/.config/streaming-enhancement/file.key` (mode 0600)
- Stores encrypted data in `~/.local/share/streaming-enhancement/keystore.json` (mode 0600)
- Always available (no native dependencies)
- Activates when native keystores unavailable

#### KeystoreManager
- Detects `process.platform`
- Tries native strategy for platform
- Falls back to EncryptedFileStrategy if native unavailable
- Logs which strategy is active
- Provides status method for diagnostics

#### Rust Native Binding (@streaming-enhancement/keystore-native)
Provides low-level access to OS keystores:
- Windows: `windows-rs` crate (v0.58) → Credential Manager
- macOS: `security-framework` crate (v2.11) → Keychain
- Linux: `keyring` crate (v3.5) → Secret Service (better API compatibility than libsecret-sys)

## Security Considerations

### Native OS Keystores

#### Windows Credential Manager
- Uses DPAPI (Data Protection API) encryption
- Keys derived from user login password
- Integrated with Windows security policies
- Windows Hello support on compatible devices
- No credentials in process lists
- **Threat model**: Protected against local and remote attackers (unless user password compromised)

#### macOS Keychain
- Uses Security.framework with AES-256 encryption
- Keys derived from user login password
- Touch ID / Face ID support on compatible devices
- Access restricted to user session
- **Threat model**: Protected against local and remote attackers (unless login password compromised)

#### Linux Secret Service
- Uses Gnome Keyring or KDE Wallet via `keyring` crate
- Encrypted with master password
- Session-locked by default
- Integrates with system keyring manager
- Pattern matching on `keyring::Error::NoEntry` for reliable error detection
- **Threat model**: Protected against local attackers when keyring locked

### Encrypted File Fallback (Limited Security)

#### Encryption
- AES-256-GCM with 96-bit IV and authentication tags
- Per-user encryption key (randomly generated)
- Atomic writes to prevent corruption

#### Key Management
- Key file: `~/.config/streaming-enhancement/file.key` (mode 0600)
- 64 hexadecimal characters (32 bytes)
- Optional environment variable override: `STREAMING_ENHANCEMENT_MASTER_KEY`

#### Threat Model - Protects Against
- ✅ Casual access to data file
- ✅ File corruption from interrupted writes
- ✅ Accidental exposure of plaintext tokens

#### Threat Model - Does NOT Protect Against
- ❌ Users with root/administrator access (can read key file)
- ❌ System compromise (key on same filesystem as data)
- ❌ Advanced attackers with full system access
- ❌ Long-term storage (key rotation not implemented)

#### Acceptable Use Cases
- Development environments
- CI/CD pipelines where native keystores unavailable
- Environments with controlled access
- Testing and development

### Application-Level Security
- No credentials logged to console (sanitized log messages)
- No credentials in stack traces
- Service/account naming: `service='streaming-enhancement'`, `account='oauth:{platform}:{username}'`
- TLS only for OAuth endpoints
- State parameter for CSRF protection
- File permissions enforced (0600/0700)

## Data Flow

### Storing a Token
```
1. TwitchStrategy calls KeystoreManager.setPassword()
2. KeystoreManager detects platform (e.g., macOS)
3. KeystoreManager selects MacosKeystoreStrategy
4. MacosKeystoreStrategy calls setPassword() on native binding
5. Rust binding calls macOS Security.framework
6. Token stored encrypted in macOS Keychain
7. Success returned through call chain
```

### Retrieving a Token (Fallback Scenario)
```
1. TwitchStrategy calls KeystoreManager.getPassword()
2. KeystoreManager detects platform (e.g., Linux)
3. KeystoreManager tries LinuxKeystoreStrategy.isAvailable()
4. Returns false (Secret Service unavailable)
5. KeystoreManager falls back to EncryptedFileStrategy
6. EncryptedFileStrategy reads keystore.json
7. Decrypts entry with encryption key from file.key
8. Returns plaintext token to TwitchStrategy
```

## Testing Strategy

### Unit Tests
- Test each strategy independently with native binding mocked
- Test EncryptedFileStrategy encryption/decryption
- Test KeystoreManager platform detection and fallback

### Integration Tests
- Test native keystores on actual platforms (Windows, macOS, Linux)
- Test fallback activation when native unavailable
- Test cross-platform compatibility

### Mock Strategy
Implement `MockKeystoreStrategy` (in-memory storage) for test isolation.

## Performance Considerations
- Native keystore operations: < 50ms expected
- Encrypted file operations: < 100ms expected
- Asynchronous API everywhere (Promise-based)
- No blocking I/O in main thread

## Future Enhancements
- [ ] Add key rotation support for encrypted file fallback
- [ ] Add Windows Hello / Touch ID biometric prompts
- [ ] Add hardware key (YubiKey) support
- [ ] Add key export/import for backup

## References
- **Feature Plan**: @docs/feature-plans/oauth-flow-keystore.md
- **Test Plan**: @tests/keystore-tests.md