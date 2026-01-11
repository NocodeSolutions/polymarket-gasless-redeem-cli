/**
 * Test crypto functionality
 */

import keyManager from './keyManager.js';

async function testCrypto() {
  try {
    console.log('🧪 Testing Crypto Functions');

    // Test data
    const testKeys = {
      privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      funderAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      apiKey: 'test_api_key',
      apiSecret: 'test_api_secret',
      apiPassphrase: 'test_passphrase'
    };

    const password = 'test_password_123';

    console.log('1. Testing encryption...');
    keyManager.storeKeys(testKeys, password);
    console.log('✅ Encryption successful');

    console.log('2. Testing decryption...');
    const loadedKeys = keyManager.loadKeys(password);
    console.log('✅ Decryption successful');

    console.log('3. Verifying data integrity...');
    const keysMatch = JSON.stringify(testKeys) === JSON.stringify(loadedKeys);
    console.log(keysMatch ? '✅ Data integrity verified' : '❌ Data integrity failed');

    // Clean up test file
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const keyFile = path.join(__dirname, '.encrypted_keys');

    if (fs.existsSync(keyFile)) {
      fs.unlinkSync(keyFile);
      console.log('🧹 Cleaned up test file');
    }

    console.log('🎉 All crypto tests passed!');

  } catch (error) {
    console.error('❌ Crypto test failed:', error.message);
    process.exit(1);
  }
}

testCrypto();
