-- 009_full_reset_schema.sql
-- Enterprise Grade Legal Schema

-- 1. Reset
DROP TABLE IF EXISTS decisions CASCADE;
DROP TABLE IF EXISTS legal_chunks CASCADE;
DROP TABLE IF EXISTS legal_documents CASCADE; -- Legacy

-- 2. Decisions Table (Strict Model)
CREATE TABLE decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,
    court TEXT NOT NULL, -- AYM, Yargıtay, Danıştay, BAM
    chamber TEXT,        -- Daire / Bölüm
    decision_date DATE,
    file_no TEXT,        -- Esas No
    decision_no TEXT,    -- Karar No
    summary TEXT,
    full_text TEXT NOT NULL,
    referenced_laws TEXT[], -- Array of strings
    citation_count INTEGER DEFAULT 0,
    raw_html TEXT,
    hash TEXT UNIQUE NOT NULL, -- SHA256 content hash for strict deduplication
    metadata JSONB DEFAULT '{}', -- Extra fields (pdf_url, original_id, etc)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Optimizations
-- GIN Index for Full Text Search (Turkish)
CREATE INDEX idx_decisions_fts ON decisions USING GIN(to_tsvector('turkish', full_text));

-- BTree Indexes for Filtering
CREATE INDEX idx_decisions_court ON decisions(court);
CREATE INDEX idx_decisions_date ON decisions(decision_date);
CREATE INDEX idx_decisions_source ON decisions(source);
CREATE INDEX idx_decisions_hash ON decisions(hash);

-- Composite Index for Unique Case Lookup (Court + File + Decision)
-- Note: Decision No might be null for some interim decisions, but usually present.
CREATE INDEX idx_decisions_case_lookup ON decisions(court, file_no, decision_no);

-- 4. Partitioning Concept (Not implemented yet as table is empty, but prepared via simple table first)
-- If we reach > 1M rows, we will partition by decision_date YEAR.
