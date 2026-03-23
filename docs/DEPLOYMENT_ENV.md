# Production environment (Vercel + Render)

## Backend (Render)

- `DATABASE_URL` — Supabase Postgres connection string.
- `SECRET_KEY` — Used for admin JWT and admin panel gate cookies (must be stable across deploys).
- `JWT_SECRET` — User access/refresh tokens.
- `ADMIN_PANEL_PASSWORD` — Second factor for `/admin` (not committed to git). Set to your chosen secret in Render **Environment** tab.
- `FRONTEND_ORIGINS` — Comma-separated list, e.g. `https://your-app.vercel.app` (no trailing slash). Used by CORS; avoids hardcoding only localhost.
- `FRONTEND_ORIGIN_REGEX` — Optional; default allows `https://*.vercel.app`.
- `TRUSTED_PROXY_HOSTS` — Comma-separated IPs/CIDRs of proxies that terminate TLS in front of the app (e.g. Render/Cloudflare). `127.0.0.1` for local. Use `*` only if you fully trust the deployment edge (see uvicorn `ProxyHeadersMiddleware`). Enables correct `request.client` without trusting raw `X-Forwarded-For` from clients.
- `AUTH_COOKIE_SECURE` — Default `true`; set `false` only for pure local HTTP.
- `ACCESS_TOKEN_COOKIE_SAMESITE` / `REFRESH_TOKEN_COOKIE_SAMESITE` — `strict` | `lax` | `none`. Vercel frontend + Render API = cross-site; use `none` (requires `Secure=true`, HTTPS).

## LLM (FAZ 2)

- `LLM_MODEL_PRIMARY` — default `gpt-4o-mini`.
- `LLM_MODEL_FALLBACK` — default `gpt-4o` (rate limit / bağlantı hatasında).
- `LEGAL_PIPELINE_BATCH_SIZE` — mahkeme kararı batch okuma (default `500`).

## Supabase SQL

- Birleşik migration: `supabase/migrations/20250321140000_combined_rls_admin_miron.sql` (RLS + `miron_effective_user_id` + admin promote).
- Uygulama: `python backend/scripts/apply_supabase_migration.py` (`DATABASE_URL` gerekli; `psql` veya `psycopg2`).

## Frontend (Vercel)

- `VITE_API_URL` — Full backend URL, e.g. `https://miron22.onrender.com` (no path). The app uses this for all API calls; do not rely on localhost in production.

## Supabase

Run the SQL in `supabase/migrations/20250320120000_promote_kerim_admin.sql` (or paste into SQL Editor) to add `role` if missing and set `cdtmiron@gmail.com` to `admin`.
