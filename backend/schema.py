from db import get_db_cursor


def ensure_schema() -> None:
    statements = [
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
    ]

    with get_db_cursor() as cur:
        for s in statements:
            cur.execute(s)
