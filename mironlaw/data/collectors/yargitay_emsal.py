"""
Yargıtay Emsal Kararları Scraper
https://emsal.yargitay.gov.tr

Hedef: ~400k karar (2000-2024 arası tüm tarih aralıkları)
Strateji: Yıllık + daire bazlı pagination
"""
from __future__ import annotations

import asyncio
import json
import re
from datetime import date, timedelta
from pathlib import Path
from typing import AsyncIterator, Dict, Any, List, Optional

import httpx
from bs4 import BeautifulSoup
from tqdm import tqdm

from .base import BaseCollector, jitter, random_ua

BASE_URL = "https://emsal.yargitay.gov.tr"

# Tüm daireler (0 = hepsi, ama pagination için daire bazlı daha iyi)
DAIRELER = {
    0: "Tümü",
    1: "1. Hukuk Dairesi", 2: "2. Hukuk Dairesi", 3: "3. Hukuk Dairesi",
    4: "4. Hukuk Dairesi", 5: "5. Hukuk Dairesi", 6: "6. Hukuk Dairesi",
    7: "7. Hukuk Dairesi", 8: "8. Hukuk Dairesi", 9: "9. Hukuk Dairesi",
    10: "10. Hukuk Dairesi", 11: "11. Hukuk Dairesi", 12: "12. Hukuk Dairesi",
    13: "13. Hukuk Dairesi", 14: "14. Hukuk Dairesi", 15: "15. Hukuk Dairesi",
    16: "16. Hukuk Dairesi", 17: "17. Hukuk Dairesi",
    18: "1. Ceza Dairesi", 19: "2. Ceza Dairesi", 20: "3. Ceza Dairesi",
    21: "4. Ceza Dairesi", 22: "5. Ceza Dairesi", 23: "6. Ceza Dairesi",
    24: "7. Ceza Dairesi", 25: "8. Ceza Dairesi", 26: "9. Ceza Dairesi",
    27: "10. Ceza Dairesi", 28: "11. Ceza Dairesi", 29: "12. Ceza Dairesi",
    30: "13. Ceza Dairesi", 31: "14. Ceza Dairesi", 32: "15. Ceza Dairesi",
    33: "16. Ceza Dairesi", 34: "17. Ceza Dairesi", 35: "18. Ceza Dairesi",
    36: "19. Ceza Dairesi", 37: "20. Ceza Dairesi", 38: "21. Ceza Dairesi",
    39: "22. Ceza Dairesi", 40: "23. Ceza Dairesi",
    100: "Hukuk Genel Kurulu", 101: "Ceza Genel Kurulu",
    102: "Büyük Genel Kurul",
}

PAGE_SIZE = 50
MAX_RETRIES = 4


class YargitayEmsalCollector(BaseCollector):
    source_name = "yargitay_emsal"

    def __init__(
        self,
        output_dir: str | Path = "raw_data",
        start_year: int = 2000,
        end_year: int = 2024,
        daire_ids: Optional[List[int]] = None,
    ):
        super().__init__(output_dir)
        self.start_year = start_year
        self.end_year = end_year
        self.daire_ids = daire_ids or list(DAIRELER.keys())

    async def _fetch_page(
        self,
        client: httpx.AsyncClient,
        daire_id: int,
        baslangic: str,
        bitis: str,
        sayfa: int,
    ) -> Optional[Dict]:
        """Bir sayfa arama sonucu döndürür (JSON)."""
        params = {
            "ara": "1",
            "hkm_id": "",
            "aranan": "",
            "eklenenkelime": "",
            "esasno": "",
            "kararno": "",
            "ilgiliKanun": "",
            "ilgiliMadde": "",
            "baslangicTarihi": baslangic,
            "bitisTarihi": bitis,
            "daire_id": daire_id,
            "dava_turu_id": "",
            "karar_sonucu_id": "",
            "sayfa": sayfa,
            "kayitSayisi": PAGE_SIZE,
        }
        for attempt in range(MAX_RETRIES):
            try:
                resp = await client.get(
                    f"{BASE_URL}/BilgiBankasiIslem",
                    params=params,
                    headers={"Referer": BASE_URL, "X-Requested-With": "XMLHttpRequest"},
                )
                if resp.status_code == 200:
                    return resp.json()
                await asyncio.sleep(2 ** attempt)
            except Exception as e:
                if attempt == MAX_RETRIES - 1:
                    print(f"[WARN] Sayfa fetch hata: {e}")
                await asyncio.sleep(2 ** attempt)
        return None

    async def _fetch_detail(
        self, client: httpx.AsyncClient, hkm_id: str
    ) -> Optional[str]:
        """Karar detay metnini çeker."""
        for attempt in range(MAX_RETRIES):
            try:
                resp = await client.get(
                    f"{BASE_URL}/VeriBilgi",
                    params={"hkm_id": hkm_id},
                )
                if resp.status_code == 200:
                    soup = BeautifulSoup(resp.text, "lxml")
                    # Karar metni genelde .kararMetni veya ana div içinde
                    for selector in [".kararMetni", "#kararMetni", ".karar-metni", "article", "main"]:
                        el = soup.select_one(selector)
                        if el:
                            return el.get_text(separator="\n", strip=True)
                    # Fallback: body text
                    body = soup.find("body")
                    if body:
                        return body.get_text(separator="\n", strip=True)[:8000]
                await asyncio.sleep(2 ** attempt)
            except Exception as e:
                if attempt == MAX_RETRIES - 1:
                    print(f"[WARN] Detay fetch hata hkm_id={hkm_id}: {e}")
                await asyncio.sleep(2 ** attempt)
        return None

    async def collect(self) -> AsyncIterator[Dict[str, Any]]:
        seen = self._already_collected()
        print(f"[Yargıtay] Zaten toplanan: {len(seen):,}")

        async with self._make_client(timeout=45.0) as client:
            for year in range(self.start_year, self.end_year + 1):
                baslangic = f"01.01.{year}"
                bitis = f"31.12.{year}"

                for daire_id in self.daire_ids:
                    daire_ad = DAIRELER.get(daire_id, str(daire_id))
                    sayfa = 1
                    toplam = None

                    while True:
                        data = await self._fetch_page(client, daire_id, baslangic, bitis, sayfa)
                        if not data:
                            break

                        # API yanıt yapısı: {"data": [...], "toplam": N} veya benzeri
                        kararlar = data.get("data") or data.get("kararlar") or data.get("rows") or []
                        if toplam is None:
                            toplam = data.get("toplam") or data.get("total") or len(kararlar)

                        if not kararlar:
                            break

                        for k in kararlar:
                            hkm_id = str(k.get("hkm_id") or k.get("id") or "")
                            if not hkm_id or hkm_id in seen:
                                continue

                            # Liste sayfasındaki özet bilgi
                            ozet = k.get("ozet") or k.get("summary") or k.get("karar_ozeti") or ""
                            esas = k.get("esas_no") or k.get("esasNo") or ""
                            karar = k.get("karar_no") or k.get("kararNo") or ""
                            tarih = k.get("tarih") or k.get("kararTarihi") or ""

                            # Detay metin çek
                            await jitter(0.8, 2.5)
                            metin = await self._fetch_detail(client, hkm_id)
                            if not metin or len(metin) < 100:
                                metin = ozet

                            record: Dict[str, Any] = {
                                "id": f"yargitay_{hkm_id}",
                                "source": "yargitay_emsal",
                                "mahkeme": "Yargıtay",
                                "daire": daire_ad,
                                "esas_no": esas,
                                "karar_no": karar,
                                "karar_tarihi": tarih,
                                "text": metin,
                                "ozet": ozet,
                            }

                            seen.add(hkm_id)
                            self._append(record)
                            yield record

                        # Sonraki sayfa var mı?
                        if len(kararlar) < PAGE_SIZE:
                            break
                        sayfa += 1
                        await jitter(1.0, 3.0)

                    print(f"  [{year}] {daire_ad}: tamamlandı")


async def run(output_dir: str = "raw_data", start_year: int = 2000, end_year: int = 2024):
    collector = YargitayEmsalCollector(
        output_dir=output_dir,
        start_year=start_year,
        end_year=end_year,
    )
    count = 0
    async for _ in collector.collect():
        count += 1
        if count % 1000 == 0:
            print(f"[Yargıtay] Toplanan: {count:,}")
    print(f"[Yargıtay] TOPLAM: {count:,}")


if __name__ == "__main__":
    asyncio.run(run())
