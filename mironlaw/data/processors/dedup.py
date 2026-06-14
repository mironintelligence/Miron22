"""
MinHash LSH tabanlı deduplication.
Neredeyse aynı metinleri (paraphrase, OCR varyant) kaldırır.
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Iterator, Dict, Any

from datasketch import MinHash, MinHashLSH


def _shingle(text: str, k: int = 5) -> set[str]:
    """k-gram shingle seti."""
    text = re.sub(r"\s+", " ", text.lower().strip())
    return {text[i:i+k] for i in range(len(text) - k + 1)} if len(text) >= k else {text}


def dedup_jsonl(
    input_path: str | Path,
    output_path: str | Path,
    threshold: float = 0.85,
    num_perm: int = 128,
    min_chars: int = 200,
) -> tuple[int, int]:
    """
    JSONL dosyasını okuyup duplicate'leri kaldırarak yeni dosyaya yazar.
    Returns: (toplam_okunan, yazılan_unique)
    """
    input_path = Path(input_path)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    lsh = MinHashLSH(threshold=threshold, num_perm=num_perm)
    total = 0
    written = 0

    with (
        input_path.open("r", encoding="utf-8") as fin,
        output_path.open("w", encoding="utf-8") as fout,
    ):
        for line in fin:
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except Exception:
                continue

            total += 1
            text = (rec.get("text") or "").strip()
            if len(text) < min_chars:
                continue

            doc_id = str(rec.get("id") or total)

            m = MinHash(num_perm=num_perm)
            for s in _shingle(text[:5000]):
                m.update(s.encode("utf-8"))

            try:
                result = lsh.query(m)
                if result:
                    continue  # duplicate — atla
                lsh.insert(doc_id, m)
            except Exception:
                pass

            fout.write(json.dumps(rec, ensure_ascii=False) + "\n")
            written += 1

            if written % 50_000 == 0:
                print(f"  [Dedup] {total:,} okundu, {written:,} unique")

    print(f"[Dedup] Tamamlandı: {total:,} → {written:,} unique (kaldırılan: {total-written:,})")
    return total, written


def merge_and_dedup(
    input_files: list[str | Path],
    output_path: str | Path,
    threshold: float = 0.85,
    num_perm: int = 128,
    min_chars: int = 200,
) -> int:
    """
    Birden fazla JSONL dosyasını birleştirip dedup yapar.
    Büyük dataset için: streaming, RAM'e sığdırır.
    """
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    lsh = MinHashLSH(threshold=threshold, num_perm=num_perm)
    seen_ids: set[str] = set()
    written = 0
    total = 0

    with output_path.open("w", encoding="utf-8") as fout:
        for fpath in input_files:
            fpath = Path(fpath)
            if not fpath.exists():
                print(f"[WARN] Dosya yok: {fpath}")
                continue

            print(f"[Merge] İşleniyor: {fpath.name}")
            with fpath.open("r", encoding="utf-8") as fin:
                for line in fin:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        rec = json.loads(line)
                    except Exception:
                        continue

                    total += 1
                    doc_id = str(rec.get("id") or total)
                    text = (rec.get("text") or "").strip()

                    if len(text) < min_chars:
                        continue
                    if doc_id in seen_ids:
                        continue

                    m = MinHash(num_perm=num_perm)
                    for s in _shingle(text[:5000]):
                        m.update(s.encode("utf-8"))

                    try:
                        if lsh.query(m):
                            continue
                        lsh.insert(doc_id, m)
                    except Exception:
                        pass

                    seen_ids.add(doc_id)
                    fout.write(json.dumps(rec, ensure_ascii=False) + "\n")
                    written += 1

                    if written % 100_000 == 0:
                        print(f"  [Merge] {total:,} okundu, {written:,} unique")

    print(f"[Merge+Dedup] {total:,} → {written:,} unique")
    return written
