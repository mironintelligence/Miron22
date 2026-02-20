import asyncio
import httpx
from lxml import html
from typing import List, Dict, Optional

class DistributedCrawler:
    def __init__(self, max_concurrency: int = 5):
        self.semaphore = asyncio.Semaphore(max_concurrency)
        self.client = httpx.AsyncClient(timeout=10.0)

    async def fetch_url(self, url: str) -> Optional[str]:
        """
        URL'yi asenkron olarak çeker.
        """
        async with self.semaphore:
            try:
                response = await self.client.get(url)
                if response.status_code == 200:
                    return response.text
                return None
            except Exception as e:
                print(f"Fetch error {url}: {e}")
                return None

    def parse_content(self, html_content: str) -> Dict[str, str]:
        """
        HTML'den başlık ve metin çıkarır.
        """
        if not html_content:
            return {}
        
        try:
            tree = html.fromstring(html_content)
            title = tree.findtext('.//title') or "No Title"
            # Get text from body, ignoring scripts/styles
            for script in tree.xpath('//script'):
                script.drop_tree()
            for style in tree.xpath('//style'):
                style.drop_tree()
            
            text = tree.text_content()
            # Basic cleanup
            text = " ".join(text.split())
            
            return {
                "title": title,
                "content": text[:5000] # Limit content for now
            }
        except Exception as e:
            print(f"Parse error: {e}")
            return {}

    async def crawl_urls(self, urls: List[str]) -> List[Dict[str, str]]:
        """
        Distributed crawl simulation: Fetch multiple URLs concurrently.
        """
        tasks = [self.fetch_url(url) for url in urls]
        results = await asyncio.gather(*tasks)
        
        parsed_data = []
        for html_content in results:
            if html_content:
                data = self.parse_content(html_content)
                if data:
                    parsed_data.append(data)
        
        return parsed_data

crawler_service = DistributedCrawler()
