"""
Danıştay Kararları Scraper
https://www.danistay.gov.tr

Hedef: ~200k karar
Strateji: Arama API'si üzerinden tarih aralığı + daire bazlı toplama
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

BASE_URL = "https://www.danistay.gov.tr"
KARAR_SEARCH_URL = f"{BASE_URL}/Karar/Ara"
KARAR_DETAIL_URL = f"{BASE_URL}/Karar/Detay"

# Danıştay daireleri
DAIRELER = [
    "1. Daire", "2. Daire", "3. Daire", "4. Daire", "5. Daire",
    "6. Daire", "7. Daire", "8. Daire", "9. Daire", "10. Daire",
    "11. Daire", "12. Daire", "13. Daire", "14. Daire", "15. Daire",
    "16. Daire", "17. Daire",
    "İdari İşler Kurulu", "İdari Dava Daireleri Kurulu",
    "Vergi Dava Daireleri Kurulu",
]

PAGE_SIZE = 20
MAX_RETRIES = 4


class DanistayCollector(BaseCollector):
    source_name = "danistay"

    def __init__(
        self,
        output_dir: str | Path = "raw_data",
        start_year: int = 2000,
        end_year: int = 2024,
    ):
        super().__init__(output_dir)
        self.start_year = start_year
        self.end_year = end_year

    async def _search(
        self,
        client: httpx.AsyncClient,
        baslangic: str,
        bitis: str,
        sayfa: int,
        daire: str = "",
    ) -> Optional[Dict]:
        payload = {
            "BaslangicTarihi": baslangic,
            "BitisTarihi": bitis,
            "Daire": daire,
            "Sayfa": sayfa,
            "SayfaBasinaKayit": PAGE_SIZE,
        }
        for attempt in range(MAX_RETRIES):
            try:
                resp = await client.post(
                    KARAR_SEARCH_URL,
                    data=payload,
                    headers={
                        "Referer": BASE_URL,
                        "Content-Type": "application/x-www-form-urlencoded",
                        "X-Requested-With": "XMLHttpRequest",
                    },
                )
                if resp.status_code == 200:
                    try:
                        return resp.json()
                    except Exception:
                        # HTML yanıtı parse et
                        return {"html": resp.text}
                await asyncio.sleep(2 ** attempt)
            except Exception as e:
                if attempt == MAX_RETRIES - 1:
                    print(f"[WARN] Danıştay search hata: {e}")
                await asyncio.sleep(2 ** attempt)
        return None

    def _parse_html_results(self, html: str) -> List[Dict]:
        """HTML arama sonucu sayfasından karar listesini çıkarır."""
        soup = BeautifulSoup(html, "lxml")
        kararlar = []

        # Karar kartları veya tablo satırları
        for row in soup.select("tr[data-id], .karar-row, .karar-item, li.karar"):
            karar_id = row.get("data-id") or row.get("id", "")
            # Link'ten ID çıkar
            link = row.select_one("a[href*='Detay'], a[href*='karar']")
            if link:
                href = link.get("href", "")
                m = re.search(r"[?&/](\d+)$", href)
                if m:
                    karar_id = m.group(1)

            esas = ""
            karar = ""
            tarih = ""
            for cell in row.select("td, span, p"):
                text = cell.get_text(strip=True)
                if re.match(r"\d{4}/\d+", text):
                    if not esas:
                        esas = text
                    else:
                        karar = text
                elif re.match(r"\d{2}\.\d{2}\.\d{4}", text):
                    tarih = text

            if karar_id:
                kararlar.append({
                    "id": karar_id,
                    "esas_no": esas,
                    "karar_no": karar,
                    "tarih": tarih,
                })

        return kararlar

    async def _fetch_detail(self, client: httpx.AsyncClient, karar_id: str) -> Optional[str]:
        for attempt in range(MAX_RETRIES):
            try:
                resp = await client.get(f"{KARAR_DETAIL_URL}/{karar_id}")
                if resp.status_code == 200:
                    soup = BeautifulSoup(resp.text, "lxml")
                    for sel in [".karar-metni", "#kararIcerik", ".decision-text", "article", ".content"]:
                        el = soup.select_one(sel)
                        if el and len(el.get_text(strip=True)) > 100:
                            return el.get_text(separator="\n", strip=True)
                    body = soup.find("body")
                    if body:
                        return body.get_text(separator="\n", strip=True)[:10000]
                await asyncio.sleep(2 ** attempt)
            except Exception as e:
                if attempt == MAX_RETRIES - 1:
                    print(f"[WARN] Danıştay detay hata id={karar_id}: {e}")
                await asyncio.sleep(2 ** attempt)
        return None

    async def collect(self) -> AsyncIterator[Dict[str, Any]]:
        seen = self._already_collected()
        print(f"[Danıştay] Zaten toplanan: {len(seen):,}")

        async with self._make_client(timeout=45.0) as client:
            # Önce session kur (CSRF token vs)
            try:
                await client.get(BASE_URL)
                await jitter(1.0, 2.0)
            except Exception:
                pass

            for year in range(self.start_year, self.end_year + 1):
                baslangic = f"01.01.{year}"
                bitis = f"31.12.{year}"
                sayfa = 1

                while True:
                    data = await self._search(client, baslangic, bitis, sayfa)
                    if not data:
                        break

                    if "html" in data:
                        kararlar = self._parse_html_results(data["html"])
                    else:
                        kararlar = data.get("data") or data.get("kararlar") or []

                    if not kararlar:
                        break

                    for k in kararlar:
                        kid = str(k.get("id") or k.get("kararId") or "")
                        if not kid or kid in seen:
                            continue

                        await jitter(0.8, 2.0)
                        metin = await self._fetch_detail(client, kid)
                        if not metin or len(metin) < 100:
                            continue

                        record: Dict[str, Any] = {
                            "id": f"danistay_{kid}",
                            "source": "danistay",
                            "mahkeme": "Danıştay",
                            "daire": k.get("daire") or "",
                            "esas_no": k.get("esas_no") or "",
                            "karar_no": k.get("karar_no") or "",
                            "karar_tarihi": k.get("tarih") or "",
                            "text": metin,
                        }

                        seen.add(kid)
                        self._append(record)
                        yield record

                    if len(kararlar) < PAGE_SIZE:
                        break
                    sayfa += 1
                    await jitter(2.0, 4.0)

                print(f"  [Danıştay] {year}: tamamlandı")


async def run(output_dir: str = "raw_data", start_year: int = 2000, end_year: int = 2024):
    collector = DanistayCollector(output_dir=output_dir, start_year=start_year, end_year=end_year)
    count = 0
    async for _ in collector.collect():
        count += 1
        if count % 500 == 0:
            print(f"[Danıştay] Toplanan: {count:,}")
    print(f"[Danıştay] TOPLAM: {count:,}")


if __name__ == "__main__":
    asyncio.run(run())
