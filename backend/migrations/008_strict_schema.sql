-- 008_strict_schema.sql
-- Strict schema for production legal data

CREATE TABLE IF NOT EXISTS decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,
    court TEXT NOT NULL,
    department TEXT,
    decision_date DATE,
    file_no TEXT, -- Esas No
    decision_no TEXT, -- Karar No
    title TEXT,
    summary TEXT,
    full_text TEXT NOT NULL,
    hash TEXT UNIQUE NOT NULL, -- SHA256 content hash
    quality_score FLOAT DEFAULT 0.0,
    referenced_laws TEXT[], -- Array of strings
    tags TEXT[],
    raw_html TEXT,
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_decisions_court ON decisions(court);
CREATE INDEX IF NOT EXISTS idx_decisions_date ON decisions(decision_date);
CREATE INDEX IF NOT EXISTS idx_decisions_file_no ON decisions(file_no);
CREATE INDEX IF NOT EXISTS idx_decisions_hash ON decisions(hash);
CREATE INDEX IF NOT EXISTS idx_decisions_quality ON decisions(quality_score);

-- Full text search index
CREATE INDEX IF NOT EXISTS idx_decisions_fts ON decisions USING GIN(to_tsvector('turkish', title || ' ' || full_text));
