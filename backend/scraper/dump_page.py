import asyncio
from playwright.async_api import async_playwright

async def dump_html():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto("https://kararlarbilgibankasi.anayasa.gov.tr", timeout=60000)
        await page.wait_for_load_state("networkidle")
        
        content = await page.content()
        with open("backend/diagnostics/page_dump.html", "w", encoding="utf-8") as f:
            f.write(content)
            
        print("HTML dumped to backend/diagnostics/page_dump.html")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(dump_html())
