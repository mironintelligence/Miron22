#!/usr/bin/env bash
# HF download bittikten sonra çalıştır:
#   bash run_after_collect.sh hf_YOUR_TOKEN_HERE

set -e
cd "$(dirname "$0")"

HF_TOKEN="${1:-}"

echo "=== MironLaw 1.0 — Dedup + Q&A + HF Push ==="
echo ""

echo "[1/3] Deduplication başlıyor..."
python3 -m data.pipeline --step dedup
echo ""

echo "[2/3] Q&A dataset oluşturuluyor..."
python3 -m data.pipeline --step build_qa
echo ""

if [ -n "$HF_TOKEN" ]; then
    echo "[3/3] HuggingFace'e push ediliyor..."
    export HUGGING_FACE_HUB_TOKEN="$HF_TOKEN"
    python3 -c "
from huggingface_hub import login
import os
login(token=os.environ['HUGGING_FACE_HUB_TOKEN'])
" 2>/dev/null
    python3 -m data.pipeline --step push_hf --hf-repo mironintelligence/mironlaw-train-data
else
    echo "[3/3] HF_TOKEN verilmedi — push atlandı."
    echo "      Push için: bash run_after_collect.sh hf_xxx..."
fi

echo ""
echo "=== TAMAMLANDI ==="
echo "Şimdi Kaggle'a git:"
echo "  → mironlaw/training/mironlaw_kaggle.ipynb dosyasını yükle"
echo "  → GPU T4 seç, HF_TOKEN secret ekle, tüm hücreleri çalıştır"
