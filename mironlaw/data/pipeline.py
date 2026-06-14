"""
MironLaw 1.0 — Ana Data Pipeline
Çalıştır: python -m mironlaw.data.pipeline [--step STEP]

Adımlar:
  1. collect   → Tüm kaynaklardan veri topla (700k HF + scraping)
  2. dedup     → Duplicate kaldır
  3. build_qa  → Eğitim dataseti oluştur
  4. push_hf   → HuggingFace'e push et (opsiyonel)

Toplam hedef: ~1.5M ham karar → ~800k-1M unique → ~4-6M eğitim örneği
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path

from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn
from rich.table import Table

console = Console()

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "raw_data"
PROCESSED_DIR = ROOT / "processed"
TRAIN_DIR = ROOT / "training"

RAW_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
TRAIN_DIR.mkdir(parents=True, exist_ok=True)


# ──────────────────────────────────────────────
# ADIM 1: COLLECT
# ──────────────────────────────────────────────

async def step_collect(start_year: int = 2000, end_year: int = 2024):
    console.rule("[bold cyan]ADIM 1: VERİ TOPLAMA")

    # 1a. HuggingFace 700k
    console.print("[cyan]1a.[/] HuggingFace 700k yükleniyor...")
    from .collectors.hf_loader import load_and_save
    n = load_and_save(output_dir=RAW_DIR)
    console.print(f"  ✓ HF: {n:,} kayıt")

    # 1b. Yargıtay Emsal
    console.print("[cyan]1b.[/] Yargıtay Emsal toplanıyor...")
    from .collectors.yargitay_emsal import YargitayEmsalCollector
    yc = YargitayEmsalCollector(output_dir=RAW_DIR, start_year=start_year, end_year=end_year)
    count = 0
    async for _ in yc.collect():
        count += 1
        if count % 5000 == 0:
            console.print(f"  ↳ Yargıtay: {count:,}")
    console.print(f"  ✓ Yargıtay: {count:,} karar")

    # 1c. Danıştay
    console.print("[cyan]1c.[/] Danıştay toplanıyor...")
    from .collectors.danistay import DanistayCollector
    dc = DanistayCollector(output_dir=RAW_DIR, start_year=start_year, end_year=end_year)
    count = 0
    async for _ in dc.collect():
        count += 1
        if count % 2000 == 0:
            console.print(f"  ↳ Danıştay: {count:,}")
    console.print(f"  ✓ Danıştay: {count:,} karar")

    # 1d. Anayasa Mahkemesi
    console.print("[cyan]1d.[/] Anayasa Mahkemesi toplanıyor...")
    from .collectors.anayasa import AnayasaCollector
    ac = AnayasaCollector(output_dir=RAW_DIR, start_year=2012, end_year=end_year)
    count = 0
    async for _ in ac.collect():
        count += 1
        if count % 500 == 0:
            console.print(f"  ↳ AYM: {count:,}")
    console.print(f"  ✓ AYM: {count:,} karar")

    # 1e. Mevzuat
    console.print("[cyan]1e.[/] Mevzuat.gov.tr toplanıyor...")
    from .collectors.mevzuat import MevzuatCollector
    mc = MevzuatCollector(output_dir=RAW_DIR)
    count = 0
    async for _ in mc.collect():
        count += 1
        if count % 500 == 0:
            console.print(f"  ↳ Mevzuat: {count:,}")
    console.print(f"  ✓ Mevzuat: {count:,} metin")

    _print_raw_stats()


def _print_raw_stats():
    table = Table(title="Raw Data İstatistikleri")
    table.add_column("Dosya")
    table.add_column("Satır", justify="right")
    table.add_column("Boyut", justify="right")

    for f in sorted(RAW_DIR.glob("*.jsonl")):
        try:
            lines = sum(1 for _ in f.open("r", encoding="utf-8"))
            size_mb = f.stat().st_size / 1_048_576
            table.add_row(f.name, f"{lines:,}", f"{size_mb:.1f} MB")
        except Exception:
            pass
    console.print(table)


# ──────────────────────────────────────────────
# ADIM 2: DEDUP
# ──────────────────────────────────────────────

def step_dedup():
    console.rule("[bold yellow]ADIM 2: DEDUPLICATION")
    from .processors.dedup import merge_and_dedup

    raw_files = sorted(RAW_DIR.glob("*.jsonl"))
    if not raw_files:
        console.print("[red]Ham veri bulunamadı. Önce 'collect' adımını çalıştır.")
        return

    out = PROCESSED_DIR / "merged_unique.jsonl"
    console.print(f"Birleştiriliyor: {len(raw_files)} dosya → {out}")
    n = merge_and_dedup(raw_files, out, threshold=0.85, min_chars=200)
    console.print(f"[green]✓ Unique kayıt: {n:,}")


# ──────────────────────────────────────────────
# ADIM 3: Q&A DATASETI
# ──────────────────────────────────────────────

def step_build_qa():
    console.rule("[bold green]ADIM 3: Q&A DATASETI OLUŞTURMA")
    from .processors.qa_builder import build_dataset

    merged = PROCESSED_DIR / "merged_unique.jsonl"
    if not merged.exists():
        console.print("[red]merged_unique.jsonl bulunamadı. Önce 'dedup' adımını çalıştır.")
        return

    out = PROCESSED_DIR / "mironlaw_train.jsonl"
    console.print(f"Q&A örnekleri üretiliyor: {merged.name} → {out.name}")
    n = build_dataset([merged], out)
    console.print(f"[green]✓ Eğitim örneği: {n:,}")

    # Kaggle için split
    _split_for_kaggle(out)


def _split_for_kaggle(train_path: Path, val_ratio: float = 0.02):
    """%98 train, %2 validation split."""
    import random
    lines = train_path.read_text(encoding="utf-8").strip().splitlines()
    random.shuffle(lines)

    split_idx = int(len(lines) * (1 - val_ratio))
    train_lines = lines[:split_idx]
    val_lines = lines[split_idx:]

    train_out = PROCESSED_DIR / "train.jsonl"
    val_out = PROCESSED_DIR / "val.jsonl"

    train_out.write_text("\n".join(train_lines), encoding="utf-8")
    val_out.write_text("\n".join(val_lines), encoding="utf-8")

    console.print(f"  Train: {len(train_lines):,} | Val: {len(val_lines):,}")
    console.print(f"  → {train_out}")
    console.print(f"  → {val_out}")


# ──────────────────────────────────────────────
# ADIM 4: HF PUSH (Opsiyonel)
# ──────────────────────────────────────────────

def step_push_hf(repo_id: str = "mironintelligence/mironlaw-train-data"):
    console.rule("[bold magenta]ADIM 4: HUGGINGFACE'E PUSH")
    from datasets import Dataset
    import json

    train_path = PROCESSED_DIR / "train.jsonl"
    if not train_path.exists():
        console.print("[red]train.jsonl bulunamadı. Önce 'build_qa' adımını çalıştır.")
        return

    console.print(f"Dataset yükleniyor: {train_path}")
    records = []
    with train_path.open("r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                records.append(json.loads(line))

    ds = Dataset.from_list(records)
    console.print(f"HuggingFace'e push ediliyor: {repo_id}")
    ds.push_to_hub(repo_id, private=True)
    console.print(f"[green]✓ Push tamamlandı: https://huggingface.co/datasets/{repo_id}")


# ──────────────────────────────────────────────
# CLI
# ──────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="MironLaw 1.0 Data Pipeline")
    parser.add_argument(
        "--step",
        choices=["collect", "dedup", "build_qa", "push_hf", "all"],
        default="all",
        help="Hangi adımı çalıştır (varsayılan: all)",
    )
    parser.add_argument("--start-year", type=int, default=2000)
    parser.add_argument("--end-year", type=int, default=2024)
    parser.add_argument("--hf-repo", default="mironintelligence/mironlaw-train-data")
    args = parser.parse_args()

    console.print(f"[bold]MironLaw 1.0 — Data Pipeline[/] | Adım: [yellow]{args.step}[/]")

    if args.step in ("collect", "all"):
        asyncio.run(step_collect(args.start_year, args.end_year))

    if args.step in ("dedup", "all"):
        step_dedup()

    if args.step in ("build_qa", "all"):
        step_build_qa()

    if args.step == "push_hf":
        step_push_hf(args.hf_repo)

    console.print("[bold green]Pipeline tamamlandı!")


if __name__ == "__main__":
    main()
