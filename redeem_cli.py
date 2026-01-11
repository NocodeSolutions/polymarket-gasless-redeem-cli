"""
Polymarket Gasless Redeem CLI
A standalone command-line tool for automatically redeeming Polymarket positions.
"""

import argparse
import asyncio
import os
import subprocess
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Get script directory
SCRIPT_DIR = Path(__file__).parent.absolute()
REDEMPTION_SCRIPT_PATH = SCRIPT_DIR / "src" / "redeem.ts"


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
    
    def __init__(self, interval_minutes: int = None, check_only: bool = False, password: str = None):
        """
        Initialize the redemption CLI.
        
        Args:
            interval_minutes: Interval in minutes for automatic redemption (None = one-time)
            check_only: If True, only check for redeemable positions without redeeming
            password: Encryption password for automated mode
        """
        self.interval_minutes = interval_minutes
        self.check_only = check_only
        self.password = password
        self._stop = asyncio.Event()
        self._task = None
        self._next_run_at = None
        self._last_run_at = None
    
    def _run_subprocess_sync(self, args: list) -> dict:
        """Run subprocess synchronously (called in a thread)."""
        try:
            # Build environment, adding password if available
            env = {**os.environ}
            if self.password:
                env['REDEEM_PASSWORD'] = self.password
            
            # On Windows, npx is a .cmd script and requires shell=True
            use_shell = sys.platform == "win32"
            
            result = subprocess.run(
                args,
                cwd=SCRIPT_DIR,
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='replace',
                env=env,
                timeout=115,
                shell=use_shell
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
    
    async def _run_redemption(self) -> dict:
        """Execute the Node.js redemption script."""
        if not REDEMPTION_SCRIPT_PATH.exists():
            print(f"[ERROR] Redemption script not found at {REDEMPTION_SCRIPT_PATH}")
            return {"success": False, "error": "Script not found"}
        
        args = ["npx", "tsx", "src/redeem.ts"]
        if self.check_only:
            args.append("--check")
        
        try:
            result_data = await asyncio.wait_for(
                asyncio.to_thread(self._run_subprocess_sync, args),
                timeout=120
            )
            
            output = result_data["output"]
            returncode = result_data["returncode"]
            
            # Print the Node.js script output directly (same format)
            if output.strip():
                print(output.strip())
            
            return {
                "success": returncode == 0,
                "exit_code": returncode
            }
            
        except asyncio.TimeoutError:
            print("[ERROR] Redemption script timed out")
            return {"success": False, "error": "Timeout"}
        except Exception as e:
            print(f"[ERROR] Failed to run redemption script: {e}")
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
                print(f"\nNext run scheduled in {self.interval_minutes} minute(s)...")
                print("-" * 55)
                
                await asyncio.sleep(interval_seconds)
                
                if not self._stop.is_set():
                    self._last_run_at = datetime.now(timezone.utc)
                    await self._run_redemption()
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[ERROR] Error in redemption loop: {e}")
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
        print("\nRedemption CLI stopped.")


def check_key_setup():
    """Check if encrypted keys have been set up."""
    key_file = SCRIPT_DIR / ".encrypted_keys"
    if not key_file.exists():
        print("[ERROR] Encrypted keys not configured.")
        print("\nPlease run key setup first:")
        print("  npx tsx src/redeem.ts --setup")
        print("\nThis will securely store your wallet credentials.")
        sys.exit(1)


def prompt_password() -> str:
    """Prompt user for encryption password."""
    import getpass
    try:
        password = getpass.getpass("Enter encryption password: ")
        return password
    except (KeyboardInterrupt, EOFError):
        print("\nCancelled.")
        sys.exit(0)


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

Setup:
  Before first use, run: npx tsx src/redeem.ts --setup
  This securely stores your wallet credentials with encryption.

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
            print("[ERROR] Interval must be at least 1 minute")
            sys.exit(1)
        interval_minutes = args.interval
    else:
        interval_minutes = None
    
    # Check key setup
    check_key_setup()
    
    # Check if Node.js is available
    try:
        result = subprocess.run(
            ["node", "--version"],
            capture_output=True,
            text=True,
            timeout=5,
            shell=(sys.platform == "win32")
        )
        if result.returncode != 0:
            raise FileNotFoundError
    except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
        print("[ERROR] Node.js is not installed or not in PATH")
        print("Please install Node.js from https://nodejs.org/")
        sys.exit(1)
    
    # Check if redeem.ts exists
    if not REDEMPTION_SCRIPT_PATH.exists():
        print(f"[ERROR] Redemption script not found at {REDEMPTION_SCRIPT_PATH}")
        sys.exit(1)
    
    # Prompt for password (required for automated operation)
    # Check environment first, then prompt
    password = os.environ.get('REDEEM_PASSWORD')
    if not password:
        password = prompt_password()
    
    # Create and run CLI
    cli = RedemptionCLI(
        interval_minutes=interval_minutes,
        check_only=args.check,
        password=password
    )
    
    try:
        asyncio.run(cli.start())
    except KeyboardInterrupt:
        print("\nStopping...")
        asyncio.run(cli.stop())


if __name__ == "__main__":
    main()
