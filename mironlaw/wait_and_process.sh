#!/usr/bin/env bash
# HF 700k download tamamlanana kadar bekler, sonra dedup + QA çalıştırır.
# Kullanım: bash wait_and_process.sh [HF_TOKEN]
#   HF_TOKEN varsa dataset'i HuggingFace'e push eder.
#
# ARKA PLANDA çalıştır:
#   nohup bash wait_and_process.sh hf_xxx > /tmp/mironlaw_process.log 2>&1 &

set -e
cd "$(dirname "$0")"

HF_TOKEN="${1:-}"
HF_FILE="raw_data/hf_700k.jsonl"

echo "[$(date)] Bekleniyor: $HF_FILE..."

# HF download tamamlanana kadar bekle
while [ ! -f "$HF_FILE" ]; do
    BLOBS=$(find ~/.cache/huggingface/hub/datasets--erdem-erdem--Turkish-Law-Documents-700k-clustered/ -name "train-*.parquet" 2>/dev/null | wc -l | tr -d ' ')
    echo "[$(date)] Download devam ediyor: $BLOBS/9 parquet dosyası hazır"
    sleep 60
done

# Dosya hala yazılıyor olabilir — boyut duraksayana kadar bekle
PREV_SIZE=0
while true; do
    CURR_SIZE=$(stat -f%z "$HF_FILE" 2>/dev/null || echo 0)
    if [ "$CURR_SIZE" -eq "$PREV_SIZE" ] && [ "$CURR_SIZE" -gt 0 ]; then
        break
    fi
    PREV_SIZE=$CURR_SIZE
    echo "[$(date)] Dosya yazılıyor: ${CURR_SIZE} byte"
    sleep 30
done

echo "[$(date)] HF download tamamlandı: $HF_FILE ($(du -h "$HF_FILE" | cut -f1))"
echo ""

echo "[$(date)] ADIM 2: Deduplication..."
python3 -m data.pipeline --step dedup
echo ""

echo "[$(date)] ADIM 3: Q&A dataset oluşturuluyor..."
python3 -m data.pipeline --step build_qa
echo ""

echo "[$(date)] İstatistikler:"
for f in processed/*.jsonl; do
    [ -f "$f" ] && echo "  $f: $(wc -l < "$f" | tr -d ' ') satır ($(du -h "$f" | cut -f1))"
done

if [ -n "$HF_TOKEN" ]; then
    echo "[$(date)] ADIM 4: HuggingFace'e push ediliyor..."
    python3 -c "from huggingface_hub import login; login(token='$HF_TOKEN')"
    python3 -m data.pipeline --step push_hf --hf-repo mironintelligence/mironlaw-train-data
    echo "[$(date)] Push tamamlandı!"
else
    echo "[$(date)] HF_TOKEN verilmedi — push atlandı."
    echo "       Dataset hazır: processed/train.jsonl"
    echo "       Push için: python3 -m data.pipeline --step push_hf --hf-repo mironintelligence/mironlaw-train-data"
fi

echo ""
echo "=== PIPELINE TAMAMLANDI ==="
echo "Sıradaki adım: Kaggle'da training/mironlaw_kaggle.ipynb çalıştır"
