import type { AovBracket, BenchmarkMetric, BenchmarkAvailability, BusinessType, Campaign } from '../types';

// ─── Ecommerce AOV Brackets ──────────────────────────────────
export const AOV_BRACKETS: AovBracket[] = [
  {
    label: '< €80', min: 0, max: 80,
    benchmark_cac: { min: 15, max: 35 }, benchmark_roas: 3.8,
    recommended_funnel: 'Direct Conversion (Meta Purchases objective)',
    timeline_days: 14,
  },
  {
    label: '€80–150', min: 80, max: 150,
    benchmark_cac: { min: 30, max: 60 }, benchmark_roas: 3.2,
    recommended_funnel: 'Hybrid: 70% Conversions + 30% Traffic + Retargeting',
    timeline_days: 21,
  },
  {
    label: '€150–300', min: 150, max: 300,
    benchmark_cac: { min: 50, max: 90 }, benchmark_roas: 2.8,
    recommended_funnel: 'Traffic → Google Search → Klaviyo Close',
    timeline_days: 30,
  },
  {
    label: '> €300', min: 300, max: Infinity,
    benchmark_cac: { min: 80, max: 150 }, benchmark_roas: 2.2,
    recommended_funnel: 'Awareness (Meta) + Google Brand Search + 5-email Klaviyo',
    timeline_days: 45,
  },
];

export const getAovBracket = (aov: number): AovBracket =>
  AOV_BRACKETS.find((b) => aov >= b.min && aov < b.max) ?? AOV_BRACKETS[AOV_BRACKETS.length - 1];

// ─── Benchmark Availability by Business Type ─────────────────
export const getBenchmarkAvailability = (type: BusinessType): BenchmarkAvailability =>
  type === 'ecommerce' ? 'full' : 'partial';

// ─── CRITICAL: Metric direction — lower is better for cost metrics ──
// "above benchmark" for ROAS/CTR = GOOD
// "above benchmark" for CPL/CPM/CAC/CPB/CPQ = BAD
export const isMetricGood = (metric: string, value: number, benchmark: number): boolean => {
  const lowerIsBetter = ['cpl', 'cpm', 'cac', 'cpc', 'cost_per_booking', 'cpb', 'cpq', 'frequency'];
  return lowerIsBetter.includes(metric.toLowerCase()) ? value < benchmark : value > benchmark;
};

// ─── Ecommerce Benchmarks ─────────────────────────────────────
export const getBenchmarkMetrics = (aov: number, campaigns: Campaign[]): BenchmarkMetric[] => {
  const bracket = getAovBracket(aov);
  const totalSpend     = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalRevenue   = campaigns.reduce((s, c) => s + c.revenue, 0);
  const totalImpress   = campaigns.reduce((s, c) => s + c.impressions, 0);
  const totalClicks    = campaigns.reduce((s, c) => s + c.clicks, 0);
  const totalPurchases = campaigns.reduce((s, c) => s + c.purchases, 0);

  const yourROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const yourCPM  = totalImpress > 0 ? (totalSpend / totalImpress) * 1000 : 0;
  const yourCPC  = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const yourCAC  = totalPurchases > 0 ? totalSpend / totalPurchases : 0;
  const yourCTR  = totalImpress > 0 ? (totalClicks / totalImpress) * 100 : 0;

  return [
    { label: 'ROAS',  your_value: +yourROAS.toFixed(2), benchmark_value: bracket.benchmark_roas,                              unit: 'x', higher_is_better: true  },
    { label: 'CPM',   your_value: +yourCPM.toFixed(2),  benchmark_value: aov < 150 ? 12.5 : aov < 300 ? 15.8 : 19.2,        unit: '€', higher_is_better: false },
    { label: 'CAC',   your_value: +yourCAC.toFixed(2),  benchmark_value: (bracket.benchmark_cac.min + bracket.benchmark_cac.max) / 2, unit: '€', higher_is_better: false },
    { label: 'CTR',   your_value: +yourCTR.toFixed(2),  benchmark_value: aov < 150 ? 1.8 : 1.4,                              unit: '%', higher_is_better: true  },
    { label: 'CPC',   your_value: +yourCPC.toFixed(2),  benchmark_value: aov < 150 ? 0.85 : aov < 300 ? 1.2 : 1.8,          unit: '€', higher_is_better: false },
  ];
};

// ─── Clinic Benchmarks (CPL / CTR / CPM only — partial) ───────
export const getClinicBenchmarkMetrics = (campaigns: Campaign[]): BenchmarkMetric[] => {
  const totalSpend   = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalLeads   = campaigns.reduce((s, c) => s + c.leads, 0);
  const totalImpress = campaigns.reduce((s, c) => s + c.impressions, 0);
  const totalClicks  = campaigns.reduce((s, c) => s + c.clicks, 0);
  const totalBookings = campaigns.reduce((s, c) => s + c.bookings, 0);

  const yourCPL  = totalLeads > 0    ? totalSpend / totalLeads : 0;
  const yourCPM  = totalImpress > 0  ? (totalSpend / totalImpress) * 1000 : 0;
  const yourCTR  = totalImpress > 0  ? (totalClicks / totalImpress) * 100 : 0;
  const yourCPB  = totalBookings > 0 ? totalSpend / totalBookings : 0;

  return [
    { label: 'CPL',              your_value: +yourCPL.toFixed(2), benchmark_value: 32,   unit: '€', higher_is_better: false },
    { label: 'CTR',              your_value: +yourCTR.toFixed(2), benchmark_value: 2.1,  unit: '%', higher_is_better: true  },
    { label: 'CPM',              your_value: +yourCPM.toFixed(2), benchmark_value: 11.2, unit: '€', higher_is_better: false },
    { label: 'Cost per Booking', your_value: +yourCPB.toFixed(2), benchmark_value: 95,   unit: '€', higher_is_better: false },
  ];
};

// ─── Spa Benchmarks ────────────────────────────────────────────
export const getSpaBenchmarkMetrics = (campaigns: Campaign[]): BenchmarkMetric[] => {
  const totalSpend    = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalLeads    = campaigns.reduce((s, c) => s + c.leads, 0);
  const totalImpress  = campaigns.reduce((s, c) => s + c.impressions, 0);
  const totalClicks   = campaigns.reduce((s, c) => s + c.clicks, 0);
  const totalBookings = campaigns.reduce((s, c) => s + c.bookings, 0);

  return [
    { label: 'Cost per Booking', your_value: +(totalBookings > 0 ? totalSpend / totalBookings : 0).toFixed(2), benchmark_value: 80,   unit: '€', higher_is_better: false },
    { label: 'CPL',              your_value: +(totalLeads > 0 ? totalSpend / totalLeads : 0).toFixed(2),       benchmark_value: 28,   unit: '€', higher_is_better: false },
    { label: 'CPM',              your_value: +(totalImpress > 0 ? (totalSpend / totalImpress) * 1000 : 0).toFixed(2), benchmark_value: 10.5, unit: '€', higher_is_better: false },
    { label: 'CTR',              your_value: +(totalImpress > 0 ? (totalClicks / totalImpress) * 100 : 0).toFixed(2), benchmark_value: 1.9,  unit: '%', higher_is_better: true  },
  ];
};

// ─── Salon Benchmarks ─────────────────────────────────────────
export const getSalonBenchmarkMetrics = (campaigns: Campaign[]): BenchmarkMetric[] => {
  const totalSpend   = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalLeads   = campaigns.reduce((s, c) => s + c.leads, 0);
  const totalImpress = campaigns.reduce((s, c) => s + c.impressions, 0);
  const totalClicks  = campaigns.reduce((s, c) => s + c.clicks, 0);
  const totalReach   = campaigns.reduce((s, c) => s + c.reach, 0);
  const avgFreq      = campaigns.length > 0 ? campaigns.reduce((s, c) => s + c.frequency, 0) / campaigns.length : 0;

  return [
    { label: 'CPL',       your_value: +(totalLeads > 0 ? totalSpend / totalLeads : 0).toFixed(2),       benchmark_value: 22,   unit: '€', higher_is_better: false },
    { label: 'CPM',       your_value: +(totalImpress > 0 ? (totalSpend / totalImpress) * 1000 : 0).toFixed(2), benchmark_value: 8.5,  unit: '€', higher_is_better: false },
    { label: 'CTR',       your_value: +(totalImpress > 0 ? (totalClicks / totalImpress) * 100 : 0).toFixed(2), benchmark_value: 2.4,  unit: '%', higher_is_better: true  },
    { label: 'Reach',     your_value: totalReach,                                                       benchmark_value: 5000, unit: '',  higher_is_better: true  },
    { label: 'Frequency', your_value: +avgFreq.toFixed(2),                                              benchmark_value: 3.5,  unit: 'x', higher_is_better: false },
  ];
};

// ─── Wholesale Benchmarks ─────────────────────────────────────
export const getWholesaleBenchmarkMetrics = (campaigns: Campaign[]): BenchmarkMetric[] => {
  const totalSpend       = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalLeads       = campaigns.reduce((s, c) => s + c.leads, 0);
  const totalQualified   = campaigns.reduce((s, c) => s + c.qualified_leads, 0);
  const totalImpress     = campaigns.reduce((s, c) => s + c.impressions, 0);
  const totalClicks      = campaigns.reduce((s, c) => s + c.clicks, 0);

  const yourCPL = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const yourCPQ = totalQualified > 0 ? totalSpend / totalQualified : 0;
  const qualityRate = totalLeads > 0 ? (totalQualified / totalLeads) * 100 : 0;

  return [
    { label: 'CPL',               your_value: +yourCPL.toFixed(2),      benchmark_value: 55,  unit: '€', higher_is_better: false },
    { label: 'Lead Quality Rate', your_value: +qualityRate.toFixed(1),  benchmark_value: 35,  unit: '%', higher_is_better: true  },
    { label: 'CPM',               your_value: +(totalImpress > 0 ? (totalSpend / totalImpress) * 1000 : 0).toFixed(2), benchmark_value: 13.5, unit: '€', higher_is_better: false },
    { label: 'CTR',               your_value: +(totalImpress > 0 ? (totalClicks / totalImpress) * 100 : 0).toFixed(2), benchmark_value: 1.2,  unit: '%', higher_is_better: true  },
    { label: 'CPQ',               your_value: +yourCPQ.toFixed(2),      benchmark_value: 160, unit: '€', higher_is_better: false },
  ];
};

// ─── Router — get metrics by business type ────────────────────
export const getBenchmarkMetricsByType = (
  type: BusinessType,
  aov: number,
  campaigns: Campaign[]
): BenchmarkMetric[] => {
  switch (type) {
    case 'clinic':    return getClinicBenchmarkMetrics(campaigns);
    case 'spa':       return getSpaBenchmarkMetrics(campaigns);
    case 'salon':     return getSalonBenchmarkMetrics(campaigns);
    case 'wholesale': return getWholesaleBenchmarkMetrics(campaigns);
    default:          return getBenchmarkMetrics(aov, campaigns);
  }
};

// ─── Formatters ───────────────────────────────────────────────
export const formatCurrency = (value: number, currency = 'EUR'): string =>
  new Intl.NumberFormat('en-EU', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);

export const formatNumber = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
};

export const roasStatus = (roas: number): 'success' | 'warning' | 'danger' => {
  if (roas >= 3)   return 'success';
  if (roas >= 1.5) return 'warning';
  return 'danger';
};

// ─── Static data ──────────────────────────────────────────────
export const MARKETS: Record<string, string> = {
  ES: '🇪🇸 Spain', DE: '🇩🇪 Germany', IT: '🇮🇹 Italy',
  NL: '🇳🇱 Netherlands', US: '🇺🇸 United States',
  UK: '🇬🇧 United Kingdom', FR: '🇫🇷 France',
};

export const CATEGORIES = [
  'Skincare', 'Makeup', 'Haircare', 'Fragrance',
  'Wellness', 'Body Care', 'Nail Care', 'Aesthetics & Anti-aging',
];

export const BUSINESS_TYPE_LABELS: Record<string, { icon: string; title: string; sub: string; desc: string }> = {
  ecommerce: { icon: '🛍️', title: 'Online Store',       sub: 'DTC ecommerce',          desc: 'Shopify / WooCommerce' },
  clinic:    { icon: '💉', title: 'Beauty Clinic',       sub: 'Aesthetic center',       desc: 'Dermatology · Medical beauty' },
  spa:       { icon: '🧖', title: 'Spa & Wellness',      sub: 'Spa, wellness, studio',  desc: 'Retreat · Studio' },
  salon:     { icon: '✂️', title: 'Salon & Studio',      sub: 'Hair, nail, brow, lash', desc: 'Beauty bar' },
  wholesale: { icon: '📦', title: 'Brand / Wholesale',   sub: 'B2B, distributor',       desc: 'Multi-brand · Retail' },
};

export const LEFT_PANEL_COPY: Record<string, string> = {
  ecommerce: "Tell us about your store and we'll calibrate 9 years of Beauty & Cosmetics ecommerce benchmark data to your exact AOV and markets.",
  clinic:    "Tell us about your clinic and we'll set up your campaign intelligence for lead generation and booking optimization.",
  spa:       "Tell us about your spa and we'll configure your dashboard for bookings, seasonal campaigns, and gift voucher performance.",
  salon:     "Tell us about your salon and we'll optimize for local reach, new client acquisition, and frequency management.",
  wholesale: "Tell us about your brand and we'll configure your dashboard for B2B lead generation and distributor outreach.",
};
