/**
 * conversions.ts — Dynamic conversion metric resolution
 *
 * Single source of truth for "what is this campaign's primary result metric?"
 * Replaces all hardcoded `leads` assumptions across the UI.
 *
 * Rule:
 *  - campaign.conversion_event holds the friendly label synced from Meta's
 *    promoted_object.custom_event_type (e.g. "Purchases", "Leads", "ATC").
 *  - We map that label -> the correct per-field DB column to read the count from.
 *  - When a set of campaigns has only ONE conversion type -> show that type.
 *  - When mixed -> show "TOTAL RESULTS" with a breakdown sub-line.
 */

import type { Campaign } from '../types';

// ── Map conversion_event label -> DB column numeric value ────────────────────
export function getCampaignConversionValue(campaign: Campaign): number {
  const evt = (campaign.conversion_event ?? '').trim();

  if (!evt || evt === 'Multiple') return 0;

  if (evt === 'Purchases')        return campaign.purchases ?? campaign.conversion_value ?? 0;
  if (evt === 'ATC')              return campaign.atc ?? campaign.conversion_value ?? 0;
  if (evt === 'Checkout')         return campaign.atc ?? campaign.conversion_value ?? 0;
  if (evt === 'Add Payment Info') return campaign.conversion_value ?? 0;
  if (evt === 'Leads')            return campaign.leads > 0 ? campaign.leads : (campaign.conversion_value ?? 0);
  if (evt === 'Registrations')    return campaign.conversion_value ?? 0;
  if (evt === 'Subscriptions')    return campaign.conversion_value ?? 0;
  if (evt === 'View Content')     return campaign.conversion_value ?? 0;
  if (evt === 'Page Views')       return campaign.page_views ?? campaign.conversion_value ?? 0;
  if (evt === 'Clicks')           return campaign.clicks;
  if (evt === 'Reach')            return campaign.reach ?? 0;

  return campaign.conversion_value ?? 0;
}

// ── Resolve the CPA label for a given conversion event ───────────────────────
export function getCpaLabel(conversionEvent: string): string {
  if (conversionEvent === 'Leads' || conversionEvent === 'Registrations') return 'AVG CPL';
  if (conversionEvent === 'Purchases') return 'AVG CPA';
  if (conversionEvent === 'Page Views') return 'CPV';
  if (conversionEvent === 'Clicks') return 'AVG CPC';
  return 'AVG CPA';
}

// ── Output shape ─────────────────────────────────────────────────────────────
export interface ConversionSummary {
  cardLabel:  string;
  eventLabel: string;
  totalValue: number;
  mixed:      boolean;
  breakdown:  { label: string; value: number }[];
  cpaLabel:   string;
  dailyKey:   'leads' | 'purchases' | 'conversion_value' | 'mixed';
}

// ── Main resolver ────────────────────────────────────────────────────────────
export function resolvePrimaryConversion(campaigns: Campaign[]): ConversionSummary {
  const empty: ConversionSummary = {
    cardLabel: 'TOTAL RESULTS', eventLabel: '', totalValue: 0,
    mixed: false, breakdown: [], cpaLabel: 'AVG CPA', dailyKey: 'conversion_value',
  };

  if (!campaigns.length) return empty;

  const groups = new Map<string, number>();
  for (const c of campaigns) {
    const evt = (c.conversion_event ?? '').trim();
    if (!evt || evt === 'Multiple') continue;
    groups.set(evt, (groups.get(evt) ?? 0) + getCampaignConversionValue(c));
  }

  if (groups.size === 0) return empty;

  if (groups.size === 1) {
    const [evt, value] = [...groups.entries()][0];
    return {
      cardLabel:  `TOTAL ${evt.toUpperCase()}`,
      eventLabel: evt,
      totalValue: value,
      mixed:      false,
      breakdown:  [],
      cpaLabel:   getCpaLabel(evt),
      dailyKey:   evt === 'Leads' ? 'leads' : evt === 'Purchases' ? 'purchases' : 'conversion_value',
    };
  }

  const totalValue = [...groups.values()].reduce((s, v) => s + v, 0);
  const breakdown  = [...groups.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
  return {
    cardLabel: 'TOTAL RESULTS', eventLabel: '', totalValue,
    mixed: true, breakdown, cpaLabel: 'AVG CPA', dailyKey: 'mixed',
  };
}
