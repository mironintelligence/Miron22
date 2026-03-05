-- 011_hardening_schema.sql
-- Database Hardening & Fingerprinting

-- 1. Add Fingerprint Column for Semantic Dedup (SimHash/MinHash stored as text or big int)
ALTER TABLE decisions ADD COLUMN IF NOT EXISTS fingerprint TEXT;

-- 2. Indexes for Hardening
CREATE INDEX IF NOT EXISTS idx_decisions_fingerprint ON decisions(fingerprint);
CREATE INDEX IF NOT EXISTS idx_decisions_source_url ON decisions(source_url);

-- 3. Ensure Constraints (Already exist but reinforcing)
-- Hash is already UNIQUE NOT NULL
-- Source URL should ideally be unique per source, but let's make it unique global for now if possible, or (source, source_url)
-- Existing data has unique source_url so we can add constraint.
ALTER TABLE decisions ADD CONSTRAINT unique_source_url UNIQUE (source_url);

-- 4. Not Nulls (Already checked in audit, but enforcing)
ALTER TABLE decisions ALTER COLUMN full_text SET NOT NULL;
ALTER TABLE decisions ALTER COLUMN source SET NOT NULL;
