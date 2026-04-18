-- Hot-path polling indexes.
-- Notifications /api/notifications and /api/notifications/unread-count are
-- polled by every authed browser tab. A composite (user_id, is_read,
-- created_at DESC) lets both queries plan on a narrow index-only scan.
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, is_read, created_at DESC);

-- Partial index supporting the JOIN in notification polling:
--   WHERE t.user_id = %s AND t.sent_at IS NULL AND t.trigger_at <= NOW()
-- Scoped to sent_at IS NULL so the index stays small over time.
CREATE INDEX IF NOT EXISTS idx_case_reminder_triggers_pending
  ON case_reminder_triggers (user_id, trigger_at)
  WHERE sent_at IS NULL;
