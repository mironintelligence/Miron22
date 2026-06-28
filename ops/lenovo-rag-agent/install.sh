#!/usr/bin/env bash
set -euo pipefail

AGENT_DIR="${MIRON_AGENT_DIR:-/opt/miron-rag-agent}"
MODEL_NAME="${MIRON_MODEL_NAME:-qwen2.5:1.5b-instruct}"
POSTGRES_DB="${POSTGRES_DB:-miron}"
POSTGRES_USER="${POSTGRES_USER:-miron}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo: sudo bash install.sh"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "==> Installing base packages"
apt-get update
apt-get install -y \
  ca-certificates \
  curl \
  git \
  gnupg \
  htop \
  jq \
  lsb-release \
  openssl \
  python3 \
  python3-venv \
  rsync \
  ufw

echo "==> Installing Docker"
if ! command -v docker >/dev/null 2>&1; then
  apt-get install -y docker.io docker-compose-plugin
fi
systemctl enable --now docker

echo "==> Preparing agent directory: $AGENT_DIR"
mkdir -p "$AGENT_DIR"/{data/postgres,data/ollama,initdb,logs,backups}
rsync -a "$(dirname "$0")/docker-compose.yml" "$AGENT_DIR/docker-compose.yml"
rsync -a "$(dirname "$0")/agent.sh" "$AGENT_DIR/agent.sh"
rsync -a "$(dirname "$0")/initdb/" "$AGENT_DIR/initdb/"
chmod +x "$AGENT_DIR/agent.sh"

if [ ! -f "$AGENT_DIR/.env" ]; then
  POSTGRES_PASSWORD="$(openssl rand -base64 32 | tr -d '\n')"
  cat > "$AGENT_DIR/.env" <<EOF
POSTGRES_DB=$POSTGRES_DB
POSTGRES_USER=$POSTGRES_USER
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
OLLAMA_KEEP_ALIVE=10m
OLLAMA_NUM_PARALLEL=1
OLLAMA_MAX_LOADED_MODELS=1
EOF
  chmod 600 "$AGENT_DIR/.env"
fi

echo "==> Setting conservative firewall"
ufw allow OpenSSH || true
ufw --force enable || true

echo "==> Starting services"
cd "$AGENT_DIR"
docker compose up -d

echo "==> Waiting for Ollama"
for _ in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "==> Pulling lightweight model: $MODEL_NAME"
docker exec miron-ollama ollama pull "$MODEL_NAME"

echo "==> Installing health agent service/timer"
cat > /etc/systemd/system/miron-rag-agent.service <<EOF
[Unit]
Description=Miron RAG Agent health check
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
Environment=MIRON_AGENT_DIR=$AGENT_DIR
ExecStart=$AGENT_DIR/agent.sh
EOF

cat > /etc/systemd/system/miron-rag-agent.timer <<EOF
[Unit]
Description=Run Miron RAG Agent health check every 5 minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
Unit=miron-rag-agent.service

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now miron-rag-agent.timer
systemctl start miron-rag-agent.service || true

echo
echo "==> Done"
echo "Agent dir: $AGENT_DIR"
echo "Postgres local URL:"
echo "postgresql://$POSTGRES_USER:<password-in-$AGENT_DIR/.env>@127.0.0.1:5432/$POSTGRES_DB"
echo "Ollama OpenAI-compatible base URL:"
echo "http://127.0.0.1:11434/v1"
echo
echo "Useful checks:"
echo "  cd $AGENT_DIR && docker compose ps"
echo "  journalctl -u miron-rag-agent.service -n 100 --no-pager"
echo "  curl http://127.0.0.1:11434/api/tags"

