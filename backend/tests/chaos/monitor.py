import psutil
import time
import os
import csv
from datetime import datetime

def monitor_resources(duration=60, interval=1, output_file="resource_log.csv"):
    pid = os.getpid()
    process = psutil.Process(pid)
    
    print(f"Monitoring Process {pid} for {duration} seconds...")
    
    with open(output_file, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["timestamp", "cpu_percent", "memory_rss_mb", "threads", "connections"])
        
        start = time.time()
        while time.time() - start < duration:
            cpu = process.cpu_percent(interval=None)
            mem = process.memory_info().rss / 1024 / 1024
            threads = process.num_threads()
            conns = len(process.connections())
            
            writer.writerow([datetime.now().isoformat(), cpu, mem, threads, conns])
            time.sleep(interval)
            
    print(f"Monitoring complete. Log saved to {output_file}")

if __name__ == "__main__":
    # Run for 10 seconds as a demo
    monitor_resources(duration=10)
