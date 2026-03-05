import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto("https://kararlarbilgibankasi.anayasa.gov.tr", timeout=60000)
        
        # Get Form Info
        form_info = await page.evaluate('''() => {
            const f = document.querySelector("form");
            if (!f) return null;
            return {
                action: f.action,
                method: f.method,
                id: f.id
            };
        }''')
        
        print(f"Form Info: {form_info}")
        
        # Get Submit Button Info
        btn_info = await page.evaluate('''() => {
            // Find button with type submit or containing text "Ara"
            const btn = Array.from(document.querySelectorAll("button, a, input[type='submit']"))
                .find(b => b.innerText.includes("Ara") || b.value == "Ara");
            
            if (!btn) return null;
            return {
                tagName: btn.tagName,
                type: btn.type,
                onclick: btn.getAttribute("onclick"),
                outerHTML: btn.outerHTML
            };
        }''')
        
        print(f"Button Info: {btn_info}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
