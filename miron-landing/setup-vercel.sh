#!/bin/bash
# Miron Landing — Vercel ilk kurulum scripti
# Bu scripti bir kez çalıştır, sonra her push otomatik deploy eder.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "=== Miron Landing Page — Vercel Kurulum ==="
echo ""

# 1. Vercel CLI kur
if ! command -v vercel &> /dev/null; then
  echo "Vercel CLI kuruluyor..."
  npm install -g vercel
fi

# 2. Vercel projesini link et ve deploy et
echo "Vercel'e bağlanılıyor..."
echo "(Tarayıcıda bir kez login gerekiyor)"
echo ""
vercel --prod --yes

echo ""
echo "=== Kurulum tamamlandı ==="
echo ""
echo "Sonraki adım (GitHub Actions için):"
echo "1. https://vercel.com/account/tokens → yeni token oluştur"
echo "2. GitHub repo → Settings → Secrets → VERCEL_TOKEN olarak ekle"
echo ""
echo "Bundan sonra her 'git push' otomatik deploy tetikler."
