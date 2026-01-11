/**
 * Test script for the improved redemption system
 * Tests functionality without requiring real API keys
 */

import { CONFIG, validateConfig } from './config.js';
import { validators, logger, formatCurrency } from './utils.js';
import { globalRateLimiter } from './rateLimiter.js';

console.log('Testing Improved Polymarket Redemption System');
console.log('='.repeat(60));

// Test 1: Configuration Validation
console.log('\n1. Testing Configuration Validation...');
try {
  validateConfig();
  console.log('[OK] Configuration validation passed');
} catch (error) {
  console.log('[FAIL] Configuration validation failed:', error.message);
}

// Test 2: Input Validators
console.log('\n2. Testing Input Validators...');
const testAddresses = [
  '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045', // Valid
  '0x123', // Invalid - too short
  'not_an_address', // Invalid - not hex
  '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045abc' // Invalid - too long
];

testAddresses.forEach((addr, i) => {
  const isValid = validators.isValidAddress(addr);
  console.log(`   Address ${i + 1}: ${isValid ? '[OK]' : '[FAIL]'} ${addr}`);
});

const testPrivateKeys = [
  '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', // Valid
  '0x123', // Invalid
  'not_a_key' // Invalid
];

testPrivateKeys.forEach((key, i) => {
  const isValid = validators.isValidPrivateKey(key);
  console.log(`   Private Key ${i + 1}: ${isValid ? '[OK]' : '[FAIL]'} ${key.substring(0, 10)}...`);
});

// Test 3: Rate Limiter
console.log('\n3. Testing Rate Limiter...');
console.log(`   Rate limit: ${CONFIG.rateLimit.requestsPerMinute} req/min`);
console.log(`   Burst limit: ${CONFIG.rateLimit.burstLimit} req`);
console.log(`   Can make request: ${globalRateLimiter.canMakeRequest() ? '[OK]' : '[FAIL]'}`);

// Test 4: Currency Formatting
console.log('\n4. Testing Currency Formatting...');
const testValues = [1.234567, 0, -1, 'invalid', null];
testValues.forEach((val, i) => {
  const formatted = formatCurrency(val);
  console.log(`   Value ${i + 1}: ${val} -> ${formatted}`);
});

// Test 5: Logger
console.log('\n5. Testing Logger...');
logger.info('Test info message');
logger.warn('Test warning message');
logger.error('Test error message');

// Test 6: Configuration Values
console.log('\n6. Testing Configuration Values...');
console.log(`   API Timeout: ${CONFIG.api.timeout}ms`);
console.log(`   RPC URL: ${CONFIG.blockchain.rpcUrl}`);
console.log(`   Chain ID: ${CONFIG.blockchain.chainId}`);
console.log(`   CTF Contract: ${CONFIG.contracts.ctf}`);
console.log(`   USDC Contract: ${CONFIG.contracts.usdc}`);
console.log(`   Max Concurrent: ${CONFIG.app.maxConcurrentRedemptions}`);
console.log(`   Redemption Delay: ${CONFIG.app.redemptionDelay}ms`);

console.log('\nAll tests completed!');
console.log('\nNext steps:');
console.log('1. Run: node redeem.js --setup  (to configure encrypted keys)');
console.log('2. Run: node redeem.js --check  (to test with real API)');
console.log('3. Run: node redeem.js          (to perform actual redemptions)');
