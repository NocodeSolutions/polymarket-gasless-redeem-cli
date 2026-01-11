# 🔄 Polymarket Gasless Redeem CLI

> A standalone command-line tool for automatically redeeming Polymarket positions using gasless transactions. Never pay gas fees again!

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
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
- **Node.js 16+** and npm
- **Polymarket Builder API credentials** (API key, secret, and passphrase)
- **Wallet private key** and **proxy wallet address** (Funder Address)

### Getting Your Credentials

1. **Polymarket Builder API**: Get your API credentials from your [Polymarket Builder account](https://polymarket.com/builder)
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

### Step 3: Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Then edit `.env` with your credentials:

```env
# Wallet Configuration
PRIVATE_KEY=your_wallet_private_key_here
FUNDER_ADDRESS=your_polymarket_proxy_wallet_address_here

# Polymarket Builder API Credentials
POLY_BUILDER_API_KEY=your_builder_api_key_here
POLY_BUILDER_SECRET=your_builder_api_secret_here
POLY_BUILDER_PASSPHRASE=your_builder_api_passphrase_here
```

> ⚠️ **Security Warning**: Never commit your `.env` file to version control! It should already be in `.gitignore`.

---

## 🎯 Quick Start

### Test Your Setup

First, verify everything is configured correctly:

```bash
python redeem_cli.py --check
```

This will:
- ✅ Validate your environment variables
- ✅ Connect to Polymarket's API
- ✅ Check for redeemable positions
- ✅ Display results without redeeming

### Run Your First Redemption

Once verified, run a one-time redemption:

```bash
python redeem_cli.py --once
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

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PRIVATE_KEY` | Your wallet private key | ✅ Yes |
| `FUNDER_ADDRESS` | Your Polymarket proxy wallet address | ✅ Yes |
| `POLY_BUILDER_API_KEY` | Polymarket Builder API key | ✅ Yes |
| `POLY_BUILDER_SECRET` | Polymarket Builder API secret | ✅ Yes |
| `POLY_BUILDER_PASSPHRASE` | Polymarket Builder API passphrase | ✅ Yes |

### File Structure

```
polymarket-gasless-redeem-cli/
├── redeem_cli.py          # Main Python CLI script
├── redeem.js              # Node.js redemption script
├── package.json           # Node.js dependencies
├── requirements.txt       # Python dependencies (empty - uses stdlib)
├── README.md              # This file
├── .env.example           # Environment variables template
└── .env                   # Your environment variables (not in git)
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

#### ❌ "Missing required environment variables"

**Solution:**
- Check that your `.env` file exists in the project root
- Ensure variable names match exactly (case-sensitive)
- Verify no extra spaces around `=` signs
- Check that values don't have quotes unless needed

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

### Best Practices

- 🔐 **Never share your private key** or API credentials
- 📁 **Use environment variables** - Never hardcode credentials
- 🚫 **Never commit `.env`** - It should be in `.gitignore`
- 🔍 **Start with `--check`** - Verify setup before redeeming
- 📊 **Monitor logs** - Regularly check for unexpected behavior
- 🔄 **Rotate credentials** - Change API keys periodically
- 🛡️ **Use secure storage** - Consider using a password manager or secure vault
- 👀 **Review transactions** - Check PolygonScan before running in automatic mode

### Security Checklist

- [ ] `.env` file is in `.gitignore`
- [ ] Private key is never logged or printed
- [ ] API credentials are stored securely
- [ ] Service runs with minimal permissions
- [ ] Logs don't contain sensitive information
- [ ] Regular security updates applied

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
