-- Phase 2: Security Hardening

-- 1. Add Token Version for Global Logout
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT DEFAULT 1;

-- 2. Ensure Audit Logs have severity index
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);

-- 3. Add index for session expiration to cleanup fast
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- 4. Ensure Users email is lowercased (if not enforced by app, enforce by DB constraint)
-- Note: Citext extension is better but we use TEXT. 
-- We can add a check constraint for lowercase email if desired, but app handles it.

-- 5. Add a comment on critical columns
COMMENT ON COLUMN users.token_version IS 'Increment this to invalidate all existing tokens for the user (Global Logout)';
COMMENT ON COLUMN users.refresh_token_hash IS 'Hash of the current refresh token (Rotation)';
