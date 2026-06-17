/**
 * NextAdsGen — Campaign Objective Intelligence
 *
 * Central module for classifying Meta campaign objectives and providing
 * goal-appropriate labels, KPI definitions, and benchmark contexts.
 * Used by: Campaigns, Dashboard, Intelligence Chat, meta-sync, Claude prompt.
 */

// ─── Types ────────────────────────────────────────────────────────────────────
export type GoalType =
  | 'sales'       // OUTCOME_SALES, CONVERSIONS, PRODUCT_CATALOG_SALES
  | 'leads'       // OUTCOME_LEADS, LEAD_GENERATION
  | 'traffic'     // OUTCOME_TRAFFIC, LINK_CLICKS
  | 'awareness'   // OUTCOME_AWARENESS, REACH, BRAND_AWARENESS
  | 'engagement'  // OUTCOME_ENGAGEMENT, POST_ENGAGEMENT, PAGE_LIKES
  | 'unknown';

export interface GoalMeta {
  label:       string;
  emoji:       string;
  color:       string;
  bg:          string;
  // Primary KPI label shown in the Conversion column
  primaryKpi:  string;
  // Secondary KPI (sub-label)
  secondaryKpi: string;
  // What Meta action_type to use for conversions
  metaActionType: string;
  // Which campaign fields hold the conversion data
  conversionField: 'purchases' | 'leads' | 'clicks' | 'reach' | 'bookings';
  costField:       'roas' | 'cpl' | 'cpc' | 'cpm';
  // Benchmark context string injected into Claude's system prompt
  benchmarkContext: string;
}

// ─── Goal metadata registry ────────────────────────────────────────────────────
export const GOAL_META: Record<GoalType, GoalMeta> = {
  sales: {
    label:         'Sales',
    emoji:         '🛒',
    color:         '#0C447C',
    bg:            '#E6F1FB',
    primaryKpi:    'ROAS',
    secondaryKpi:  'Purchases',
    metaActionType:'purchase',
    conversionField:'purchases',
    costField:      'roas',
    benchmarkContext:
      'This is a SALES/CONVERSIONS campaign. Key metrics: ROAS (target ≥3.0x for beauty ecommerce), ' +
      'CAC (target ≤€35 for AOV €80-120), CPM benchmark €8-14 for beauty audience. ' +
      'Scaling rule: increase budget +20% only when ROAS stable for 7 days.',
  },
  leads: {
    label:         'Leads',
    emoji:         '📋',
    color:         '#633806',
    bg:            '#FAEEDA',
    primaryKpi:    'CPL',
    secondaryKpi:  'Leads',
    metaActionType:'lead',
    conversionField:'leads',
    costField:      'cpl',
    benchmarkContext:
      'This is a LEAD GENERATION campaign. Key metrics: CPL (benchmark €22-55 depending on business type), ' +
      'Lead Quality Rate (target ≥35%), Cost per Qualified Lead (target ≤€160 for clinics). ' +
      'Instant Forms vs Landing Page: Instant Forms give lower CPL but often lower quality. ' +
      'Show rate benchmark for clinics/spas: 40-60% of leads should book.',
  },
  traffic: {
    label:         'Traffic',
    emoji:         '🚀',
    color:         '#0C447C',
    bg:            '#E6F1FB',
    primaryKpi:    'CPC',
    secondaryKpi:  'CTR',
    metaActionType:'link_click',
    conversionField:'clicks',
    costField:      'cpc',
    benchmarkContext:
      'This is a TRAFFIC campaign. Key metrics: CTR (benchmark ≥1.5% for beauty, excellent >2.5%), ' +
      'CPC (benchmark €0.30-0.80 for beauty audiences), CPM benchmark €8-14. ' +
      'Traffic campaigns are often top-of-funnel — check if retargeting audiences are being built. ' +
      'If CTR <1%, creative needs refreshing or audience is too broad.',
  },
  awareness: {
    label:         'Awareness',
    emoji:         '👁',
    color:         '#3d2d8a',
    bg:            '#EEEBFB',
    primaryKpi:    'Reach',
    secondaryKpi:  'Frequency',
    metaActionType:'impression',
    conversionField:'reach',
    costField:      'cpm',
    benchmarkContext:
      'This is an AWARENESS/REACH campaign. Key metrics: CPM (benchmark €8-14 for beauty), ' +
      'Frequency (optimal 2-4x, above 5x = creative fatigue for local businesses). ' +
      'Reach campaigns build brand recognition — pair with retargeting for full funnel. ' +
      'For salons/local businesses: keep frequency ≤3.5x to avoid audience burn-out.',
  },
  engagement: {
    label:         'Engagement',
    emoji:         '💬',
    color:         '#633806',
    bg:            '#FAEEDA',
    primaryKpi:    'Engagements',
    secondaryKpi:  'CTR',
    metaActionType:'post_engagement',
    conversionField:'clicks',
    costField:      'cpc',
    benchmarkContext:
      'This is an ENGAGEMENT campaign. Key metrics: Cost per Engagement, CTR, Reach. ' +
      'Engagement campaigns are useful for social proof and warming audiences. ' +
      'High engagement (likes, comments) boosts social proof which improves conversion rates. ' +
      'Consider switching to conversion objectives once you have significant engagement data.',
  },
  unknown: {
    label:         'Other',
    emoji:         '📊',
    color:         '#5F5E5A',
    bg:            '#F1EFE8',
    primaryKpi:    'Clicks',
    secondaryKpi:  'Impressions',
    metaActionType:'link_click',
    conversionField:'clicks',
    costField:      'cpc',
    benchmarkContext:
      'Campaign objective is not standard. Review campaign settings in Meta Ads Manager. ' +
      'Focus on CPM and CTR as baseline performance indicators.',
  },
};

// ─── Classifier ────────────────────────────────────────────────────────────────
export const classifyObjective = (objective: string): GoalType => {
  const o = (objective || '').toUpperCase();

  if (o.includes('SALES') || o.includes('CONVERSIONS') || o.includes('PURCHASE') || o.includes('CATALOG'))
    return 'sales';
  if (o.includes('LEADS') || o.includes('LEAD_GENERATION'))
    return 'leads';
  if (o.includes('TRAFFIC') || o.includes('LINK_CLICKS'))
    return 'traffic';
  if (o.includes('AWARENESS') || o.includes('REACH') || o.includes('BRAND'))
    return 'awareness';
  if (o.includes('ENGAGEMENT') || o.includes('POST_ENGAGEMENT') || o.includes('PAGE_LIKES'))
    return 'engagement';
  return 'unknown';
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Get GoalMeta for an objective string */
export const getGoalMeta = (objective: string): GoalMeta =>
  GOAL_META[classifyObjective(objective)];

/** Detect the dominant goal in a list of campaigns */
export const detectDominantGoal = (objectives: string[]): GoalType => {
  const counts: Record<GoalType, number> = {
    sales: 0, leads: 0, traffic: 0, awareness: 0, engagement: 0, unknown: 0,
  };
  objectives.forEach(o => { counts[classifyObjective(o)]++; });
  return (Object.keys(counts) as GoalType[]).reduce((a, b) =>
    counts[a] >= counts[b] ? a : b
  );
};

/**
 * Build the objective context block injected into Claude's system prompt.
 * Includes all unique objectives present in the user's active campaigns.
 */
export const buildObjectiveContext = (
  objectives: { name: string; objective: string; spend: number }[]
): string => {
  if (!objectives.length) return '';

  const grouped: Record<GoalType, string[]> = {
    sales: [], leads: [], traffic: [], awareness: [], engagement: [], unknown: [],
  };
  objectives.forEach(c => {
    grouped[classifyObjective(c.objective)].push(`${c.name} (spend: €${c.spend.toFixed(0)})`);
  });

  const lines: string[] = ['## Active Campaign Context'];
  (Object.entries(grouped) as [GoalType, string[]][]).forEach(([goal, camps]) => {
    if (!camps.length) return;
    const meta = GOAL_META[goal];
    lines.push(`\n### ${meta.emoji} ${meta.label} Campaigns (${camps.length})`);
    lines.push(meta.benchmarkContext);
    lines.push('Campaigns: ' + camps.slice(0, 5).join(', ') + (camps.length > 5 ? ` (+${camps.length - 5} more)` : ''));
  });

  return lines.join('\n');
};

/**
 * For the meta-sync edge function — returns which Meta action_types
 * to look for based on campaign objective.
 */
export const getMetaActionTypes = (objective: string): string[] => {
  const goal = classifyObjective(objective);
  switch (goal) {
    case 'sales':      return ['purchase', 'offsite_conversion.fb_pixel_purchase'];
    case 'leads':      return ['lead', 'onsite_conversion.lead_grouped', 'offsite_conversion.fb_pixel_lead'];
    case 'traffic':    return ['link_click', 'outbound_click'];
    case 'awareness':  return ['reach', 'impression'];
    case 'engagement': return ['post_engagement', 'page_engagement', 'like'];
    default:           return ['link_click'];
  }
};
