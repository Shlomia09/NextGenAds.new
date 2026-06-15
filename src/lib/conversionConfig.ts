/**
 * NextAdsGen — Conversion Type Configuration
 * Single source of truth for KPI definitions, labels, colors,
 * and benchmark context strings per account conversion type.
 */

export type ConversionType = 'ecommerce' | 'leads' | 'bookings' | 'app' | 'awareness';

// ─── Conversion type display metadata ────────────────────────
export interface ConversionTypeMeta {
  label:     string;
  emoji:     string;
  color:     string;
  bg:        string;
  description: string;
}

export const CONVERSION_META: Record<ConversionType, ConversionTypeMeta> = {
  ecommerce: {
    label:       'eCommerce / Sales',
    emoji:       '🛒',
    color:       '#10B981',
    bg:          'rgba(16,185,129,0.10)',
    description: 'ROAS, Revenue, Orders, CAC',
  },
  leads: {
    label:       'Lead Generation',
    emoji:       '📋',
    color:       '#C4836A',
    bg:          'rgba(196,131,106,0.10)',
    description: 'CPL, Leads, Cost per Booking',
  },
  bookings: {
    label:       'Bookings / Appointments',
    emoji:       '📅',
    color:       '#60A5FA',
    bg:          'rgba(96,165,250,0.10)',
    description: 'Appointments, CPB, Show Rate',
  },
  app: {
    label:       'App Installs',
    emoji:       '📱',
    color:       '#A78BFA',
    bg:          'rgba(167,139,250,0.10)',
    description: 'Installs, CPI, CTR',
  },
  awareness: {
    label:       'Brand Awareness',
    emoji:       '👁',
    color:       '#FBBF24',
    bg:          'rgba(251,191,36,0.10)',
    description: 'Reach, CPM, Frequency',
  },
};

// ─── KPI strip configs per conversion type ────────────────────
export interface KpiDef {
  key:     string;
  label:   string;
  prefix?: string;
  suffix?: string;
  color?:  string;
  /** How to derive this value from campaign array */
  compute: (campaigns: CampaignLike[]) => number | string;
}

interface CampaignLike {
  spend: number;
  revenue: number;
  roas: number;
  purchases: number;
  leads: number;
  cpl: number;
  bookings: number;
  clicks: number;
  impressions: number;
  reach: number;
  frequency: number;
}

const fmt = (n: number, prefix = '€') =>
  n === 0 ? '—' : `${prefix}${n < 1000 ? n.toFixed(2) : (n / 1000).toFixed(1) + 'k'}`;
const fmtN = (n: number) => n === 0 ? '—' : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

export const KPI_CONFIG: Record<ConversionType, KpiDef[]> = {
  ecommerce: [
    { key: 'spend',    label: 'Total Spend',  compute: cs => fmt(cs.reduce((s,c) => s + c.spend, 0)) },
    { key: 'revenue',  label: 'Revenue',      color: '#10B981', compute: cs => fmt(cs.reduce((s,c) => s + c.revenue, 0)) },
    { key: 'roas',     label: 'Avg ROAS',     suffix: 'x', compute: cs => {
      const sp = cs.reduce((s,c) => s + c.spend, 0);
      const rv = cs.reduce((s,c) => s + c.revenue, 0);
      return sp > 0 ? (rv / sp).toFixed(2) + 'x' : '—';
    }},
    { key: 'purchases', label: 'Purchases',   compute: cs => fmtN(cs.reduce((s,c) => s + c.purchases, 0)) },
    { key: 'cac',      label: 'CAC',          compute: cs => {
      const sp = cs.reduce((s,c) => s + c.spend, 0);
      const pu = cs.reduce((s,c) => s + c.purchases, 0);
      return pu > 0 ? fmt(sp / pu) : '—';
    }},
  ],
  leads: [
    { key: 'spend',    label: 'Total Spend',  compute: cs => fmt(cs.reduce((s,c) => s + c.spend, 0)) },
    { key: 'leads',    label: 'Total Leads',  color: '#C4836A', compute: cs => fmtN(cs.reduce((s,c) => s + c.leads, 0)) },
    { key: 'cpl',      label: 'Avg CPL',      compute: cs => {
      const sp = cs.reduce((s,c) => s + c.spend, 0);
      const le = cs.reduce((s,c) => s + c.leads, 0);
      return le > 0 ? fmt(sp / le) : '—';
    }},
    { key: 'bookings', label: 'Bookings',     compute: cs => fmtN(cs.reduce((s,c) => s + c.bookings, 0)) },
    { key: 'cpb',      label: 'Cost / Booking', compute: cs => {
      const sp = cs.reduce((s,c) => s + c.spend, 0);
      const bk = cs.reduce((s,c) => s + c.bookings, 0);
      return bk > 0 ? fmt(sp / bk) : '—';
    }},
  ],
  bookings: [
    { key: 'spend',       label: 'Total Spend',      compute: cs => fmt(cs.reduce((s,c) => s + c.spend, 0)) },
    { key: 'bookings',    label: 'Appointments',  color: '#60A5FA', compute: cs => fmtN(cs.reduce((s,c) => s + c.bookings, 0)) },
    { key: 'cpb',         label: 'Cost / Booking',   compute: cs => {
      const sp = cs.reduce((s,c) => s + c.spend, 0);
      const bk = cs.reduce((s,c) => s + c.bookings, 0);
      return bk > 0 ? fmt(sp / bk) : '—';
    }},
    { key: 'leads',       label: 'Leads (Raw)',       compute: cs => fmtN(cs.reduce((s,c) => s + c.leads, 0)) },
    { key: 'show_rate',   label: 'Show Rate',  suffix: '%', compute: cs => {
      const le = cs.reduce((s,c) => s + c.leads, 0);
      const bk = cs.reduce((s,c) => s + c.bookings, 0);
      return le > 0 ? ((bk / le) * 100).toFixed(0) + '%' : '—';
    }},
  ],
  awareness: [
    { key: 'spend',       label: 'Total Spend',   compute: cs => fmt(cs.reduce((s,c) => s + c.spend, 0)) },
    { key: 'reach',       label: 'Total Reach',   color: '#FBBF24', compute: cs => fmtN(cs.reduce((s,c) => s + c.reach, 0)) },
    { key: 'cpm',         label: 'Avg CPM',       compute: cs => {
      const sp = cs.reduce((s,c) => s + c.spend, 0);
      const im = cs.reduce((s,c) => s + c.impressions, 0);
      return im > 0 ? fmt((sp / im) * 1000) : '—';
    }},
    { key: 'impressions', label: 'Impressions',   compute: cs => fmtN(cs.reduce((s,c) => s + c.impressions, 0)) },
    { key: 'frequency',   label: 'Avg Frequency', suffix: 'x', compute: cs => {
      const withFreq = cs.filter(c => c.frequency > 0);
      if (!withFreq.length) return '—';
      return (withFreq.reduce((s,c) => s + c.frequency, 0) / withFreq.length).toFixed(1) + 'x';
    }},
  ],
  app: [
    { key: 'spend',    label: 'Total Spend',  compute: cs => fmt(cs.reduce((s,c) => s + c.spend, 0)) },
    { key: 'clicks',   label: 'Clicks',       compute: cs => fmtN(cs.reduce((s,c) => s + c.clicks, 0)) },
    { key: 'cpc',      label: 'Avg CPC',      compute: cs => {
      const sp = cs.reduce((s,c) => s + c.spend, 0);
      const cl = cs.reduce((s,c) => s + c.clicks, 0);
      return cl > 0 ? fmt(sp / cl) : '—';
    }},
    { key: 'ctr',      label: 'CTR',  suffix: '%', compute: cs => {
      const cl = cs.reduce((s,c) => s + c.clicks, 0);
      const im = cs.reduce((s,c) => s + c.impressions, 0);
      return im > 0 ? ((cl / im) * 100).toFixed(2) + '%' : '—';
    }},
    { key: 'cpm',      label: 'CPM',          compute: cs => {
      const sp = cs.reduce((s,c) => s + c.spend, 0);
      const im = cs.reduce((s,c) => s + c.impressions, 0);
      return im > 0 ? fmt((sp / im) * 1000) : '—';
    }},
  ],
};

// ─── Claude benchmark context per conversion type ─────────────
export const BENCHMARK_CONTEXT: Record<ConversionType, string> = {
  ecommerce: `
## Benchmark Context: eCommerce / Sales
You are analyzing a SALES & ROAS optimization account.
Key benchmarks (Beauty & Cosmetics, 9-year dataset):
- AOV €80-120 bracket → Target ROAS: 3.0-4.0x
- AOV €120-200 bracket → Target ROAS: 4.0-6.0x
- CAC benchmark: €25-45 for skincare, €35-60 for cosmetics
- CPM benchmark: €8-14 cold audience, €6-10 retargeting
- Scaling rule: increase budget +20% ONLY when ROAS stable for 7 consecutive days
- Cold audience CTR: ≥1.5% acceptable, >2.5% excellent
- Retargeting window: 7-14 days optimal for skincare
- Kill rule: CPM >€18 for cold audience = kill or creative refresh
Primary optimization KPIs: ROAS, CAC, Revenue, Purchase Volume
`,
  leads: `
## Benchmark Context: Lead Generation
You are analyzing a LEAD GENERATION account.
Key benchmarks (Beauty clinics, spas, salons, 9-year dataset):
- Clinic CPL benchmark: €28-45 (good), <€25 (excellent), >€55 (concerning)
- Spa CPL benchmark: €20-35 (good), >€50 (concerning)
- Salon CPL benchmark: €15-28 (good), >€40 (concerning)
- Lead Quality Rate target: ≥35% (qualified/total leads)
- Show Rate benchmark: 40-60% of leads should convert to booked appointments
- Cost per Booking: €80-120 for clinics, €50-80 for spas/salons
- Instant Forms → lower CPL but 20-30% lower quality vs Landing Page
- CPM benchmark: €8-14 cold, frequency cap: 2-3x for local audiences
Primary optimization KPIs: CPL, Lead Quality Rate, Cost per Booking, Show Rate
`,
  bookings: `
## Benchmark Context: Direct Bookings
You are analyzing a BOOKING CONVERSION account.
Key benchmarks (Beauty service businesses):
- Cost per Booking: €60-100 acceptable, <€60 excellent
- Show Rate: 50-65% industry benchmark (no-show = wasted ad spend)
- Lead-to-Booking conversion: target ≥40%
- LTV consideration: focus on new client acquisition, not just bookings
- Best performing ad formats: Video testimonials, before/after, seasonal offers
- Gift voucher campaigns: 3.2x better performance Oct-Dec
Primary optimization KPIs: Cost per Booking, Show Rate, Lead-to-Booking Rate
`,
  awareness: `
## Benchmark Context: Brand Awareness / Reach
You are analyzing a BRAND AWARENESS account.
Key benchmarks (Beauty & Cosmetics):
- CPM benchmark: €6-12 (awareness campaigns typically lower than conversion)
- Optimal frequency: 2.5-4.0x per week for brand recall
- Frequency >5x = creative fatigue, especially for local audiences
- Reach objective works best paired with retargeting (conversion funnel)
- Awareness campaigns alone don't drive ROI — always pair with conversion layer
- Video view rate benchmark: >15% for 3-second view, >3% for 50% completion
Primary optimization KPIs: Reach, CPM, Frequency, Video View Rate
`,
  app: `
## Benchmark Context: App Installs
You are analyzing an APP INSTALL campaign.
Key benchmarks:
- CPI (Cost per Install) benchmark: €1.50-4.00 for beauty/lifestyle apps
- D1 retention rate target: ≥25%
- CTR benchmark: ≥1.0% for app install ads
- Best performing creative: short video (6-15 sec), showing app UI
- Target: lookalike of existing app users (1-3% similarity)
Primary optimization KPIs: CPI, CTR, Install Volume
`,
};
