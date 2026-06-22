ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at  TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_granted_by  UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_granted_by_name TEXT;

CREATE INDEX IF NOT EXISTS idx_users_sub_expires ON users(subscription_expires_at)
    WHERE subscription_expires_at IS NOT NULL;
