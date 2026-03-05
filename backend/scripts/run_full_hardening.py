import asyncio
import os
import sys
import subprocess
import time

# Adjust path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

def run_backfill():
    print("🚀 Starting robust backfill...")
    while True:
        # Check if done
        # We can run a quick check query or just run the script and let it exit if no rows
        proc = subprocess.run(["python3", "backend/scripts/backfill_fingerprints.py"], capture_output=True, text=True)
        print(proc.stdout)
        if "Processing batch" not in proc.stdout:
            if "Backfill Complete" in proc.stdout or not proc.stdout.strip():
                print("Backfill seems complete.")
                break
            else:
                print(f"Backfill error: {proc.stderr}. Retrying...")
                time.sleep(5)
        else:
            # Script ran for a bit then maybe crashed or finished a batch
            # Loop again
            pass

def run_cleanup():
    print("🚀 Starting cleanup...")
    subprocess.run(["python3", "backend/scripts/dedup_cleanup.py"])

if __name__ == "__main__":
    run_backfill()
    run_cleanup()
    print("✅ Hardening Complete.")
