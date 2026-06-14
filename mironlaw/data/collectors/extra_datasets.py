"""
Dataset-Mironlaw1.0 klasöründeki tüm ek dataset'leri pipeline raw_data'ya kopyalar.
Her kaynak için text alanı normalize edilir.

Çalıştır: python3 -m data.collectors.extra_datasets
"""
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = ROOT / "raw_data"
DS_DIR = Path("/Users/kerimaydemir/Dataset-Mironlaw1.0")
RAW_DIR.mkdir(parents=True, exist_ok=True)


SYSTEM_PROMPT = (
    "Sen MironLaw 1.0, Türk hukuku konusunda uzmanlaşmış bir yapay zeka asistanısın. "
    "Yargıtay, Danıştay ve Anayasa Mahkemesi içtihatlarına hakim, "
    "Türk hukukuna göre doğru, kapsamlı ve pratik hukuki analizler yaparsın."
)


def _write_jsonl(records, out_path: Path):
    with out_path.open("w", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(f"  → {out_path.name}: {len(records):,} kayıt")


def convert_xls_qa():
    """turkish_law_dataset.xls (CSV formatında) → raw_data/extra_law_qa.jsonl"""
    src = DS_DIR / "turkish_law_dataset.xls"
    if not src.exists():
        return
    out = RAW_DIR / "extra_law_qa.jsonl"
    if out.exists():
        print(f"  [SKIP] {out.name} zaten var")
        return

    records = []
    import pandas as pd
    df = pd.read_csv(src, sep=None, engine="python", dtype=str).fillna("")
    for i, row in df.iterrows():
        soru = str(row.get("soru", "")).strip()
        cevap = str(row.get("cevap", "")).strip()
        context = str(row.get("context", "")).strip()
        kaynak = str(row.get("kaynak", "")).strip()
        if not soru or not cevap:
            continue
        text = f"SORU: {soru}\n\nCEVAP: {cevap}"
        if context:
            text += f"\n\nKAYNAK: {context[:500]}"
        records.append({
            "id": f"extra_qa_{i}",
            "source": "extra_law_qa",
            "text": text,
            "question": soru,
            "answer": cevap,
            "kaynak": kaynak,
        })
    _write_jsonl(records, out)


def convert_legal_nli():
    """legal_nli_train/val/test.jsonl → raw_data/legal_nli.jsonl (NLI → Q&A format)"""
    out = RAW_DIR / "legal_nli.jsonl"
    if out.exists():
        print(f"  [SKIP] {out.name} zaten var")
        return

    records = []
    label_map = {
        "entailment": "gerektirir (tutarlı)",
        "contradiction": "çelişir",
        "neutral": "nötr (bağımsız)",
        "ENTAILMENT": "gerektirir (tutarlı)",
        "CONTRADICTION": "çelişir",
        "NEUTRAL": "nötr (bağımsız)",
    }
    for split in ["train", "validation", "test"]:
        src = DS_DIR / f"legal_nli_{split}.jsonl"
        if not src.exists():
            continue
        with src.open("r", encoding="utf-8") as f:
            for line in f:
                r = json.loads(line)
                premise = str(r.get("premise", "")).strip()
                hyp = str(r.get("hypothesis", "")).strip()
                label = str(r.get("label", "")).strip()
                label_tr = label_map.get(label, label)
                if not premise or not hyp:
                    continue
                text = (
                    f"Hukuki önerme: {premise}\n\n"
                    f"İddia: {hyp}\n\n"
                    f"İlişki: Bu iki ifade {label_tr}."
                )
                records.append({
                    "id": r.get("id", f"nli_{len(records)}"),
                    "source": "legal_nli_tr",
                    "text": text,
                    "premise": premise,
                    "hypothesis": hyp,
                    "label": label,
                })
    _write_jsonl(records, out)


def copy_jsonl_datasets():
    """Dataset-Mironlaw1.0 'deki JSONL dosyalarını raw_data'ya kopyalar."""
    COPY_MAP = {
        "orion_law_qa.jsonl": "extra_orion_qa.jsonl",
        "turkish_law_eqa.jsonl": "extra_eqa.jsonl",
        "law_chatbot.jsonl": "extra_chatbot.jsonl",
        "aym_decisions.jsonl": "extra_aym_decisions.jsonl",
        "koclab_aym.jsonl": "extra_koclab_aym.jsonl",
        "yargitay_9daire_2025.jsonl": "extra_yargitay_2025.jsonl",
        "ipproo_law.jsonl": "extra_ipproo.jsonl",
        "aym_violation_clean.jsonl": "extra_aym_violation.jsonl",
        "law_ontology.jsonl": "extra_ontology.jsonl",
    }
    for src_name, dst_name in COPY_MAP.items():
        src = DS_DIR / src_name
        dst = RAW_DIR / dst_name
        if not src.exists() or src.stat().st_size == 0:
            continue
        if dst.exists():
            print(f"  [SKIP] {dst_name} zaten var")
            continue
        # Normalize: ensure 'text' field exists
        records = []
        with src.open("r", encoding="utf-8") as f:
            for i, line in enumerate(f):
                line = line.strip()
                if not line:
                    continue
                try:
                    r = json.loads(line)
                except Exception:
                    continue
                if "text" not in r or not str(r.get("text", "")).strip():
                    # Birleştir
                    parts = []
                    for k, v in r.items():
                        if k not in ("id", "source", "_split", "label") and isinstance(v, str) and len(v) > 20:
                            parts.append(v)
                    r["text"] = "\n\n".join(parts[:4])
                r.setdefault("id", f"{dst_name}_{i}")
                r.setdefault("source", src_name.replace(".jsonl", ""))
                records.append(r)
        _write_jsonl(records, dst)


def main():
    print("=== Dataset-Mironlaw1.0 → raw_data dönüştürücü ===")
    print("")

    print("[1] XLS Q&A dataset dönüştürülüyor...")
    try:
        convert_xls_qa()
    except Exception as e:
        print(f"  HATA: {e}")

    print("[2] Legal NLI dataset dönüştürülüyor...")
    try:
        convert_legal_nli()
    except Exception as e:
        print(f"  HATA: {e}")

    print("[3] JSONL datasetler kopyalanıyor...")
    try:
        copy_jsonl_datasets()
    except Exception as e:
        print(f"  HATA: {e}")

    print("")
    print("=== TAMAMLANDI ===")
    print("Şimdi çalıştır: python3 -m data.pipeline --step dedup")


if __name__ == "__main__":
    main()
