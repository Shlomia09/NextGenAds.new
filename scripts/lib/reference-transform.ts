// Turns the raw reference exports into anonymous reference_campaign_stats rows.
// Brand, campaign, collection and real account identifiers never leave this module: campaigns
// become a sha-256 key, accounts become an opaque source_key, and names are dropped.
import { createHash } from 'node:crypto';
import { classifyCampaign, GOOGLE_CAMPAIGN_TYPE_GOAL } from '../../src/lib/objective';

export type Platform = 'meta' | 'google';

export interface ReferenceRow {
  source_key: string;
  platform: Platform;
  campaign_key: string;
  objective_normalized: string;
  campaign_type: string | null;
  period_start: string;
  period_end: string;
  granularity: 'day' | 'month' | 'year';
  currency_original: string;
  spend_original: number;
  spend_eur: number;
  impressions: number;
  reach: number | null;
  clicks: number;
  link_clicks: number | null;
  landing_page_views: number | null;
  add_to_cart: number | null;
  initiate_checkout: number | null;
  purchases: number | null;
  purchase_value_eur: number | null;
  leads: number | null;
  vertical: string;
  category: string | null;
  market: string | null;
}

// ── CSV ──────────────────────────────────────────────────────────────────────
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false; }
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const [head = [], ...body] = rows;
  const keys = head.map(h => canonicalHeader(h));
  return body.map(r => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])));
}

// Columns are matched by header name, in English, Hebrew or Spanish, never by position.
const HEADER_ALIASES: Record<string, string[]> = {
  campaign_id:        ['campaign id', 'מזהה קמפיין', 'id de la campaña', 'identificador de la campaña'],
  campaign_name:      ['campaign', 'campaign name', 'שם קמפיין', 'nombre de la campaña', 'campaña'],
  ad_account_id:      ['account id', 'ad account id', 'מזהה חשבון', 'id de la cuenta'],
  objective:          ['objective', 'מטרה', 'objetivo'],
  campaign_type:      ['campaign type', 'סוג קמפיין', 'tipo de campaña'],
  date:               ['day', 'reporting starts', 'יום', 'día', 'fecha'],
  month:              ['month', 'חודש', 'mes'],
  currency:           ['currency', 'currency code', 'מטבע', 'moneda'],
  spend:              ['amount spent', 'amount spent (usd)', 'amount spent (eur)', 'סכום שהוצא', 'importe gastado'],
  cost:               ['cost', 'עלות', 'coste', 'costo'],
  impressions:        ['impr.', 'חשיפות', 'impresiones'],
  reach:              ['טווח הגעה', 'alcance'],
  clicks:             ['clicks (all)', 'קליקים', 'clics'],
  clicks_interactions:['interactions', 'clicks', 'interacciones'],
  landing_page_views: ['landing page views', 'צפיות בדף נחיתה', 'visitas a la página de destino'],
  add_to_cart:        ['adds to cart', 'הוספות לעגלה', 'artículos añadidos al carrito'],
  initiate_checkout:  ['checkouts initiated', 'begin_checkout', 'התחלות תשלום', 'pagos iniciados'],
  purchases:          ['purchases', 'רכישות', 'compras'],
  purchase_value:     ['purchases conversion value', 'ערך המרות רכישה', 'valor de conversión de compras'],
  conversions:        ['conv.', 'conversions', 'המרות', 'conversiones'],
};
export function canonicalHeader(raw: string): string {
  const h = raw.replace(/^﻿/, '').trim().toLowerCase();
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    if (h === key || aliases.includes(h)) return key;
  }
  return h.replace(/\s+/g, '_');
}

// ── Values ───────────────────────────────────────────────────────────────────
const num = (v: string | undefined): number => {
  const n = parseFloat(String(v ?? '').replace(/[,\s€$%]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const optNum = (v: string | undefined): number | null => (v === undefined || v === '' ? null : num(v));
const round2 = (n: number) => Math.round(n * 100) / 100;

export const campaignKey = (platform: Platform, account: string, campaign: string) =>
  createHash('sha256').update(`${platform}:${account}:${campaign}`).digest('hex');

// A period string from the export: 'YYYY-MM-DD' (day), 'YYYY-MM' (month) or 'YYYY' (year).
export function period(raw: string): { start: string; end: string; granularity: 'day' | 'month' | 'year' } {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { start: raw, end: raw, granularity: 'day' };
  if (/^\d{4}-\d{2}$/.test(raw)) {
    const [y, m] = raw.split('-').map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return { start: `${raw}-01`, end: `${raw}-${String(last).padStart(2, '0')}`, granularity: 'month' };
  }
  if (/^\d{4}$/.test(raw)) return { start: `${raw}-01-01`, end: `${raw}-12-31`, granularity: 'year' };
  throw new Error(`Unrecognised period "${raw}"`);
}

// FX: EUR per unit of currency, keyed 'YYYY-MM'. A year row uses the mean of its months.
export type FxTable = Map<string, number>;
export function toEur(amount: number, currency: string, start: string, granularity: string, fx: FxTable): number {
  if (currency === 'EUR') return amount;
  const months = granularity === 'year'
    ? [...fx.keys()].filter(k => k.startsWith(start.slice(0, 4)) && k.endsWith(`:${currency}`)).map(k => k.slice(0, 7))
    : [start.slice(0, 7)];
  const rates = months.map(m => fx.get(`${m}:${currency}`)).filter((r): r is number => r !== undefined);
  if (rates.length === 0) throw new Error(`No ${currency}→EUR rate for ${start.slice(0, 7)}`);
  return amount * (rates.reduce((a, b) => a + b, 0) / rates.length);
}

// ── Exports → rows ───────────────────────────────────────────────────────────
export interface SourceSpec { file: string; platform: Platform; sourceKey: string }

export function transform(records: Record<string, string>[], spec: SourceSpec, fx: FxTable): ReferenceRow[] {
  return records.map((r, i) => {
    const line = i + 2;
    const account = r.ad_account_id;
    if (!account) throw new Error(`${spec.file}:${line} has no account id`);
    const isMeta = spec.platform === 'meta';
    const rawCampaign = isMeta ? r.campaign_id : `${r.campaign_name}|${r.campaign_type}`;
    if (!rawCampaign || rawCampaign === '|') throw new Error(`${spec.file}:${line} has no campaign identifier`);
    const p = period(isMeta ? r.date : r.month);
    const currency = (r.currency || '').toUpperCase();
    if (!currency) throw new Error(`${spec.file}:${line} has no currency`);
    const spend = num(isMeta ? r.spend : r.cost);
    const value = isMeta ? num(r.purchase_value) : 0;
    return {
      source_key:           spec.sourceKey,
      platform:             spec.platform,
      campaign_key:         campaignKey(spec.platform, account, rawCampaign),
      objective_normalized: classifyCampaign(spec.platform, isMeta ? r.objective : r.campaign_type),
      campaign_type:        isMeta ? null : r.campaign_type || null,
      period_start:         p.start,
      period_end:           p.end,
      granularity:          p.granularity,
      currency_original:    currency,
      spend_original:       round2(spend),
      spend_eur:            round2(toEur(spend, currency, p.start, p.granularity, fx)),
      impressions:          num(r.impressions),
      reach:                optNum(r.reach),
      clicks:               num(isMeta ? r.clicks : r.clicks_interactions),
      link_clicks:          optNum(r.link_clicks),
      landing_page_views:   optNum(isMeta ? r.landing_page_views : r.page_views),
      add_to_cart:          optNum(r.add_to_cart),
      initiate_checkout:    optNum(isMeta ? r.initiate_checkout : r.begin_checkout),
      purchases:            isMeta ? optNum(r.purchases) : optNum(r.conversions),
      purchase_value_eur:   isMeta ? round2(toEur(value, currency, p.start, p.granularity, fx)) : null,
      leads:                optNum(r.leads),
      vertical:             (r.vertical || 'beauty').toLowerCase(),
      category:             null,
      market:               null,
    };
  });
}

// Every identifying string from the export, used to prove none of them reaches the output.
// Google's default campaign names are just the campaign type ("Smart", "Shopping",
// "Performance Max"); those identify nothing and are kept out of the set.
export function identifyingValues(records: Record<string, string>[]): Set<string> {
  const generic = new Set(Object.keys(GOOGLE_CAMPAIGN_TYPE_GOAL));
  const out = new Set<string>();
  for (const r of records) for (const k of ['brand', 'campaign_name', 'collection', 'ad_account_id', 'campaign_id']) {
    const v = r[k];
    if (v && v.length >= 3 && !generic.has(v.toUpperCase())) out.add(v);
  }
  return out;
}
