// node scripts/run-ts.mjs --test tests/half-life.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeHalfLife, type AdDay } from '../src/lib/halfLife';

const day = (i: number, over: Partial<AdDay> = {}): AdDay => ({
  date: new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10),
  spend: 100, impressions: 10000, clicks: 200, reach: 8000, conversions: 10,
  landing_page_views: 150, video_3s_views: 3000, ...over,
});
const days = (n: number, f: (i: number) => Partial<AdDay>) => Array.from({ length: n }, (_, i) => day(i, f(i)));

test('needs at least one full 7-day window', () => {
  assert.equal(computeHalfLife(days(6, () => ({}))), null);
});

test('CPA basis: dies when rolling CPA doubles; cause is the first threshold crossed', () => {
  // 10 steady days, then conversions fall to 2/day while CPM rises (spend up, impressions flat)
  const d = days(30, i => (i < 10 ? {} : { conversions: 2, spend: 140 }));
  const r = computeHalfLife(d)!;
  assert.equal(r.basis, 'cpa');
  assert.equal(r.bestWindow.value, 10);                // 700 / 70
  assert.ok(r.halfLifeDays !== null && r.halfLifeDays > 0);
  // conversions fall while landing-page views hold, so LP CVR drops 30% (day 3) before CPM rises 30% (day 6)
  assert.equal(r.cause?.metric, 'landing_page');
});

test('CPM is the cause when only the cost of reach rises', () => {
  const d = days(30, i => (i < 10 ? {} : { spend: 140 }));   // same delivery and conversions, 40% dearer
  const r = computeHalfLife(d)!;
  assert.equal(r.cause?.metric, 'cpm');
  assert.equal(r.halfLifeDays, null, 'CPA rose 40%, not 100%: not dead yet');
});

test('CTR basis when the ad never converts', () => {
  const d = days(25, i => ({ conversions: 0, clicks: i < 8 ? 300 : 120 }));
  const r = computeHalfLife(d)!;
  assert.equal(r.basis, 'ctr');
  assert.ok(r.diedOn !== null, 'CTR fell to 40% of best, so it reached Half-Life');
});

test('frequency over 3 is the cause when reach collapses first', () => {
  const d = days(24, i => (i < 9 ? {} : { reach: 2500 }));
  const r = computeHalfLife(d)!;
  assert.equal(r.cause?.metric, 'frequency');
});

test('hook rate is evaluated only for video; image ads skip it', () => {
  const video = computeHalfLife(days(24, i => (i < 9 ? {} : { video_3s_views: 1500 })))!;
  assert.equal(video.cause?.metric, 'hook_rate');
  const image = computeHalfLife(days(24, i => ({ video_3s_views: null, ...(i < 9 ? {} : {}) })))!;
  assert.equal(image.cause, null);
});

test('a healthy ad has no Half-Life yet and no cause', () => {
  const r = computeHalfLife(days(20, () => ({})))!;
  assert.equal(r.halfLifeDays, null);
  assert.equal(r.cause, null);
});
