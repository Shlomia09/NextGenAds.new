// Loads the reference beauty dataset into reference_campaign_stats.
//
//   npx vite-node scripts/load-reference-dataset.ts            # dry run: report only, writes nothing
//   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
//   npx vite-node scripts/load-reference-dataset.ts --commit   # writes, in one import batch
//
// Reads data/reference/ (git-ignored: the raw exports carry brand and account names).
// Stops without writing if any source's total is more than 1% off its expected total.
// Idempotent: the unique key (source_key, campaign_key, period_start, granularity) is upserted,
// so a second run updates rows instead of duplicating them. On failure, every row written by the
// batch is deleted and the batch is marked failed.
import { readFileSync, existsSync } from 'node:fs';
import { parseCsv, transform, identifyingValues, type FxTable, type ReferenceRow, type SourceSpec } from './lib/reference-transform';

const DIR = 'data/reference/';
const SOURCES: (SourceSpec & { realAccount: string; expectedTotal: number; expectedCurrency: string; note: string })[] = [
  {
    file: 'meta_355719742225476_daily.csv', platform: 'meta', sourceKey: 'ref_meta_01',
    realAccount: '355719742225476', expectedCurrency: 'USD',
    // The export's own total. The account reports more (the gap is deleted campaigns, ~3%);
    // this check guards the load, not the export.
    expectedTotal: 122712.66, note: 'export total (account total is higher: deleted campaigns)',
  },
  {
    file: 'google_263034418_monthly_v2.csv', platform: 'google', sourceKey: 'ref_google_01',
    realAccount: '263034418', expectedCurrency: 'EUR',
    expectedTotal: 201696, note: 'account total in Google Ads',
  },
];
const MAX_GAP = 0.01;

function loadFx(): FxTable {
  const sql = readFileSync('supabase/seed/fx_rates_monthly.sql', 'utf8');
  const fx: FxTable = new Map();
  for (const m of sql.matchAll(/\('(\d{4}-\d{2})-01', '([A-Z]{3})', [\d.]+, ([\d.]+)\)/g)) fx.set(`${m[1]}:${m[2]}`, Number(m[3]));
  if (fx.size === 0) throw new Error('No FX rates found in supabase/seed/fx_rates_monthly.sql');
  return fx;
}

function report(spec: (typeof SOURCES)[number], rows: ReferenceRow[]) {
  const keys = rows.map(r => `${r.campaign_key}|${r.period_start}|${r.granularity}`);
  const dupes = keys.length - new Set(keys).size;
  const original = rows.reduce((s, r) => s + r.spend_original, 0);
  const eur = rows.reduce((s, r) => s + r.spend_eur, 0);
  const dates = rows.map(r => r.period_start).sort();
  const match = original / spec.expectedTotal;
  return {
    source: spec.sourceKey, platform: spec.platform, rows: rows.length,
    campaigns: new Set(rows.map(r => r.campaign_key)).size,
    from: dates[0], to: rows.map(r => r.period_end).sort().at(-1),
    granularity: [...new Set(rows.map(r => r.granularity))].join('/'),
    [`spend_${spec.expectedCurrency}`]: Math.round(original * 100) / 100,
    spend_eur: Math.round(eur * 100) / 100,
    expected: `${spec.expectedTotal} ${spec.expectedCurrency} (${spec.note})`,
    match_pct: Math.round(match * 10000) / 100,
    duplicate_keys: dupes,
    ok: Math.abs(1 - match) <= MAX_GAP && dupes === 0,
  };
}

async function main() {
  const commit = process.argv.includes('--commit');
  const fx = loadFx();
  const all: { spec: (typeof SOURCES)[number]; rows: ReferenceRow[] }[] = [];

  for (const spec of SOURCES) {
    if (!existsSync(DIR + spec.file)) throw new Error(`Missing ${DIR}${spec.file}`);
    const records = parseCsv(readFileSync(DIR + spec.file, 'utf8'));
    const currencies = new Set(records.map(r => (r.currency || '').toUpperCase()));
    if (currencies.size !== 1 || !currencies.has(spec.expectedCurrency)) {
      throw new Error(`${spec.file}: expected ${spec.expectedCurrency} only, found ${[...currencies].join(',')}`);
    }
    const rows = transform(records, spec, fx);
    // No identifying string from the export may survive into the rows that get written.
    const secrets = identifyingValues(records);
    const leaked = rows.flatMap(r => Object.values(r)).filter(v => typeof v === 'string' && secrets.has(v));
    if (leaked.length) throw new Error(`${spec.file}: ${leaked.length} identifying values reached the output`);
    all.push({ spec, rows });
  }

  const summary = all.map(({ spec, rows }) => report(spec, rows));
  console.table(summary);
  if (summary.some(s => !s.ok)) {
    console.error('Stopped: a source is more than 1% off its expected total, or has duplicate keys. Nothing was written.');
    process.exit(1);
  }
  if (!commit) { console.log('Dry run: nothing written. Re-run with --commit to load.'); return; }

  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required with --commit');
  const { createClient } = await import('@supabase/supabase-js');
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data: batch, error: batchErr } = await db.from('import_batches')
    .insert({ kind: 'reference_dataset', status: 'running' }).select('id').single();
  if (batchErr || !batch) throw new Error(`import_batches: ${batchErr?.message}`);

  try {
    for (const { spec } of all) {
      const { error } = await db.from('reference_sources').upsert({
        source_key: spec.sourceKey, platform: spec.platform, real_account_ref: spec.realAccount,
        relationship: 'own', usage_basis: '[FILL IN: agreement or consent covering benchmark use]',
      });
      if (error) throw new Error(`reference_sources: ${error.message}`);
    }
    for (const { rows } of all) {
      for (let i = 0; i < rows.length; i += 500) {
        const chunk = rows.slice(i, i + 500).map(r => ({ ...r, import_batch_id: batch.id }));
        const { error } = await db.from('reference_campaign_stats')
          .upsert(chunk, { onConflict: 'source_key,campaign_key,period_start,granularity' });
        if (error) throw new Error(`reference_campaign_stats: ${error.message}`);
      }
    }
    // The Meta reference account is also connected as a live account; flag it so it is never
    // counted twice and its brand is hidden from everyone but admins.
    const { data: acct, error: acctErr } = await db.from('ad_accounts')
      .update({ is_reference_source: true }).eq('account_id', SOURCES[0].realAccount).select('brand_id');
    if (acctErr) throw new Error(`ad_accounts: ${acctErr.message}`);
    const brandIds = (acct ?? []).map(a => a.brand_id).filter(Boolean);
    if (brandIds.length) {
      const { error } = await db.from('brands').update({ is_reference_source: true }).in('id', brandIds);
      if (error) throw new Error(`brands: ${error.message}`);
    }
    await db.from('import_batches').update({
      status: 'completed', finished_at: new Date().toISOString(), report: { sources: summary },
    }).eq('id', batch.id);
    console.log(`Loaded in batch ${batch.id}.`);
  } catch (err) {
    // Roll back everything this batch wrote.
    await db.from('reference_campaign_stats').delete().eq('import_batch_id', batch.id);
    await db.from('import_batches').update({
      status: 'failed', finished_at: new Date().toISOString(), report: { error: String(err), sources: summary },
    }).eq('id', batch.id);
    throw err;
  }
}

main().catch(err => { console.error(err instanceof Error ? err.message : err); process.exit(1); });
