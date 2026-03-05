-- 010_master_ingestion_schema.sql
-- Master Ingestion Corpus Schema

DROP TABLE IF EXISTS decisions CASCADE;

CREATE TABLE decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,
    court TEXT NOT NULL,
    decision_date DATE,
    decision_no TEXT,
    full_text TEXT NOT NULL,
    raw_json JSONB,
    hash TEXT UNIQUE NOT NULL,
    source_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Additional fields for easier querying/filtering later
    summary TEXT,
    referenced_laws TEXT[],
    citation_count INTEGER DEFAULT 0
);

-- Optimized Indexes
CREATE INDEX idx_decisions_court ON decisions(court);
CREATE INDEX idx_decisions_date ON decisions(decision_date);
CREATE INDEX idx_decisions_hash ON decisions(hash);
CREATE INDEX idx_decisions_fts ON decisions USING GIN(to_tsvector('turkish', full_text));
