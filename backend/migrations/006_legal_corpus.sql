-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. LEGAL DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS legal_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL, -- 'law', 'regulation', 'case_law'
    title TEXT NOT NULL,
    court TEXT, -- 'Yargıtay', 'Danıştay' etc.
    chamber TEXT, -- '9. Hukuk Dairesi'
    decision_no TEXT, -- '2023/12345'
    basis_no TEXT, -- '2023/54321'
    date DATE,
    text TEXT NOT NULL, -- Full text
    summary TEXT,
    metadata JSONB DEFAULT '{}'::jsonb, -- Flexible metadata
    source_url TEXT UNIQUE, -- Prevent duplicates via URL
    hash TEXT UNIQUE, -- Content hash for duplicate detection
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Filtering
CREATE INDEX IF NOT EXISTS idx_legal_docs_type ON legal_documents(type);
CREATE INDEX IF NOT EXISTS idx_legal_docs_court ON legal_documents(court);
CREATE INDEX IF NOT EXISTS idx_legal_docs_date ON legal_documents(date);
CREATE INDEX IF NOT EXISTS idx_legal_docs_metadata ON legal_documents USING GIN(metadata);
-- Full Text Search Index
CREATE INDEX IF NOT EXISTS idx_legal_docs_fts ON legal_documents USING GIN(to_tsvector('turkish', title || ' ' || text));

-- 2. LEGAL EMBEDDINGS (CHUNKS)
-- Note: Creating table if NOT exists might skip the change if it partially exists.
-- We should drop it if we are changing schema drastically in dev phase.
DROP TABLE IF EXISTS legal_embeddings CASCADE;

CREATE TABLE legal_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES legal_documents(id) ON DELETE CASCADE,
    chunk_index INT,
    article_number TEXT,
    section TEXT, -- 'gerekçe', 'hüküm', 'karşı_oy'
    chunk_text TEXT NOT NULL,
    embedding VECTOR(3072), -- text-embedding-3-large dimension (UPGRADED)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW Index for Vector Search (Supabase free/pro tier limit is often 2000 dim for HNSW, but pgvector supports more. 
-- We use 1536 for text-embedding-3-small or reduce dims. 
-- Wait, text-embedding-3-large is 3072. 
-- Error says: column cannot have more than 2000 dimensions for hnsw index.
-- This is a pgvector limitation on HNSW. IVFFlat supports up to 16000.
-- We must switch to IVFFlat OR reduce dimensions. 
-- OpenAI supports dimension reduction via API. Or we use text-embedding-3-small (1536).
-- Let's switch to text-embedding-3-small (1536) for better compatibility and cost.)

-- 2. LEGAL EMBEDDINGS (CHUNKS) - UPDATED TO 1536 DIMENSIONS (Back to Small due to PGVector Limits)
-- pgvector 0.5.0 supports up to 2000 dims for indexing (IVFFlat/HNSW). 
-- text-embedding-3-large is 3072 dims.
-- To use large model, we MUST use dimensionality reduction (matryoshka) to 1536 or 2000.
-- Or we stick to text-embedding-3-small (1536 dims).
-- Given the constraints, text-embedding-3-small is safer and cheaper for 100k docs.
-- REVERTING TO 1536.

DROP TABLE IF EXISTS legal_embeddings CASCADE;

CREATE TABLE IF NOT EXISTS legal_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES legal_documents(id) ON DELETE CASCADE,
    chunk_index INT,
    article_number TEXT,
    section TEXT, 
    chunk_text TEXT NOT NULL,
    embedding VECTOR(1536), -- text-embedding-3-small
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW Index for Vector Search (1536 dims works with HNSW)
CREATE INDEX IF NOT EXISTS idx_legal_embeddings_vec ON legal_embeddings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_legal_embeddings_doc_id ON legal_embeddings(document_id);

-- 3. UPDATE LOG
CREATE TABLE IF NOT EXISTS legal_updates_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,
    documents_added INT DEFAULT 0,
    documents_updated INT DEFAULT 0,
    status TEXT, 
    error_message TEXT,
    run_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. HYBRID SEARCH FUNCTION (Updated signature)
DROP FUNCTION IF EXISTS search_legal_documents;

CREATE OR REPLACE FUNCTION search_legal_documents(
    query_embedding VECTOR(1536),
    query_text TEXT,
    match_threshold FLOAT,
    match_count INT,
    filter_court TEXT DEFAULT NULL,
    filter_date_from DATE DEFAULT NULL,
    filter_type TEXT DEFAULT NULL
)
RETURNS TABLE (
    document_id UUID,
    chunk_id UUID,
    chunk_text TEXT,
    similarity FLOAT,
    rank_score FLOAT,
    metadata JSONB,
    title TEXT,
    date DATE
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.document_id,
        e.id AS chunk_id,
        e.chunk_text,
        (1 - (e.embedding <=> query_embedding)) AS similarity,
        ts_rank(to_tsvector('turkish', d.text), plainto_tsquery('turkish', query_text)) AS rank_score,
        d.metadata,
        d.title,
        d.date
    FROM
        legal_embeddings e
    JOIN
        legal_documents d ON e.document_id = d.id
    WHERE
        (1 - (e.embedding <=> query_embedding)) > match_threshold
        AND (filter_court IS NULL OR d.court = filter_court)
        AND (filter_date_from IS NULL OR d.date >= filter_date_from)
        AND (filter_type IS NULL OR d.type = filter_type)
    ORDER BY
        (similarity * 0.7 + COALESCE(rank_score, 0) * 0.3) DESC
    LIMIT match_count;
END;
$$;

-- RLS POLICIES (Public Read for now, or restricted)
ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_embeddings ENABLE ROW LEVEL SECURITY;

-- Allow read for authenticated users (Check if exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'legal_documents' AND policyname = 'Allow read access'
    ) THEN
        CREATE POLICY "Allow read access" ON legal_documents FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'legal_embeddings' AND policyname = 'Allow read access embeddings'
    ) THEN
        CREATE POLICY "Allow read access embeddings" ON legal_embeddings FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Service role bypasses RLS for ingestion
