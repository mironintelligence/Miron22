# Supabase Kurulum ve Production Checklist

## 1) Proje/Region Tutarlılığı

- `SUPABASE_URL` ve `SUPABASE_KEY` aynı Supabase projesine ait olmalı.
- `DATABASE_URL` aynı proje ref’i içermeli ve doğru region pooler host’una gitmeli.

Örnek (Frankfurt / eu-central-1, transaction pooler):

- `SUPABASE_URL=https://ffvdyjvmwmbtxqvqwhtt.supabase.co`
- `DATABASE_URL=postgresql://postgres.ffvdyjvmwmbtxqvqwhtt:<DB_PASSWORD>@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require`

## 2) Render Environment Variables

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `DATABASE_URL` (sslmode=require ile)
- `JWT_SECRET`
- `SECRET_KEY`
- `DATA_HASH_KEY`
- `DATA_ENCRYPTION_KEY`
- `OPENAI_API_KEY`

## 3) Migration Uygulama Sırası

Supabase SQL Editor üzerinden sırasıyla çalıştır:

1. `backend/migrations/001_initial_schema.sql`
2. `backend/migrations/002_security_hardening.sql`
3. `backend/migrations/003_performance_indexes.sql`
4. `backend/migrations/014_comprehensive_schema.sql`
5. `backend/migrations/015_rls_policies.sql` (opsiyonel, Supabase API ile tablo erişimi kullanılacaksa)

## 4) RLS Stratejisi (Öneri)

Bu backend, Postgres’e doğrudan bağlanıp CRUD yapar. Supabase API (PostgREST) üzerinden client-side erişim planlanıyorsa:

- `users`, `sessions`, `audit_logs` tablolarını client-side erişime açma.
- Client-side ihtiyaçlar için ayrı tablolar (`notifications`, `user_contracts`) üzerinde RLS policy uygula.

## 5) Güvenlik Notları

- DB şifresi sızdıysa hemen rotate et.
- `DEFAULT_ADMIN_PASSWORD` sadece ilk kurulum için kullan; `BOOTSTRAP_MODE=true` olmadan admin bootstrap yapılmaz.

