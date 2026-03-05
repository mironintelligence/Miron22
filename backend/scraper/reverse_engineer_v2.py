import asyncio
import json
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        print("--- PHASE 1: REVERSE ENGINEERING (ATTEMPT 2) ---")
        
        # Try GET with params
        target_url = "https://kararlarbilgibankasi.anayasa.gov.tr?BaslangicTarihi=01.01.2024&BitisTarihi=31.12.2024"
        print(f"Navigating to {target_url}...")
        
        await page.goto(target_url, timeout=60000)
        await page.wait_for_load_state("networkidle")
        
        # Check inputs
        inputs = await page.evaluate('''() => {
            return Array.from(document.querySelectorAll("input")).map(i => ({name: i.name, id: i.id, value: i.value, type: i.type}));
        }''')
        
        print(f"Found {len(inputs)} inputs:")
        for i in inputs:
            print(f" - {i['name']} (id={i['id']}, type={i['type']}): '{i['value']}'")
            
        # Check if results changed
        # We can check the "Karar Bulundu" text
        count_text = await page.inner_text(".bulunankararsayisi")
        print(f"Result Count: {count_text}")

        # If inputs are empty, try to find the filter toggle
        if not any(i['value'] == "01.01.2024" for i in inputs):
            print("Inputs empty. Attempting to find form interactions...")
            
            # Look for filter button
            # Based on dump: onclick="filtreAc()"
            # It might be an icon or button
            # <a ... onclick="filtreAc()"> or similar?
            # Actually, let's look for "Detaylı Arama" or similar text
            
            # We will dump the page text content to see what's visible
            text = await page.inner_text("body")
            # print(text[:1000])

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
