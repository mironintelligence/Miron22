"""
Ek datasetleri (orion_qa, eqa, chatbot, aym, legal_nli, vb.) direkt
instruction-tuning formatına çevirir ve mironlaw_train.jsonl'e ekler.

Ana pipeline bittikten sonra çalıştır:
  python3 -m data.processors.extra_qa_converter
"""
from __future__ import annotations

import json
import random
from pathlib import Path
from typing import Dict, List, Optional

ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = ROOT / "raw_data"
PROCESSED_DIR = ROOT / "processed"

SYSTEM_PROMPT = (
    "Sen MironLaw 1.0, Türk hukuku konusunda uzmanlaşmış bir yapay zeka asistanısın. "
    "Yargıtay, Danıştay ve Anayasa Mahkemesi içtihatlarına hakim, "
    "Türk Medeni Kanunu, Borçlar Kanunu, Ceza Kanunu ve diğer mevzuata göre "
    "doğru, kapsamlı ve pratik hukuki analizler yaparsın. "
    "Yanıtların Türkçe, net ve profesyonel olur."
)


def _msg(user: str, asst: str) -> Dict:
    return {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user},
            {"role": "assistant", "content": asst},
        ]
    }


def convert_orion_qa(path: Path) -> List[Dict]:
    """OrionCAF/turkish_law_qa_dataset: question + answer + context"""
    results = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            r = json.loads(line)
            q = str(r.get("question") or "").strip()
            a = str(r.get("answer") or "").strip()
            ctx = str(r.get("context") or "").strip()
            if not q or not a:
                continue
            user = f"{q}"
            if ctx:
                user = f"Bağlam: {ctx[:600]}\n\nSoru: {q}"
            results.append(_msg(user, a))
    return results


def convert_eqa(path: Path) -> List[Dict]:
    """yeniguno/turkish-law-eqa: question + context + answers"""
    results = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            r = json.loads(line)
            q = str(r.get("question") or "").strip()
            ctx = str(r.get("context") or "").strip()
            ans = r.get("answers") or {}
            if isinstance(ans, dict):
                ans_text = str(ans.get("text", [""])[0] if ans.get("text") else "").strip()
            elif isinstance(ans, str):
                ans_text = ans.strip()
            else:
                ans_text = ""
            if not q or not ans_text:
                continue
            user = f"Hukuki soru: {q}"
            if ctx:
                user = f"Metin: {ctx[:800]}\n\nSoru: {q}"
            results.append(_msg(user, ans_text))
    return results


def convert_chatbot(path: Path) -> List[Dict]:
    """Renicames/turkish-law-chatbot: instruction + input + output"""
    results = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            r = json.loads(line)
            inst = str(r.get("instruction") or "").strip()
            inp = str(r.get("input") or "").strip()
            out = str(r.get("output") or "").strip()
            if not out or not (inst or inp):
                continue
            user = inst
            if inp:
                user = f"{inst}\n\n{inp}" if inst else inp
            results.append(_msg(user, out))
    return results


def convert_aym(path: Path) -> List[Dict]:
    """icgcihan/Turkish_Constutional_Court_Decisions"""
    results = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            r = json.loads(line)
            text = str(r.get("text") or "").strip()
            decision = str(r.get("decision") or "").strip()
            summary = str(r.get("summary") or "").strip()
            if not text or len(text) < 100:
                continue
            if decision:
                results.append(_msg(
                    f"Bu Anayasa Mahkemesi kararının sonucu nedir?\n\n{text[:2000]}",
                    f"Anayasa Mahkemesi şu kararı vermiştir:\n\n{decision[:800]}"
                ))
            if summary:
                results.append(_msg(
                    f"Bu Anayasa Mahkemesi kararını özetle:\n\n{text[:2000]}",
                    summary[:800]
                ))
    return results


def convert_koclab_aym(path: Path) -> List[Dict]:
    """KocLab-Bilkent/turkish-constitutional-court"""
    results = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            r = json.loads(line)
            text = str(r.get("text") or r.get("karar") or "").strip()
            if not text or len(text) < 100:
                continue
            results.append(_msg(
                f"Bu Anayasa Mahkemesi kararını hukuki açıdan analiz et:\n\n{text[:2500]}",
                f"Bu karar, Anayasa Mahkemesi tarafından şu değerlendirme ile karara bağlanmıştır:\n\n{text[:1200]}"
            ))
    return results


def convert_yargitay_2025(path: Path) -> List[Dict]:
    """Yargıtay 9. Daire 2025 kararları"""
    results = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            r = json.loads(line)
            text = str(r.get("text") or "").strip()
            if not text or len(text) < 100:
                continue
            # Daire bilgisi
            daire = str(r.get("daire") or "Yargıtay 9. Hukuk Dairesi").strip()
            esas = str(r.get("esas_no") or r.get("esasNo") or "").strip()
            karar = str(r.get("karar_no") or r.get("kararNo") or "").strip()
            header = daire
            if esas:
                header += f" | Esas: {esas}"
            if karar:
                header += f" | Karar: {karar}"
            results.append(_msg(
                f"Aşağıdaki Yargıtay kararını analiz et:\n\n{header}\n\n{text[:2500]}",
                f"Bu Yargıtay kararının analizi:\n\n{text[:1500]}"
            ))
    return results


def convert_law_qa(path: Path) -> List[Dict]:
    """turkish_law_dataset.xls / extra_law_qa: soru + cevap + context"""
    results = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            r = json.loads(line)
            q = str(r.get("question") or r.get("soru") or "").strip()
            a = str(r.get("answer") or r.get("cevap") or "").strip()
            if not q or not a or len(a) < 30:
                continue
            results.append(_msg(q, a))
    return results


def convert_legal_nli(path: Path) -> List[Dict]:
    """Turkish-NLI/legal_nli_TR_V1: premise + hypothesis + label"""
    results = []
    label_map = {
        "entailment": "Bu iki ifade arasında çıkarım ilişkisi vardır. İkinci ifade, birincisinden mantıksal olarak çıkmaktadır.",
        "contradiction": "Bu iki ifade birbiriyle çelişmektedir. Bir doğruysa, diğeri yanlış olmalıdır.",
        "neutral": "Bu iki ifade arasında belirli bir çıkarım ilişkisi yoktur. Birinin doğruluğu, diğerinin durumunu belirlemez.",
        "ENTAILMENT": "Bu iki ifade arasında çıkarım ilişkisi vardır.",
        "CONTRADICTION": "Bu iki ifade birbiriyle çelişmektedir.",
        "NEUTRAL": "Bu iki ifade arasında belirli bir çıkarım ilişkisi yoktur.",
    }
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            r = json.loads(line)
            premise = str(r.get("premise") or "").strip()
            hyp = str(r.get("hypothesis") or "").strip()
            label = str(r.get("label") or "").strip()
            if not premise or not hyp:
                continue
            label_text = label_map.get(label, "")
            if not label_text:
                continue
            results.append(_msg(
                f"Aşağıdaki iki hukuki ifade arasındaki ilişkiyi değerlendir:\n\n"
                f"İfade 1: {premise}\n\nİfade 2: {hyp}",
                label_text
            ))
    return results


def convert_ontology(path: Path) -> List[Dict]:
    """hayriyigit/turkish-law-ontology: instruction-following format"""
    results = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            r = json.loads(line)
            inp = str(r.get("input") or "").strip()
            out = str(r.get("output") or "").strip()
            sys_p = str(r.get("system_prompt") or "").strip()
            if not inp or not out or len(out) < 50:
                continue
            # Use the decision text as the basis for Q&A
            results.append(_msg(
                f"Bu mahkeme kararını analiz et ve yapılandırılmış bilgi çıkar:\n\n{inp[:2000]}",
                out[:1500]
            ))
    return results


CONVERTERS = [
    ("extra_orion_qa.jsonl", convert_orion_qa),
    ("extra_eqa.jsonl", convert_eqa),
    ("extra_chatbot.jsonl", convert_chatbot),
    ("extra_aym_decisions.jsonl", convert_aym),
    ("extra_koclab_aym.jsonl", convert_koclab_aym),
    ("extra_yargitay_2025.jsonl", convert_yargitay_2025),
    ("extra_law_qa.jsonl", convert_law_qa),
    ("extra_ontology.jsonl", convert_ontology),
    ("legal_nli.jsonl", convert_legal_nli),
]


def build_extra_qa(output_path: Path) -> int:
    """Tüm extra datasetleri Q&A formatına çevirip output_path'e yazar."""
    total = 0
    with output_path.open("w", encoding="utf-8") as fout:
        for filename, converter in CONVERTERS:
            src = RAW_DIR / filename
            if not src.exists():
                print(f"  [SKIP] {filename} bulunamadı")
                continue
            try:
                examples = converter(src)
                for ex in examples:
                    fout.write(json.dumps(ex, ensure_ascii=False) + "\n")
                total += len(examples)
                print(f"  ✓ {filename}: {len(examples):,} örnek")
            except Exception as e:
                print(f"  [HATA] {filename}: {e}")
    return total


def append_to_train(extra_path: Path, train_path: Path) -> int:
    """extra_qa.jsonl'i mevcut train.jsonl'e ekler."""
    if not extra_path.exists():
        print(f"[HATA] {extra_path} bulunamadı")
        return 0
    count = 0
    with train_path.open("a", encoding="utf-8") as fout:
        with extra_path.open("r", encoding="utf-8") as fin:
            for line in fin:
                fout.write(line)
                count += 1
    return count


def main():
    print("=== Extra Q&A Converter ===")
    print("")

    extra_out = PROCESSED_DIR / "extra_qa.jsonl"
    train_path = PROCESSED_DIR / "mironlaw_train.jsonl"

    if not PROCESSED_DIR.exists():
        PROCESSED_DIR.mkdir(parents=True)

    print("Extra datasetler Q&A formatına çevriliyor...")
    n = build_extra_qa(extra_out)
    print(f"\nToplam: {n:,} ek eğitim örneği → {extra_out}")

    if train_path.exists():
        print(f"\nmironlaw_train.jsonl'e ekleniyor...")
        added = append_to_train(extra_out, train_path)
        total = sum(1 for _ in train_path.open("r", encoding="utf-8"))
        print(f"Eklendi: {added:,} | Toplam train: {total:,}")
    else:
        print(f"\n[WARN] {train_path} henüz yok. Ana pipeline bittikten sonra tekrar çalıştır.")

    # Split güncelle
    if train_path.exists():
        import random as rnd
        lines = train_path.read_text(encoding="utf-8").strip().splitlines()
        rnd.shuffle(lines)
        split = int(len(lines) * 0.98)
        (PROCESSED_DIR / "train.jsonl").write_text("\n".join(lines[:split]), encoding="utf-8")
        (PROCESSED_DIR / "val.jsonl").write_text("\n".join(lines[split:]), encoding="utf-8")
        print(f"\nSplit: train={split:,} | val={len(lines)-split:,}")

    print("\n=== TAMAMLANDI ===")


if __name__ == "__main__":
    main()
