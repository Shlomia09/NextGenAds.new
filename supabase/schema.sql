-- ============================================================
-- NextGenAds Database Schema
-- Run this in Supabase SQL Editor for your NEW project
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- BRANDS
-- ============================================================
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  aov_min NUMERIC NOT NULL DEFAULT 0,
  aov_max NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  markets TEXT[] NOT NULL DEFAULT '{}',
  stage TEXT NOT NULL DEFAULT 'new' CHECK (stage IN ('new', 'scaling', 'mature')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own brands" ON brands
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- AD ACCOUNTS
-- ============================================================
CREATE TABLE IF NOT EXISTS ad_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('meta', 'google')),
  account_id TEXT NOT NULL,
  account_name TEXT NOT NULL DEFAULT '',
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'error', 'disconnected')),
  UNIQUE(user_id, platform, account_id)
);

ALTER TABLE ad_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own ad_accounts" ON ad_accounts
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- CAMPAIGNS
-- ============================================================
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  ad_account_id UUID REFERENCES ad_accounts(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('meta', 'google')),
  campaign_id_external TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  objective TEXT NOT NULL DEFAULT '',
  budget_daily NUMERIC,
  budget_lifetime NUMERIC,
  spend NUMERIC NOT NULL DEFAULT 0,
  impressions BIGINT NOT NULL DEFAULT 0,
  clicks BIGINT NOT NULL DEFAULT 0,
  purchases BIGINT NOT NULL DEFAULT 0,
  revenue NUMERIC NOT NULL DEFAULT 0,
  roas NUMERIC NOT NULL DEFAULT 0,
  date_start DATE,
  date_end DATE,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(brand_id, platform, campaign_id_external)
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own campaigns" ON campaigns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM brands b WHERE b.id = campaigns.brand_id AND b.user_id = auth.uid()
    )
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_brand_id ON campaigns(brand_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_spend ON campaigns(spend DESC);

-- ============================================================
-- RECOMMENDATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('funnel_structure', 'audience', 'budget', 'creative', 'scaling')),
  priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'medium')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  action TEXT NOT NULL,
  reasoning TEXT NOT NULL DEFAULT '',
  benchmark_reference TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'executed', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_at TIMESTAMPTZ
);

ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own recommendations" ON recommendations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM brands b WHERE b.id = recommendations.brand_id AND b.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_recommendations_brand_status ON recommendations(brand_id, status);

-- ============================================================
-- INTELLIGENCE SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS intelligence_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE intelligence_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own sessions" ON intelligence_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_intelligence_sessions_updated_at
  BEFORE UPDATE ON intelligence_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- STORAGE BUCKET (for future creative uploads)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('creatives', 'creatives', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users manage own creatives" ON storage.objects
  FOR ALL USING (auth.uid()::TEXT = (storage.foldername(name))[1]);
