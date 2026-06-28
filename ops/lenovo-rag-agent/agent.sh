#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="${MIRON_AGENT_DIR:-/opt/miron-rag-agent}"
LOG_DIR="$BASE_DIR/logs"
mkdir -p "$LOG_DIR"

cd "$BASE_DIR"

timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

log() {
  printf '[%s] %s\n' "$(timestamp)" "$*" | tee -a "$LOG_DIR/agent.log"
}

if ! command -v docker >/dev/null 2>&1; then
  log "docker missing"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  log "docker compose missing"
  exit 1
fi

log "checking containers"
docker compose ps | tee -a "$LOG_DIR/agent.log"

log "checking postgres"
docker exec miron-postgres pg_isready -U "$(grep '^POSTGRES_USER=' .env | cut -d= -f2-)" -d "$(grep '^POSTGRES_DB=' .env | cut -d= -f2-)" | tee -a "$LOG_DIR/agent.log" || true

log "checking ollama"
curl -fsS http://127.0.0.1:11434/api/tags | tee "$LOG_DIR/ollama-tags.json" >/dev/null || true

log "disk"
df -h "$BASE_DIR" | tee -a "$LOG_DIR/agent.log"

log "memory"
free -h | tee -a "$LOG_DIR/agent.log"

log "done"

