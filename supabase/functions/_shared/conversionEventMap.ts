/**
 * conversionEventMap -- shared conversion event label mapping
 *
 * Single source of truth: Meta conversion event label (campaigns.conversion_event)
 * -> DB column that holds the count + cost label for the UI.
 *
 * Imported by Deno edge functions (generate-recommendations, etc.) directly.
 * The frontend uses src/lib/conversionEventMap.ts which mirrors this object.
 * Vite cannot resolve paths outside src/, so an exact copy lives there.
 *
 * When adding a new conversion event type:
 *   1. Add the entry here.
 *   2. Mirror it in src/lib/conversionEventMap.ts (keep both files in sync).
 *   3. Update getCampaignConversionValue() in src/lib/conversions.ts.
 *   4. Add the action_type lookup in meta-sync and auto-sync-all.
 */

export interface ConversionEventEntry {
  column: 'purchases' | 'atc' | 'leads' | 'page_views' | 'clicks' | 'reach' | 'conversion_value';
  costLabel: 'CPL' | 'CPA' | 'CPV' | 'CPC' | 'CPM';
}

export const CONVERSION_EVENT_MAP: Record<string, ConversionEventEntry> = {
  'Purchases':        { column: 'purchases',        costLabel: 'CPA' },
  'ATC':              { column: 'atc',              costLabel: 'CPA' },
  'Checkout':         { column: 'atc',              costLabel: 'CPA' },
  'Add Payment Info': { column: 'atc',              costLabel: 'CPA' },
  'Leads':            { column: 'leads',            costLabel: 'CPL' },
  'Registrations':    { column: 'leads',            costLabel: 'CPL' },
  'Subscriptions':    { column: 'leads',            costLabel: 'CPL' },
  'Page Views':       { column: 'page_views',       costLabel: 'CPV' },
  'Clicks':           { column: 'clicks',           costLabel: 'CPC' },
  'Reach':            { column: 'reach',            costLabel: 'CPM' },
  'View Content':     { column: 'conversion_value', costLabel: 'CPA' },
};
