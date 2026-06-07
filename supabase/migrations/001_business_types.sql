-- NextGenAds — Business Type Expansion Migration
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/nplbghydqjapkycoiucl/sql/new

ALTER TABLE brands ADD COLUMN IF NOT EXISTS business_type TEXT
  CHECK (business_type IN ('ecommerce','clinic','spa','salon','wholesale'));

ALTER TABLE brands ADD COLUMN IF NOT EXISTS avg_treatment_value INTEGER;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS avg_ticket INTEGER;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS avg_wholesale_order INTEGER;

ALTER TABLE brands ADD COLUMN IF NOT EXISTS goal TEXT
  CHECK (goal IN ('purchases','leads','bookings','inquiries'));

ALTER TABLE brands ADD COLUMN IF NOT EXISTS crm_platform TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS booking_platform TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS ecom_platform TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS ad_spend_range TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS services TEXT[];
ALTER TABLE brands ADD COLUMN IF NOT EXISTS target_buyers TEXT[];
ALTER TABLE brands ADD COLUMN IF NOT EXISTS biggest_challenge TEXT;

-- Add leads column to campaigns (alongside existing purchases)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS leads BIGINT NOT NULL DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS lead_quality_rate NUMERIC DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS bookings BIGINT NOT NULL DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS reach BIGINT NOT NULL DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS frequency NUMERIC DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS cpl NUMERIC DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS qualified_leads BIGINT NOT NULL DEFAULT 0;
