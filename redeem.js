/**
 * Polymarket Gasless Redemption Script
 * Enhanced with security, reliability, and performance improvements
 *
 * Usage:
 *   node redeem.js          # Redeem all positions
 *   node redeem.js --check  # Just check, don't redeem
 *   node redeem.js --setup  # Setup encrypted key storage
 */

import { ethers } from "ethers";
import { RelayClient, RelayerTxType } from "@polymarket/builder-relayer-client";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";

import keyManager from "./keyManager.js";
import { CONFIG, validateConfig, loadEnvironmentOverrides } from "./config.js";
import { globalRateLimiter } from "./rateLimiter.js";
import { retryWithBackoff, validators, logger, withTimeout, safeJsonParse, formatCurrency, sleep } from "./utils.js";

// Load environment overrides
loadEnvironmentOverrides();

// Validate configuration
try {
  validateConfig();
} catch (error) {
  console.error('[ERROR] Configuration error:', error.message);
  process.exit(1);
}

/**
 * Fetch redeemable positions from Data API with rate limiting and validation
 */
async function getRedeemablePositions(walletAddress) {
  // Validate input
  if (!validators.isValidAddress(walletAddress)) {
    throw new Error(`Invalid wallet address: ${walletAddress}`);
  }

  const url = `${CONFIG.api.dataApiUrl}/positions?user=${walletAddress}&sizeThreshold=0.01&redeemable=true&limit=100&offset=0`;

  logger.debug('Fetching redeemable positions', { url, walletAddress });

  const fetchFn = async () => {
    const response = await withTimeout(
      fetch(url, {
        headers: {
          'User-Agent': 'Polymarket-Redemption-CLI/1.0.0',
          'Accept': 'application/json'
        }
      }),
      CONFIG.api.timeout,
      'Data API request timed out'
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Data API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // Validate response structure
    if (!Array.isArray(data)) {
      throw new Error('Invalid API response: expected array of positions');
    }

    return data;
  };

  // Execute with rate limiting and retry logic
  const positions = await retryWithBackoff(
    () => globalRateLimiter.executeWithRateLimit(fetchFn, 'Data API call'),
    CONFIG.api.retries,
    2000,
    'Data API fetch'
  );

  logger.info(`Fetched ${positions.length} positions from API`);

  // Group by conditionId - aggregate both outcomes for display and redemption
  const byCondition = new Map();

  for (const pos of positions) {
    // Validate position data
    if (!pos.conditionId || !validators.isValidAddress(pos.conditionId)) {
      logger.warn('Skipping invalid position', { position: pos });
      continue;
    }

    const cid = pos.conditionId;
    if (!byCondition.has(cid)) {
      byCondition.set(cid, {
        conditionId: cid,
        title: pos.title || 'Unknown Market',
        negativeRisk: Boolean(pos.negativeRisk),
        outcomes: [],
        totalValue: 0,
        totalSize: 0
      });
    }

    const group = byCondition.get(cid);

    // Validate outcome data
    const outcome = {
      outcome: pos.outcome || 'Unknown',
      outcomeIndex: Number(pos.outcomeIndex) || 0,
      size: Math.max(0, Number(pos.size) || 0),
      value: Math.max(0, Number(pos.currentValue) || 0)
    };

    group.outcomes.push(outcome);
    group.totalValue += outcome.value;
    group.totalSize += outcome.size;
  }

  const groupedPositions = Array.from(byCondition.values());
  logger.info(`Grouped into ${groupedPositions.length} condition(s)`);

  return groupedPositions;
}

/**
 * Create CTF redeem transaction with validation
 */
function createCtfRedeemTx(conditionId) {
  if (!validators.isValidAddress(conditionId)) {
    throw new Error(`Invalid condition ID: ${conditionId}`);
  }

  const iface = new ethers.Interface(CONFIG.abis.ctfRedeem);
  const data = iface.encodeFunctionData("redeemPositions", [
    CONFIG.contracts.usdc,
    ethers.ZeroHash,
    conditionId,
    [1, 2] // Both outcomes for binary markets
  ]);

  logger.debug('Created CTF redeem transaction', {
    to: CONFIG.contracts.ctf,
    conditionId,
    outcomes: [1, 2]
  });

  return {
    to: CONFIG.contracts.ctf,
    data: data,
    value: "0"
  };
}

/**
 * Create NegRisk redeem transaction with validation
 */
function createNegRiskRedeemTx(conditionId, amounts) {
  if (!validators.isValidAddress(conditionId)) {
    throw new Error(`Invalid condition ID: ${conditionId}`);
  }

  if (!Array.isArray(amounts) || amounts.length === 0) {
    throw new Error('Amounts must be a non-empty array');
  }

  // Validate amounts are positive integers (scaled by 1e6 for USDC decimals)
  for (const amount of amounts) {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new Error(`Invalid amount: ${amount}. Must be positive integer.`);
    }
  }

  const iface = new ethers.Interface(CONFIG.abis.negRiskRedeem);
  const data = iface.encodeFunctionData("redeemPositions", [
    conditionId,
    amounts
  ]);

  logger.debug('Created NegRisk redeem transaction', {
    to: CONFIG.contracts.negRiskAdapter,
    conditionId,
    amounts
  });

  return {
    to: CONFIG.contracts.negRiskAdapter,
    data: data,
    value: "0"
  };
}

/**
 * Main redemption function with enhanced security and reliability
 */
async function main() {
  const checkOnly = process.argv.includes("--check");
  const setupMode = process.argv.includes("--setup");

  console.log("Polymarket Gasless Redemption v2.0");
  console.log("=".repeat(50));

  // Setup mode - initialize encrypted key storage
  if (setupMode) {
    try {
      if (keyManager.isSetup()) {
        console.log("[WARNING] Keys are already set up. Use --reset to reconfigure.");
        return { setup: false, message: "Already configured" };
      }

      await keyManager.setupWizard();
      console.log("\n[OK] Setup complete! You can now use --check or run redemptions.");
      return { setup: true };
    } catch (error) {
      console.error("[ERROR] Setup failed:", error.message);
      process.exit(1);
    }
  }

  // Load encrypted keys
  let keys;
  try {
    if (!keyManager.isSetup()) {
      console.log("[ERROR] Keys not configured. Run with --setup first.");
      console.log("   Example: node redeem.js --setup");
      process.exit(1);
    }

    keys = await keyManager.getKeys();
    logger.info("Keys loaded successfully");
  } catch (error) {
    console.error("[ERROR] Failed to load keys:", error.message);
    process.exit(1);
  }

  // Validate loaded keys
  if (!validators.isValidPrivateKey(keys.privateKey)) {
    console.error("[ERROR] Invalid private key format");
    process.exit(1);
  }

  if (!validators.isValidAddress(keys.funderAddress)) {
    console.error("[ERROR] Invalid funder address format");
    process.exit(1);
  }

  // Initialize wallet with Polygon provider
  let wallet, provider;
  try {
    provider = new ethers.JsonRpcProvider(CONFIG.blockchain.rpcUrl);
    wallet = new ethers.Wallet(keys.privateKey, provider);

    // Verify wallet connection
    await wallet.getAddress();
    logger.info("Wallet initialized", { address: wallet.address });
  } catch (error) {
    console.error("[ERROR] Failed to initialize wallet:", error.message);
    process.exit(1);
  }

  console.log(`EOA: ${wallet.address}`);
  console.log(`Proxy Wallet: ${keys.funderAddress}`);

  // Get redeemable positions with retry logic
  console.log("\nFetching redeemable positions...");
  let positions;
  try {
    positions = await getRedeemablePositions(keys.funderAddress);
  } catch (error) {
    console.error("[ERROR] Failed to fetch positions:", error.message);
    process.exit(1);
  }

  if (positions.length === 0) {
    console.log("No redeemable positions found.");
    return { redeemed: 0, total: 0 };
  }

  console.log(`Found ${positions.length} condition(s) to redeem:\n`);

  let totalValue = 0;
  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    const title = (pos.title || "Unknown Market").substring(0, 50);

    console.log(`${i + 1}. ${title}`);
    for (const outcome of pos.outcomes) {
      const status = outcome.value > 0 ? "[WIN]" : "[LOSE]";
      console.log(`   ${outcome.outcome}: Size ${formatCurrency(outcome.size)}, Value $${formatCurrency(outcome.value)} ${status}`);
    }
    console.log(`   Condition Value: $${formatCurrency(pos.totalValue)}`);
    totalValue += pos.totalValue;
  }

  console.log(`\nTotal redeemable: $${formatCurrency(totalValue)}`);

  if (checkOnly) {
    console.log("\n(Check mode - not redeeming)");
    return { redeemed: 0, total: positions.length, checkOnly: true };
  }

  // Initialize RelayClient with enhanced error handling
  console.log("\nInitializing gasless relayer...");

  let client;
  try {
    const builderConfig = new BuilderConfig({
      localBuilderCreds: {
        key: keys.apiKey,
        secret: keys.apiSecret,
        passphrase: keys.apiPassphrase
      }
    });

    client = new RelayClient(
      CONFIG.api.relayerUrl,
      CONFIG.blockchain.chainId,
      wallet,
      builderConfig,
      RelayerTxType.PROXY
    );

    logger.info("Relayer client initialized");
    console.log("[OK] Relayer ready\n");
  } catch (error) {
    console.error("[ERROR] Failed to initialize relayer:", error.message);
    process.exit(1);
  }

  // Redeem each condition with concurrency control
  const semaphore = new Semaphore(CONFIG.app.maxConcurrentRedemptions);
  const results = [];

  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    const title = (pos.title || "Unknown Market").substring(0, 30);

    console.log(`${i + 1}/${positions.length}. Redeeming: ${title}`);
    console.log(`   Value: $${formatCurrency(pos.totalValue)}`);

    // Use semaphore for concurrency control
    await semaphore.acquire();

    // Execute redemption with timeout and error handling
    const redeemPromise = (async () => {
      try {
        let tx;
        if (pos.negativeRisk) {
          // For negative risk markets, calculate amounts for each outcome
          const amounts = pos.outcomes.map(o => Math.floor(o.size * 1e6));
          tx = createNegRiskRedeemTx(pos.conditionId, amounts);
          console.log(`   NegRisk redeem, amounts: [${amounts.join(', ')}]`);
        } else {
          // CTF binary: redeem both outcomes at once
          tx = createCtfRedeemTx(pos.conditionId);
          console.log(`   CTF redeem (both outcomes)`);
        }

        // Execute via relayer with timeout
        const executeWithTimeout = withTimeout(
          client.execute([tx], `Redeem: ${title}`),
          CONFIG.app.redeemTimeout * 1000,
          'Relayer execution timed out'
        );

        const response = await executeWithTimeout;
        console.log(`   Submitted, waiting for confirmation...`);

        const result = await response.wait();
        logger.debug('Transaction result', result);

        if (result && result.transactionHash) {
          const txUrl = `https://polygonscan.com/tx/${result.transactionHash}`;

          if (result.state === "STATE_FAILED") {
            console.log(`   FAILED ON-CHAIN! Tx: ${result.transactionHash}`);
            console.log(`   ${txUrl}`);
            return { success: false, txHash: result.transactionHash, url: txUrl };
          } else {
            console.log(`   SUCCESS! Tx: ${result.transactionHash}`);
            console.log(`   ${txUrl}`);
            return { success: true, txHash: result.transactionHash, url: txUrl };
          }
        } else {
          console.log(`   FAILED - no transaction hash returned`);
          return { success: false, error: 'No transaction hash' };
        }

      } catch (error) {
        const errorMsg = error.message || 'Unknown error';
        console.log(`   ERROR: ${errorMsg}`);

        if (error.transactionHash) {
          console.log(`   Tx: https://polygonscan.com/tx/${error.transactionHash}`);
        }

        logger.error('Redemption failed', { error: errorMsg, conditionId: pos.conditionId });
        return { success: false, error: errorMsg };
      } finally {
        semaphore.release();
      }
    })();

    results.push(redeemPromise);

    // Add delay between redemptions to avoid overwhelming the relayer
    if (i < positions.length - 1) {
      await sleep(CONFIG.app.redemptionDelay);
    }
  }

  // Wait for all redemptions to complete
  const redemptionResults = await Promise.all(results);
  const successCount = redemptionResults.filter(r => r.success).length;

  console.log(`\n${"=".repeat(50)}`);
  console.log(`Redemption complete! ${successCount}/${positions.length} successful`);

  // Log successful transactions
  const successfulTxs = redemptionResults.filter(r => r.success && r.txHash);
  if (successfulTxs.length > 0) {
    console.log("\nSuccessful transactions:");
    successfulTxs.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.url}`);
    });
  }

  return {
    redeemed: successCount,
    total: positions.length,
    transactions: successfulTxs.map(r => r.txHash)
  };
}

/**
 * Simple semaphore for concurrency control
 */
class Semaphore {
  constructor(maxConcurrent) {
    this.maxConcurrent = maxConcurrent;
    this.current = 0;
    this.waitQueue = [];
  }

  async acquire() {
    if (this.current < this.maxConcurrent) {
      this.current++;
      return;
    }

    return new Promise(resolve => {
      this.waitQueue.push(resolve);
    });
  }

  release() {
    this.current--;
    if (this.waitQueue.length > 0) {
      this.current++;
      const resolve = this.waitQueue.shift();
      resolve();
    }
  }
}

// Run main function with enhanced error handling
main()
  .then(result => {
    // Allow event loop to clean up async handles before exiting (fixes Windows libuv assertion)
    setTimeout(() => {
      // Setup mode - always exit successfully if setup completed
      if (result.setup !== undefined) {
        process.exit(result.setup ? 0 : 1);
      }

      // Check mode - success if we completed the check without fatal errors
      if (result.checkOnly) {
        logger.info("Check completed successfully");
        process.exit(0);
      }

      // Redemption mode - success if at least some positions were redeemed
      // (partial success is still success, as individual failures are logged)
      const success = result.redeemed > 0 || result.total === 0;
      logger.info("Redemption process completed", {
        successful: result.redeemed,
        total: result.total,
        success
      });

      process.exit(success ? 0 : 1);
    }, 100);
  })
  .catch(error => {
    logger.error("Fatal error in main function", { error: error.message });
    console.error("Fatal error:", error.message);
    setTimeout(() => process.exit(1), 100);
  });

