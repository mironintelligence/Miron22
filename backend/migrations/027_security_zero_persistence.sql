-- Migration 027: Zero-Persistence Security Hardening
-- KVKK Madde 12 uyumu + avukat sır saklama yükümlülüğü
-- Audit log'da içerik (dosya, sorgu, AI yanıtı) ASLA saklanmaz; yalnızca metadata.

BEGIN;

-- ---------------------------------------------------------------
-- 1. sessions tablosuna güvenlik kolonları ekle
-- ---------------------------------------------------------------
ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS login_time      TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS logout_time     TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS activity_count  INT         DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_activity   TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_sessions_last_activity
    ON sessions (last_activity DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_active_user
    ON sessions (user_id, is_revoked, last_activity)
    WHERE is_revoked = FALSE;

-- ---------------------------------------------------------------
-- 2. audit_logs tablosuna güvenlik/KVKK kolonları ekle
-- ---------------------------------------------------------------
ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS session_id  UUID REFERENCES sessions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS action_type TEXT,   -- 'document_upload' | 'query' | 'search'
    ADD COLUMN IF NOT EXISTS file_size   INT,    -- byte cinsinden boyut; içerik değil
    ADD COLUMN IF NOT EXISTS query_type  TEXT,   -- 'decision_search' | 'legislation' | 'risk_analysis'
    ADD COLUMN IF NOT EXISTS filename_hash TEXT; -- orijinal dosya adı değil, SHA-256 hash'i

CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id
    ON audit_logs (session_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type
    ON audit_logs (action_type);

-- ---------------------------------------------------------------
-- 3. audit_logs içerik-yasağı trigger
--    details JSONB'de yasaklı anahtarlar (içerik, metin, yanıt) varsa REJECT et.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION audit_logs_no_content_check()
RETURNS TRIGGER AS $$
DECLARE
    forbidden TEXT[] := ARRAY[
        'content', 'text', 'body', 'response', 'answer',
        'query_text', 'file_content', 'message', 'prompt',
        'document', 'extracted_text', 'ai_response'
    ];
    key TEXT;
BEGIN
    IF NEW.details IS NOT NULL THEN
        FOREACH key IN ARRAY forbidden LOOP
            IF NEW.details ? key THEN
                RAISE EXCEPTION
                    'KVKK ihlali: audit_logs.details içinde "%" anahtarı kullanılamaz (içerik saklanamaz)',
                    key;
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_no_content ON audit_logs;
CREATE TRIGGER trg_audit_no_content
    BEFORE INSERT OR UPDATE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION audit_logs_no_content_check();

-- ---------------------------------------------------------------
-- 4. Expired session auto-cleanup function
--    Cron veya uygulama katmanından çağrılır.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION purge_expired_sessions()
RETURNS INT AS $$
DECLARE
    deleted INT;
BEGIN
    DELETE FROM sessions
    WHERE expires_at < NOW() - INTERVAL '7 days'
       OR (is_revoked = TRUE AND revoked_at < NOW() - INTERVAL '24 hours');
    GET DIAGNOSTICS deleted = ROW_COUNT;
    RETURN deleted;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------
-- 5. Session inactivity timeout view (30 dakika)
-- ---------------------------------------------------------------
CREATE OR REPLACE VIEW active_sessions_view AS
SELECT
    s.id,
    s.user_id,
    s.ip_address,
    s.login_time,
    s.last_activity,
    s.activity_count,
    EXTRACT(EPOCH FROM (NOW() - s.last_activity)) / 60 AS idle_minutes
FROM sessions s
WHERE s.is_revoked = FALSE
  AND s.expires_at > NOW()
  AND s.last_activity > NOW() - INTERVAL '30 minutes';

COMMIT;
