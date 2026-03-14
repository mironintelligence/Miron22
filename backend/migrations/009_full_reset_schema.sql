-- 009_full_reset_schema.sql
-- Kurumsal Düzey Hukuk Şeması

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

-- 3. İyileştirmeler
-- Tam metin arama için GIN indexi (Türkçe)
CREATE INDEX idx_decisions_fts ON decisions USING GIN(to_tsvector('turkish', full_text));

-- Filtreleme için BTree indexleri
CREATE INDEX idx_decisions_court ON decisions(court);
CREATE INDEX idx_decisions_date ON decisions(decision_date);
CREATE INDEX idx_decisions_source ON decisions(source);
CREATE INDEX idx_decisions_hash ON decisions(hash);

-- Benzersiz dosya araması için birleşik index (Mahkeme + Esas + Karar)
-- Not: Karar no bazı ara kararlarda boş olabilir.
CREATE INDEX idx_decisions_case_lookup ON decisions(court, file_no, decision_no);

-- 4. Bölümleme yaklaşımı (şimdilik uygulanmadı)
-- Satır sayısı çok artarsa decision_date yılına göre bölümleme yapılır.
