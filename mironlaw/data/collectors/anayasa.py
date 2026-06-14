"""
Anayasa Mahkemesi Kararları Scraper
https://kararlarbilgibankasi.anayasa.gov.tr
https://normkararlarbilgibankasi.anayasa.gov.tr  (Norm Denetimi)

Hedef: ~80k karar (bireysel başvuru + norm denetimi)
API: REST/JSON endpoint'leri var
"""
from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import AsyncIterator, Dict, Any, Optional

import httpx
from bs4 import BeautifulSoup

from .base import BaseCollector, jitter

# Bireysel Başvuru API
BB_API = "https://kararlarbilgibankasi.anayasa.gov.tr/api"
# Norm Denetimi (İptal/İtiraz)
ND_BASE = "https://normkararlarbilgibankasi.anayasa.gov.tr"

PAGE_SIZE = 50
MAX_RETRIES = 4


class AnayasaCollector(BaseCollector):
    source_name = "anayasa"

    def __init__(
        self,
        output_dir: str | Path = "raw_data",
        start_year: int = 2012,
        end_year: int = 2024,
    ):
        super().__init__(output_dir)
        self.start_year = start_year
        self.end_year = end_year

    async def _bb_search(
        self,
        client: httpx.AsyncClient,
        sayfa: int,
        yil: Optional[int] = None,
    ) -> Optional[Dict]:
        """Bireysel Başvuru kararlarını listeler."""
        params: Dict[str, Any] = {
            "pageNumber": sayfa,
            "pageSize": PAGE_SIZE,
        }
        if yil:
            params["yil"] = yil

        for attempt in range(MAX_RETRIES):
            try:
                resp = await client.get(
                    f"{BB_API}/kararlar",
                    params=params,
                    headers={"Accept": "application/json"},
                )
                if resp.status_code == 200:
                    return resp.json()
                await asyncio.sleep(2 ** attempt)
            except Exception as e:
                if attempt == MAX_RETRIES - 1:
                    print(f"[WARN] AYM BB search hata sayfa={sayfa}: {e}")
                await asyncio.sleep(2 ** attempt)
        return None

    async def _bb_detail(self, client: httpx.AsyncClient, karar_id: str) -> Optional[str]:
        for attempt in range(MAX_RETRIES):
            try:
                resp = await client.get(
                    f"{BB_API}/kararlar/{karar_id}",
                    headers={"Accept": "application/json"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    # Karar metni farklı alanlarda olabilir
                    metin = (
                        data.get("kararMetni")
                        or data.get("karar_metni")
                        or data.get("metin")
                        or data.get("icerik")
                        or ""
                    )
                    if metin:
                        return metin
                    # HTML alanda olabilir
                    html_metin = data.get("kararMetniHtml") or data.get("html") or ""
                    if html_metin:
                        soup = BeautifulSoup(html_metin, "lxml")
                        return soup.get_text(separator="\n", strip=True)
                await asyncio.sleep(2 ** attempt)
            except Exception as e:
                if attempt == MAX_RETRIES - 1:
                    print(f"[WARN] AYM BB detay hata id={karar_id}: {e}")
                await asyncio.sleep(2 ** attempt)
        return None

    async def _nd_search(
        self,
        client: httpx.AsyncClient,
        sayfa: int,
        yil: Optional[int] = None,
    ) -> Optional[Dict]:
        """Norm Denetimi kararlarını listeler."""
        params: Dict[str, Any] = {
            "Sayfa": sayfa,
            "SayfaBasinaKayit": PAGE_SIZE,
        }
        if yil:
            params["KararYili"] = yil

        for attempt in range(MAX_RETRIES):
            try:
                resp = await client.get(
                    f"{ND_BASE}/api/Karar/Ara",
                    params=params,
                    headers={"Accept": "application/json"},
                )
                if resp.status_code == 200:
                    return resp.json()
                await asyncio.sleep(2 ** attempt)
            except Exception as e:
                if attempt == MAX_RETRIES - 1:
                    print(f"[WARN] AYM ND search hata: {e}")
                await asyncio.sleep(2 ** attempt)
        return None

    async def _nd_detail(self, client: httpx.AsyncClient, karar_id: str) -> Optional[str]:
        for attempt in range(MAX_RETRIES):
            try:
                resp = await client.get(
                    f"{ND_BASE}/api/Karar/{karar_id}",
                    headers={"Accept": "application/json"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    metin = (
                        data.get("kararMetni") or data.get("metin")
                        or data.get("icerik") or ""
                    )
                    if metin:
                        return metin
                    html = data.get("kararMetniHtml") or ""
                    if html:
                        return BeautifulSoup(html, "lxml").get_text(separator="\n", strip=True)
                await asyncio.sleep(2 ** attempt)
            except Exception as e:
                if attempt == MAX_RETRIES - 1:
                    print(f"[WARN] AYM ND detay hata id={karar_id}: {e}")
                await asyncio.sleep(2 ** attempt)
        return None

    async def _collect_bb(self, client: httpx.AsyncClient, seen: set) -> AsyncIterator[Dict]:
        """Bireysel Başvuru kararları."""
        for year in range(self.start_year, self.end_year + 1):
            sayfa = 1
            while True:
                data = await self._bb_search(client, sayfa, year)
                if not data:
                    break

                items = data.get("data") or data.get("kararlar") or data.get("items") or []
                if not items:
                    break

                for item in items:
                    kid = str(item.get("id") or item.get("kararId") or "")
                    if not kid or kid in seen:
                        continue

                    await jitter(0.5, 1.5)
                    metin = await self._bb_detail(client, kid)
                    if not metin or len(metin) < 100:
                        metin = item.get("ozet") or item.get("baslik") or ""
                    if not metin:
                        continue

                    record: Dict[str, Any] = {
                        "id": f"aym_bb_{kid}",
                        "source": "anayasa_bb",
                        "mahkeme": "Anayasa Mahkemesi",
                        "tur": "Bireysel Başvuru",
                        "esas_no": item.get("basVuruNo") or item.get("esasNo") or "",
                        "karar_no": item.get("kararNo") or "",
                        "karar_tarihi": item.get("kararTarihi") or str(year),
                        "baslik": item.get("baslik") or "",
                        "text": metin,
                    }

                    seen.add(kid)
                    self._append(record)
                    yield record

                total = data.get("toplam") or data.get("total") or 0
                if not items or len(items) < PAGE_SIZE:
                    break
                sayfa += 1
                await jitter(1.0, 2.5)

            print(f"  [AYM BB] {year}: tamamlandı")

    async def _collect_nd(self, client: httpx.AsyncClient, seen: set) -> AsyncIterator[Dict]:
        """Norm Denetimi (iptal/itiraz) kararları."""
        for year in range(self.start_year, self.end_year + 1):
            sayfa = 1
            while True:
                data = await self._nd_search(client, sayfa, year)
                if not data:
                    break

                items = data.get("data") or data.get("kararlar") or data.get("items") or []
                if not items:
                    break

                for item in items:
                    kid = str(item.get("id") or item.get("kararId") or "")
                    if not kid or kid in seen:
                        continue

                    await jitter(0.5, 1.5)
                    metin = await self._nd_detail(client, kid)
                    if not metin or len(metin) < 100:
                        continue

                    record: Dict[str, Any] = {
                        "id": f"aym_nd_{kid}",
                        "source": "anayasa_nd",
                        "mahkeme": "Anayasa Mahkemesi",
                        "tur": "Norm Denetimi",
                        "esas_no": item.get("esasNo") or "",
                        "karar_no": item.get("kararNo") or "",
                        "karar_tarihi": item.get("kararTarihi") or str(year),
                        "text": metin,
                    }

                    seen.add(kid)
                    self._append(record)
                    yield record

                if not items or len(items) < PAGE_SIZE:
                    break
                sayfa += 1
                await jitter(1.5, 3.0)

            print(f"  [AYM ND] {year}: tamamlandı")

    async def collect(self) -> AsyncIterator[Dict[str, Any]]:
        seen = self._already_collected()
        print(f"[AYM] Zaten toplanan: {len(seen):,}")

        async with self._make_client(timeout=40.0) as client:
            async for rec in self._collect_bb(client, seen):
                yield rec
            async for rec in self._collect_nd(client, seen):
                yield rec


async def run(output_dir: str = "raw_data", start_year: int = 2012, end_year: int = 2024):
    collector = AnayasaCollector(output_dir=output_dir, start_year=start_year, end_year=end_year)
    count = 0
    async for _ in collector.collect():
        count += 1
        if count % 200 == 0:
            print(f"[AYM] Toplanan: {count:,}")
    print(f"[AYM] TOPLAM: {count:,}")


if __name__ == "__main__":
    asyncio.run(run())
