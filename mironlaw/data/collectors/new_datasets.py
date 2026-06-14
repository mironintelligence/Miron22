"""
Yeni HuggingFace datasetlerini indirir:
  - muhammetakkurt/mevzuat-gov-dataset   → raw_data/mevzuat_main.jsonl
  - yusufbaykaloglu/turkish-university-mevzuat → raw_data/mevzuat_university.jsonl
  - yusufbaykaloglu/University_Mevzuat_QA_v2   → raw_data/mevzuat_qa.jsonl
  - umutertugrul/turkish-academic-theses-dataset (hukuk filtreli) → raw_data/academic_theses.jsonl
  - alibayram/hukuk_soru_cevap                 → raw_data/hukuk_soru_cevap.jsonl
  - aketen0654/9_yargitay_kararlari_2025       → raw_data/yargitay_2025_9d.jsonl

Çalıştır: python3 -m data.collectors.new_datasets
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

from datasets import load_dataset

ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = ROOT / "raw_data"
RAW_DIR.mkdir(parents=True, exist_ok=True)

LAW_KEYWORDS = {
    "hukuk", "hukuki", "kanun", "mevzuat", "mahkeme", "yargı", "yargıtay",
    "dava", "karar", "ceza", "medeni", "borç", "sözleşme", "tazminat",
    "icra", "iflas", "tescil", "anayasa", "idare", "vergi", "ticaret",
    "miras", "vekaletname", "ipotek", "kefalet", "temyiz", "istinaf",
    "sulh", "avukat", "savcı", "hakim", "daire", "içtihat",
}


def _already_done(path: Path) -> bool:
    if path.exists() and path.stat().st_size > 1024:
        print(f"  [SKIP] {path.name} zaten var ({path.stat().st_size // 1024}KB)")
        return True
    return False


def _write(records: list[Dict], path: Path):
    with path.open("w", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(f"  → {path.name}: {len(records):,} kayıt")


def _is_law_related(text: str) -> bool:
    t = text.lower()
    return any(k in t for k in LAW_KEYWORDS)


def download_mevzuat_main():
    out = RAW_DIR / "mevzuat_main.jsonl"
    if _already_done(out):
        return
    print("  muhammetakkurt/mevzuat-gov-dataset indiriliyor...")
    ds = load_dataset("muhammetakkurt/mevzuat-gov-dataset", split="train")
    records = []
    for i, r in enumerate(ds):
        kanun_adi = str(r.get("Kanun Adı") or r.get("kanun_adi") or "").strip()
        kanun_no = str(r.get("kanun_numarasi") or r.get("kanun_no") or "").strip()
        kabul_tarihi = str(r.get("kabul_tarihi") or "").strip()
        url = str(r.get("url") or "").strip()

        # maddeler: list of {madde_numarasi, text}
        maddeler = r.get("maddeler") or []
        madde_texts = []
        if isinstance(maddeler, list):
            for m in maddeler:
                if isinstance(m, dict):
                    mno = str(m.get("madde_numarasi") or "").strip()
                    mtxt = str(m.get("text") or "").strip()
                    if mtxt:
                        madde_texts.append(f"{mno}: {mtxt}" if mno else mtxt)

        header = f"Kanun: {kanun_adi}"
        if kanun_no:
            header += f" (No: {kanun_no})"
        if kabul_tarihi:
            header += f" | Kabul: {kabul_tarihi}"

        full_text = header + "\n\n" + "\n\n".join(madde_texts)
        if len(full_text) < 100:
            continue

        records.append({
            "id": f"mevzuat_main_{i}",
            "source": "mevzuat_gov",
            "kanun_adi": kanun_adi,
            "kanun_no": kanun_no,
            "kabul_tarihi": kabul_tarihi,
            "text": full_text[:8000],
        })
    _write(records, out)


def download_mevzuat_university():
    out = RAW_DIR / "mevzuat_university.jsonl"
    if _already_done(out):
        return
    print("  yusufbaykaloglu/turkish-university-mevzuat indiriliyor...")
    try:
        ds = load_dataset("yusufbaykaloglu/turkish-university-mevzuat", split="train")
    except Exception:
        ds = load_dataset("yusufbaykaloglu/turkish-university-mevzuat")
        ds = list(ds.values())[0]
    records = []
    for i, r in enumerate(ds):
        # Fields: Üniversite, Link, İçerik, Resmi Gazete Tarihi, Resmi Gazete Sayısı, Mevzuat No
        text = str(r.get("İçerik") or r.get("icerik") or r.get("content") or "").strip()
        univ = str(r.get("Üniversite") or "").strip()
        rg_tarih = str(r.get("Resmi Gazete Tarihi") or "").strip()
        mevzuat_no = str(r.get("Mevzuat No") or "").strip()
        if not text or len(text) < 50:
            continue
        header_parts = []
        if univ:
            header_parts.append(f"Üniversite: {univ}")
        if rg_tarih:
            header_parts.append(f"Resmi Gazete: {rg_tarih}")
        if mevzuat_no:
            header_parts.append(f"Mevzuat No: {mevzuat_no}")
        full_text = ("\n".join(header_parts) + "\n\n" + text).strip() if header_parts else text
        records.append({
            "id": f"mevzuat_univ_{i}",
            "source": "mevzuat_university",
            "text": full_text[:4000],
            "kanun_adi": univ,
        })
    _write(records, out)


def download_mevzuat_qa():
    out = RAW_DIR / "mevzuat_qa.jsonl"
    # Force re-download if empty
    if out.exists() and out.stat().st_size > 100:
        print(f"  [SKIP] {out.name} zaten var")
        return
    print("  yusufbaykaloglu/University_Mevzuat_QA_v2 indiriliyor...")
    try:
        ds = load_dataset("yusufbaykaloglu/University_Mevzuat_QA_v2", split="train")
    except Exception:
        ds = load_dataset("yusufbaykaloglu/University_Mevzuat_QA_v2")
        ds = list(ds.values())[0]
    records = []
    for i, r in enumerate(ds):
        # Fields: questions, answers
        q = str(r.get("questions") or r.get("question") or r.get("soru") or "").strip()
        a = str(r.get("answers") or r.get("answer") or r.get("cevap") or "").strip()
        if not q or not a:
            continue
        records.append({
            "id": f"mevzuat_qa_{i}",
            "source": "mevzuat_qa",
            "text": f"SORU: {q}\n\nCEVAP: {a}",
            "question": q,
            "answer": a,
        })
    _write(records, out)


def download_academic_theses():
    out = RAW_DIR / "academic_theses.jsonl"
    if _already_done(out):
        return
    print("  umutertugrul/turkish-academic-theses-dataset indiriliyor (hukuk filtreli)...")
    try:
        ds = load_dataset("umutertugrul/turkish-academic-theses-dataset", split="train")
    except Exception:
        ds = load_dataset("umutertugrul/turkish-academic-theses-dataset")
        ds = list(ds.values())[0]
    records = []
    for i, r in enumerate(ds):
        title_tr = str(r.get("title_tr") or r.get("baslik") or "").strip()
        abstract_tr = str(r.get("abstract_tr") or r.get("ozet") or r.get("text") or "").strip()
        subject = str(r.get("subject") or r.get("konu") or r.get("alan") or "").strip()
        combined = f"{title_tr} {abstract_tr} {subject}".lower()
        if not _is_law_related(combined):
            continue
        text = f"Tez Başlığı: {title_tr}\n\nÖzet: {abstract_tr}" if abstract_tr else title_tr
        if len(text) < 50:
            continue
        records.append({
            "id": f"thesis_{i}",
            "source": "academic_theses",
            "text": text[:3000],
            "title": title_tr,
            "subject": subject,
        })
    _write(records, out)


def download_hukuk_soru_cevap():
    out = RAW_DIR / "hukuk_soru_cevap.jsonl"
    if _already_done(out):
        return
    print("  alibayram/hukuk_soru_cevap indiriliyor...")
    try:
        ds = load_dataset("alibayram/hukuk_soru_cevap", split="train")
    except Exception:
        ds = load_dataset("alibayram/hukuk_soru_cevap")
        ds = list(ds.values())[0]
    records = []
    for i, r in enumerate(ds):
        q = str(r.get("question") or r.get("soru") or r.get("input") or "").strip()
        a = str(r.get("answer") or r.get("cevap") or r.get("output") or "").strip()
        if not q or not a or len(a) < 20:
            continue
        records.append({
            "id": f"hsq_{i}",
            "source": "hukuk_soru_cevap",
            "text": f"SORU: {q}\n\nCEVAP: {a}",
            "question": q,
            "answer": a,
        })
    _write(records, out)


def download_yargitay_2025():
    out = RAW_DIR / "yargitay_2025_9d.jsonl"
    # Force re-download if < 100 records
    existing = sum(1 for _ in out.open()) if out.exists() else 0
    if existing > 100:
        print(f"  [SKIP] {out.name} zaten var ({existing:,} kayıt)")
        return
    print("  aketen0654/9_yargitay_kararlari_2025 indiriliyor...")
    try:
        ds = load_dataset("aketen0654/9_yargitay_kararlari_2025", split="train")
    except Exception:
        ds = load_dataset("aketen0654/9_yargitay_kararlari_2025")
        ds = list(ds.values())[0]
    records = []
    for i, r in enumerate(ds):
        # Fields: mahkeme_adi, esas_sayisi, karar_sayisi, karar_tarihi, dava_konusu, yargitay_karari
        karar = str(r.get("yargitay_karari") or r.get("karar") or r.get("text") or "").strip()
        dava = str(r.get("dava_konusu") or "").strip()
        esas = str(r.get("esas_sayisi") or "").strip()
        karar_no = str(r.get("karar_sayisi") or "").strip()
        tarih = str(r.get("karar_tarihi") or "").strip()
        mahkeme = str(r.get("mahkeme_adi") or "Yargıtay 9. Hukuk Dairesi").strip()

        if not karar or len(karar) < 100:
            continue

        header_parts = [mahkeme]
        if esas:
            header_parts.append(f"Esas: {esas}")
        if karar_no:
            header_parts.append(f"Karar: {karar_no}")
        if tarih:
            header_parts.append(f"Tarih: {tarih}")

        full_text = " | ".join(header_parts)
        if dava:
            full_text += f"\n\nDava Konusu: {dava[:500]}"
        full_text += f"\n\nKarar:\n{karar}"

        records.append({
            "id": f"yrgty2025_{i}",
            "source": "yargitay_2025",
            "text": full_text[:5000],
            "daire": mahkeme,
            "esas_no": esas,
            "karar_no": karar_no,
            "karar_tarihi": tarih,
        })
    _write(records, out)


DOWNLOADS = [
    ("Mevzuat (ana kanunlar)", download_mevzuat_main),
    ("Mevzuat (üniversite)", download_mevzuat_university),
    ("Mevzuat QA", download_mevzuat_qa),
    ("Akademik tezler (hukuk)", download_academic_theses),
    ("Hukuk soru-cevap", download_hukuk_soru_cevap),
    ("Yargıtay 2025 (9. Daire)", download_yargitay_2025),
]


def main():
    print("=== Yeni Dataset İndirici ===\n")
    for name, fn in DOWNLOADS:
        print(f"[{name}]")
        try:
            fn()
        except Exception as e:
            print(f"  HATA: {e}")
        print()
    print("=== TAMAMLANDI ===")
    print("Sıradaki: python3 -m data.processors.extra_qa_converter2")


if __name__ == "__main__":
    main()
