"""
Polymarket Gasless Redeem CLI
A standalone command-line tool for automatically redeeming Polymarket positions.
"""

import argparse
import asyncio
import logging
import os
import re
import subprocess
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
log = logging.getLogger("redemption_cli")

# Get script directory
SCRIPT_DIR = Path(__file__).parent.absolute()
REDEMPTION_SCRIPT_PATH = SCRIPT_DIR / "redeem.js"


def load_env_file():
    """Load environment variables from .env file."""
    env_path = SCRIPT_DIR / ".env"
    if env_path.exists():
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                # Skip empty lines and comments
                if not line or line.startswith('#'):
                    continue
                # Parse KEY=VALUE format
                if '=' in line:
                    key, value = line.split('=', 1)
                    key = key.strip()
                    value = value.strip()
                    # Remove quotes if present
                    if value.startswith('"') and value.endswith('"'):
                        value = value[1:-1]
                    elif value.startswith("'") and value.endswith("'"):
                        value = value[1:-1]
                    # Only set if not already in environment
                    if key and value and key not in os.environ:
                        os.environ[key] = value


class RedemptionCLI:
    """Command-line interface for Polymarket redemption service."""
    
    def __init__(self, interval_minutes: int = None, check_only: bool = False):
        """
        Initialize the redemption CLI.
        
        Args:
            interval_minutes: Interval in minutes for automatic redemption (None = one-time)
            check_only: If True, only check for redeemable positions without redeeming
        """
        self.interval_minutes = interval_minutes
        self.check_only = check_only
        self._stop = asyncio.Event()
        self._task = None
        self._next_run_at = None
        self._last_run_at = None
    
    def log(self, message: str, level: str = "INFO"):
        """Log a message with timestamp."""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {message}")
        if level == "ERROR":
            log.error(message)
        elif level == "WARNING":
            log.warning(message)
        else:
            log.info(message)
    
    def _run_subprocess_sync(self, args: list) -> dict:
        """Run subprocess synchronously (called in a thread)."""
        try:
            result = subprocess.run(
                args,
                cwd=SCRIPT_DIR,
                capture_output=True,
                text=True,
                env={**os.environ},
                timeout=115
            )
            return {
                "output": result.stdout + result.stderr,
                "returncode": result.returncode
            }
        except subprocess.TimeoutExpired:
            return {
                "output": "Script timed out",
                "returncode": -1
            }
        except Exception as e:
            return {
                "output": str(e),
                "returncode": -1
            }
    
    def _parse_output(self, output: str) -> dict:
        """Parse script output and extract key information."""
        result = {
            "conditions": 0,
            "total_value": 0.0,
            "redeemed": 0,
            "transactions": []
        }
        
        lines = output.strip().split("\n")
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Parse condition count
            if "condition(s) to redeem" in line:
                match = re.search(r"Found (\d+) condition", line)
                if match:
                    result["conditions"] = int(match.group(1))
            
            # Parse total value
            if "Total redeemable:" in line:
                match = re.search(r"\$([0-9.]+)", line)
                if match:
                    result["total_value"] = float(match.group(1))
            
            # Parse redemption results
            if "SUCCESS!" in line:
                match = re.search(r"Tx: (0x[a-fA-F0-9]+)", line)
                if match:
                    result["transactions"].append(match.group(1))
                    result["redeemed"] += 1
            
            # Parse completion
            if "Redemption complete!" in line:
                match = re.search(r"(\d+)/(\d+) successful", line)
                if match:
                    result["redeemed"] = int(match.group(1))
        
        return result
    
    async def _run_redemption(self) -> dict:
        """Execute the Node.js redemption script."""
        if not REDEMPTION_SCRIPT_PATH.exists():
            error_msg = f"Redemption script not found at {REDEMPTION_SCRIPT_PATH}"
            self.log(error_msg, "ERROR")
            return {"success": False, "error": "Script not found"}
        
        args = ["node", "redeem.js"]
        if self.check_only:
            args.append("--check")
        
        action = "check" if self.check_only else "redemption"
        self.log(f"Starting {action}...")
        
        try:
            result_data = await asyncio.wait_for(
                asyncio.to_thread(self._run_subprocess_sync, args),
                timeout=120
            )
            
            output = result_data["output"]
            returncode = result_data["returncode"]
            
            # Print output
            print(output)
            
            # Parse results
            result = self._parse_output(output)
            result["exit_code"] = returncode
            result["success"] = returncode == 0
            
            if result["success"]:
                if result["conditions"] > 0:
                    self.log(f"Found {result['conditions']} position(s) to redeem")
                    if result["total_value"] > 0:
                        self.log(f"Total value: ${result['total_value']:.4f}")
                    if not self.check_only and result["redeemed"] > 0:
                        self.log(f"Successfully redeemed {result['redeemed']} position(s)")
                else:
                    self.log("No redeemable positions found")
            else:
                self.log(f"Redemption failed with exit code {returncode}", "ERROR")
            
            return result
            
        except asyncio.TimeoutError:
            self.log("Redemption script timed out", "ERROR")
            return {"success": False, "error": "Timeout"}
        except Exception as e:
            self.log(f"Failed to run redemption script: {e}", "ERROR")
            return {"success": False, "error": str(e)}
    
    async def _run_loop(self):
        """Main loop that runs redemption periodically."""
        # Run immediately on start
        self._last_run_at = datetime.now(timezone.utc)
        await self._run_redemption()
        
        if self.interval_minutes is None:
            return
        
        # Then run every interval_minutes
        interval_seconds = self.interval_minutes * 60
        while not self._stop.is_set():
            try:
                # Set next run time
                self._next_run_at = datetime.now(timezone.utc) + timedelta(seconds=interval_seconds)
                self.log(f"Next redemption scheduled in {self.interval_minutes} minute(s)")
                
                await asyncio.sleep(interval_seconds)
                
                if not self._stop.is_set():
                    self._last_run_at = datetime.now(timezone.utc)
                    await self._run_redemption()
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.log(f"Error in redemption loop: {e}", "ERROR")
                # Wait a minute before retrying
                await asyncio.sleep(60)
    
    async def start(self):
        """Start the redemption service."""
        if self.interval_minutes is None:
            # One-time execution
            await self._run_redemption()
        else:
            # Continuous loop
            self._stop.clear()
            self._task = asyncio.create_task(self._run_loop())
            self.log(f"Redemption CLI started (interval: {self.interval_minutes} minute(s))")
            try:
                await self._task
            except asyncio.CancelledError:
                pass
    
    async def stop(self):
        """Stop the redemption service."""
        self._stop.set()
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self.log("Redemption CLI stopped")


def validate_environment():
    """Validate that required environment variables are set."""
    required_vars = [
        "PRIVATE_KEY",
        "FUNDER_ADDRESS",
        "POLY_BUILDER_API_KEY",
        "POLY_BUILDER_SECRET",
        "POLY_BUILDER_PASSPHRASE"
    ]
    
    missing = []
    for var in required_vars:
        if not os.environ.get(var):
            missing.append(var)
    
    if missing:
        print("ERROR: Missing required environment variables:")
        for var in missing:
            print(f"  - {var}")
        print("\nPlease set these in your .env file or environment.")
        print("See .env.example for reference.")
        sys.exit(1)


def main():
    """Main entry point."""
    # Load .env file before parsing arguments
    load_env_file()
    
    parser = argparse.ArgumentParser(
        description="Polymarket Gasless Redeem CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # One-time redemption
  python redeem_cli.py --once

  # One-time check (no redemption)
  python redeem_cli.py --check

  # Automatic redemption every 15 minutes
  python redeem_cli.py --interval 15

  # Automatic redemption every hour
  python redeem_cli.py --interval 60

Environment Variables:
  PRIVATE_KEY              - Your wallet private key
  FUNDER_ADDRESS           - Your Polymarket proxy wallet address
  POLY_BUILDER_API_KEY     - Polymarket Builder API key
  POLY_BUILDER_SECRET      - Polymarket Builder API secret
  POLY_BUILDER_PASSPHRASE  - Polymarket Builder API passphrase

For more information, see README.md
        """
    )
    
    parser.add_argument(
        "--interval",
        type=int,
        metavar="MINUTES",
        help="Run redemption automatically every N minutes (e.g., --interval 15)"
    )
    
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run redemption once and exit (default if --interval not specified)"
    )
    
    parser.add_argument(
        "--check",
        action="store_true",
        help="Only check for redeemable positions, don't actually redeem"
    )
    
    args = parser.parse_args()
    
    # Determine mode
    if args.interval is not None:
        if args.interval < 1:
            print("ERROR: Interval must be at least 1 minute")
            sys.exit(1)
        interval_minutes = args.interval
    else:
        interval_minutes = None
    
    # Validate environment
    validate_environment()
    
    # Check if Node.js is available
    try:
        result = subprocess.run(
            ["node", "--version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode != 0:
            raise FileNotFoundError
    except (FileNotFoundError, subprocess.TimeoutExpired):
        print("ERROR: Node.js is not installed or not in PATH")
        print("Please install Node.js from https://nodejs.org/")
        sys.exit(1)
    
    # Check if redeem.js exists
    if not REDEMPTION_SCRIPT_PATH.exists():
        print(f"ERROR: Redemption script not found at {REDEMPTION_SCRIPT_PATH}")
        print("Please ensure redeem.js is in the same directory as redeem_cli.py")
        sys.exit(1)
    
    # Create and run CLI
    cli = RedemptionCLI(
        interval_minutes=interval_minutes,
        check_only=args.check
    )
    
    try:
        if interval_minutes is None:
            print("Running one-time redemption...")
        else:
            print(f"Starting automatic redemption CLI (interval: {interval_minutes} minute(s))")
            print("Press Ctrl+C to stop")
        
        asyncio.run(cli.start())
    except KeyboardInterrupt:
        print("\nStopping redemption CLI...")
        asyncio.run(cli.stop())
        print("CLI stopped.")


if __name__ == "__main__":
    main()

