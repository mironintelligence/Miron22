import asyncio
import json
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        print("--- PHASE 1: REVERSE ENGINEERING (ATTEMPT 3) ---")
        await page.goto("https://kararlarbilgibankasi.anayasa.gov.tr", timeout=60000)
        await page.wait_for_load_state("networkidle")
        
        print("Filling Date Inputs...")
        # Use the IDs found in V2
        await page.fill("#KararTarihiIlk", "01.01.2024")
        await page.fill("#KararTarihiSon", "31.12.2024")
        
        # Find Submit Button
        # It's likely a button inside the form.
        # Let's try to click the button that submits the form
        
        # We can try to press "Enter" in one of the fields
        await page.press("#KararTarihiSon", "Enter")
        
        print("Submitted via Enter. Waiting for response...")
        
        # Capture the next request
        async with page.expect_response(lambda response: response.url == page.url or "Index" in response.url or "Ara" in response.url) as response_info:
            # We already pressed enter, just waiting
            pass
            
        final_response = await response_info.value
        print(f"Triggered Request: {final_response.url} ({final_response.status})")
        
        await page.wait_for_load_state("networkidle")
        
        # Check results
        count_text = await page.inner_text(".bulunankararsayisi")
        print(f"Result Count: {count_text}")
        
        # Log the request details if it was a POST
        # We need to hook into the 'request' event to see the post data of the triggered navigation
        # But since we are past that, let's just assume if the count changed, it worked.
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
