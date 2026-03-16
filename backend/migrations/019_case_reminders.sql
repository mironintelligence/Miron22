CREATE TABLE IF NOT EXISTS case_reminders (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    details TEXT,
    due_at TIMESTAMPTZ NOT NULL,
    notified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_reminders_user_due ON case_reminders(user_id, due_at);
CREATE INDEX IF NOT EXISTS idx_case_reminders_notified_at ON case_reminders(notified_at);

