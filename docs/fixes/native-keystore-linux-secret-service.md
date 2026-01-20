# Fix: Linux Secret Service Keystore Password Storage Issue

## Problem
Native keystore on Linux was failing to retrieve passwords after storing them.
`setPassword()` returned success but `getPassword()` failed with `ERR_KEY_NOT_FOUND`.

### Affected Tests (Before Fix)
- `should return token status for valid token` - Expected 200, Got 404
- `should return expired status for expired token` - Expected 200, Got 404
- `should delete existing token` - Expected 200, Got 404

### Test Results
- Before fix: 262/265 tests passing (3 keystore failures)
- After fix: 265/265 tests passing

## Root Cause
The Rust `keyring` crate (v3.5) was being used without the `sync-secret-service`
feature flag, which prevented proper initialization of the Linux Secret Service backend.

Without the feature flag:
- `keyring::Entry::new()` creates a no-op entry
- `set_password()` returns success (no error thrown)
- Password is not actually persisted to Secret Service
- `get_password()` fails with `NoEntry` error

With the feature flag:
- Secret Service backend is properly initialized via DBus
- `secret-service` crate (v4.1.0) is linked
- `dbus-secret-service` crate provides actual Secret Service implementation
- Passwords are correctly stored and retrieved

## Solution
Added `features = ["sync-secret-service"]` to Cargo.toml keyring dependency.

### Changed File
`shared/keystore-native/Cargo.toml` (line 30):

```toml
# Before:
[target.'cfg(target_os = "linux")'.dependencies]
keyring = "3.5"

# After:
[target.'cfg(target_os = "linux")'.dependencies]
keyring = { version = "3.5", features = ["sync-secret-service"] }
```

## Implementation Steps

1. Created branch: `fix/native-keystore-linux-secret-service`
2. Updated Cargo.toml with `sync-secret-service` feature flag
3. Rebuilt native module using `cargo build --release`
4. Compiled module increased from 947KB to 2.3MB (includes Secret Service libraries)
5. Verified with direct node test - all operations (set/get/delete) work correctly
6. Ran full test suite - all 265 tests passing
7. Created this documentation in `docs/fixes/`
8. Merged back to feature branch

## Alternative Solutions (Not Needed)
The following alternatives were planned but not required:
- Upgrade to keyring 3.6.3
- Try `linux-native` feature
- Explicit collection specification via EntryBuilder

These were skipped because the feature flag fix resolved the issue.

## Technical Details

### Keyring Crate Features
From the keyring crate documentation:

> To use the crate, you must specify a feature for each supported credential store.
> For Linux and *nix platforms, use `sync-secret-service` for synchronous DBus access.

### Compiled Dependencies
After adding the feature flag, the following additional crates are linked:
- `dbus-secret-service v4.1.0` - DBus Secret Service client
- `zbus v4.0.1` - DBus communication
- `openssl v0.10.66` - Crypto operations (optional)

### Module Size
- Before: 947KB (minimal, no Secret Service backend)
- After: 2.3MB (includes DBus and Secret Service libraries)

## Verification

### Direct Test
```bash
cd shared/keystore-native
node -e "
const { NapiKeystore } = require('./index.js');
const k = new NapiKeystore();
console.log('isAvailable:', k.isAvailable());
k.setPassword('test-service', 'test-account', 'test-password');
console.log('setPassword completed');
const p = k.getPassword('test-service', 'test-account');
console.log('getPassword result:', p);
console.log('Match:', p === 'test-password' ? 'YES' : 'NO');
k.deletePassword('test-service', 'test-account');
console.log('deletePassword completed');
"
```

### Output
```
isAvailable: true
setPassword completed
getPassword result: test-password
Match: YES
deletePassword completed
```

### Integration Test Results
```
 Test Files  16 passed (16)
      Tests  265 passed (265)
   Start at  19:11:33
   Duration  1.65s
```

## Related Files
- `shared/keystore-native/Cargo.toml` - Feature flag added
- `shared/keystore-native/src/platform/linux.rs` - Uses keyring crate
- `packages/server-daemon/__tests__/controllers/OAuthController.test.ts` - OAuth tests now pass
- `shared/keystore-native/linux-x64/keystore_native.node` - Rebuilt binary

## References
- keyring crate docs: https://docs.rs/keyring
- keyring issue #207: Secret Service compatibility in 3.2.0
- Secret Service API: https://specifications.freedesktop.org/secret-service/latest/

## Cleanup Task
Once this fix is deployed and verified in production, move this file to `docs/archive/fixes/`
to keep `docs/fixes/` directory clean for ongoing work.
