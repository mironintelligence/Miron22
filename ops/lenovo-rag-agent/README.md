# Lenovo RAG Agent

Minimal Debian/Ubuntu server on the Lenovo can run Miron support services without using the MacBook:

- PostgreSQL 16 with `pgvector`
- Ollama local model server
- A small health-check agent via `systemd`

This is intentionally conservative for an 8 GB RAM / low-power laptop. The default model is:

```bash
qwen2.5:1.5b-instruct
```

It is not meant to replace Groq for hard reasoning. It is meant to reduce Groq usage by handling:

- retrieval
- short summaries
- source listing
- simple RAG answers
- cached/common questions

## One-command Install

After installing Debian 12 minimal and enabling internet:

```bash
cd /path/to/Miron22/ops/lenovo-rag-agent
sudo bash install.sh
```

Optional model override:

```bash
sudo MIRON_MODEL_NAME=qwen3:1.7b bash install.sh
```

## Endpoints

Postgres listens only on localhost:

```text
127.0.0.1:5432
```

Ollama listens only on localhost:

```text
http://127.0.0.1:11434
http://127.0.0.1:11434/v1
```

Use an SSH tunnel, Tailscale, or a backend running on the same machine to reach these services.

## Checks

```bash
cd /opt/miron-rag-agent
docker compose ps
curl http://127.0.0.1:11434/api/tags
journalctl -u miron-rag-agent.service -n 100 --no-pager
```

## Generated Secrets

The installer creates:

```text
/opt/miron-rag-agent/.env
```

It contains the local Postgres password. Do not commit it.

