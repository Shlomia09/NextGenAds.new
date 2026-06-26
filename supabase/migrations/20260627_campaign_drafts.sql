-- Migration: Create campaign_drafts table for Workshop
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS campaign_drafts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id              uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  platform              text NOT NULL DEFAULT 'meta',     -- 'meta' | 'google'
  goal                  text,
  campaign_name         text,
  status                text NOT NULL DEFAULT 'draft',    -- 'draft' | 'published'
  draft_data            jsonb NOT NULL DEFAULT '{}',      -- full Wizard form state
  published_campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at on every UPDATE
CREATE OR REPLACE FUNCTION update_campaign_drafts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_campaign_drafts_updated_at
  BEFORE UPDATE ON campaign_drafts
  FOR EACH ROW EXECUTE FUNCTION update_campaign_drafts_updated_at();

-- RLS: users can only see/edit their own drafts
ALTER TABLE campaign_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own drafts"
  ON campaign_drafts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own drafts"
  ON campaign_drafts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drafts"
  ON campaign_drafts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drafts"
  ON campaign_drafts FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookup by user + brand
CREATE INDEX IF NOT EXISTS idx_campaign_drafts_user_brand
  ON campaign_drafts (user_id, brand_id);
