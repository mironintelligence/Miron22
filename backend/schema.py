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
    ]

    with get_db_cursor() as cur:
        for s in statements:
            cur.execute(s)
