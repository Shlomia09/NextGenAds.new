-- ============================================================
-- NextGenAds — Migration: action_logs backfill + source column
-- Run in: https://supabase.com/dashboard/project/nplbghydqjapkycoiucl/sql/new
--
-- Context: The original action_logs table (20260705_heinrick_full_access.sql)
-- was a minimal schema. execute-recommendation deployed columns directly to
-- Supabase that were never recorded in git migrations. This migration:
--   1. Re-adds those columns safely (IF NOT EXISTS pattern via ADD COLUMN IF NOT EXISTS)
--   2. Adds a new `source` column to track where an action originated
-- ============================================================

-- Columns added live by execute-recommendation (not previously in migrations)
ALTER TABLE action_logs ADD COLUMN IF NOT EXISTS campaign_id        UUID        REFERENCES campaigns(id) ON DELETE SET NULL;
ALTER TABLE action_logs ADD COLUMN IF NOT EXISTS recommendation_id  UUID        REFERENCES recommendations(id) ON DELETE SET NULL;
ALTER TABLE action_logs ADD COLUMN IF NOT EXISTS baseline_snapshot  JSONB;
ALTER TABLE action_logs ADD COLUMN IF NOT EXISTS monitor_at         TIMESTAMPTZ;
ALTER TABLE action_logs ADD COLUMN IF NOT EXISTS monitoring_status  TEXT        DEFAULT 'not_scheduled';
ALTER TABLE action_logs ADD COLUMN IF NOT EXISTS monitoring_result  JSONB;

-- New: source column — tracks which UI path triggered the action
-- Values: 'recommendation' | 'quick_action' | 'ai_chat'
-- NULL = legacy rows created before this column existed
ALTER TABLE action_logs ADD COLUMN IF NOT EXISTS source TEXT
  CHECK (source IN ('recommendation', 'quick_action', 'ai_chat'));

-- Index for monitoring cron (check-recommendation-outcomes queries this)
CREATE INDEX IF NOT EXISTS idx_action_logs_monitoring
  ON action_logs(monitoring_status, monitor_at)
  WHERE monitoring_status = 'pending';

-- Index for source-based queries (future analytics)
CREATE INDEX IF NOT EXISTS idx_action_logs_source ON action_logs(brand_id, source, created_at DESC);
