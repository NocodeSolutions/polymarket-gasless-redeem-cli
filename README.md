# 🔄 Polymarket Gasless Redeem CLI

> A standalone command-line tool for automatically redeeming Polymarket positions using gasless transactions. Never pay gas fees again!

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

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
- 🔒 **Secure** - Environment-based credential management
- 🌐 **Cross-Platform** - Works on Windows, Linux, and macOS

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.8+** (uses only standard library, no external dependencies)
- **Node.js 18+** and npm
- **Polymarket Builder API credentials** (API key, secret, and passphrase)
- **Wallet private key** and **proxy wallet address** (Funder Address)

### Getting Your Credentials

1. **Polymarket Builder API**: Get your API credentials from [Polymarket Settings → Builder Codes](https://polymarket.com/settings?tab=builder)
2. **Proxy Wallet Address**: This is your Polymarket proxy wallet address (Funder Address)
3. **Private Key**: Your wallet's private key (keep this secure!)

---

## 🚀 Installation

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd polymarket-redemption-service
```

### Step 2: Install Node.js Dependencies

```bash
npm install
```

This will install:
- `@polymarket/builder-relayer-client` - For gasless transactions
- `@polymarket/builder-signing-sdk` - For API signing
- `ethers` - Ethereum library
- `dotenv` - Environment variable management

### Step 3: Configure Encrypted Key Storage

Run the secure setup wizard to store your credentials:

```bash
npm run setup
# or
node redeem.js --setup
```

The wizard will prompt you for:
- Your wallet private key
- Your Polymarket proxy wallet address (Funder Address)
- Your Builder API key, secret, and passphrase
- A password to encrypt your credentials

> 🔐 **Security**: Your credentials are encrypted with AES-256-GCM and stored in `.encrypted_keys`. The password is required each time you run redemptions.

---

## 🎯 Quick Start

### Step 1: Setup Encrypted Keys (one-time)

```bash
node redeem.js --setup
```

### Step 2: Test Your Setup

Verify everything is configured correctly:

```bash
python redeem_cli.py --check
# or: node redeem.js --check
```

This will:
- ✅ Verify your encrypted keys are set up
- ✅ Connect to Polymarket's API
- ✅ Check for redeemable positions
- ✅ Display results without redeeming

### Step 3: Run Your First Redemption

Once verified, run a one-time redemption:

```bash
python redeem_cli.py --once
# or: node redeem.js
```

---

## 📖 Usage

### Command-Line Options

```bash
python redeem_cli.py [OPTIONS]
```

| Option | Description |
|--------|-------------|
| `--interval MINUTES` | Run redemption automatically every N minutes |
| `--once` | Run redemption once and exit (default if --interval not specified) |
| `--check` | Only check for redeemable positions, don't actually redeem |
| `--help` | Show help message and exit |

### Usage Examples

#### One-Time Redemption

Redeem all available positions once and exit:

```bash
python redeem_cli.py --once
```

#### Check Mode

Check for redeemable positions without redeeming:

```bash
python redeem_cli.py --check
```

#### Automatic Redemption

Run redemption automatically every 15 minutes:

```bash
python redeem_cli.py --interval 15
```

Run redemption automatically every hour:

```bash
python redeem_cli.py --interval 60
```

> 💡 **Note**: The CLI prompts for your encryption password once at startup. The password is kept in memory for the session, so interval mode works automatically without re-prompting.

#### Using Environment Variable (for scripts/services)

For fully automated operation (e.g., systemd service), you can set the password via environment variable:

```bash
export REDEEM_PASSWORD="your_encryption_password"
python redeem_cli.py --interval 15
```

> ⚠️ **Security Warning**: Only use `REDEEM_PASSWORD` in secured environments. The password is stored in memory during execution.

#### Stop Automatic Service

Press `Ctrl+C` to gracefully stop the service.

### Example Output

```
==================================================
Polymarket Gasless Redemption
==================================================
EOA: 0x5047f21090Ee39896C719a232C7e8A0d6CC2F7B6
Proxy Wallet: 0x370a1dee49ba99971a9189b90778d913a54e4e63

Fetching redeemable positions...
Found 3 condition(s) to redeem:

1. Will Bitcoin reach $100k by end of 2024?...
   YES: Size 10.0000, Value $10.0000 [WIN]
   NO: Size 0.0000, Value $0.0000 [LOSE]
   Condition Value: $10.0000

Total redeemable: ~$10.0000

Initializing gasless relayer...
Relayer initialized.

1. Redeeming: Will Bitcoin reach $100k...
   Value: $10.0000
   CTF redeem (both outcomes)
   Submitted, waiting for confirmation...
   SUCCESS! Tx: 0x1234...abcd
   https://polygonscan.com/tx/0x1234...abcd

==================================================
Redemption complete! 3/3 successful
```

---

## ⚙️ Configuration

### Encrypted Key Storage

Credentials are stored securely using encrypted key storage. Run `node redeem.js --setup` to configure.

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
├── redeem_cli.py          # Main Python CLI script
├── redeem.js              # Node.js redemption script
├── config.js              # Configuration management
├── keyManager.js          # Encrypted key storage
├── rateLimiter.js         # API rate limiting
├── utils.js               # Utility functions
├── package.json           # Node.js dependencies
├── requirements.txt       # Python dependencies (empty - uses stdlib)
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

### Transaction Flow

```
┌─────────────┐
│   CLI App   │
│  (Python)   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  redeem.js  │
│  (Node.js)  │
└──────┬──────┘
       │
       ├──► Polymarket Data API (fetch positions)
       │
       └──► Builder Relayer (gasless transactions)
                │
                └──► Polygon Network
```

---

## 🖥️ Running as a Service

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
ExecStart=/usr/bin/python3 /path/to/polymarket-gasless-redeem-cli/redeem_cli.py --interval 15
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

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
pm2 start redeem_cli.py --name polymarket-gasless-redeem-cli --interpreter python3 -- --interval 15
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
- Run `node redeem.js --setup` to configure your credentials
- Follow the setup wizard to enter your wallet and API credentials
- Create a strong password to encrypt your keys

#### ❌ "Invalid password or corrupted key file"

**Solution:**
- Verify you're entering the correct encryption password
- If you forgot your password, delete `.encrypted_keys` and run setup again
- Ensure the key file hasn't been modified or corrupted

#### ❌ "Redemption script not found"

**Solution:**
- Ensure `redeem.js` is in the same directory as `redeem_cli.py`
- Check file permissions: `chmod +x redeem.js` (Linux/macOS)
- Verify you're running the command from the project root

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

```bash
# First-time setup (Node.js - required once)
node redeem.js --setup
```

### Running Redemptions

**Option 1: Node.js (one-time only)**
```bash
node redeem.js --check    # Check positions
node redeem.js            # Redeem positions
```

**Option 2: Python CLI (supports intervals)**
```bash
python redeem_cli.py --check        # Check positions
python redeem_cli.py --once         # Redeem once
python redeem_cli.py --interval 15  # Redeem every 15 minutes
```

> 💡 **Tip**: Use **Python CLI** for scheduled/automatic redemption. Use **Node.js** for quick one-time operations.

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

---

## 📞 Support

For issues related to:

- **Polymarket API**: Check [Polymarket Documentation](https://docs.polymarket.com)
- **Builder Relayer**: Contact [Polymarket Support](https://polymarket.com/support)
- **This CLI**: [Open an issue on GitHub](https://github.com/your-repo/issues)

---

## 📚 Additional Resources

- [Polymarket Documentation](https://docs.polymarket.com)
- [Builder Relayer Client](https://github.com/Polymarket/builder-relayer-client)
- [Polygon Network](https://polygon.technology/)
- [Ethers.js Documentation](https://docs.ethers.io/)

---

## 🎉 Changelog

### Version 1.0.0 (2024-01-10)

- ✨ Initial release
- 🚀 Automatic and manual redemption modes
- 🔍 Check-only mode
- 💻 CLI interface with comprehensive help
- 📊 Detailed logging with PolygonScan links
- 🔒 Environment-based configuration
- 🌐 Cross-platform support

---

<div align="center">

**Made with ❤️ for the Polymarket community**

⭐ Star this repo if you find it useful!

</div>
