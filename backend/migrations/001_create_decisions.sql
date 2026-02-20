-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create decisions table
CREATE TABLE IF NOT EXISTS decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    court VARCHAR NOT NULL,
    chamber VARCHAR NOT NULL,
    decision_date DATE,
    decision_number VARCHAR,
    case_number VARCHAR,
    raw_text TEXT,
    clean_text TEXT NOT NULL,
    summary TEXT,
    outcome VARCHAR,
    embedding VECTOR(3072),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
-- Vector index (IVFFlat) for cosine similarity
CREATE INDEX IF NOT EXISTS idx_embedding ON decisions USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Full-text search index (GIN) for Turkish text
CREATE INDEX IF NOT EXISTS idx_fulltext ON decisions USING GIN(to_tsvector('turkish', clean_text));
