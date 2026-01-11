# 🔄 Polymarket Gasless Redeem CLI

> A standalone command-line tool for automatically redeeming Polymarket positions using gasless transactions.

## ⚠️ Disclaimer

**This is NOT an official Polymarket library.** This project (`polymarket-gasless-redeem-cli`) is an independent, community-developed tool and is not affiliated with, endorsed by, or maintained by Polymarket.

**Important Notes:**
- This CLI tool interacts with Polymarket's Builder Relayer API and Data API, which may change without notice
- The code has been developed based on public Polymarket documentation and APIs, but has not been officially reviewed or approved by Polymarket
- API endpoints, authentication methods, or transaction formats may change, potentially breaking this tool
- While the code includes security measures (encrypted key storage, input validation, rate limiting), users should review the code before use

**Use at your own risk.** The author is not responsible for any issues, data loss, failed transactions, or problems arising from the use of this library. Always verify transactions on PolygonScan and test with small amounts first.

---

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](#-license)

---

## 📋 Table of Contents

- [Features](#-features)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Usage](#-usage)
- [Configuration](#-configuration)
- [How It Works](#-how-it-works)
- [Running as a Service](#-running-as-a-service)
- [Troubleshooting](#-troubleshooting)
- [Security](#-security-considerations)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

- 🚀 **Gasless Redemption** - Uses Polymarket's Builder Relayer for zero-gas transactions
- ⏰ **Automatic Mode** - Runs redemption automatically at configurable intervals
- 🎯 **Manual Mode** - One-time execution for immediate redemption
- 🔍 **Check Mode** - Check for redeemable positions without redeeming
- 💻 **CLI Interface** - Simple command-line interface with comprehensive help
- 📊 **Detailed Logging** - Full transaction history with PolygonScan links
- 🔒 **Secure** - AES-256-GCM encrypted credential storage
- 🌐 **Cross-Platform** - Works on Windows, Linux, and macOS

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18+** and npm (required)
- **Python 3.8+** (optional - only needed for `--interval` scheduling feature)
- **Polymarket Builder API credentials** (API key, secret, and passphrase)
- **Wallet private key** and **proxy wallet address** (Funder Address)

> 💡 **Note**: Python is optional. If you only need one-time redemptions or prefer to use cron/Task Scheduler for automation, you can use Node.js alone.

### Getting Your Credentials

You'll need 5 pieces of information:

| Credential | Where to Find It |
|------------|------------------|
| **Private Key** | Export from your wallet app (MetaMask, Coinbase Wallet, etc.) or Polymarket account settings (if using custodial wallet). This is the EOA wallet linked to your Polymarket account. |
| **Proxy Wallet Address (Funder Address)** | Your Polymarket "Funder Address" - visible in your Polymarket deposit/withdraw page or account settings. This is the address where your Polymarket positions are held. |
| **Builder API Key** | [Polymarket Settings → Builder Codes](https://polymarket.com/settings?tab=builder) - Create a new API key |
| **Builder API Secret** | Shown once when you create the API key (save it!) |
| **Builder API Passphrase** | You set this when creating the API key |

> ⚠️ **Important**: 
> - **Private Key**: Polymarket supports most crypto wallets (MetaMask, Coinbase Wallet, WalletConnect, etc.). Export your private key from whichever wallet you connected to Polymarket. If you created a custodial wallet through Polymarket, export from your Polymarket account settings.
> - **Proxy Wallet Address (Funder Address)**: This is the address where your Polymarket positions are stored. It may be the same as your EOA address or a Polymarket proxy contract address, depending on how your account was set up. You can find it in your Polymarket deposit/withdraw settings or account settings. The script will display both your EOA and Proxy Wallet addresses when it runs, so you can verify they match what you entered.

---

## 🚀 Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/NocodeSolutions/polymarket-gasless-redeem-cli.git
cd polymarket-gasless-redeem-cli
```

### Step 2: Install Node.js Dependencies

```bash
npm install
```

This will install:
- `@polymarket/builder-relayer-client` - For gasless transactions
- `@polymarket/builder-signing-sdk` - For API signing
- `viem` - Modern Ethereum library (replaces ethers.js)
- `tsx` - TypeScript runtime (development dependency)
- `typescript` - TypeScript compiler (development dependency)

### Step 3: Configure Encrypted Key Storage

Run the secure setup wizard to store your credentials:

**Using npm (recommended):**
```bash
npm run setup
```

**Or using npx directly:**
```bash
npx tsx src/redeem.ts --setup
```

To reconfigure your keys (delete old ones and set up new ones):

**Using npm:**
```bash
npm run reset
```

**Or using npx directly:**
```bash
npx tsx src/redeem.ts --reset
```

> ⚠️ **Note**: Key setup and reset must be done using Node.js/npm commands. The Python CLI is only for running redemptions with interval scheduling.

The wizard will prompt you for:

| Prompt | What to Enter |
|--------|---------------|
| Wallet private key | Your EOA private key - export from your wallet (MetaMask, Coinbase Wallet, etc.) or Polymarket account if using custodial wallet. Starts with `0x`. |
| Proxy wallet address | Your Polymarket Funder Address - the address where your positions are held. Find it in Polymarket deposit/withdraw settings. Starts with `0x`. |
| Builder API key | From [Polymarket Builder Codes](https://polymarket.com/settings?tab=builder) |
| Builder API secret | The secret shown when you created the API key |
| Builder API passphrase | The passphrase you set when creating the API key |
| Encryption password | **Create a strong password** - you'll need this to run redemptions |

> 🔐 **Security**: Your credentials are encrypted with AES-256-GCM and stored in `.encrypted_keys`. 
> - **One-time mode**: Password prompted each run
> - **Interval mode**: Password prompted once at startup, kept in memory for the session

---

## 🎯 Quick Start

### Step 1: Setup Encrypted Keys (one-time)

**Using npm (recommended):**
```bash
npm run setup
```

**Or using npx directly:**
```bash
npx tsx src/redeem.ts --setup
```

> ⚠️ **Note**: The Python CLI doesn't support `--setup` or `--reset` flags. You must use Node.js/npm for initial setup and key management.

### Step 2: Test Your Setup

Verify everything is configured correctly:

**Using npm:**
```bash
npm run check
```

**Or using npx directly:**
```bash
npx tsx src/redeem.ts --check
```

**Or using Python:**
```bash
python redeem_cli.py --check
```

This will:
- ✅ Verify your encrypted keys are set up
- ✅ Connect to Polymarket's API
- ✅ Check for redeemable positions
- ✅ Display results without redeeming

### Step 3: Run Your First Redemption

Once verified, run a one-time redemption:

**Using npm:**
```bash
npm run redeem
```

**Or using npx directly:**
```bash
npx tsx src/redeem.ts
```

**Or using Python:**
```bash
python redeem_cli.py --once
```

---

## 📖 Usage

This tool provides two ways to run redemptions:

1. **Node.js/TypeScript** (`src/redeem.ts`) - Core engine, supports one-time operations
2. **Python CLI** (`redeem_cli.py`) - Wrapper with built-in interval scheduling

### Quick Reference

| Task | Node.js/npm Command | Python Command |
|------|-------------------|----------------|
| **Show help** | `npm run help` or `npx tsx src/redeem.ts --help` | `python redeem_cli.py --help` |
| **Setup keys** | `npm run setup` | ❌ Not supported - use npm |
| **Reset keys** | `npm run reset` | ❌ Not supported - use npm |
| **Check positions** | `npm run check` | `python redeem_cli.py --check` |
| **Redeem once** | `npm run redeem` | `python redeem_cli.py --once` |
| **Redeem every N min** | ❌ Use cron/Task Scheduler | `python redeem_cli.py --interval N` |

### Node.js/TypeScript Commands

The TypeScript implementation is the core engine. You can use it via npm scripts or directly with npx.

#### Available npm Scripts

| Command | Description | Equivalent Direct Command |
|---------|-------------|---------------------------|
| `npm run setup` | Setup encrypted key storage | `npx tsx src/redeem.ts --setup` |
| `npm run reset` | Reset and reconfigure keys | `npx tsx src/redeem.ts --reset` |
| `npm run check` | Check for redeemable positions (no redemption) | `npx tsx src/redeem.ts --check` |
| `npm run redeem` | Redeem all available positions once | `npx tsx src/redeem.ts` |
| `npm run start` | Same as `npm run redeem` | `npx tsx src/redeem.ts` |
| `npm run help` | Show help message | `npx tsx src/redeem.ts --help` |
| `npm run dev` | Run in watch mode (development) | `npx tsx watch src/redeem.ts` |

#### Direct TypeScript Commands

```bash
# Show help message
npx tsx src/redeem.ts --help
# or: npx tsx src/redeem.ts -h

# Setup encrypted keys (one-time)
npx tsx src/redeem.ts --setup

# Reset and reconfigure keys
npx tsx src/redeem.ts --reset

# Check for redeemable positions (no redemption)
npx tsx src/redeem.ts --check

# Redeem all available positions once
npx tsx src/redeem.ts
```

> 💡 **Note**: Node.js commands support one-time operations only. For automatic interval scheduling, use the Python CLI or configure cron/Task Scheduler.

### Python CLI Commands

The Python CLI provides built-in interval scheduling and is recommended for automated services.

#### Command-Line Options

```bash
python redeem_cli.py [OPTIONS]
```

| Option | Description |
|--------|-------------|
| `--interval MINUTES` | Run redemption automatically every N minutes |
| `--once` | Run redemption once and exit (default if --interval not specified) |
| `--check` | Only check for redeemable positions, don't actually redeem |
| `--help`, `-h` | Show help message and exit |

> 💡 **Note**: Both Node.js and Python CLIs support `--help`. Use `npm run help` or `npx tsx src/redeem.ts --help` for Node.js help, and `python redeem_cli.py --help` for Python help.

> ⚠️ **Note**: The Python CLI doesn't support `--setup` or `--reset` flags. Use `npm run setup` or `npx tsx src/redeem.ts --setup` for key management.

#### Usage Examples

**One-Time Redemption:**
```bash
python redeem_cli.py --once
```

**Check Mode (no redemption):**
```bash
python redeem_cli.py --check
```

**Automatic Redemption (every 15 minutes):**
```bash
python redeem_cli.py --interval 15
```

**Automatic Redemption (every hour):**
```bash
python redeem_cli.py --interval 60
```

> 💡 **Note**: The Python CLI prompts for your encryption password once at startup. The password is kept in memory for the session, so interval mode works automatically without re-prompting.

#### Using Environment Variable (for scripts/services)

For fully automated operation (e.g., systemd service), you can set the password via environment variable:

```bash
export REDEEM_PASSWORD="your_encryption_password"
python redeem_cli.py --interval 15
```

> ⚠️ **Security Warning**: Only use `REDEEM_PASSWORD` in secured environments. The password is stored in memory during execution.

#### Stop Automatic Service

Press `Ctrl+C` to gracefully stop the service.

### Which Tool Should I Use?

| Use Case | Recommended Tool | Command |
|----------|----------------|---------|
| Quick one-time redemption | Node.js (npm) | `npm run redeem` |
| Check positions quickly | Node.js (npm) | `npm run check` |
| Automatic interval scheduling | Python CLI | `python redeem_cli.py --interval 15` |
| System service/daemon | Python CLI | `python redeem_cli.py --interval 15` |
| Cron/Task Scheduler automation | Node.js (npm) | `npm run redeem` |

### Example Output

```
=======================================================
Polymarket Gasless Redemption v2.0 (TypeScript + Viem)
=======================================================
EOA: 0x5047f21090Ee39896C719a232C7e8A0d6CC2F7B6
Proxy Wallet: 0x370a1dee49ba99971a9189b90778d913a54e4e63

Fetching redeemable positions...
Found 3 condition(s) to redeem:

1. Will Bitcoin reach $100k by end of 2024?...
   YES: Size 10.0000, Value $10.0000 [WIN]
   NO: Size 0.0000, Value $0.0000 [LOSE]
   Condition Value: $10.0000

Total redeemable: $10.0000

Initializing gasless relayer...
[OK] Relayer ready

1/3. Redeeming: Will Bitcoin reach $100k by end...
   Value: $10.0000
   CTF redeem (both outcomes)
   Submitted, waiting for confirmation...
   SUCCESS! Tx: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
   https://polygonscan.com/tx/0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

=======================================================
Redemption complete! 3/3 successful

Successful transactions:
   1. https://polygonscan.com/tx/0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
   2. https://polygonscan.com/tx/0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
   3. https://polygonscan.com/tx/0x7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234
```

---

## ⚙️ Configuration

### Encrypted Key Storage

Credentials are stored securely using encrypted key storage. Run one of these commands to configure:

```bash
npm run setup
# or: npx tsx src/redeem.ts --setup
```

> ⚠️ **Note**: Key setup must be done using Node.js/npm. The Python CLI doesn't support setup/reset commands.

### Optional Environment Variables

These environment variables can optionally override default settings:

| Variable | Description | Default |
|----------|-------------|---------|
| `RPC_URL` | Polygon RPC endpoint | `https://polygon-rpc.com` |
| `LOG_LEVEL` | Logging level (ERROR, WARN, INFO, DEBUG) | `INFO` |
| `MAX_CONCURRENT_REDEMPTIONS` | Max parallel redemptions | `3` |

### File Structure

```
polymarket-gasless-redeem-cli/
├── src/
│   ├── redeem.ts          # Main TypeScript redemption script
│   ├── config.ts          # Configuration management
│   ├── keyManager.ts      # Encrypted key storage
│   ├── rateLimiter.ts     # API rate limiting
│   ├── transactionManager.ts  # Transaction management
│   ├── transactions.ts   # Transaction building
│   ├── types.ts           # TypeScript type definitions
│   └── utils.ts           # Utility functions
├── redeem_cli.py          # Python CLI wrapper (optional)
├── package.json           # Node.js dependencies and scripts
├── requirements.txt       # Python dependencies (empty - uses stdlib)
├── tsconfig.json          # TypeScript configuration
├── README.md              # This file
└── .encrypted_keys        # Your encrypted credentials (not in git)
```

---

## 🔧 How It Works

The CLI follows these steps:

1. **🔍 Fetch Positions** - Queries Polymarket's Data API for redeemable positions
2. **📊 Group by Condition** - Aggregates positions by condition ID
3. **🔨 Build Transactions** - Creates redemption transactions for each condition
4. **🚀 Submit Gasless** - Submits transactions via Polymarket's gasless relayer
5. **✅ Confirm & Log** - Waits for confirmation and logs results with PolygonScan links

### Supported Position Types

- **CTF (Conditional Tokens Framework)** - Binary markets with YES/NO outcomes
- **Negative Risk** - Markets with negative risk positions

### Architecture: Node.js vs Python

This tool has two components:

| Component | Language | Purpose | Required? |
|-----------|----------|---------|-----------|
| `src/redeem.ts` | TypeScript/Node.js | Core engine - handles all API calls, encryption, and transactions | ✅ **Yes** |
| `redeem_cli.py` | Python | Convenience wrapper - adds built-in `--interval` scheduling | ❌ **Optional** |

**Why Python?** The Python CLI was added for ease of use - it provides built-in interval scheduling without needing to configure cron jobs or Task Scheduler. If you're comfortable with system scheduling tools, you can use Node.js directly and skip Python entirely.

**Node.js Only (no Python needed):**
```bash
npm run check    # Check positions
npm run redeem   # Redeem positions
# Use cron (Linux/Mac) or Task Scheduler (Windows) for automation
```

**With Python (built-in scheduling):**
```bash
python redeem_cli.py --interval 15  # Runs every 15 minutes automatically
```

### Transaction Flow

```
┌─────────────────────────────────────────────┐
│  Option A: Python CLI (optional)            │
│  - Provides --interval scheduling           │
│  - Prompts password once, keeps in memory   │
└──────────────────┬──────────────────────────┘
                   │ (calls as subprocess)
                   ▼
┌─────────────────────────────────────────────┐
│  src/redeem.ts (TypeScript/Node.js) - REQUIRED │
│  - Encrypted key management                 │
│  - Polymarket API integration               │
│  - Transaction building & submission        │
└──────────────────┬──────────────────────────┘
                   │
       ┌───────────┴───────────┐
       ▼                       ▼
 Polymarket Data API    Builder Relayer
 (fetch positions)      (gasless transactions)
                              │
                              ▼
                       Polygon Network
```

---

## 🖥️ Running as a Service

> ⚠️ **Note**: For automated services, set the `REDEEM_PASSWORD` environment variable to avoid interactive password prompts.

### Linux/macOS (systemd)

Create a systemd service file at `/etc/systemd/system/polymarket-gasless-redeem-cli.service`:

```ini
[Unit]
Description=Polymarket Gasless Redeem CLI
After=network.target

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/polymarket-gasless-redeem-cli
Environment="PATH=/usr/bin:/usr/local/bin"
Environment="REDEEM_PASSWORD=your_encryption_password"
ExecStart=/usr/bin/python3 /path/to/polymarket-gasless-redeem-cli/redeem_cli.py --interval 15
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

> 🔒 **Security Tip**: For production, consider using systemd's `EnvironmentFile` directive to load the password from a secured file with restricted permissions.

Enable and start the service:

```bash
sudo systemctl enable polymarket-gasless-redeem-cli
sudo systemctl start polymarket-gasless-redeem-cli
sudo systemctl status polymarket-gasless-redeem-cli
```

View logs:

```bash
sudo journalctl -u polymarket-gasless-redeem-cli -f
```

### Using PM2 (Node.js Process Manager)

```bash
npm install -g pm2
REDEEM_PASSWORD="your_password" pm2 start redeem_cli.py --name polymarket-gasless-redeem-cli --interpreter python3 -- --interval 15
pm2 save
pm2 startup
```

### Using Supervisor

Create `/etc/supervisor/conf.d/polymarket-gasless-redeem-cli.conf`:

```ini
[program:polymarket-gasless-redeem-cli]
command=/usr/bin/python3 /path/to/polymarket-gasless-redeem-cli/redeem_cli.py --interval 15
directory=/path/to/polymarket-gasless-redeem-cli
user=your_user
environment=REDEEM_PASSWORD="your_encryption_password"
autostart=true
autorestart=true
stderr_logfile=/var/log/polymarket-gasless-redeem-cli.err.log
stdout_logfile=/var/log/polymarket-gasless-redeem-cli.out.log
```

---

## 🐛 Troubleshooting

### Common Issues

#### ❌ "Node.js is not installed or not in PATH"

**Solution:**
- Install Node.js from [https://nodejs.org/](https://nodejs.org/)
- Ensure `node` command is available in your PATH
- Restart your terminal after installation

#### ❌ "Encrypted keys not configured"

**Solution:**
- Run `npm run setup` or `npx tsx src/redeem.ts --setup` to configure your credentials
- Follow the setup wizard to enter your wallet and API credentials
- Create a strong password to encrypt your keys
- Note: Python CLI doesn't support setup - use Node.js/npm for key management

#### ❌ "Invalid password or corrupted key file"

**Solution:**
- Verify you're entering the correct encryption password
- If you forgot your password or want to reconfigure, run `npm run reset` or `npx tsx src/redeem.ts --reset` to delete old keys and set up new ones
- Ensure the key file hasn't been modified or corrupted
- Note: Python CLI doesn't support reset - use Node.js/npm for key management

#### ❌ "Redemption script not found"

**Solution:**
- Ensure you're running commands from the project root directory
- Verify `src/redeem.ts` exists (for Node.js) or `redeem_cli.py` exists (for Python)
- Check file permissions: `chmod +x redeem_cli.py` (Linux/macOS) if needed
- Ensure Node.js dependencies are installed: `npm install`

#### ❌ "Script timed out"

**Solution:**
- Check your internet connection
- Verify Polymarket API is accessible
- Service will retry automatically in automatic mode
- Increase timeout in `redeem_cli.py` if needed (default: 120 seconds)

#### ❌ "Failed to redeem positions"

**Solution:**
- Verify your Builder API credentials are correct
- Check your proxy wallet address is correct
- Ensure your wallet has sufficient balance (if needed)
- Check Polygon network status
- Review transaction on PolygonScan for error details

#### ❌ "No redeemable positions found"

**This is normal!** It means:
- All positions are already redeemed, or
- No positions have resolved yet, or
- Positions don't meet the minimum size threshold (0.01)

### Debug Mode

For more detailed logging, you can modify the logging level in `redeem_cli.py`:

```python
logging.basicConfig(
    level=logging.DEBUG,  # Change from INFO to DEBUG
    ...
)
```

---

## 🔒 Security Considerations

### 🔐 **Enhanced Security Features (v2.0)**

This version includes significant security improvements:

- **🔒 Encrypted Key Storage** - All sensitive data is encrypted with AES-256-GCM
- **🛡️ Password Protection** - Keys are protected with PBKDF2-derived encryption keys
- **✅ Input Validation** - All inputs are validated before processing
- **🚦 Rate Limiting** - API calls are rate-limited to prevent abuse
- **🔄 Retry Logic** - Automatic retry with exponential backoff for resilience
- **📊 Structured Logging** - Secure logging without exposing sensitive data

### Best Practices

- 🔐 **Never share your encryption password** or recovery keys
- 🚫 **Never commit `.encrypted_keys`** - It should be in `.gitignore`
- 🔍 **Start with `--check`** - Verify setup before redeeming
- 📊 **Monitor logs** - Regularly check for unexpected behavior
- 🔄 **Rotate credentials** - Change API keys and passwords periodically
- 🛡️ **Backup encrypted keys** - Store backups securely (password required to restore)
- 👀 **Review transactions** - Check PolygonScan before running in automatic mode
- 🔑 **Strong passwords** - Use complex passwords for key encryption

### Security Checklist

- [x] `.encrypted_keys` file is in `.gitignore`
- [ ] Encryption password is strong (8+ characters, mixed case, numbers, symbols)
- [x] Private keys are never logged or printed
- [x] API credentials are encrypted at rest with AES-256-GCM
- [ ] Service runs with minimal permissions
- [x] Logs don't contain sensitive information
- [ ] Regular security updates applied
- [ ] Encrypted keys are backed up securely

### Key Management

The system uses encrypted key storage instead of plain environment variables:

**First-time setup:**
```bash
npm run setup
# or: npx tsx src/redeem.ts --setup
```

**Reset/reconfigure keys:**
```bash
npm run reset
# or: npx tsx src/redeem.ts --reset
```

> ⚠️ **Important**: Key management (`--setup` and `--reset`) must be done using Node.js/npm commands. The Python CLI only supports running redemptions (`--once`, `--check`, `--interval`).

### Running Redemptions

**Option 1: Node.js/npm (one-time operations)**
```bash
npm run check    # Check positions
npm run redeem   # Redeem positions
```

**Option 2: Python CLI (supports intervals)**
```bash
python redeem_cli.py --check        # Check positions
python redeem_cli.py --once         # Redeem once
python redeem_cli.py --interval 15  # Redeem every 15 minutes
```

> 💡 **Tip**: Use **Python CLI** for scheduled/automatic redemption. Use **Node.js/npm** for quick one-time operations.

**Benefits:**
- Keys are encrypted with AES-256-GCM
- Password-based access control
- No plain-text credentials in files
- Automatic key validation
- Secure key rotation support

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Setup

```bash
# Install dependencies
npm install

# Run tests (if available)
python -m pytest

# Run linter
pylint redeem_cli.py
```

---

## 📝 License

This project is provided as-is for personal use. Use at your own risk.

**⚠️ Disclaimer:** This is NOT an official Polymarket library. This project (`polymarket-gasless-redeem-cli`) is an independent, community-developed tool and is not affiliated with, endorsed by, or maintained by Polymarket. The code interacts with Polymarket's APIs which may change without notice. Use at your own risk. The author is not responsible for any issues, data loss, failed transactions, or problems arising from the use of this library.

---

## 📞 Support

For issues related to:

- **Polymarket API**: Check [Polymarket Documentation](https://docs.polymarket.com)
- **Builder Relayer**: Contact [Polymarket Support](https://polymarket.com/support)
- **This CLI**: [Open an issue on GitHub](https://github.com/NocodeSolutions/polymarket-gasless-redeem-cli/issues)

---

## 📚 Additional Resources

- [Polymarket Documentation](https://docs.polymarket.com)
- [Builder Relayer Client](https://github.com/Polymarket/builder-relayer-client)
- [Polygon Network](https://polygon.technology/)
- [Viem Documentation](https://viem.sh/)

---

## 🎉 Changelog

### Version 2.0.0 (2026-01-11)

- 🔐 **Encrypted key storage** - AES-256-GCM encryption for all credentials
- 🔑 **Password-based access** - Secure password protection with PBKDF2
- ⏰ **Improved interval mode** - Password prompted once at startup
- 🔄 **REDEEM_PASSWORD env var** - Support for fully automated services
- ✅ **Input validation** - Proper bytes32 validation for condition IDs
- 🚦 **Rate limiting** - Built-in API rate limiting
- 📊 **Structured logging** - Enhanced logging without sensitive data exposure
- ⚡ **Migrated to Viem** - Replaced ethers.js with viem for modern Ethereum interactions

### Version 1.0.0 (2026-01-10)

- ✨ Initial release
- 🚀 Automatic and manual redemption modes
- 🔍 Check-only mode
- 💻 CLI interface with comprehensive help
- 📊 Detailed logging with PolygonScan links
- 🌐 Cross-platform support

---

<div align="center">

**Made with ❤️ for the Polymarket community**

⭐ Star this repo if you find it useful!

</div>
