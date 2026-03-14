-- pgvector eklentisini etkinleştir
CREATE EXTENSION IF NOT EXISTS vector;

-- decisions tablosunu oluştur
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

-- Indexleri oluştur
-- Kosinüs benzerliği için vektör indexi (IVFFlat)
CREATE INDEX IF NOT EXISTS idx_embedding ON decisions USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Türkçe metin için tam metin arama indexi (GIN)
CREATE INDEX IF NOT EXISTS idx_fulltext ON decisions USING GIN(to_tsvector('turkish', clean_text));
