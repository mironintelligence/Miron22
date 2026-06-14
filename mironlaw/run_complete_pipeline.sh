#!/usr/bin/env bash
# MironLaw 1.1 — Tam veri pipeline'ı
# Kullanım: bash run_complete_pipeline.sh [HF_TOKEN]
#
# Bu script:
#   1. Yeni HF datasetlerini indirir (mevzuat, theses, QA)
#   2. Sentetik dilekçe/sözleşme üretir (~18k örnek)
#   3. Extra datasetleri Q&A formatına çevirir
#   4. Tüm veriyi train.jsonl'e ekler ve yeniden böler
#   5. (Opsiyonel) HuggingFace'e push eder

set -e
cd "$(dirname "$0")"

HF_TOKEN="${1:-}"
LOG="/tmp/mironlaw_complete.log"

echo "=== MironLaw 1.1 — Tam Pipeline ===" | tee -a "$LOG"
echo "[$(date)]" | tee -a "$LOG"
echo "" | tee -a "$LOG"

# ─── ADIM 1: Yeni HF datasetlerini indir ────────────────────────────────────
echo "[1/5] Yeni HF datasetleri indiriliyor..." | tee -a "$LOG"
python3 -m data.collectors.new_datasets 2>&1 | tee -a "$LOG"
echo "" | tee -a "$LOG"

# ─── ADIM 2: Sentetik dilekçe/sözleşme üret ────────────────────────────────
echo "[2/5] Sentetik dilekçe ve sözleşmeler üretiliyor..." | tee -a "$LOG"
python3 -m data.processors.dilekce_generator 2>&1 | tee -a "$LOG"
echo "" | tee -a "$LOG"

# ─── ADIM 3: Extra QA dönüşümü ───────────────────────────────────────────────
echo "[3/5] Tüm extra datasetler Q&A formatına çevriliyor..." | tee -a "$LOG"
python3 -m data.processors.extra_qa_converter 2>&1 | tee -a "$LOG"
echo "" | tee -a "$LOG"

# ─── ADIM 4: Dilekçe verilerini train'e ekle ────────────────────────────────
echo "[4/5] Dilekçe verisi train.jsonl'e ekleniyor..." | tee -a "$LOG"
DILEKCE_FILE="processed/dilekce_sozlesme.jsonl"
TRAIN_FILE="processed/mironlaw_train.jsonl"
if [ -f "$DILEKCE_FILE" ] && [ -f "$TRAIN_FILE" ]; then
    cat "$DILEKCE_FILE" >> "$TRAIN_FILE"
    COUNT=$(wc -l < "$TRAIN_FILE" | tr -d ' ')
    echo "Dilekçe eklendi. Toplam train.jsonl: $COUNT satır" | tee -a "$LOG"
    # Split güncelle
    python3 -c "
import random, pathlib
lines = pathlib.Path('$TRAIN_FILE').read_text(encoding='utf-8').strip().splitlines()
random.shuffle(lines)
split = int(len(lines) * 0.98)
pathlib.Path('processed/train.jsonl').write_text('\n'.join(lines[:split]), encoding='utf-8')
pathlib.Path('processed/val.jsonl').write_text('\n'.join(lines[split:]), encoding='utf-8')
print(f'Split: train={split:,} | val={len(lines)-split:,}')
" 2>&1 | tee -a "$LOG"
else
    echo "[WARN] train.jsonl veya dilekçe dosyası bulunamadı" | tee -a "$LOG"
fi
echo "" | tee -a "$LOG"

# ─── İstatistikler ───────────────────────────────────────────────────────────
echo "İstatistikler:" | tee -a "$LOG"
for f in processed/*.jsonl; do
    [ -f "$f" ] && echo "  $(basename $f): $(wc -l < "$f" | tr -d ' ') satır ($(du -h "$f" | cut -f1))" | tee -a "$LOG"
done
echo "" | tee -a "$LOG"

# ─── ADIM 5: HuggingFace push ────────────────────────────────────────────────
if [ -n "$HF_TOKEN" ]; then
    echo "[5/5] HuggingFace'e push ediliyor..." | tee -a "$LOG"
    python3 -c "from huggingface_hub import login; login(token='$HF_TOKEN')" 2>/dev/null
    python3 -m data.pipeline --step push_hf --hf-repo mironintelligence/mironlaw-train-data 2>&1 | tee -a "$LOG"
    echo "Push tamamlandı!" | tee -a "$LOG"
else
    echo "[5/5] HF_TOKEN verilmedi — push atlandı." | tee -a "$LOG"
    echo "      Push için: bash run_complete_pipeline.sh hf_TOKEN_HERE" | tee -a "$LOG"
fi

echo "" | tee -a "$LOG"
echo "=== MironLaw 1.1 PIPELINE TAMAMLANDI ===" | tee -a "$LOG"
echo "Log: $LOG"
echo ""
echo "SONRAKI ADIM:"
echo "  1. Kaggle'a git → mironlaw/training/mironlaw_kaggle.ipynb yükle"
echo "  2. T4 GPU seç → HF_TOKEN secret ekle"
echo "  3. Tüm hücreleri çalıştır → MironLaw 1.1 eğitilecek"
