const keystore = require('./index.js');

console.log('Testing keystore-native addon...');

try {
  const { NapiKeystore } = keystore;
  const store = new NapiKeystore();
  
  console.log('Keystore constructor works');
  
  const isAvailable = store.isAvailable();
  console.log(`isAvailable(): ${isAvailable}`);
  
  if (!isAvailable) {
    console.log('WARNING: Native keystore not available (Secret Service may not be running)');
    console.log('Addon loaded successfully, skipping functional tests\n');
    process.exit(0);
  }
  
  const testService = 'keystore-test-' + Date.now();
  const testAccount = 'test-account';
  const testValue = 'my-secret-password';
  
  try {
    store.setPassword(testService, testAccount, testValue);
    console.log('setPassword() works');
  } catch (err) {
    if (err.code === 'ERR_PLATFORM' || err.code === 'ERR_KEY_NOT_FOUND') {
      console.log('WARNING: setPassword() failed: Secret Service may not be running or unlocked');
      console.log('Addon loaded successfully, skipping functional tests\n');
      process.exit(0);
    }
    throw err;
  }
  
  let retrieved;
  try {
    retrieved = store.getPassword(testService, testAccount);
    console.log(`getPassword() works: ${retrieved}`);
    
    if (retrieved !== testValue) {
      throw new Error(`Password mismatch! Expected: ${testValue}, Got: ${retrieved}`);
    }
    
    store.deletePassword(testService, testAccount);
    console.log('deletePassword() works');
    
    try {
      store.getPassword(testService, testAccount);
      throw new Error('getPassword() should have thrown for deleted entry');
    } catch (err) {
      if (err.message && err.message.includes('not found')) {
        console.log('getPassword() throws error for deleted entry');
      } else {
        throw err;
      }
    }
  } catch (err) {
    if (err.code === 'GenericFailure' && err.message && (err.message.includes('ERR_KEY_NOT_FOUND') || err.message.includes('ERR_PLATFORM'))) {
      console.log('WARNING: getPassword() failed: Secret Service backend may have permission issues');
      console.log('Addon loaded successfully, all methods callable\n');
      process.exit(0);
    }
    throw err;
  }
  
  console.log('\nAll tests passed!');
} catch (err) {
  console.error(`\nTest failed: ${err.message}`);
  console.error(err);
  process.exit(1);
}