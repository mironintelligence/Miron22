#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
WORKER_DIR="${REPO_ROOT}/ops/failover-gateway"

PRIMARY_ORIGIN="${PRIMARY_ORIGIN:-https://lenovo-api.mironintelligence.com}"
FALLBACK_ORIGIN="${FALLBACK_ORIGIN:-https://miron22.onrender.com}"
GATEWAY_DOMAIN="${GATEWAY_DOMAIN:-api.mironintelligence.com}"
PRIMARY_TIMEOUT_MS="${PRIMARY_TIMEOUT_MS:-2500}"
FALLBACK_TIMEOUT_MS="${FALLBACK_TIMEOUT_MS:-45000}"
FALLBACK_ON_MUTATING_5XX="${FALLBACK_ON_MUTATING_5XX:-false}"

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "CLOUDFLARE_API_TOKEN eksik. Cloudflare token'i env olarak ver." >&2
  exit 2
fi

cat > "${WORKER_DIR}/wrangler.toml" <<EOF
name = "miron-api-gateway"
main = "worker.js"
compatibility_date = "2026-06-01"

[vars]
PRIMARY_ORIGIN = "${PRIMARY_ORIGIN}"
FALLBACK_ORIGIN = "${FALLBACK_ORIGIN}"
PRIMARY_TIMEOUT_MS = "${PRIMARY_TIMEOUT_MS}"
FALLBACK_TIMEOUT_MS = "${FALLBACK_TIMEOUT_MS}"
FALLBACK_ON_MUTATING_5XX = "${FALLBACK_ON_MUTATING_5XX}"

routes = [
  { pattern = "${GATEWAY_DOMAIN}/*", custom_domain = true }
]
EOF

cd "${WORKER_DIR}"
npx --yes wrangler@latest deploy

echo "Worker deploy tamam: https://${GATEWAY_DOMAIN}"
echo "Health test:"
curl -fsS "https://${GATEWAY_DOMAIN}/__gateway/health" || true
echo
