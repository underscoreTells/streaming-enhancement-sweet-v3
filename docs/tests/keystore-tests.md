# Test Plan: Keystore

## Scope
Unit tests for keystore strategy pattern, encypted file fallback, and cross-platform keystore access.

## Test Environment
- Node.js LTS
- TypeScript
- Jest or Vitest (test framework)
- Mock/stub libraries for native keystore access

## Unit Tests

### KeystoreStrategy Interface
- [ ] Test interface definition compiles
- [ ] Test all required methods are present
- [ ] Test method signatures match interface

### WindowsKeystoreStrategy
- [ ] Test `setPassword()` successfully stores password
- [ ] Test `getPassword()` retrieves stored password
- [ ] Test `getPassword()` returns null for non-existent entries
- [ ] Test `deletePassword()` deletes entry
- [ ] Test `deletePassword()` returns false for non-existent entries
- [ ] Test `isAvailable()` returns true on Windows
- [ ] Test `isAvailable()` returns false on other platforms
- [ ] Test error handling for invalid service/account names
- [ ] Test error handling for network timeout
- [ ] Test special characters in account names

### MacosKeystoreStrategy
- [ ] Test `setPassword()` successfully stores password
- [ ] Test `getPassword()` retrieves stored password
- [ ] Test `getPassword()` returns null for non-existent entries
- [ ] Test `deletePassword()` deletes entry
- [ ] Test `deletePassword()` returns false for non-existent entries
- [ ] Test `isAvailable()` returns true on macOS
- [ ] Test `isAvailable()` returns false on other platforms
- [ ] Test error handling for invalid service/account names
- [ ] Test error handling for keychain locked
- [ ] Test special characters in account names

### LinuxKeystoreStrategy
- [ ] Test `setPassword()` successfully stores password
- [ ] Test `getPassword()` retrieves stored password
- [ ] Test `getPassword()` returns null for non-existent entries
- [ ] Test `deletePassword()` deletes entry
- [ ] Test `deletePassword()` returns false for non-existent entries
- [ ] Test `isAvailable()` returns true on Linux
- [ ] Test `isAvailable()` returns false on other platforms
- [ ] Test error handling for invalid service/account names
- [ ] Test error handling when Secret Service unavailable
- [ ] Test special characters in account names

### EncryptedFileStrategy
- [ ] Test `setPassword()` encrypts and stores password
- [ ] Test `getPassword()` decrypts and retrieves password
- [ ] Test `getPassword()` returns null for non-existent entries
- [ ] Test `deletePassword()` removes entry
- [ ] Test `deletePassword()` returns false for non-existent entries
- [ ] Test `isAvailable()` always returns true (pure JS fallback)
- [ ] Test encryption strength (AES-256-GCM)
- [ ] Test encryption key generation is deterministic
- [ ] Test encrypted data format (IV + auth tag + ciphertext)
- [ ] Test decryption fails with wrong key
- [ ] Test decryption fails with corrupted data
- [ ] Test file permissions are 0600 for keystore.json
- [ ] Test file permissions are 0600 for file.key
- [ ] Test directory permissions are 0700
- [ ] Test auto-creation of directories
- [ ] Test concurrent writes don't corrupt data

### KeystoreManager
- [ ] Test platform detection (Windows, macOS, Linux)
- [ ] Test chooses native keystore strategy when available
- [ ] Test falls back to EncryptedFileStrategy when native unavailable
- [ ] Test `setPassword()` delegates to chosen strategy
- [ ] Test `getPassword()` delegates to chosen strategy
- [ ] Test `deletePassword()` delegates to chosen strategy
- [ ] Test `getStatus()` returns current strategy and availability
- [ ] Test logs warning when only fallback available
- [ ] Test handles strategy switching at runtime

## Integration Tests

### Cross-Platform Keystore Access
- [ ] Test Windows keystore works on Windows (requires Windows runner)
- [ ] Test macOS Keychain works on macOS (requires macOS runner)
- [ ] Test Linux Secret Service works on Linux (requires Linux runner)
- [ ] Test EncryptedFileStrategy works on all platforms

### Keystore Fallback
- [ ] Test fallback activates when native unavailable
- [ ] Test data can be migrated between strategies (if supported)
- [ ] Test multiple keystore instances don't conflict

## Mock Strategy

### MockKeystoreStrategy (for testing)
- [ ] Implement in-memory keystore for test isolation
- [ ] Test set/get/delete operations
- [ ] Test data persistence in memory
- [ ] Test cleanup between tests

## Performance Tests

- [ ] Test `setPassword()` performance (< 50ms)
- [ ] Test `getPassword()` performance (< 50ms)
- [ ] Test `deletePassword()` performance (< 50ms)
- [ ] Test EncryptedFileStrategy performance (< 100ms)
- [ ] Test concurrent operations don't block

## Security Tests

- [ ] Test passwords are not logged to console
- [ ] Test passwords are not visible in process list
- [ ] Test encrypted file cannot be decrypted without key
- [ ] Test encryption key is stored securely
- [ ] Test temp files are cleaned up

## Test Configuration

```typescript
vitest.config.ts:
export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html']
    }
  }
})
```

## Test Files Structure

```
packages/server-daemon/__tests__/
├── infrastructure/
│   └── keystore/
│       ├── strategies/
│       │   ├── WindowsKeystoreStrategy.test.ts
│       │   ├── MacosKeystoreStrategy.test.ts
│       │   ├── LinuxKeystoreStrategy.test.ts
│       │   └── EncryptedFileStrategy.test.ts
│       ├── KeystoreManager.test.ts
│       └── MockKeystoreStrategy.ts
```

## References
- **Feature Plan**: @docs/feature-plans/oauth-flow-keystore.md
- **Architecture**: @architecture/keystore-strategy-pattern.md