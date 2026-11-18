// node scripts/run-ts.mjs --test tests/reference-dataset.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { classifyObjective, classifyCampaign, GOOGLE_CAMPAIGN_TYPE_GOAL } from '../src/lib/objective';
import { parseCsv, transform, identifyingValues, period, toEur, canonicalHeader, type FxTable } from '../scripts/lib/reference-transform';

const MIGRATION = readFileSync('supabase/migrations/20261118120000_reference_dataset.sql', 'utf8');

// ── One taxonomy: SQL rouge_goal() must match src/lib/objective.ts ───────────
test('rouge_goal() Google mapping equals GOOGLE_CAMPAIGN_TYPE_GOAL', () => {
  const sql = Object.fromEntries(
    [...MIGRATION.matchAll(/when '([A-Z ]+)'\s+then '(\w+)'/g)].map(m => [m[1], m[2]]),
  );
  assert.deepEqual(sql, GOOGLE_CAMPAIGN_TYPE_GOAL);
});

test('rouge_goal() Meta rules give the same goal as classifyObjective()', () => {
  // Re-implement the SQL regex branch from the migration text, in order, and compare.
  const rules = [...MIGRATION.matchAll(/~ '\(([A-Z_|]+)\)'\s+then '(\w+)'/g)].map(m => ({ re: new RegExp(`(${m[1]})`), goal: m[2] }));
  assert.ok(rules.length >= 5, 'expected the five Meta rules in the migration');
  const sqlGoal = (raw: string) => rules.find(r => r.re.test(raw.toUpperCase()))?.goal ?? 'unknown';
  for (const raw of ['OUTCOME_SALES', 'OUTCOME_TRAFFIC', 'LINK_CLICKS', 'OUTCOME_ENGAGEMENT', 'OUTCOME_LEADS',
    'LEAD_GENERATION', 'OUTCOME_AWARENESS', 'REACH', 'BRAND_AWARENESS', 'CONVERSIONS', 'PRODUCT_CATALOG_SALES',
    'POST_ENGAGEMENT', 'PAGE_LIKES', 'MESSAGES', '']) {
    assert.equal(sqlGoal(raw), classifyObjective(raw), raw);
  }
});

// ── Transform ────────────────────────────────────────────────────────────────
test('periods: day, month (to the last day), year', () => {
  assert.deepEqual(period('2024-02-10'), { start: '2024-02-10', end: '2024-02-10', granularity: 'day' });
  assert.deepEqual(period('2024-02'), { start: '2024-02-01', end: '2024-02-29', granularity: 'month' });
  assert.deepEqual(period('2018'), { start: '2018-01-01', end: '2018-12-31', granularity: 'year' });
  assert.throws(() => period('Feb 2024'));
});

test('FX: EUR passes through, USD uses the month rate, a year uses the mean of its months', () => {
  const fx: FxTable = new Map([['2024-01:USD', 0.9], ['2024-02:USD', 0.8]]);
  assert.equal(toEur(100, 'EUR', '2024-01-05', 'day', fx), 100);
  assert.equal(toEur(100, 'USD', '2024-01-05', 'day', fx), 90);
  assert.ok(Math.abs(toEur(100, 'USD', '2024-01-01', 'year', fx) - 85) < 1e-9);
  assert.throws(() => toEur(100, 'USD', '2030-01-01', 'day', fx));
});

test('headers are matched by name in English, Hebrew and Spanish', () => {
  assert.equal(canonicalHeader('Amount spent (USD)'), 'spend');
  assert.equal(canonicalHeader('סכום שהוצא'), 'spend');
  assert.equal(canonicalHeader('Importe gastado'), 'spend');
  assert.equal(canonicalHeader('﻿campaign_id'), 'campaign_id');
  const rows = parseCsv('Day,Campaign ID,Amount spent (USD)\n2024-01-01,42,"1,250.50"\n');
  assert.deepEqual(rows, [{ date: '2024-01-01', campaign_id: '42', spend: '1,250.50' }]);
});

test('Google campaign types map onto the shared taxonomy', () => {
  assert.equal(classifyCampaign('google', 'Performance Max'), 'sales');
  assert.equal(classifyCampaign('google', 'Demand Gen'), 'engagement');
  assert.equal(classifyCampaign('google', 'Something new'), 'unknown');
  assert.equal(classifyCampaign('meta', 'OUTCOME_SALES'), 'sales');
});

// ── The real exports (skipped where the git-ignored files aren't present) ────
const fx: FxTable = new Map(
  [...readFileSync('supabase/seed/fx_rates_monthly.sql', 'utf8')
    .matchAll(/\('(\d{4}-\d{2})-01', '([A-Z]{3})', [\d.]+, ([\d.]+)\)/g)].map(m => [`${m[1]}:${m[2]}`, Number(m[3])]),
);
for (const [file, platform, sourceKey] of [
  ['meta_355719742225476_daily.csv', 'meta', 'ref_meta_01'],
  ['google_263034418_monthly_v2.csv', 'google', 'ref_google_01'],
] as const) {
  const path = `data/reference/${file}`;
  test(`${sourceKey}: no brand, campaign, collection or account identifier survives`, { skip: !existsSync(path) }, () => {
    const records = parseCsv(readFileSync(path, 'utf8'));
    const rows = transform(records, { file, platform, sourceKey }, fx);
    const secrets = identifyingValues(records);
    const blob = JSON.stringify(rows);
    for (const s of secrets) assert.ok(!blob.includes(`"${s}"`), 'an identifying value reached the output');
    assert.ok(!blob.includes(file.match(/\d{9,}/)![0]), 'the real account id reached the output');
    const keys = rows.map(r => `${r.campaign_key}|${r.period_start}|${r.granularity}`);
    assert.equal(new Set(keys).size, keys.length, 'unique key must not collide (idempotent upsert)');
  });
}
