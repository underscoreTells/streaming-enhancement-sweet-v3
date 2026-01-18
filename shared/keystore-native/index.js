const path = require('path');
const os = require('os');

let nativeModule;

try {
  const platform = os.platform();
  const arch = os.arch();
  
  let platformDir;
  
  if (platform === 'linux') {
    platformDir = `linux-${arch}`;
  } else if (platform === 'darwin') {
    platformDir = `darwin-${arch}`;
  } else if (platform === 'win32') {
    platformDir = `win32-${arch}`;
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  
  const nativePath = path.join(__dirname, platformDir, 'keystore_native.node');
  nativeModule = require(nativePath);
} catch (err) {
  throw new Error(`Failed to load native keystore module: ${err.message}\nMake sure to run the install script: npm run install`);
}

module.exports = nativeModule;