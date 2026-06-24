"""
Tavily tabanlı web araması — DB'de bulunamayan Türk hukuku sorgularında devreye girer.
Resmi/güvenilir kaynaklara öncelik verir; bulunanları decisions tablosuna kaydeder.
"""
from __future__ import annotations

import hashlib
import os
from typing import List, Dict


TRUSTED_DOMAINS = [
    "mevzuat.gov.tr",
    "yargitay.gov.tr",
    "danistay.gov.tr",
    "emsal.yargitay.gov.tr",
    "karararama.danistay.gov.tr",
    "legalbank.net",
    "kazanci.com.tr",
]


def web_search_legal(query: str, limit: int = 3) -> List[Dict]:
    """
    Güvenilir hukuk kaynaklarında Tavily araması.
    TAVILY_API_KEY yoksa veya istek başarısız olursa [] döner.
    """
    api_key = os.environ.get("TAVILY_API_KEY")
    if not api_key:
        return []
    try:
        from tavily import TavilyClient
        client = TavilyClient(api_key=api_key)
        result = client.search(
            query=query,
            search_depth="basic",
            max_results=limit,
            include_domains=TRUSTED_DOMAINS,
        )
        items = []
        for r in result.get("results", []):
            content = (r.get("content") or "").strip()
            if not content:
                continue
            items.append({
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "content": content[:1000],
            })
        return items
    except Exception as e:
        print(f"[web_search] Tavily hatası: {e}")
        return []


def save_web_results_to_db(results: List[Dict]) -> None:
    """
    Tavily sonuçlarını decisions tablosuna kaydeder.
    ON CONFLICT (hash) DO NOTHING ile güvenli — tekrar çalıştırılabilir.
    """
    if not results:
        return
    try:
        from db import get_db_cursor
        rows = []
        for r in results:
            content = r.get("content", "").strip()
            if not content:
                continue
            title = r.get("title", "")
            url = r.get("url", "")
            full_text = f"{title}\n\n{content}\n\nKaynak: {url}"
            h = hashlib.sha256(full_text.encode("utf-8")).hexdigest()
            rows.append((
                "Web",
                "Web",
                url[:500],
                title[:500],
                full_text,
                h,
            ))
        if not rows:
            return
        with get_db_cursor(write=True) as cur:
            cur.executemany(
                """
                INSERT INTO decisions (source, court, chamber, summary, full_text, hash)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (hash) DO NOTHING
                """,
                rows,
            )
    except Exception as e:
        print(f"[web_search] DB kayıt hatası: {e}")
