/**
 * Polymarket Gasless Redemption Script
 * Uses official @polymarket/builder-relayer-client for gasless transactions
 * 
 * Usage:
 *   node redeem.js          # Redeem all positions
 *   node redeem.js --check  # Just check, don't redeem
 */

import { ethers } from "ethers";
import { RelayClient, RelayerTxType } from "@polymarket/builder-relayer-client";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env - try current directory first, then parent directory
const envPaths = [
  resolve(__dirname, ".env"),
  resolve(__dirname, "../.env")
];

for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    break;
  }
}

// Constants
const RELAYER_URL = "https://relayer-v2.polymarket.com";
const CHAIN_ID = 137;
const DATA_API = "https://data-api.polymarket.com";

const CTF_ADDRESS = "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045";
const USDC_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const NEG_RISK_ADAPTER = "0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296";

// ABIs
const CTF_REDEEM_ABI = [
  "function redeemPositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint256[] indexSets)"
];

const NEG_RISK_REDEEM_ABI = [
  "function redeemPositions(bytes32 conditionId, uint256[] amounts)"
];

/**
 * Fetch redeemable positions from Data API
 */
async function getRedeemablePositions(walletAddress) {
  const url = `${DATA_API}/positions?user=${walletAddress}&sizeThreshold=0.01&redeemable=true&limit=100&offset=0`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Data API error: ${response.status}`);
  }
  
  const positions = await response.json();
  
  // Group by conditionId - aggregate both outcomes for display and redemption
  const byCondition = new Map();
  for (const pos of positions) {
    const cid = pos.conditionId;
    if (!byCondition.has(cid)) {
      byCondition.set(cid, {
        conditionId: cid,
        title: pos.title,
        negativeRisk: pos.negativeRisk || false,
        outcomes: [],
        totalValue: 0,
        totalSize: 0
      });
    }
    const group = byCondition.get(cid);
    group.outcomes.push({
      outcome: pos.outcome,
      outcomeIndex: pos.outcomeIndex,
      size: pos.size || 0,
      value: pos.currentValue || 0
    });
    group.totalValue += pos.currentValue || 0;
    group.totalSize += pos.size || 0;
  }
  
  return Array.from(byCondition.values());
}

/**
 * Create CTF redeem transaction
 */
function createCtfRedeemTx(conditionId) {
  const iface = new ethers.utils.Interface(CTF_REDEEM_ABI);
  const data = iface.encodeFunctionData("redeemPositions", [
    USDC_ADDRESS,
    ethers.constants.HashZero,
    conditionId,
    [1, 2]
  ]);
  
  return {
    to: CTF_ADDRESS,
    data: data,
    value: "0"
  };
}

/**
 * Create NegRisk redeem transaction
 */
function createNegRiskRedeemTx(conditionId, amounts) {
  const iface = new ethers.utils.Interface(NEG_RISK_REDEEM_ABI);
  const data = iface.encodeFunctionData("redeemPositions", [
    conditionId,
    amounts
  ]);
  
  return {
    to: NEG_RISK_ADAPTER,
    data: data,
    value: "0"
  };
}

/**
 * Main redemption function
 */
async function main() {
  const checkOnly = process.argv.includes("--check");
  
  console.log("=".repeat(50));
  console.log("Polymarket Gasless Redemption");
  console.log("=".repeat(50));
  
  // Validate environment
  const privateKey = process.env.PRIVATE_KEY;
  const funderAddress = process.env.FUNDER_ADDRESS;
  const builderKey = process.env.POLY_BUILDER_API_KEY;
  const builderSecret = process.env.POLY_BUILDER_SECRET;
  const builderPassphrase = process.env.POLY_BUILDER_PASSPHRASE;
  
  if (!privateKey) throw new Error("PRIVATE_KEY not set in .env");
  if (!funderAddress) throw new Error("FUNDER_ADDRESS not set in .env");
  if (!builderKey || !builderSecret || !builderPassphrase) {
    throw new Error("Builder API credentials not set in .env");
  }
  
  // Initialize wallet with Polygon provider
  const provider = new ethers.providers.JsonRpcProvider("https://polygon-rpc.com");
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`EOA: ${wallet.address}`);
  console.log(`Proxy Wallet: ${funderAddress}`);
  
  // Get redeemable positions
  console.log("\nFetching redeemable positions...");
  const positions = await getRedeemablePositions(funderAddress);
  
  if (positions.length === 0) {
    console.log("No redeemable positions found.");
    return { redeemed: 0, total: 0 };
  }
  
  console.log(`Found ${positions.length} condition(s) to redeem:\n`);
  
  let totalValue = 0;
  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    const title = (pos.title || "Unknown").substring(0, 50);
    
    console.log(`${i + 1}. ${title}...`);
    for (const outcome of pos.outcomes) {
      const status = outcome.value > 0 ? "WIN" : "LOSE";
      console.log(`   ${outcome.outcome}: Size ${outcome.size.toFixed(4)}, Value $${outcome.value.toFixed(4)} [${status}]`);
    }
    console.log(`   Condition Value: $${pos.totalValue.toFixed(4)}`);
    totalValue += pos.totalValue;
  }
  
  console.log(`\nTotal redeemable: ~$${totalValue.toFixed(4)}`);
  
  if (checkOnly) {
    console.log("\n(Check mode - not redeeming)");
    return { redeemed: 0, total: positions.length, checkOnly: true };
  }
  
  // Initialize RelayClient with PROXY type
  console.log("\nInitializing gasless relayer...");
  
  const builderCreds = {
    key: builderKey,
    secret: builderSecret,
    passphrase: builderPassphrase
  };
  
  const builderConfig = new BuilderConfig({
    localBuilderCreds: builderCreds
  });
  
  // Use PROXY type for MagicLink/Proxy wallets
  const client = new RelayClient(
    RELAYER_URL,
    CHAIN_ID,
    wallet,
    builderConfig,
    RelayerTxType.PROXY
  );
  
  console.log("Relayer initialized.\n");
  
  // Redeem each condition
  let successCount = 0;
  
  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    const title = (pos.title || "Unknown").substring(0, 30);
    const negRisk = pos.negativeRisk;
    const conditionId = pos.conditionId;
    
    console.log(`${i + 1}. Redeeming: ${title}...`);
    console.log(`   Value: $${pos.totalValue.toFixed(4)}`);
    
    try {
      let tx;
      if (negRisk) {
        // For neg risk, build amounts array from all outcomes
        const amounts = pos.outcomes.map(o => Math.floor(o.size * 1e6));
        tx = createNegRiskRedeemTx(conditionId, amounts);
        console.log(`   NegRisk redeem, amounts: [${amounts}]`);
      } else {
        // CTF binary: redeem both outcomes at once with [1, 2]
        tx = createCtfRedeemTx(conditionId);
        console.log(`   CTF redeem (both outcomes)`);
      }
      
      // Execute via relayer (gasless!)
      const response = await client.execute([tx], `Redeem: ${title}`);
      console.log(`   Submitted, waiting for confirmation...`);
      
      const result = await response.wait();
      console.log(`   Result:`, JSON.stringify(result, null, 2));
      
      if (result && result.transactionHash) {
        if (result.state === "STATE_FAILED") {
          console.log(`   FAILED ON-CHAIN! Tx: ${result.transactionHash}`);
          console.log(`   https://polygonscan.com/tx/${result.transactionHash}`);
        } else {
          console.log(`   SUCCESS! Tx: ${result.transactionHash}`);
          console.log(`   https://polygonscan.com/tx/${result.transactionHash}`);
          successCount++;
        }
      } else {
        console.log(`   FAILED - no transaction hash returned`);
      }
      
    } catch (error) {
      console.log(`   ERROR: ${error.message}`);
      if (error.transactionHash) {
        console.log(`   https://polygonscan.com/tx/${error.transactionHash}`);
      }
    }
    
    // Small delay between redemptions
    if (i < positions.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Redemption complete! ${successCount}/${positions.length} successful`);
  
  return { redeemed: successCount, total: positions.length };
}

// Run
main()
  .then(result => {
    // Allow event loop to clean up async handles before exiting (fixes Windows libuv assertion)
    setTimeout(() => {
      // In check mode, success means we completed the check without errors
      // In redeem mode, success means all positions were redeemed
      const success = result.checkOnly || result.redeemed === result.total;
      process.exit(success ? 0 : 1);
    }, 100);
  })
  .catch(error => {
    console.error("Fatal error:", error.message);
    setTimeout(() => process.exit(1), 100);
  });

