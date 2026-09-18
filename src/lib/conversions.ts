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
 *
 * getPrimaryConversionMetric() is the single-campaign wrapper used by
 * CampaignDetailPanel and other per-campaign render sites.
 * Resolution order: conversion_event first, GOAL_META fallback.
 * costValue is computed here — callers must NOT divide spend/value themselves.
 * hasData=false means the metric is structurally absent, not truly zero.
 * CLAUDE.md no-fake-data rule: render an empty state when hasData is false.
 */

import type { Campaign } from '../types';
import { classifyObjective, GOAL_META } from './objective';
// CONVERSION_EVENT_MAP: event label -> DB column + cost label
// SOURCE OF TRUTH: supabase/functions/_shared/conversionEventMap.ts
// This frontend mirror (src/lib/conversionEventMap.ts) must stay identical to it.
import { CONVERSION_EVENT_MAP } from './conversionEventMap';

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
// Derived from CONVERSION_EVENT_MAP so it stays in sync with the shared map.
export function getCpaLabel(conversionEvent: string): string {
  return CONVERSION_EVENT_MAP[conversionEvent]?.costLabel ?? 'AVG CPA';
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

// ── Single-campaign metric shape ──────────────────────────────────────────────
export interface CampaignConversionMetric {
  /** Machine-readable identifier: 'leads' | 'purchases' | 'atc' |
   *  'page_views' | 'clicks' | 'reach' | 'conversion_value' */
  key:        string;
  /** Human-readable display label, e.g. 'Leads', 'Purchases', 'Reach' */
  label:      string;
  /** The resolved numeric value from the correct DB column */
  value:      number;
  /** Whether data is structurally present (false = render empty state, not zero) */
  hasData:    boolean;
  /** Short cost-per-result label: 'CPL' | 'CPA' | 'CPC' | 'CPV' | 'CPM' */
  costLabel:  string;
  /** Computed cost-per-result (spend / value). 0 when value === 0 or spend === 0 */
  costValue:  number;
}

/**
 * getPrimaryConversionMetric — single-campaign wrapper.
 *
 * Resolution order:
 *  1. campaign.conversion_event (set by meta-sync from Meta's promoted_object)
 *  2. GOAL_META[classifyObjective(campaign.objective)] fallback
 *
 * costValue is computed here. Callers must NOT compute spend/value themselves.
 * hasData=false: metric column is structurally absent — render an empty state,
 * not a 0. This enforces the CLAUDE.md no-fake-data rule for missing data.
 */
export function getPrimaryConversionMetric(campaign: Campaign): CampaignConversionMetric {
  const spend = campaign.spend ?? 0;

  // ── 1. conversion_event path ────────────────────────────────────────────────
  const evt = (campaign.conversion_event ?? '').trim();
  if (evt && evt !== 'Multiple') {
    const value = getCampaignConversionValue(campaign);
    // hasData: the column was populated (not a structural absence)
    // We check the source column directly to distinguish 0 vs null/missing.
    const hasData = (() => {
      if (evt === 'Purchases')        return campaign.purchases != null || campaign.conversion_value != null;
      if (evt === 'ATC' || evt === 'Checkout') return campaign.atc != null || campaign.conversion_value != null;
      if (evt === 'Add Payment Info') return campaign.conversion_value != null;
      if (evt === 'Leads' || evt === 'Registrations' || evt === 'Subscriptions')
                                      return campaign.leads != null || campaign.conversion_value != null;
      if (evt === 'View Content')     return campaign.conversion_value != null;
      if (evt === 'Page Views')       return campaign.page_views != null || campaign.conversion_value != null;
      if (evt === 'Clicks')           return campaign.clicks != null;
      if (evt === 'Reach')            return campaign.reach != null;
      return campaign.conversion_value != null;
    })();

    const key = (() => {
      if (evt === 'Purchases')        return 'purchases';
      if (evt === 'ATC' || evt === 'Checkout' || evt === 'Add Payment Info') return 'atc';
      if (evt === 'Leads' || evt === 'Registrations' || evt === 'Subscriptions') return 'leads';
      if (evt === 'Page Views')       return 'page_views';
      if (evt === 'Clicks')           return 'clicks';
      if (evt === 'Reach')            return 'reach';
      return 'conversion_value';
    })();

    const costLabel = (() => {
      if (evt === 'Leads' || evt === 'Registrations' || evt === 'Subscriptions') return 'CPL';
      if (evt === 'Purchases')        return 'CPA';
      if (evt === 'Page Views')       return 'CPV';
      if (evt === 'Clicks')           return 'CPC';
      if (evt === 'Reach')            return 'CPM';
      return 'CPA';
    })();

    return {
      key,
      label:     evt,
      value,
      hasData,
      costLabel,
      costValue: hasData && value > 0 && spend > 0 ? spend / value : 0,
    };
  }

  // ── 2. GOAL_META fallback ────────────────────────────────────────────────────
  const goal     = classifyObjective(campaign.objective ?? '');
  const meta     = GOAL_META[goal];
  const field    = meta.conversionField; // 'purchases' | 'leads' | 'clicks' | 'reach' | 'bookings'

  const valueMap: Record<string, number | null | undefined> = {
    purchases: campaign.purchases,
    leads:     campaign.leads,
    clicks:    campaign.clicks,
    reach:     campaign.reach,
    bookings:  undefined, // Campaign type does not include bookings; hasData=false for this fallback
  };

  const rawValue = valueMap[field];
  const hasData  = rawValue != null;
  const value    = rawValue ?? 0;

  const costLabelMap: Record<string, string> = {
    roas:  'ROAS',
    cpl:   'CPL',
    cpc:   'CPC',
    cpm:   'CPM',
  };
  const costLabel = costLabelMap[meta.costField] ?? 'CPA';

  // For ROAS specifically, costValue = roas (not spend/value)
  const costValue = (() => {
    if (!hasData || value === 0) return 0;
    if (meta.costField === 'roas')  return campaign.roas ?? 0;
    if (meta.costField === 'cpl')   return campaign.cpl  ?? (spend > 0 && value > 0 ? spend / value : 0);
    if (spend > 0 && value > 0)     return spend / value;
    return 0;
  })();

  return {
    key:       field,
    label:     meta.primaryKpi === 'ROAS' ? 'Purchases' : meta.primaryKpi,
    value,
    hasData,
    costLabel,
    costValue,
  };
}
