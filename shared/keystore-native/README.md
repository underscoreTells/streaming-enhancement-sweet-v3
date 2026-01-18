# @streaming-enhancement/keystore-native

Native key storage for streaming-enhancement project using platform keystores:

- **Windows**: Credential Manager
- **macOS**: Keychain Services
- **Linux**: Secret Service (via libsecret)

## Installation

```bash
npm install @streaming-enhancement/keystore-native
```

## Usage

```javascript
import { NapiKeystore, NapiKeystoreError } from '@streaming-enhancement/keystore-native';

// Create a new keystore instance
const keystore = new NapiKeystore();

// Check if keystore is available
if (keystore.isAvailable()) {
  console.log('Keystore is available');
}

// Store a token
try {
  keystore.setPassword('twitch', 'user@example.com', 'access_token_123');
  console.log('Password stored successfully');
} catch (error) {
  console.error('Failed to store password:', error);
}

// Retrieve a token
try {
  const token = keystore.getPassword('twitch', 'user@example.com');
  console.log('Retrieved token:', token);
} catch (error) {
  console.error('Failed to retrieve password:', error);
}

// Delete a token
try {
  keystore.deletePassword('twitch', 'user@example.com');
  console.log('Password deleted successfully');
} catch (error) {
  console.error('Failed to delete password:', error);
}
```

## TypeScript

```typescript
import { NapiKeystore } from '@streaming-enhancement/keystore-native';

const keystore = new NapiKeystore();
keystore.setPassword('service', 'account', 'value');
```

## Platform-Specific Storage

### Windows
- Uses Windows Credential Manager
- Credentials stored per-user
- Requires appropriate permissions

### macOS
- Uses Keychain Services
- Defaults to default keychain
- Requires user authorization on first access

### Linux
- Uses libsecret Secret Service
- Requires a secret service provider (gnome-keyring, kwallet, etc.)
- Falls back to encrypted file if service unavailable

## Error Codes

- `ERR_PLATFORM_NOT_SUPPORTED`: Platform not supported or keystore unavailable
- `ERR_KEY_NOT_FOUND`: Requested key does not exist
- `ERR_ACCESS_DENIED`: Permission denied
- `ERR_IO`: File system I/O error
- `ERR_SERIALIZATION`: Data serialization/deserialization error
- `ERR_PLATFORM`: Platform-specific error

## Building

```bash
npm install
npm run build
```

## Testing

```bash
npm test
```

## License

MIT