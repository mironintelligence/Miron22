-- Phase 2: Enable RLS (Mandatory Security Fix)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY; -- Uncomment if table exists

-- Phase 3: Create Secure Policies

-- Users
CREATE POLICY "Users can read own data" ON users
FOR SELECT USING (id = auth.uid()); -- Assumes users.id matches auth.uid (supabase auth) OR app handles it via context

-- Sessions
CREATE POLICY "Users manage own sessions" ON sessions
FOR ALL USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Audit Logs
CREATE POLICY "Users read own audit logs" ON audit_logs
FOR SELECT USING (user_id = auth.uid());

-- Phase 4: Fix Slow Query (Indexes)
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_hash ON sessions(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_is_revoked ON sessions(is_revoked);
CREATE INDEX IF NOT EXISTS idx_sessions_user_revoked ON sessions(user_id, is_revoked);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_refresh_hash_unique ON sessions(refresh_token_hash);

-- Phase 5: Database Hardening
-- Ensure unique email
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email);

-- Ensure created_at defaults (if not already set in schema)
ALTER TABLE users ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE sessions ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE audit_logs ALTER COLUMN created_at SET DEFAULT NOW();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers if columns exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at') THEN
        CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
    END IF;
END $$;

-- Set timeouts (Session level - applied via connection string or here for specific roles)
-- ALTER ROLE authenticated SET statement_timeout = '2s';
-- ALTER ROLE authenticated SET idle_in_transaction_session_timeout = '5s';
