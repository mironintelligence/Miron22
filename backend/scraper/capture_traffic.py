import asyncio
import json
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        print("--- CAPTURING TRAFFIC ---")
        requests_log = []

        async def handle_request(request):
            # Log all XHR/Fetch/Doc
            if request.resource_type in ["document", "xhr", "fetch"]:
                requests_log.append({
                    "url": request.url,
                    "method": request.method,
                    "headers": request.headers,
                    "post_data": request.post_data
                })

        page.on("request", handle_request)

        # 1. Load Home
        await page.goto("https://kararlarbilgibankasi.anayasa.gov.tr", timeout=60000)
        await page.wait_for_load_state("networkidle")
        
        # 2. Click Page 2
        # <a href="...?page=2">
        print("Clicking Page 2...")
        try:
            await page.click("a[href*='page=2']")
            await page.wait_for_load_state("networkidle")
        except Exception as e:
            print(f"Pagination failed: {e}")

        # Save
        with open("backend/diagnostics/traffic.json", "w") as f:
            json.dump(requests_log, f, indent=2)
            
        print("Traffic saved to backend/diagnostics/traffic.json")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
