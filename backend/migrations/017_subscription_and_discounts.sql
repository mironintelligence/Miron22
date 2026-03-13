ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS used_discount_code TEXT;

CREATE INDEX IF NOT EXISTS idx_users_subscription_plan ON users(subscription_plan);

