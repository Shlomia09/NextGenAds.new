-- ============================================================
-- Migration: Add missing conversion columns to campaign_daily_stats
-- Supports date-range filtering for ATC, Page Views, Reach, and custom conversion values.
-- ============================================================

ALTER TABLE campaign_daily_stats
  ADD COLUMN IF NOT EXISTS atc INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS page_views INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reach INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conversion_value INTEGER NOT NULL DEFAULT 0;
