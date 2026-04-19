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
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS used_discount_code TEXT;",
        "CREATE INDEX IF NOT EXISTS idx_users_subscription_plan ON users(subscription_plan);",
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
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_card_on_file BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;",
    ]

    with get_db_cursor() as cur:
        for s in statements:
            cur.execute(s)
