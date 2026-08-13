/**
 * lib/exportCsv.ts
 *
 * Client-side CSV export utility for NextAdsGen.
 * No dependencies — uses native browser APIs only.
 *
 * Usage:
 *   exportCampaignsCsv(campaigns, { dateLabel: 'Last 30 days', brandName: 'NeoLumo' })
 */

import type { Campaign } from '../types';

interface ExportOptions {
  /** Human-readable date range label for the filename and header row */
  dateLabel: string;
  /** Brand name for the filename */
  brandName?: string;
}

/** Safely format a number for CSV (no commas in the number, comma is the delimiter) */
const n = (v: number | null | undefined, decimals = 2): string =>
  v == null || v === 0 ? '0' : v.toFixed(decimals);

/** Escape a string value for CSV (wrap in quotes if it contains comma, quote, or newline) */
const esc = (v: string | null | undefined): string => {
  const s = String(v ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

/** Convert array of rows to a CSV string */
function toCsv(rows: string[][]): string {
  return rows.map(row => row.map(esc).join(',')).join('\n');
}

/** Trigger a browser download of a text file */
function download(filename: string, content: string, mimeType = 'text/csv;charset=utf-8;') {
  const blob = new Blob(['\uFEFF' + content], { type: mimeType }); // BOM for Excel UTF-8
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Sanitise a string for use in a filename */
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ─────────────────────────────────────────────────────────────────────────────
// Main export function
// ─────────────────────────────────────────────────────────────────────────────

export function exportCampaignsCsv(campaigns: Campaign[], opts: ExportOptions): void {
  const { dateLabel, brandName = 'all-brands' } = opts;

  const today    = new Date().toISOString().split('T')[0];
  const filename = `nextadsgen_campaigns_${slug(brandName)}_${slug(dateLabel)}_${today}.csv`;

  // ── Header row ──────────────────────────────────────────────────────────────
  const headers = [
    'Campaign Name',
    'Status',
    'Objective',
    'Platform',
    // Spend / Reach
    'Spend (€)',
    'Impressions',
    'Clicks',
    'CTR (%)',
    'CPM (€)',
    // Ecommerce
    'Purchases',
    'Revenue (€)',
    'ROAS',
    'Add to Cart',
    // Lead gen
    'Leads',
    'CPL (€)',
    'Qualified Leads',
    'Lead Quality Rate (%)',
    'Bookings',
    // Traffic
    'Page Views',
    // Reach
    'Reach',
    'Frequency',
    // Budget
    'Daily Budget (€)',
    // Meta IDs
    'Campaign ID (External)',
    'Date Start',
    'Last Synced',
  ];

  // ── Data rows ───────────────────────────────────────────────────────────────
  const rows: string[][] = campaigns.map(c => {
    const ctr = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0;
    const cpm = c.impressions > 0 ? (c.spend / c.impressions) * 1000 : 0;

    return [
      c.name,
      c.status,
      c.objective,
      c.platform,
      // Spend / Reach
      n(c.spend),
      n(c.impressions, 0),
      n(c.clicks, 0),
      n(ctr),
      n(cpm),
      // Ecommerce
      n(c.purchases, 0),
      n(c.revenue),
      n(c.roas),
      n(c.atc, 0),
      // Lead gen
      n(c.leads, 0),
      n(c.cpl),
      n(c.qualified_leads, 0),
      n(c.lead_quality_rate ? c.lead_quality_rate * 100 : 0),
      n(c.bookings, 0),
      // Traffic
      n(c.page_views, 0),
      // Reach
      n(c.reach, 0),
      n(c.frequency),
      // Budget
      n(c.budget_daily),
      // Meta IDs
      c.campaign_id_external,
      c.date_start ?? '',
      c.synced_at ? c.synced_at.split('T')[0] : '',
    ];
  });

  // ── Summary row ─────────────────────────────────────────────────────────────
  const sum = (key: keyof Campaign) =>
    campaigns.reduce((s, c) => s + (Number(c[key]) || 0), 0);

  const totalSpend      = sum('spend');
  const totalImpressions = sum('impressions');
  const totalClicks     = sum('clicks');
  const totalPurchases  = sum('purchases');
  const totalRevenue    = sum('revenue');
  const totalLeads      = sum('leads');
  const totalAtc        = sum('atc');
  const totalQLeads     = sum('qualified_leads');
  const totalBookings   = sum('bookings');
  const totalPageViews  = sum('page_views');

  const summaryRow: string[] = [
    `TOTAL (${campaigns.length} campaigns)`,
    '',
    '',
    '',
    n(totalSpend),
    n(totalImpressions, 0),
    n(totalClicks, 0),
    totalImpressions > 0 ? n((totalClicks / totalImpressions) * 100) : '0',
    totalImpressions > 0 ? n((totalSpend / totalImpressions) * 1000) : '0',
    n(totalPurchases, 0),
    n(totalRevenue),
    totalPurchases > 0 ? n(totalRevenue / totalPurchases) : '0',
    n(totalAtc, 0),
    n(totalLeads, 0),
    totalLeads > 0 ? n(totalSpend / totalLeads) : '0',
    n(totalQLeads, 0),
    '',
    n(totalBookings, 0),
    n(totalPageViews, 0),
    '', '', '', '', '', '',
  ];

  const csvContent = toCsv([
    // Meta header (date range context)
    [`NextAdsGen Export — ${dateLabel}`, `Generated: ${new Date().toLocaleString()}`, '', ...Array(headers.length - 2).fill('')],
    [],
    headers,
    ...rows,
    [],
    summaryRow,
  ]);

  download(filename, csvContent);
}
