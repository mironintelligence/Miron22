# Miron AI - Yargıtay Search Engine

## Overview
This project includes a Hybrid Search Engine for Yargıtay (Supreme Court) decisions, combining Semantic Search (pgvector) and Full-Text Search (tsvector).

## Setup

### Database
The system requires PostgreSQL with `pgvector` extension.

1. **Migration**: Run the SQL script to create table and indexes.
   ```bash
   psql -d <db_name> -f backend/migrations/001_create_decisions.sql
   ```

2. **Seeding**: Populate the database with sample decisions and embeddings.
   ```bash
   # Ensure DATABASE_URL is set in .env
   python3 backend/scripts/seed_yargitay.py
   ```

## Search API

### Endpoint
`GET /api/search/decisions`

### Parameters
- `q` (required): Search query string.
- `year` (optional): Filter by year (e.g., 2023).
- `court` (optional): Filter by court (e.g., "Yargıtay").
- `chamber` (optional): Filter by chamber (e.g., "3. Hukuk Dairesi").

### Example Request
```bash
curl -X GET "http://localhost:8000/api/search/decisions?q=kira+tahliye&year=2023" \
     -H "Authorization: Bearer demo"
```

### Example Response
```json
{
  "query": "kira tahliye",
  "results": [
    {
      "id": "uuid...",
      "decision_number": "2023/1452 K.",
      "court": "Yargıtay",
      "chamber": "3. Hukuk Dairesi",
      "date": "2023-11-15",
      "summary": "...",
      "outcome": "ONAMA",
      "semantic_score": 0.92,
      "keyword_rank": 0.45,
      "final_score": 0.85
    }
  ]
}
```

## Hybrid Scoring Algorithm
The final score is calculated using a Weighted Sum model:
```python
Final Score = (Semantic Score * 0.65) + (Keyword Rank * 0.35)
```
- **Semantic Score**: Cosine similarity (1 - distance) between query embedding and document embedding.
- **Keyword Rank**: PostgreSQL `ts_rank_cd` score normalized (clamped to 1.0).

## Testing
Run the automated tests to verify logic:
```bash
pytest backend/tests/test_yargitay_search.py -v
```
