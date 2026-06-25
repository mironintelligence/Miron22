from db import get_db_cursor


def ensure_schema() -> None:
    statements = [
        # ------------------------------------------------------------------
        # Core identity / audit / session tables.
        # These are also created by migration 005 but we recreate them here
        # idempotently so `ensure_schema` alone is enough to boot a fresh
        # environment (e.g. local Docker without running the migration set).
        # ------------------------------------------------------------------
        """
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            first_name TEXT,
            last_name TEXT,
            role TEXT DEFAULT 'user',
            is_active BOOLEAN DEFAULT TRUE,
            is_verified BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            last_login_at TIMESTAMPTZ,
            last_login_ip TEXT,
            refresh_token_hash TEXT,
            failed_login_attempts INT DEFAULT 0,
            locked_until TIMESTAMPTZ,
            token_version INT DEFAULT 1,
            password_updated_at TIMESTAMPTZ
        );
        """,
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT DEFAULT 1;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_updated_at TIMESTAMPTZ;",
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));",
        "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);",
        "CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until) WHERE locked_until IS NOT NULL;",
        """
        CREATE TABLE IF NOT EXISTS sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            refresh_token_hash TEXT NOT NULL,
            device_fingerprint TEXT,
            ip_address TEXT,
            user_agent TEXT,
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            is_revoked BOOLEAN DEFAULT FALSE,
            revoked_at TIMESTAMPTZ,
            revoked_reason TEXT
        );
        """,
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_refresh_hash_unique ON sessions(refresh_token_hash);",
        "CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON sessions(user_id, is_revoked, expires_at);",
        """
        CREATE TABLE IF NOT EXISTS audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            action TEXT NOT NULL,
            resource TEXT,
            details JSONB,
            ip_address TEXT,
            user_agent TEXT,
            severity TEXT DEFAULT 'INFO',
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        """,
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);",
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);",
        """
        CREATE TABLE IF NOT EXISTS demo_requests (
            id UUID PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            first_name TEXT,
            last_name TEXT,
            phone TEXT,
            note TEXT,
            status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
            approved_until TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        """,
        "CREATE INDEX IF NOT EXISTS idx_demo_requests_status ON demo_requests(status);",
        "CREATE INDEX IF NOT EXISTS idx_demo_requests_email ON demo_requests(email);",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free';",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS demo_expires_at TIMESTAMPTZ;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS used_discount_code TEXT;",
        "ALTER TABLE pricing_settings ADD COLUMN IF NOT EXISTS yearly_price NUMERIC(12,2) DEFAULT 85000.00;",
        "CREATE INDEX IF NOT EXISTS idx_users_subscription_plan ON users(subscription_plan);",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_granted_by UUID;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_granted_by_name TEXT;",
        "CREATE INDEX IF NOT EXISTS idx_users_sub_expires ON users(subscription_expires_at) WHERE subscription_expires_at IS NOT NULL;",
        """
        CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            type VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        """,
        "CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);",
        "CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);",
        # Unread-count and "my notifications" are polled every minute by every
        # authed tab. A narrow composite index lets both queries plan on an
        # index-only scan without touching the heap.
        "CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);",
        """
        CREATE TABLE IF NOT EXISTS case_reminders (
            id UUID PRIMARY KEY,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            details TEXT,
            due_at TIMESTAMPTZ NOT NULL,
            notified_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        """,
        "CREATE INDEX IF NOT EXISTS idx_case_reminders_user_due ON case_reminders(user_id, due_at);",
        "CREATE INDEX IF NOT EXISTS idx_case_reminders_notified_at ON case_reminders(notified_at);",
        """
        ALTER TABLE case_reminders
            ADD COLUMN IF NOT EXISTS case_number TEXT,
            ADD COLUMN IF NOT EXISTS court TEXT,
            ADD COLUMN IF NOT EXISTS remind_offsets_minutes INT[],
            ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
        """,
        """
        CREATE TABLE IF NOT EXISTS case_reminder_triggers (
            id UUID PRIMARY KEY,
            reminder_id UUID NOT NULL REFERENCES case_reminders(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            channel TEXT NOT NULL DEFAULT 'in_app',
            trigger_at TIMESTAMPTZ NOT NULL,
            sent_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """,
        "CREATE INDEX IF NOT EXISTS idx_case_reminder_triggers_user_due ON case_reminder_triggers(user_id, trigger_at);",
        # Supporting the JOIN in /api/notifications which filters by
        # (user_id, sent_at IS NULL, trigger_at <= NOW()).
        "CREATE INDEX IF NOT EXISTS idx_case_reminder_triggers_pending ON case_reminder_triggers(user_id, trigger_at) WHERE sent_at IS NULL;",
        """
        CREATE TABLE IF NOT EXISTS contract_templates (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            category VARCHAR(100) NOT NULL,
            content TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        """,
        "CREATE INDEX IF NOT EXISTS idx_contract_templates_category ON contract_templates(category);",
        """
        CREATE TABLE IF NOT EXISTS user_contracts (
            id SERIAL PRIMARY KEY,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            original_content TEXT,
            analysis_result JSONB,
            generated_content TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS feedback_messages (
            id UUID PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            subject TEXT NOT NULL,
            message TEXT NOT NULL,
            meta_data JSONB,
            status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'resolved')),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ
        );
        """,
        "CREATE INDEX IF NOT EXISTS idx_feedback_messages_status ON feedback_messages(status);",
        "CREATE INDEX IF NOT EXISTS idx_feedback_messages_created_at ON feedback_messages(created_at);",
        """
        CREATE TABLE IF NOT EXISTS discount_codes (
            code TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            value NUMERIC(10, 2) NOT NULL,
            max_usage INT,
            used_count INT DEFAULT 0,
            expires_at TIMESTAMPTZ,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            description TEXT
        );
        """,
        "ALTER TABLE discount_codes ADD COLUMN IF NOT EXISTS type TEXT;",
        "ALTER TABLE discount_codes ADD COLUMN IF NOT EXISTS value NUMERIC(10, 2);",
        "ALTER TABLE discount_codes ADD COLUMN IF NOT EXISTS max_usage INT;",
        "ALTER TABLE discount_codes ADD COLUMN IF NOT EXISTS used_count INT DEFAULT 0;",
        "ALTER TABLE discount_codes ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;",
        "ALTER TABLE discount_codes ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;",
        "ALTER TABLE discount_codes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();",
        "ALTER TABLE discount_codes ADD COLUMN IF NOT EXISTS description TEXT;",
        """
        DO $$
        BEGIN
            ALTER TABLE discount_codes
                ADD CONSTRAINT discount_codes_type_check CHECK (type IN ('percent', 'fixed'));
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END $$;
        """,
        """
        CREATE TABLE IF NOT EXISTS legal_consents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            ip_address TEXT,
            agreed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            agreement_type TEXT NOT NULL CHECK (agreement_type IN ('SaaS', 'MSS', 'PREINFO', 'KVKK')),
            document_version_hash TEXT NOT NULL
        );
        """,
        "CREATE INDEX IF NOT EXISTS idx_legal_consents_user ON legal_consents(user_id);",
        """
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
        """,
        """
        CREATE UNIQUE INDEX IF NOT EXISTS idx_legal_documents_one_active_per_type
            ON legal_documents (type) WHERE is_active;
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_legal_documents_type_version_num
            ON legal_documents (type, version_number DESC);
        """,
        """
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
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_user_legal_acceptances_user_type_time
            ON user_legal_acceptances (user_id, document_type, accepted_at DESC);
        """,
        """
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
        """,
        "DROP TRIGGER IF EXISTS trg_user_legal_acceptances_no_update ON user_legal_acceptances;",
        """
        CREATE TRIGGER trg_user_legal_acceptances_no_update
            BEFORE UPDATE OR DELETE ON user_legal_acceptances
            FOR EACH ROW EXECUTE FUNCTION forbid_user_legal_acceptances_mutation();
        """,
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_card_on_file BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;",
        # ------------------------------------------------------------------
        # Yargıtay/Danıştay kararları ve QA dataset (RAG kaynak tablosu)
        # ------------------------------------------------------------------
        """
        CREATE TABLE IF NOT EXISTS decisions (
            id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            source        TEXT NOT NULL DEFAULT '',
            court         TEXT NOT NULL DEFAULT '',
            chamber       TEXT,
            decision_date DATE,
            file_no       TEXT,
            decision_no   TEXT,
            summary       TEXT,
            full_text     TEXT NOT NULL,
            referenced_laws TEXT[] DEFAULT '{}',
            citation_count  INTEGER DEFAULT 0,
            hash          TEXT UNIQUE NOT NULL,
            metadata      JSONB DEFAULT '{}',
            created_at    TIMESTAMPTZ DEFAULT NOW(),
            updated_at    TIMESTAMPTZ DEFAULT NOW()
        );
        """,
        "ALTER TABLE decisions ADD COLUMN IF NOT EXISTS chamber TEXT;",
        "ALTER TABLE decisions ADD COLUMN IF NOT EXISTS file_no TEXT;",
        "ALTER TABLE decisions ADD COLUMN IF NOT EXISTS decision_no TEXT;",
        "ALTER TABLE decisions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';",
        "ALTER TABLE decisions ADD COLUMN IF NOT EXISTS referenced_laws TEXT[] DEFAULT '{}';",
        "ALTER TABLE decisions ADD COLUMN IF NOT EXISTS citation_count INTEGER DEFAULT 0;",
        "CREATE INDEX IF NOT EXISTS idx_decisions_fts ON decisions USING GIN(to_tsvector('turkish', full_text));",
        "CREATE INDEX IF NOT EXISTS idx_decisions_court ON decisions(court);",
        "CREATE INDEX IF NOT EXISTS idx_decisions_hash ON decisions(hash);",
        "CREATE INDEX IF NOT EXISTS idx_decisions_date ON decisions(decision_date);",
        # ------------------------------------------------------------------
        # Asistan sohbet geçmişi (Supabase kalıcı depolama)
        # ------------------------------------------------------------------
        """
        CREATE TABLE IF NOT EXISTS assistant_chats (
            id          BIGINT PRIMARY KEY,
            user_id     UUID NOT NULL,
            name        TEXT NOT NULL DEFAULT 'Yeni sohbet',
            messages    JSONB NOT NULL DEFAULT '[]',
            created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """,
        "CREATE INDEX IF NOT EXISTS idx_assistant_chats_user_updated ON assistant_chats(user_id, updated_at DESC);",
        "ALTER TABLE assistant_chats ADD COLUMN IF NOT EXISTS messages_enc TEXT;",
        "ALTER TABLE assistant_chats ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days');",
        "CREATE INDEX IF NOT EXISTS idx_assistant_chats_expires ON assistant_chats(expires_at);",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_improvement_consent BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_improvement_consent_at TIMESTAMPTZ;",
        # Şifre sıfırlama kolonları — forgot-password + OTP akışı için gerekli
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token TEXT;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_expires_at TIMESTAMPTZ;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_otp_hash TEXT;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_otp_expires TIMESTAMPTZ;",
        "CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_password_token) WHERE reset_password_token IS NOT NULL;",
    ]

    with get_db_cursor() as cur:
        for s in statements:
            cur.execute(s)
