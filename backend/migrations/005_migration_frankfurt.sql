-- PHASE 0: SCHEMA RECREATION (IF EMPTY DB)
-- This ensures tables exist before applying hardening

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    first_name TEXT,
    last_name TEXT,
    role TEXT DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    last_login_ip TEXT,
    refresh_token_hash TEXT,
    demo_expires_at TIMESTAMPTZ,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMPTZ,
    token_version INT DEFAULT 1
);

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

CREATE TABLE IF NOT EXISTS discount_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    discount_percent INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PHASE 3: SECURITY HARDENING
-- Run this in Frankfurt Project SQL Editor

-- 1. Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;

-- 2. Create Policies

-- Users
DROP POLICY IF EXISTS "Users can read own data" ON users;
CREATE POLICY "Users can read own data" ON users
FOR SELECT USING (id = auth.uid()); 

-- Sessions
DROP POLICY IF EXISTS "Users manage own sessions" ON sessions;
CREATE POLICY "Users manage own sessions" ON sessions
FOR ALL USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Audit Logs
DROP POLICY IF EXISTS "Users read own audit logs" ON audit_logs;
CREATE POLICY "Users read own audit logs" ON audit_logs
FOR SELECT USING (user_id = auth.uid());

-- Discount Codes
DROP POLICY IF EXISTS "Public read discount codes" ON discount_codes;
CREATE POLICY "Public read discount codes" ON discount_codes
FOR SELECT USING (true);

-- PHASE 4: PERFORMANCE FIXES (INDEXES)

CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_refresh_hash_unique ON sessions(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email_unique ON users(email);

-- PHASE 5: DATABASE HARDENING

-- Updated At Trigger
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at') THEN
        DROP TRIGGER IF EXISTS update_users_modtime ON users;
        CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
    END IF;
END $$;
