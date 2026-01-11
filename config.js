/**
 * Configuration Management System
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const CONFIG = {
  // API Configuration
  api: {
    relayerUrl: 'https://relayer-v2.polymarket.com',
    dataApiUrl: 'https://data-api.polymarket.com',
    timeout: 30000,
    retries: 3,
    backoffMultiplier: 2,
    maxBackoffTime: 30000
  },

  // Blockchain Configuration
  blockchain: {
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com',
    gasLimit: 200000,
    confirmations: 1
  },

  // Rate Limiting
  rateLimit: {
    requestsPerMinute: 30,
    burstLimit: 10,
    windowMs: 60000
  },

  // Contract Addresses
  contracts: {
    ctf: '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045',
    usdc: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    negRiskAdapter: '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296'
  },

  // ABIs
  abis: {
    ctfRedeem: [
      "function redeemPositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint256[] indexSets)"
    ],
    negRiskRedeem: [
      "function redeemPositions(bytes32 conditionId, uint256[] amounts)"
    ]
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'INFO',
    format: 'json', // 'json' or 'text'
    enableConsole: true,
    enableFile: false,
    logFile: path.join(__dirname, 'logs', 'redemption.log')
  },

  // Application
  app: {
    maxConcurrentRedemptions: 3,
    redemptionDelay: 2000,
    checkTimeout: 60,
    redeemTimeout: 120
  }
};

/**
 * Validate configuration
 */
export function validateConfig() {
  // Validate contract addresses
  for (const [name, address] of Object.entries(CONFIG.contracts)) {
    if (!address.startsWith('0x') || address.length !== 42) {
      throw new Error(`Invalid contract address for ${name}: ${address}`);
    }
  }

  // Validate API URLs
  if (!CONFIG.api.relayerUrl.startsWith('https://')) {
    throw new Error('Relayer URL must use HTTPS');
  }

  if (!CONFIG.api.dataApiUrl.startsWith('https://')) {
    throw new Error('Data API URL must use HTTPS');
  }

  // Validate rate limits
  if (CONFIG.rateLimit.requestsPerMinute <= 0) {
    throw new Error('Requests per minute must be positive');
  }

  console.log('✅ Configuration validated');
}

/**
 * Environment-specific overrides
 */
export function loadEnvironmentOverrides() {
  // Override from environment variables if set
  if (process.env.RPC_URL) {
    CONFIG.blockchain.rpcUrl = process.env.RPC_URL;
  }

  if (process.env.LOG_LEVEL) {
    CONFIG.logging.level = process.env.LOG_LEVEL;
  }

  if (process.env.MAX_CONCURRENT_REDEMPTIONS) {
    CONFIG.app.maxConcurrentRedemptions = parseInt(process.env.MAX_CONCURRENT_REDEMPTIONS);
  }
}
