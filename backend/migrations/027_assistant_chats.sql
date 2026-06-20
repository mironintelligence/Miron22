-- Assistant chats persistence
CREATE TABLE IF NOT EXISTS assistant_chats (
  id          BIGINT PRIMARY KEY,
  user_id     UUID NOT NULL,
  name        TEXT NOT NULL DEFAULT 'Yeni sohbet',
  messages    JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assistant_chats_user_updated
  ON assistant_chats(user_id, updated_at DESC);
