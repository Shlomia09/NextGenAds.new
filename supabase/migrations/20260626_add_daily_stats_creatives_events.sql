-- ============================================================
-- NextGenAds — Migration: Daily Stats, Ad Creatives, System Events
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/nplbghydqjapkycoiucl/sql/new
-- ============================================================

-- ============================================================
-- CAMPAIGN DAILY STATS
-- Populated by meta-sync Edge Function (time_increment=1)
-- Powers the 30-day trend chart on the Dashboard
-- ============================================================
CREATE TABLE IF NOT EXISTS campaign_daily_stats (
  id         UUID      PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID     REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  brand_id   UUID      REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  date       DATE      NOT NULL,
  spend      NUMERIC   NOT NULL DEFAULT 0,
  impressions BIGINT   NOT NULL DEFAULT 0,
  clicks     BIGINT    NOT NULL DEFAULT 0,
  leads      BIGINT    NOT NULL DEFAULT 0,
  purchases  BIGINT    NOT NULL DEFAULT 0,
  revenue    NUMERIC   NOT NULL DEFAULT 0,
  UNIQUE(campaign_id, date)
);

ALTER TABLE campaign_daily_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own daily stats" ON campaign_daily_stats;
CREATE POLICY "Users see own daily stats" ON campaign_daily_stats
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM brands b WHERE b.id = campaign_daily_stats.brand_id AND b.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_daily_stats_brand_date ON campaign_daily_stats(brand_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_stats_campaign_date ON campaign_daily_stats(campaign_id, date DESC);

-- ============================================================
-- AD CREATIVES
-- Populated by meta-sync Edge Function (ad-level insights)
-- Powers the "Top Creative" card on the Dashboard
-- ============================================================
CREATE TABLE IF NOT EXISTS ad_creatives (
  id              UUID      PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id     UUID      REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  brand_id        UUID      REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  ad_id_external  TEXT      NOT NULL,
  ad_name         TEXT      NOT NULL DEFAULT '',
  spend           NUMERIC   NOT NULL DEFAULT 0,
  impressions     BIGINT    NOT NULL DEFAULT 0,
  clicks          BIGINT    NOT NULL DEFAULT 0,
  leads           BIGINT    NOT NULL DEFAULT 0,
  purchases       BIGINT    NOT NULL DEFAULT 0,
  ctr             NUMERIC   NOT NULL DEFAULT 0,
  cpl             NUMERIC   NOT NULL DEFAULT 0,
  thumbnail_url   TEXT,
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, ad_id_external)
);

ALTER TABLE ad_creatives ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own ad_creatives" ON ad_creatives;
CREATE POLICY "Users see own ad_creatives" ON ad_creatives
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM brands b WHERE b.id = ad_creatives.brand_id AND b.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_ad_creatives_brand_leads ON ad_creatives(brand_id, leads DESC);
CREATE INDEX IF NOT EXISTS idx_ad_creatives_brand_spend ON ad_creatives(brand_id, spend DESC);

-- ============================================================
-- SYSTEM EVENTS
-- Activity log for Live Activity feed on Dashboard
-- Written by Edge Functions (meta-sync, generate-recommendations, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS system_events (
  id        UUID      PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id  UUID      REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  type      TEXT      NOT NULL CHECK (type IN ('sync', 'recommendation', 'ai_session', 'lead_batch', 'optimization')),
  label     TEXT      NOT NULL,
  metadata  JSONB     NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own system_events" ON system_events;
CREATE POLICY "Users see own system_events" ON system_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM brands b WHERE b.id = system_events.brand_id AND b.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_system_events_brand_created ON system_events(brand_id, created_at DESC);

-- ============================================================
-- DONE. After running this:
-- 1. Deploy updated meta-sync Edge Function (adds daily + ad sync + event logging)
-- 2. Run a Meta sync from the Campaigns page to populate the new tables
-- 3. The Dashboard will automatically show the chart, top creative, and live activity
-- ============================================================
