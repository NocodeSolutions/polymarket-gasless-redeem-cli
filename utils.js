/**
 * Utility Functions
 */

import { CONFIG } from './config.js';

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff(
  fn,
  maxRetries = CONFIG.api.retries,
  baseDelay = 1000,
  description = 'operation'
) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        console.error(`[ERROR] ${description} failed after ${maxRetries + 1} attempts`);
        throw error;
      }

      const delay = Math.min(
        baseDelay * Math.pow(CONFIG.api.backoffMultiplier, attempt),
        CONFIG.api.maxBackoffTime
      );

      console.warn(`[WARN] ${description} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`);
      console.warn(`   Error: ${error.message}`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Input validation utilities
 */
export const validators = {
  /**
   * Validate Ethereum address
   */
  isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  },

  /**
   * Validate private key
   */
  isValidPrivateKey(key) {
    return /^0x[a-fA-F0-9]{64}$/.test(key);
  },

  /**
   * Validate transaction hash
   */
  isValidTxHash(hash) {
    return /^0x[a-fA-F0-9]{64}$/.test(hash);
  },

  /**
   * Validate positive number
   */
  isPositiveNumber(value) {
    const num = Number(value);
    return !isNaN(num) && num > 0;
  }
};

/**
 * Enhanced logging system
 */
export class Logger {
  constructor(level = CONFIG.logging.level) {
    this.level = level;
    this.levels = {
      'ERROR': 0,
      'WARN': 1,
      'INFO': 2,
      'DEBUG': 3
    };
  }

  shouldLog(level) {
    return this.levels[level] <= this.levels[this.level];
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const baseMessage = `[${timestamp}] ${level}: ${message}`;

    if (CONFIG.logging.format === 'json') {
      const logEntry = {
        timestamp,
        level,
        message,
        ...(data && { data })
      };
      return JSON.stringify(logEntry);
    } else {
      let formatted = baseMessage;
      if (data) {
        formatted += ` ${JSON.stringify(data, null, 2)}`;
      }
      return formatted;
    }
  }

  error(message, data = null) {
    if (this.shouldLog('ERROR')) {
      console.error(this.formatMessage('ERROR', message, data));
    }
  }

  warn(message, data = null) {
    if (this.shouldLog('WARN')) {
      console.warn(this.formatMessage('WARN', message, data));
    }
  }

  info(message, data = null) {
    if (this.shouldLog('INFO')) {
      console.log(this.formatMessage('INFO', message, data));
    }
  }

  debug(message, data = null) {
    if (this.shouldLog('DEBUG')) {
      console.log(this.formatMessage('DEBUG', message, data));
    }
  }
}

// Global logger instance
export const logger = new Logger();

/**
 * Timeout wrapper for promises
 */
export function withTimeout(promise, timeoutMs, errorMessage = 'Operation timed out') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
}

/**
 * Safe JSON parsing with error handling
 */
export function safeJsonParse(jsonString, fallback = null) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    logger.warn('Failed to parse JSON', { error: error.message, jsonString });
    return fallback;
  }
}

/**
 * Format currency values safely
 */
export function formatCurrency(value, decimals = 4) {
  const num = Number(value);
  if (isNaN(num)) {
    return '0.0000';
  }
  return num.toFixed(decimals);
}

/**
 * Sleep utility
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
