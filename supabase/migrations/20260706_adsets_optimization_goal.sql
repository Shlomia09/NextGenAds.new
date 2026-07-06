-- ============================================================
-- Migration: Add optimization_goal + insights columns to ad_sets
-- Enables per-adset conversion goal tracking (ATC, View Content, etc.)
-- ============================================================

ALTER TABLE ad_sets
  ADD COLUMN IF NOT EXISTS optimization_goal  text,
  ADD COLUMN IF NOT EXISTS conversion_event   text,   -- friendly label: 'ATC', 'View Content', 'Purchases'…
  ADD COLUMN IF NOT EXISTS spend              numeric  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS impressions        bigint   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicks             integer  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS results            integer  DEFAULT 0,   -- count of the adset's primary conversion action
  ADD COLUMN IF NOT EXISTS cost_per_result    numeric  DEFAULT 0;

-- Index for fast lookup by campaign + status
CREATE INDEX IF NOT EXISTS idx_ad_sets_campaign_status ON ad_sets(campaign_id, status);
