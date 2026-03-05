-- Performance Indexes & Constraints Audit
-- LEVEL 1 Requirement: Constraint & Index Audit

-- 1. Token Version Index (For Auth Checks)
CREATE INDEX IF NOT EXISTS idx_users_token_version ON users(token_version);

-- 2. Created At Indexes (For Sorting/Filtering)
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- 3. Refresh Token Hash Index (For Fast Lookup during Refresh)
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_hash ON sessions(refresh_token_hash);

-- 4. Device Fingerprint Index (For Security Analysis)
CREATE INDEX IF NOT EXISTS idx_sessions_fingerprint ON sessions(device_fingerprint);

-- 5. Rate Limit Analysis (If we were storing rate limits in DB, but we use Redis/Mem)
-- However, we can index failed_login_attempts for security queries
CREATE INDEX IF NOT EXISTS idx_users_failed_login ON users(failed_login_attempts) WHERE failed_login_attempts > 0;

-- 6. Locked Users Index
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until) WHERE locked_until IS NOT NULL;
