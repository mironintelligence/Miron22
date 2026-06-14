"""
Mevzuat.gov.tr Scraper — Türk Hukuku Mevzuat Metinleri
https://www.mevzuat.gov.tr

Hedef: ~50k kanun/yönetmelik/tebliğ/KHK metni
Strateji: Mevzuat listesi → her mevzuatın tam metni
"""
from __future__ import annotations

import asyncio
import json
import re
from pathlib import Path
from typing import AsyncIterator, Dict, Any, List, Optional

import httpx
from bs4 import BeautifulSoup

from .base import BaseCollector, jitter

BASE_URL = "https://www.mevzuat.gov.tr"
API_BASE = f"{BASE_URL}/api"

# Mevzuat türleri
MEVZUAT_TURLERI = {
    "1": "Kanun",
    "2": "Kanun Hükmünde Kararname",
    "3": "Cumhurbaşkanlığı Kararnamesi",
    "4": "Tüzük",
    "5": "Yönetmelik",
    "6": "Tebliğ",
    "7": "Özelge",
    "8": "Genelge",
}

PAGE_SIZE = 50
MAX_RETRIES = 4


class MevzuatCollector(BaseCollector):
    source_name = "mevzuat"

    def __init__(
        self,
        output_dir: str | Path = "raw_data",
        tur_ids: Optional[List[str]] = None,
    ):
        super().__init__(output_dir)
        self.tur_ids = tur_ids or list(MEVZUAT_TURLERI.keys())

    async def _list_mevzuat(
        self,
        client: httpx.AsyncClient,
        tur_id: str,
        sayfa: int,
    ) -> Optional[Dict]:
        params = {
            "mevzuatTur": tur_id,
            "pageNumber": sayfa,
            "pageSize": PAGE_SIZE,
        }
        for attempt in range(MAX_RETRIES):
            try:
                resp = await client.get(
                    f"{API_BASE}/MevzuatList",
                    params=params,
                    headers={"Accept": "application/json"},
                )
                if resp.status_code == 200:
                    return resp.json()
                # HTML fallback
                resp2 = await client.get(
                    f"{BASE_URL}/mevzuat?tur={tur_id}&sayfa={sayfa}",
                )
                if resp2.status_code == 200:
                    return {"html": resp2.text}
                await asyncio.sleep(2 ** attempt)
            except Exception as e:
                if attempt == MAX_RETRIES - 1:
                    print(f"[WARN] Mevzuat list hata tur={tur_id}: {e}")
                await asyncio.sleep(2 ** attempt)
        return None

    async def _fetch_metin(self, client: httpx.AsyncClient, mevzuat_id: str) -> Optional[str]:
        urls = [
            f"{API_BASE}/MevzuatDetay/{mevzuat_id}",
            f"{BASE_URL}/mevzuat/{mevzuat_id}",
        ]
        for url in urls:
            for attempt in range(MAX_RETRIES):
                try:
                    resp = await client.get(url)
                    if resp.status_code == 200:
                        try:
                            data = resp.json()
                            metin = (
                                data.get("mevzuatMetni")
                                or data.get("metin")
                                or data.get("icerik")
                                or ""
                            )
                            if metin and len(metin) > 100:
                                return metin
                        except Exception:
                            pass
                        soup = BeautifulSoup(resp.text, "lxml")
                        for sel in ["#mevzuatMetni", ".mevzuat-metin", "article", ".law-text", "main"]:
                            el = soup.select_one(sel)
                            if el and len(el.get_text(strip=True)) > 100:
                                return el.get_text(separator="\n", strip=True)
                    await asyncio.sleep(2 ** attempt)
                except Exception as e:
                    if attempt == MAX_RETRIES - 1:
                        print(f"[WARN] Mevzuat metin hata id={mevzuat_id}: {e}")
                    await asyncio.sleep(2 ** attempt)
        return None

    def _parse_list_html(self, html: str) -> List[Dict]:
        soup = BeautifulSoup(html, "lxml")
        items = []
        for a in soup.select("a[href*='mevzuat'], a[href*='kanun'], a[href*='yonetmelik']"):
            href = a.get("href", "")
            m = re.search(r"/(\d+)/?$", href)
            if m:
                items.append({
                    "id": m.group(1),
                    "baslik": a.get_text(strip=True),
                })
        return items

    async def collect(self) -> AsyncIterator[Dict[str, Any]]:
        seen = self._already_collected()
        print(f"[Mevzuat] Zaten toplanan: {len(seen):,}")

        async with self._make_client(timeout=40.0) as client:
            for tur_id in self.tur_ids:
                tur_ad = MEVZUAT_TURLERI.get(tur_id, tur_id)
                sayfa = 1

                while True:
                    data = await self._list_mevzuat(client, tur_id, sayfa)
                    if not data:
                        break

                    if "html" in data:
                        items = self._parse_list_html(data["html"])
                    else:
                        items = data.get("data") or data.get("items") or data.get("mevzuatlar") or []

                    if not items:
                        break

                    for item in items:
                        mid = str(item.get("id") or item.get("mevzuatId") or "")
                        if not mid or mid in seen:
                            continue

                        baslik = item.get("baslik") or item.get("adi") or item.get("mevzuatAdi") or ""
                        resmi_gazete = item.get("resmiGazete") or item.get("yayinTarihi") or ""

                        await jitter(0.5, 1.5)
                        metin = await self._fetch_metin(client, mid)
                        if not metin or len(metin) < 100:
                            continue

                        record: Dict[str, Any] = {
                            "id": f"mevzuat_{mid}",
                            "source": "mevzuat",
                            "tur": tur_ad,
                            "baslik": baslik,
                            "resmi_gazete": resmi_gazete,
                            "text": metin,
                        }

                        seen.add(mid)
                        self._append(record)
                        yield record

                    if len(items) < PAGE_SIZE:
                        break
                    sayfa += 1
                    await jitter(1.0, 2.5)

                print(f"  [Mevzuat] {tur_ad}: tamamlandı")


async def run(output_dir: str = "raw_data"):
    collector = MevzuatCollector(output_dir=output_dir)
    count = 0
    async for _ in collector.collect():
        count += 1
        if count % 200 == 0:
            print(f"[Mevzuat] Toplanan: {count:,}")
    print(f"[Mevzuat] TOPLAM: {count:,}")


if __name__ == "__main__":
    asyncio.run(run())
