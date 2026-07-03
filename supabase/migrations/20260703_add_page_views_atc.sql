-- Migration: Add page_views and atc columns to campaigns table
-- page_views = landing_page_view action type from Meta (Traffic campaigns primary KPI)
-- atc        = add_to_cart action type from Meta (Sales campaigns funnel metric)

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS page_views INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS atc        INTEGER NOT NULL DEFAULT 0;

-- Comment for documentation
COMMENT ON COLUMN campaigns.page_views IS 'Meta landing_page_view action count (primary KPI for Traffic campaigns)';
COMMENT ON COLUMN campaigns.atc        IS 'Meta add_to_cart action count (funnel metric for Sales campaigns)';
