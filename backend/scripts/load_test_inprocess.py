import statistics
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
import os
import sys

from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

try:
    from backend.main import app
except Exception:
    from main import app


def worker(n: int) -> float:
    c = TestClient(app, base_url="https://testserver")
    t0 = time.perf_counter()
    ok = 0
    limited = 0
    other = 0
    for _ in range(n):
        r = c.get("/api/health")
        if r.status_code == 200:
            ok += 1
        elif r.status_code == 429:
            limited += 1
        else:
            other += 1
    return {"elapsed_s": time.perf_counter() - t0, "ok": ok, "limited": limited, "other": other}


def main():
    threads = 8
    per_thread = 200
    times = []
    ok_total = 0
    limited_total = 0
    other_total = 0
    t0 = time.perf_counter()
    with ThreadPoolExecutor(max_workers=threads) as ex:
        futs = [ex.submit(worker, per_thread) for _ in range(threads)]
        for f in as_completed(futs):
            r = f.result()
            times.append(r["elapsed_s"])
            ok_total += int(r["ok"])
            limited_total += int(r["limited"])
            other_total += int(r["other"])
    total = time.perf_counter() - t0
    req = threads * per_thread
    rps = req / total if total > 0 else 0
    print(
        {
            "threads": threads,
            "requests": req,
            "total_s": round(total, 4),
            "rps": round(rps, 2),
            "ok": ok_total,
            "limited": limited_total,
            "other": other_total,
            "thread_s_min": round(min(times), 4),
            "thread_s_p50": round(statistics.median(times), 4),
            "thread_s_max": round(max(times), 4),
        }
    )


if __name__ == "__main__":
    main()
