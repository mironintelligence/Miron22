"""
HuggingFace'teki 700k Türk hukuk datasetini yükler.
erdem-erdem/Turkish-Law-Documents-700k-clustered
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Iterator, Dict, Any

from tqdm import tqdm


HF_DATASET_ID = "erdem-erdem/Turkish-Law-Documents-700k-clustered"


def load_and_save(output_dir: str | Path = "raw_data", min_chars: int = 200) -> int:
    """
    HF dataset'i indirip raw_data/hf_700k.jsonl'e yazar.
    Zaten varsa atlar.
    """
    from datasets import load_dataset

    out_path = Path(output_dir) / "hf_700k.jsonl"
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    if out_path.exists():
        lines = sum(1 for _ in out_path.open("r", encoding="utf-8"))
        print(f"[HF] Zaten var: {out_path} ({lines:,} kayıt)")
        return lines

    print(f"[HF] Dataset indiriliyor: {HF_DATASET_ID}")
    ds = load_dataset(HF_DATASET_ID, split="train")

    written = 0
    with out_path.open("w", encoding="utf-8") as f:
        for row in tqdm(ds, desc="HF 700k", unit="doc"):
            text = (row.get("text") or "").strip()
            if len(text) < min_chars:
                continue

            record: Dict[str, Any] = {
                "id": f"hf_{row.get('id', written)}",
                "source": f"hf_{row.get('source', 'unknown')}",
                "text": text,
                "esas_no": row.get("esasNo") or "",
                "karar_no": row.get("kararNo") or "",
                "karar_tarihi": str(row.get("kararTarihi") or ""),
                "cluster_id": row.get("tr_e5_knn_cluster_id"),
            }
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
            written += 1

    print(f"[HF] Yazıldı: {written:,} kayıt → {out_path}")
    return written


if __name__ == "__main__":
    load_and_save()
