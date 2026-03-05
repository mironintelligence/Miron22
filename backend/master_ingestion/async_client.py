import asyncio
import random
import logging
import aiohttp
from typing import Optional, Dict, Any, List
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("async_client")

class AsyncClient:
    def __init__(self, rate_limit: float = 1.0):
        self.rate_limit = rate_limit
        self.last_request_time = 0
        self.session: Optional[aiohttp.ClientSession] = None
        self.lock = asyncio.Lock()
        
    async def init(self):
        if not self.session:
            self.session = aiohttp.ClientSession(
                connector=aiohttp.TCPConnector(ssl=False, limit=50),
                timeout=aiohttp.ClientTimeout(total=60)
            )

    async def close(self):
        if self.session:
            await self.session.close()
            self.session = None

    async def _wait_for_rate_limit(self):
        async with self.lock:
            now = asyncio.get_event_loop().time()
            elapsed = now - self.last_request_time
            if elapsed < self.rate_limit:
                wait_time = self.rate_limit - elapsed + random.uniform(0.1, 0.5)
                await asyncio.sleep(wait_time)
            self.last_request_time = asyncio.get_event_loop().time()

    def _get_headers(self) -> Dict[str, str]:
        # Rotation
        uas = [
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ]
        return {
            "User-Agent": random.choice(uas),
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
            "Connection": "keep-alive"
        }

    @retry(
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=2, min=4, max=60),
        retry=retry_if_exception_type((aiohttp.ClientError, asyncio.TimeoutError))
    )
    async def fetch(self, url: str, method: str = "GET", **kwargs) -> Dict[str, Any]:
        if not self.session: await self.init()
        await self._wait_for_rate_limit()
        
        headers = self._get_headers()
        if "headers" in kwargs:
            headers.update(kwargs.pop("headers"))
            
        try:
            async with self.session.request(method, url, headers=headers, **kwargs) as response:
                if response.status in [403, 429]:
                    logger.warning(f"Status {response.status} on {url}. Backing off.")
                    raise aiohttp.ClientResponseError(
                        response.request_info, response.history, status=response.status
                    )
                
                try:
                    data = await response.json()
                    return {"type": "json", "data": data, "status": response.status}
                except:
                    text = await response.text()
                    return {"type": "html", "data": text, "status": response.status}
                    
        except Exception as e:
            logger.error(f"Fetch failed {url}: {e}")
            raise e

client = AsyncClient()
