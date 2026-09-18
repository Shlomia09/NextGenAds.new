/**
 * conversionEventMap -- frontend mirror of supabase/functions/_shared/conversionEventMap.ts
 *
 * Vite cannot resolve imports from outside src/, so this is an exact copy of the
 * shared file. Keep both files identical.
 *
 * SOURCE OF TRUTH: supabase/functions/_shared/conversionEventMap.ts
 * When you edit one, edit the other. They must stay in sync.
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
