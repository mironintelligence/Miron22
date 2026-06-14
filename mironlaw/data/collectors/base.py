from __future__ import annotations

import asyncio
import json
import random
import time
from pathlib import Path
from typing import AsyncIterator, Dict, Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

_USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
]


def random_ua() -> str:
    return random.choice(_USER_AGENTS)


async def jitter(min_s: float = 1.0, max_s: float = 3.5) -> None:
    await asyncio.sleep(random.uniform(min_s, max_s))


class BaseCollector:
    """Tüm scraper'ların base class'ı. JSONL'e incremental yazar."""

    source_name: str = "base"

    def __init__(self, output_dir: str | Path = "raw_data"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.out_path = self.output_dir / f"{self.source_name}.jsonl"

    def _already_collected(self) -> set[str]:
        seen: set[str] = set()
        if not self.out_path.exists():
            return seen
        with self.out_path.open("r", encoding="utf-8") as f:
            for line in f:
                try:
                    rec = json.loads(line)
                    if rec.get("id"):
                        seen.add(str(rec["id"]))
                except Exception:
                    pass
        return seen

    def _append(self, record: Dict[str, Any]) -> None:
        with self.out_path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

    async def collect(self) -> AsyncIterator[Dict[str, Any]]:
        raise NotImplementedError

    @staticmethod
    def _make_client(timeout: float = 30.0) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            headers={
                "User-Agent": random_ua(),
                "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
            timeout=timeout,
            follow_redirects=True,
            verify=False,
        )
