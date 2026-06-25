-- ============================================================
-- Chat Session Memory: Add title + summary columns
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- Add title and summary columns to intelligence_sessions
ALTER TABLE intelligence_sessions
  ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'New Session';

ALTER TABLE intelligence_sessions
  ADD COLUMN IF NOT EXISTS summary TEXT;

-- Index for fast lookup by brand
CREATE INDEX IF NOT EXISTS idx_intelligence_sessions_brand_updated
  ON intelligence_sessions(brand_id, updated_at DESC);
