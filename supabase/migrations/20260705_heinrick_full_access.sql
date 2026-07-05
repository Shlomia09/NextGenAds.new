-- ============================================================
-- NextGenAds — Migration: Heinrick Full Ad Access
-- Run in: https://supabase.com/dashboard/project/nplbghydqjapkycoiucl/sql/new
-- ============================================================

-- 1. Extend ad_creatives with missing fields
ALTER TABLE ad_creatives ADD COLUMN IF NOT EXISTS status            TEXT    NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE ad_creatives ADD COLUMN IF NOT EXISTS adset_id_external TEXT;
ALTER TABLE ad_creatives ADD COLUMN IF NOT EXISTS roas              NUMERIC NOT NULL DEFAULT 0;

-- 2. ad_sets — stores adset-level data per campaign
CREATE TABLE IF NOT EXISTS ad_sets (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id       UUID        REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  brand_id          UUID        REFERENCES brands(id)   ON DELETE CASCADE NOT NULL,
  adset_id_external TEXT        NOT NULL,
  adset_name        TEXT        NOT NULL DEFAULT '',
  status            TEXT        NOT NULL DEFAULT 'ACTIVE',
  daily_budget      NUMERIC,
  lifetime_budget   NUMERIC,
  targeting         JSONB,
  synced_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, adset_id_external)
);

ALTER TABLE ad_sets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own ad_sets" ON ad_sets;
CREATE POLICY "Users see own ad_sets" ON ad_sets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM brands b WHERE b.id = ad_sets.brand_id AND b.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_ad_sets_brand        ON ad_sets(brand_id);
CREATE INDEX IF NOT EXISTS idx_ad_sets_campaign      ON ad_sets(campaign_id);

-- 3. action_logs — audit trail for every action Heinrick proposes & executes
CREATE TABLE IF NOT EXISTS action_logs (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id    UUID        REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID        NOT NULL,
  action_type TEXT        NOT NULL,   -- create_campaign | duplicate_ad | pause_campaign | etc.
  params      JSONB       NOT NULL DEFAULT '{}',
  result      JSONB,
  status      TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_at TIMESTAMPTZ
);

ALTER TABLE action_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own action_logs" ON action_logs;
CREATE POLICY "Users see own action_logs" ON action_logs
  FOR ALL USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_action_logs_brand ON action_logs(brand_id, created_at DESC);

-- ============================================================
-- DONE. Next steps:
-- 1. Deploy meta-sync  (adds status+adset_id to ads, syncs ad_sets)
-- 2. Deploy meta-action (adds create_campaign, duplicate_ad)
-- 3. Deploy claude-chat (adds ad+adset context + action_proposal)
-- 4. Update Intelligence.tsx (action proposal confirmation UI)
-- 5. Sync once from Campaigns page to fill new columns
-- ============================================================
