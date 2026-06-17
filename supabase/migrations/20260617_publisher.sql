-- ── Publisher architecture migration ─────────────────────────

-- Add platform column to campaigns
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS platform TEXT
  DEFAULT 'meta'
  CHECK (platform IN ('meta','google','tiktok','other'));

-- ── campaign_drafts ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_drafts (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID REFERENCES auth.users NOT NULL,
  brand_id                UUID,

  -- Status
  status                  TEXT DEFAULT 'draft'
    CHECK (status IN ('draft','publishing','published','failed')),

  -- Platform
  platform                TEXT DEFAULT 'meta'
    CHECK (platform IN ('meta','google','tiktok')),
  ad_account_id           TEXT,

  -- Copy (from Creative Studio)
  copy_primary            TEXT,
  copy_body               TEXT,
  copy_cta                TEXT,
  copy_hook_type          TEXT,
  conversion_type         TEXT,

  -- Creative metadata (no binary stored — re-upload if browser closed)
  creative_filename       TEXT,
  creative_media_type     TEXT,
  creative_thumbnail      TEXT,   -- small dataURL (≤100KB) for preview

  -- Campaign settings
  campaign_name           TEXT,
  daily_budget_cents      INTEGER DEFAULT 5000,
  currency                TEXT DEFAULT 'EUR',
  start_time              TIMESTAMPTZ,
  end_time                TIMESTAMPTZ,
  destination_url         TEXT,

  -- Audience
  target_countries        TEXT[]  DEFAULT ARRAY['IT'],
  age_min                 INTEGER DEFAULT 25,
  age_max                 INTEGER DEFAULT 55,
  gender                  TEXT    DEFAULT 'all',

  -- Publish result
  publish_result          JSONB,

  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE campaign_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their drafts"
  ON campaign_drafts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── campaign_publish_log ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_publish_log (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID REFERENCES auth.users,
  draft_id           UUID REFERENCES campaign_drafts,
  platform           TEXT,
  status             TEXT CHECK (status IN ('pending','success','failed')),
  request_payload    JSONB,
  response_payload   JSONB,
  error_message      TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE campaign_publish_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their logs"
  ON campaign_publish_log FOR ALL
  USING (auth.uid() = user_id);
