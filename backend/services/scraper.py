from __future__ import annotations

import asyncio
import random
import urllib.parse
from typing import Any, Dict, List

# from playwright.async_api import async_playwright


_USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0",
]


async def _sleep(min_s: float = 2.0, max_s: float = 5.0) -> None:
    await asyncio.sleep(random.uniform(min_s, max_s))


async def search_yargitay_karar(keyword: str) -> List[Dict[str, Any]]:
    # STUBBED OUT TO REMOVE HEAVY PLAYWRIGHT DEPENDENCY ON RENDER
    # TODO: Re-enable if dedicated scraper service is available
    return []

    # q = (keyword or "").strip()
    # if not q:
    #     return []

    # ua = random.choice(_USER_AGENTS)
    # query = urllib.parse.quote_plus(f"{q} yargıtay karar")
    # url = f"https://scholar.google.com/scholar?q={query}"

    # async with async_playwright() as p:
    #     browser = await p.chromium.launch(headless=True)
    #     context = await browser.new_context(
    #         user_agent=ua,
    #         locale="tr-TR",
    #         viewport={"width": 1280, "height": 720},
    #     )
    #     page = await context.new_page()

    #     await _sleep()
    #     await page.goto(url, wait_until="domcontentloaded", timeout=45_000)
    #     await _sleep()

    #     await page.wait_for_selector("div#gs_res_ccl_mid", timeout=20_000)
    #     await _sleep()

    #     cards = await page.query_selector_all("div.gs_r.gs_or.gs_scl")
    #     out: List[Dict[str, Any]] = []

    #     for card in cards[:5]:
    #         title_el = await card.query_selector("h3.gs_rt")
    #         snippet_el = await card.query_selector("div.gs_rs")

    #         title = (await title_el.inner_text()) if title_el else ""
    #         snippet = (await snippet_el.inner_text()) if snippet_el else ""

    #         title = " ".join((title or "").split())
    #         snippet = " ".join((snippet or "").split())

    #         if title or snippet:
    #             out.append({"title": title, "summary": snippet})

    #         await _sleep()

    #     await context.close()
    #     await browser.close()

    # return out
