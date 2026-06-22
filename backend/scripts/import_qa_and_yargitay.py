"""
Import QA datasets and Yargıtay 9.HD decisions into the decisions table.

Usage:
    DATASET_DIR=/path/to/Dataset-Mironlaw1.0 DATABASE_URL=... python import_qa_and_yargitay.py --source all
    python import_qa_and_yargitay.py --source yargitay
    python import_qa_and_yargitay.py --source qa

Requires DATABASE_URL env var. DATASET_DIR defaults to ../../../../Dataset-Mironlaw1.0.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from datetime import datetime
from typing import Iterator, Optional

# ---------------------------------------------------------------------------
# Dataset paths — DATASET_DIR env var overrides the default relative path
# ---------------------------------------------------------------------------
DATASET_DIR = os.environ.get("DATASET_DIR") or os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "../../../../Dataset-Mironlaw1.0"
)

YARGITAY_FILE = os.path.join(DATASET_DIR, "yargitay_9daire_samet.jsonl")
QA_FILES = [
    (os.path.join(DATASET_DIR, "law_chatbot.jsonl"),  "Soru",     "Cevap",   "law_chatbot"),
    (os.path.join(DATASET_DIR, "orion_law_qa.jsonl"), "question", "answer",  "orion_law_qa"),
    (os.path.join(DATASET_DIR, "ipproo_law.jsonl"),   "soru",     "cevap",   "ipproo_law"),
]

BATCH_SIZE = 500

# ---------------------------------------------------------------------------
# DB helpers — standalone (no FastAPI deps)
# ---------------------------------------------------------------------------

def _get_conn():
    import psycopg2
    url = os.environ.get("DATABASE_URL")
    if not url:
        sys.exit("ERROR: DATABASE_URL env var not set.")
    return psycopg2.connect(url)


def _sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# Yargıtay records
# ---------------------------------------------------------------------------

def _iter_yargitay() -> Iterator[dict]:
    if not os.path.exists(YARGITAY_FILE):
        sys.exit(f"ERROR: Dataset file not found: {YARGITAY_FILE}")

    seen_hashes: set[str] = set()
    with open(YARGITAY_FILE, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                r = json.loads(line)
            except json.JSONDecodeError:
                continue

            esas  = (r.get("esas_sayisi") or "").strip()
            karar = (r.get("karar_sayisi") or "").strip()
            tarih = (r.get("karar_tarihi") or "").strip()
            konu  = (r.get("dava_konusu") or "").strip()
            metin = (r.get("yargitay_karari") or "").strip()

            if not konu or not metin:
                continue

            full_text = (
                f"Esas: {esas} | Karar: {karar} | Tarih: {tarih}\n\n"
                f"DAVA KONUSU:\n{konu}\n\n"
                f"YARGITAY KARARI:\n{metin}"
            )
            h = _sha256(full_text)
            if h in seen_hashes:
                continue
            seen_hashes.add(h)

            # Parse date DD.MM.YYYY → YYYY-MM-DD
            decision_date: Optional[str] = None
            if tarih:
                try:
                    decision_date = datetime.strptime(tarih, "%d.%m.%Y").strftime("%Y-%m-%d")
                except ValueError:
                    pass

            yield {
                "source": "yargitay_9daire_samet",
                "court": "Yargıtay",
                "chamber": "9. Hukuk Dairesi",
                "decision_date": decision_date,
                "file_no": esas,
                "decision_no": karar,
                "summary": konu[:500],
                "full_text": full_text,
                "hash": h,
                "metadata": json.dumps({"mahkeme_adi": r.get("mahkeme_adi", "")}),
            }


# ---------------------------------------------------------------------------
# QA records
# ---------------------------------------------------------------------------

def _iter_qa() -> Iterator[dict]:
    for filepath, soru_key, cevap_key, chamber_name in QA_FILES:
        if not os.path.exists(filepath):
            print(f"  WARNING: Dataset file not found, skipping: {filepath}")
            continue

        count = 0
        with open(filepath, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    r = json.loads(line)
                except json.JSONDecodeError:
                    continue

                soru  = (r.get(soru_key) or "").strip()
                cevap = (r.get(cevap_key) or "").strip()

                if not soru or not cevap:
                    continue

                full_text = f"Soru: {soru}\n\nCevap: {cevap}"
                h = _sha256(full_text)

                yield {
                    "source": chamber_name,
                    "court": "QA_Dataset",
                    "chamber": chamber_name,
                    "decision_date": None,
                    "file_no": None,
                    "decision_no": None,
                    "summary": soru[:500],
                    "full_text": full_text,
                    "hash": h,
                    "metadata": json.dumps({"original_id": r.get("id", "")}),
                }
                count += 1

        print(f"  [{chamber_name}] {count} records processed from {os.path.basename(filepath)}")


# ---------------------------------------------------------------------------
# Batch insert
# ---------------------------------------------------------------------------

INSERT_SQL = """
    INSERT INTO decisions
        (source, court, chamber, decision_date, file_no, decision_no,
         summary, full_text, hash, metadata)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    ON CONFLICT (hash) DO NOTHING
"""


def _insert_batch(cur, batch: list[dict]) -> int:
    rows = [
        (
            r["source"], r["court"], r["chamber"], r["decision_date"],
            r["file_no"], r["decision_no"], r["summary"], r["full_text"],
            r["hash"], r["metadata"],
        )
        for r in batch
    ]
    cur.executemany(INSERT_SQL, rows)
    return cur.rowcount  # rows actually inserted (duplicates excluded)


def import_records(records_iter, label: str) -> tuple[int, int]:
    """Insert all records from iterator. Returns (total_processed, total_inserted)."""
    conn = _get_conn()
    conn.autocommit = False
    cur = conn.cursor()

    total = 0
    inserted = 0
    batch: list[dict] = []

    try:
        for rec in records_iter:
            batch.append(rec)
            total += 1
            if len(batch) >= BATCH_SIZE:
                inserted += _insert_batch(cur, batch)
                conn.commit()
                batch = []
                print(f"  [{label}] committed {total} records so far …", end="\r")

        if batch:
            inserted += _insert_batch(cur, batch)
            conn.commit()

    except Exception as e:
        conn.rollback()
        print(f"\n  [{label}] ERROR — rolled back: {e}")
        raise
    finally:
        cur.close()
        conn.close()

    return total, inserted


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Import legal data into decisions table")
    parser.add_argument(
        "--source",
        choices=["yargitay", "qa", "all"],
        default="all",
        help="Which dataset(s) to import (default: all)",
    )
    args = parser.parse_args()

    print(f"\n=== MironLaw Import — {args.source.upper()} ===\n")

    if args.source in ("yargitay", "all"):
        print("Importing Yargıtay 9. Hukuk Dairesi kararları …")
        total, ins = import_records(_iter_yargitay(), "Yargıtay")
        print(f"\n  Yargıtay → processed: {total}, inserted: {ins}, duplicates skipped: {total - ins}")

    if args.source in ("qa", "all"):
        print("\nImporting QA datasets …")
        total, ins = import_records(_iter_qa(), "QA")
        print(f"\n  QA → processed: {total}, inserted: {ins}, duplicates skipped: {total - ins}")

    print("\n=== Import complete ===\n")


if __name__ == "__main__":
    main()
