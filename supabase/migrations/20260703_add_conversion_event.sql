-- Migration: Add conversion_event and conversion_value to campaigns
-- conversion_event = the Meta custom_event_type as configured in the campaign
--                    e.g. 'ADD_TO_CART', 'PURCHASE', 'LEAD', 'VIEW_CONTENT', 'LANDING_PAGE_VIEW', 'REACH'
-- conversion_value = the actual count of that event from Meta insights

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS conversion_event  VARCHAR(64) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS conversion_value  INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN campaigns.conversion_event IS 'Meta custom_event_type as set in the campaign (e.g. ADD_TO_CART, PURCHASE, LEAD, VIEW_CONTENT)';
COMMENT ON COLUMN campaigns.conversion_value IS 'Count of the conversion_event from Meta insights actions array';
