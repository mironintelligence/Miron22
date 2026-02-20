import sys
import os
import asyncio
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.normalization import normalization_service
from services.risk_engine import risk_engine
from services.crawler import crawler_service

def test_normalization():
    text = "   Hello    World\n\n\nTest   "
    clean = normalization_service.clean_text(text)
    assert clean == "Hello World\nTest"
    
    chunks = normalization_service.chunk_text("A" * 1500, chunk_size=1000, overlap=100)
    assert len(chunks) == 2
    assert len(chunks[0]) == 1000
    assert len(chunks[1]) == 600 # 1500 - (1000 - 100) = 600

def test_risk_engine():
    text = "Davada delil yok ve zamanaşımı söz konusu."
    risk = risk_engine.analyze_risk(text)
    assert risk["risk_score"] > 50
    assert "Deliller yetersiz/eksik belirtilmiş." in risk["key_issues"]
    assert "Zamanaşımı riski." in risk["key_issues"]

def test_crawler_mock():
    # Mocking fetch_url since we don't want to hit real URLs
    async def mock_fetch(url):
        return "<html><title>Test</title><body>Some content</body></html>"
    
    original_fetch = crawler_service.fetch_url
    crawler_service.fetch_url = mock_fetch
    
    results = asyncio.run(crawler_service.crawl_urls(["http://example.com"]))
    assert len(results) == 1
    assert results[0]["title"] == "Test"
    
    crawler_service.fetch_url = original_fetch

if __name__ == "__main__":
    # Manual run
    async def main():
        print("Testing Normalization...")
        test_normalization()
        print("Testing Risk Engine...")
        test_risk_engine()
        print("Testing Crawler...")
        test_crawler_mock()
        print("All foundation tests passed!")
    
    asyncio.run(main())
