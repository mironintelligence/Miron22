import asyncio
import json
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        # Launch browser
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080}
        )
        page = await context.new_page()

        print("--- PHASE 1: REVERSE ENGINEERING ---")
        print("Navigating to https://kararlarbilgibankasi.anayasa.gov.tr...")

        # Capture logs
        requests_log = []

        async def handle_response(response):
            try:
                # We are interested in XHR/Fetch requests that return JSON or HTML fragments
                if response.request.resource_type in ["xhr", "fetch"]:
                    content_type = response.headers.get("content-type", "")
                    status = response.status
                    url = response.url
                    
                    body = ""
                    try:
                        if "application/json" in content_type:
                            body = await response.json()
                        elif "text/html" in content_type:
                            text = await response.text()
                            body = text[:500] # First 500 chars
                    except:
                        body = "[Unreadable]"

                    log_entry = {
                        "url": url,
                        "method": response.request.method,
                        "status": status,
                        "content_type": content_type,
                        "headers": response.request.headers,
                        "post_data": response.request.post_data,
                        "response_preview": body
                    }
                    requests_log.append(log_entry)
                    print(f"Captured: {response.request.method} {url} ({status})")

            except Exception as e:
                print(f"Error capturing response: {e}")

        page.on("response", handle_response)

        # Go to page
        await page.goto("https://kararlarbilgibankasi.anayasa.gov.tr", timeout=60000)
        
        # Wait for load
        await page.wait_for_load_state("networkidle")
        print("Page loaded.")

        # Perform Search
        print("Performing Search (01.01.2024 - 31.12.2024)...")
        
        # Fill Date Inputs
        # Selectors might need adjustment based on real page structure, 
        # but usually name="BaslangicTarihi"
        await page.fill("input[name='BaslangicTarihi']", "01.01.2024")
        await page.fill("input[name='BitisTarihi']", "31.12.2024")
        
        # Click Search Button
        # Usually a button with text "Ara" or class "btn-primary" inside form
        # We try generic selector first
        search_button = page.locator("button:has-text('Ara')").first
        if await search_button.count() > 0:
            await search_button.click()
        else:
            # Fallback
            await page.click(".btn-primary")
            
        # Wait for results
        try:
            # Wait for some response to come back
            await page.wait_for_timeout(5000) 
        except:
            pass

        # Save Logs
        with open("backend/diagnostics/network_capture.json", "w", encoding="utf-8") as f:
            json.dump(requests_log, f, indent=2, default=str)
            
        print("Network capture saved to backend/diagnostics/network_capture.json")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
