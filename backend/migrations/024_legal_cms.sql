-- Legal CMS: versioned documents + append-only user acceptances

CREATE TABLE IF NOT EXISTS legal_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN (
        'terms', 'privacy', 'dpa', 'cookie', 'ai_terms', 'disclaimer', 'kvkk'
    )),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    version TEXT NOT NULL,
    version_number INT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    requires_acceptance BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_by UUID REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT legal_documents_type_version_unique UNIQUE (type, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_legal_documents_one_active_per_type
    ON legal_documents (type)
    WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_legal_documents_type_version_num
    ON legal_documents (type, version_number DESC);

CREATE TABLE IF NOT EXISTS user_legal_acceptances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN (
        'terms', 'privacy', 'dpa', 'cookie', 'ai_terms', 'disclaimer', 'kvkk'
    )),
    document_version TEXT NOT NULL,
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT,
    acceptance_method TEXT NOT NULL CHECK (acceptance_method IN (
        'signup', 'login_modal', 'forced_update', 'migration_existing_user', 'complete_registration'
    ))
);

CREATE INDEX IF NOT EXISTS idx_user_legal_acceptances_user_type_time
    ON user_legal_acceptances (user_id, document_type, accepted_at DESC);

CREATE OR REPLACE FUNCTION forbid_user_legal_acceptances_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'user_legal_acceptances is append-only';
    END IF;
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'user_legal_acceptances is append-only';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_legal_acceptances_no_update ON user_legal_acceptances;
CREATE TRIGGER trg_user_legal_acceptances_no_update
    BEFORE UPDATE OR DELETE ON user_legal_acceptances
    FOR EACH ROW EXECUTE FUNCTION forbid_user_legal_acceptances_mutation();
