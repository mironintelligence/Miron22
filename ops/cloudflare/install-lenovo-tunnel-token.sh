#!/usr/bin/env bash
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Bu script Lenovo'da root olarak calismali." >&2
  exit 2
fi

if [[ -z "${TUNNEL_TOKEN:-}" ]]; then
  echo "TUNNEL_TOKEN eksik. Cloudflare Zero Trust Tunnel token'i env olarak ver." >&2
  exit 2
fi

systemctl disable --now miron-cloudflared-quick.service 2>/dev/null || true
systemctl stop cloudflared.service 2>/dev/null || true
cloudflared service uninstall 2>/dev/null || true

cloudflared service install "${TUNNEL_TOKEN}"
systemctl enable --now cloudflared.service

sleep 3
systemctl --no-pager --full status cloudflared.service || true
echo "Named tunnel connector kuruldu. Cloudflare tarafinda public hostname:"
echo "  lenovo-api.mironintelligence.com -> http://127.0.0.1:8000"
echo "Backend health:"
curl -fsS http://127.0.0.1:8000/api/health
echo
