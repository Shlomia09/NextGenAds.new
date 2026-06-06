import type { AovBracket, BenchmarkMetric, Campaign } from '../types';

// AOV Bracket definitions (from system prompt benchmark data)
export const AOV_BRACKETS: AovBracket[] = [
  {
    label: '< €80',
    min: 0,
    max: 80,
    benchmark_cac: { min: 15, max: 35 },
    benchmark_roas: 3.8,
    recommended_funnel: 'Direct Conversion (Meta Purchases objective)',
    timeline_days: 14,
  },
  {
    label: '€80–150',
    min: 80,
    max: 150,
    benchmark_cac: { min: 30, max: 60 },
    benchmark_roas: 3.2,
    recommended_funnel: 'Hybrid: 70% Conversions + 30% Traffic + Retargeting',
    timeline_days: 21,
  },
  {
    label: '€150–300',
    min: 150,
    max: 300,
    benchmark_cac: { min: 50, max: 90 },
    benchmark_roas: 2.8,
    recommended_funnel: 'Traffic → Google Search → Klaviyo Close',
    timeline_days: 30,
  },
  {
    label: '> €300',
    min: 300,
    max: Infinity,
    benchmark_cac: { min: 80, max: 150 },
    benchmark_roas: 2.2,
    recommended_funnel: 'Awareness (Meta) + Google Brand Search + 5-email Klaviyo',
    timeline_days: 45,
  },
];

export const getAovBracket = (aov: number): AovBracket => {
  return (
    AOV_BRACKETS.find((b) => aov >= b.min && aov < b.max) || AOV_BRACKETS[AOV_BRACKETS.length - 1]
  );
};

export const getBenchmarkMetrics = (
  aov: number,
  campaigns: Campaign[]
): BenchmarkMetric[] => {
  const bracket = getAovBracket(aov);

  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0);
  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0);
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
  const totalPurchases = campaigns.reduce((s, c) => s + c.purchases, 0);

  const yourROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const yourCPM = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
  const yourCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const yourCAC = totalPurchases > 0 ? totalSpend / totalPurchases : 0;
  const yourCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  return [
    {
      label: 'ROAS',
      your_value: parseFloat(yourROAS.toFixed(2)),
      benchmark_value: bracket.benchmark_roas,
      unit: 'x',
      higher_is_better: true,
    },
    {
      label: 'CPM',
      your_value: parseFloat(yourCPM.toFixed(2)),
      benchmark_value: aov < 150 ? 12.5 : aov < 300 ? 15.8 : 19.2,
      unit: '€',
      higher_is_better: false,
    },
    {
      label: 'CAC',
      your_value: parseFloat(yourCAC.toFixed(2)),
      benchmark_value: (bracket.benchmark_cac.min + bracket.benchmark_cac.max) / 2,
      unit: '€',
      higher_is_better: false,
    },
    {
      label: 'CTR',
      your_value: parseFloat(yourCTR.toFixed(2)),
      benchmark_value: aov < 150 ? 1.8 : 1.4,
      unit: '%',
      higher_is_better: true,
    },
    {
      label: 'CPC',
      your_value: parseFloat(yourCPC.toFixed(2)),
      benchmark_value: aov < 150 ? 0.85 : aov < 300 ? 1.2 : 1.8,
      unit: '€',
      higher_is_better: false,
    },
  ];
};

// Format currency
export const formatCurrency = (value: number, currency = 'EUR'): string => {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
};

// Format large numbers
export const formatNumber = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
};

// ROAS status color
export const roasStatus = (roas: number): 'success' | 'warning' | 'danger' => {
  if (roas >= 3) return 'success';
  if (roas >= 1.5) return 'warning';
  return 'danger';
};

// Market labels
export const MARKETS: Record<string, string> = {
  ES: '🇪🇸 Spain',
  DE: '🇩🇪 Germany',
  IT: '🇮🇹 Italy',
  NL: '🇳🇱 Netherlands',
  US: '🇺🇸 United States',
  UK: '🇬🇧 United Kingdom',
  FR: '🇫🇷 France',
};

// Category labels
export const CATEGORIES = [
  'Skincare',
  'Makeup',
  'Haircare',
  'Fragrance',
  'Wellness',
  'Body Care',
  'Nail Care',
];
