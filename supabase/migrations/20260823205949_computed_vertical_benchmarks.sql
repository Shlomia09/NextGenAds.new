-- Migration: 20260823205949_computed_vertical_benchmarks
-- Applied to Supabase directly on 2026-08-23; added to repo 2026-09-13 as housekeeping.
-- SECURITY DEFINER is intentional: aggregate cross-account benchmarks only.
-- Reviewed and closed 2026-09-13. See HANDOFF.md.

CREATE OR REPLACE VIEW public.vertical_benchmarks_computed AS
SELECT
  b.business_type                                                               AS vertical,
  count(DISTINCT cds.brand_id)                                                  AS account_count,
  count(*)                                                                      AS day_count,
  min(cds.date)                                                                 AS earliest_date,
  max(cds.date)                                                                 AS latest_date,
  round(avg(NULLIF(cds.spend,0) / NULLIF(cds.leads,0)::numeric), 2)            AS avg_cpl,
  round(percentile_cont(0.5) WITHIN GROUP (ORDER BY ((cds.spend / NULLIF(cds.leads,0)::numeric)::double precision))::numeric, 2) AS median_cpl,
  round(avg(NULLIF(cds.spend,0) / NULLIF(cds.impressions,0)::numeric * 1000), 2) AS avg_cpm,
  round(avg(cds.clicks::numeric / NULLIF(cds.impressions,0)::numeric * 100), 2) AS avg_ctr,
  round(avg(NULLIF(cds.revenue,0) / NULLIF(cds.spend,0)), 2)                   AS avg_roas
FROM campaign_daily_stats cds
JOIN brands b ON b.id = cds.brand_id
WHERE cds.spend > 0
GROUP BY b.business_type;
