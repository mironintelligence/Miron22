# Miron AI

## Overview
Miron AI is a production-ready legal intelligence platform for document analysis, decision search, legislation analysis, risk strategy, and legal calculators. The system is designed for secure, transient processing with strong authentication and hardened request handling.

## Requirements
- Python 3.11+
- Node 18+
- PostgreSQL 16 with pgvector extension

## Environment Variables
Set these in your secret manager or deployment environment:
- `DATABASE_URL`
- `OPENAI_API_KEY`
- `JWT_SECRET`
- `DATA_ENCRYPTION_KEY` (Fernet key)
- `DATA_HASH_KEY`
- `SUPABASE_URL` (optional)
- `SUPABASE_KEY` (optional)
- `RATE_LIMIT_WINDOW_SECONDS` (optional)
- `RATE_LIMIT_MAX_REQUESTS` (optional)

## Database Setup

### Migration
```bash
psql -d <db_name> -f backend/migrations/001_create_decisions.sql
```

### Seeding (100+ Real Decisions)
Provide a JSONL dataset and set `DECISIONS_SOURCE` to its path or URL:
```bash
export DECISIONS_SOURCE="/path/to/decisions.jsonl"
python3 backend/scripts/seed_yargitay.py
```

### Validation
```bash
python3 backend/scripts/validate_decisions.py
```

## Search API

### Decisions Search
`GET /api/search/decisions`

Parameters:
- `q` (required)
- `year` (optional)
- `court` (optional)
- `chamber` (optional)

Example:
```bash
curl -X GET "http://localhost:8000/api/search/decisions?q=kira+tahliye&year=2023"
```

Response:
```json
{
  "query": "kira tahliye",
  "results": [
    {
      "id": "uuid...",
      "decision_number": "2023/1452 K.",
      "case_number": "2023/1023 E.",
      "court": "Yargıtay",
      "chamber": "3. Hukuk Dairesi",
      "summary": "...",
      "outcome": "ONAMA",
      "semantic_score": 0.92,
      "keyword_rank": 0.45,
      "final_score": 0.85
    }
  ]
}
```

Hybrid scoring:
```
Final Score = (Semantic Score * 0.65) + (Keyword Rank * 0.35)
```

## Mevzuat API
`POST /api/mevzuat/search`

Example:
```bash
curl -X POST "http://localhost:8000/api/mevzuat/search" \
  -H "Content-Type: application/json" \
  -d '{"query":"kira tahliye", "law":"TBK", "article":"315"}'
```

## Risk & Strategy API
`POST /api/risk/analyze`

Example:
```bash
curl -X POST "http://localhost:8000/api/risk/analyze" \
  -F "case_text=Davada delil yok ve zamanaşımı söz konusu."
```

## Calculators API
Endpoints:
- `/calc/faiz-basit`
- `/calc/faiz-bilesik`
- `/calc/faiz-ticari`
- `/calc/faiz-temerrut`
- `/calc/iscilik`
- `/calc/kidem`
- `/calc/ihbar`
- `/calc/zamanasimi`
- `/calc/harc`
- `/calc/vekalet`
- `/calc/icra-masraf`

## Production Deployment Guide

### Backend
```bash
pip install -r backend/requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

### Frontend
```bash
npm -C frontend install
npm -C frontend run build
```

Deploy the frontend build output to a static host (Vercel, Netlify, or Nginx). Source maps are disabled in production builds.

## Testing
```bash
pytest backend/tests -v
npm -C frontend run build
```
