-- MIGRATION: 007_refactor_metadata_only.sql
-- Purpose: Remove embedding columns from Supabase (moving to Qdrant)
-- and add advanced metadata fields for the new analyzer engine.

-- 1. Remove Vector Extension dependency (if we strictly don't want it here anymore, 
-- but might keep it for hybrid search legacy compatibility or simple distance calcs)
-- keeping vector extension is fine, but we drop the column.

-- 2. Refactor Legal Documents
ALTER TABLE legal_documents 
ADD COLUMN IF NOT EXISTS quality_score FLOAT,
ADD COLUMN IF NOT EXISTS analysis_json JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending'; -- pending, processed, failed

-- Drop old hash if exists, recreate with stricter constraint if needed
-- We keep 'hash' for deduplication.

-- 3. Drop Embeddings Table (Moved to Qdrant)
DROP TABLE IF EXISTS legal_embeddings CASCADE;

-- 4. Create Ingestion Queue Table (For Parallel Workers)
CREATE TABLE IF NOT EXISTS ingestion_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_url TEXT UNIQUE NOT NULL,
    priority INT DEFAULT 0,
    status TEXT DEFAULT 'queued', -- queued, processing, completed, failed
    attempts INT DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingestion_status ON ingestion_queue(status);

-- 5. Updated Search Function (Hybrid with Qdrant - Placeholder)
-- Since Qdrant handles vectors, PG handles Metadata/FullText.
-- We will need a function that takes IDs from Qdrant and joins with PG.
-- Or we do this in Application Layer (Python).
-- Let's drop the old search function.
DROP FUNCTION IF EXISTS search_legal_documents;

-- 6. Full Text Search Config
CREATE INDEX IF NOT EXISTS idx_legal_docs_analysis ON legal_documents USING GIN(analysis_json);
