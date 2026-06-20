# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

**Deployment:**
- Frontend: React + Vite → Vercel (`www.mironintelligence.com`)
- Backend: FastAPI → Render (`miron22.onrender.com`, free tier — spins down)
- Database: Supabase PostgreSQL (project `ffvdyjvmwmbtxqvqwhtt`, eu-central-1)

**API proxy:** All frontend `/api/*` calls go through Vercel rewrites → Render. Never hardcode `miron22.onrender.com` in frontend code. Use relative paths (`/api/...`) or `getApiBase()` from `frontend/src/utils/api.js`.

**AI:** Groq (primary) via OpenAI SDK with `base_url="https://api.groq.com/openai/v1"`. Set `GROQ_API_KEY` in Render env vars. Embeddings always use OpenAI (`get_embedding_client()` in `backend/openai_client.py`).

**Auth flow:** JWT (8h TTL) + refresh token (7 days) stored in `sessionStorage`. Supabase auth is also wired for PKCE/magic-link flows. Backend issues tokens at `/api/auth/login`; Supabase session is checked first in `AuthProvider.bootstrap()`.

**CSRF:** Double-submit cookie pattern in `backend/middleware/csrf.py`. All state-mutating requests need `X-CSRF-Token` header; the frontend fetches the token at `/api/csrf-token`.

## Dev Commands

```bash
# Frontend
cd frontend && npm install
npm run dev          # localhost:5173
npm run build
npm run lint
npm test             # vitest (watch)
npm run test:ci      # vitest --coverage

# Backend (from repo root)
cd backend && pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Run single test
cd frontend && npx vitest run src/components/Navbar.test.jsx
cd backend && pytest tests/test_auth.py -v
```

## Key Patterns

**Branch mapping:** `main` = production (Vercel + Render deploy). `miron22` = dev/staging branch.

**Password hashing:** Argon2id via `passlib` (`backend/security.py`). Legacy PBKDF2 hashes are verified for backward-compat.

**Legal acceptance middleware:** `backend/legal_acceptance_deps.py` — all protected routes require user to have accepted latest legal docs. Returns `403 LEGAL_ACCEPTANCE_REQUIRED` if not accepted.

**LLM calls:** Always use `chat_completions_create(client, model=..., ...)` from `backend/llm_gateway.py` — handles Groq/OpenAI fallback automatically.

**DB cursor:** Use `get_db_cursor(write=True/False)` context manager from `backend/db.py`. Read-only queries go to replica when `DB_READ_REPLICA_URL` is set.

**Schema migrations:** Add new `ALTER TABLE` statements to `backend/schema.py` `_MIGRATIONS` list. They run on startup via `apply_migrations()`.

**Company name:** Miron GROUP LLC (not "Miron Intelligence Ltd").
