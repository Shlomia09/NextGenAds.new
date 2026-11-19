// Half-Life and cause of death for one ad — the definition in Docs/founder-decisions.md (item 4):
//
//   • Input: daily, ad-level data from a live client. Nothing else (the reference layer never feeds this).
//   • Best window: the best rolling 7-day window of the ad — lowest CPA, or highest CTR when the ad has no
//     conversions at all.
//   • Half-Life: days from the end of the best window until the rolling 7-day metric is 50% worse than it:
//     CTR at half the best, or CPA at twice the best (efficiency halved). [interpretation — CONFIRM WITH FOUNDER]
//   • Cause of death: the first metric, after the best window, to cross its threshold —
//     frequency > 3 · hook rate down > 30% · CPM up > 30% · landing-page CVR down > 30%
//     (each rolling 7-day value against the best window; ties broken in that order).

export interface AdDay {
  date: string;              // YYYY-MM-DD
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  conversions: number;
  landing_page_views: number;
  video_3s_views: number | null;   // null for non-video ads: hook rate is not evaluated
}

export type Cause = 'frequency' | 'hook_rate' | 'cpm' | 'landing_page';

export interface HalfLifeResult {
  basis: 'cpa' | 'ctr';
  bestWindow: { start: string; end: string; value: number };
  /** Days from the end of the best window to the 50% point; null while the ad hasn't reached it. */
  halfLifeDays: number | null;
  /** The day the 50% point was reached, if it was. */
  diedOn: string | null;
  /** First threshold crossed after the best window, and when; null if none has been crossed. */
  cause: { metric: Cause; on: string } | null;
  /** Days of data after the best window (how long it has been tracked since its peak). */
  daysSinceBest: number;
}

export const THRESHOLDS = {
  window: 7,
  frequency: 3,          // absolute
  hookRateDrop: 0.30,
  cpmRise: 0.30,
  lpCvrDrop: 0.30,
  halfDecline: 0.5,      // CTR × 0.5, or CPA × 2
} as const;

interface Win {
  start: string; end: string; endIndex: number;
  spend: number; impressions: number; clicks: number; reach: number;
  conversions: number; lpv: number; video: number | null;
}

const rollingWindows = (days: AdDay[], size: number): Win[] => {
  const out: Win[] = [];
  for (let end = size - 1; end < days.length; end++) {
    const slice = days.slice(end - size + 1, end + 1);
    const sum = (f: (d: AdDay) => number) => slice.reduce((s, d) => s + f(d), 0);
    const anyVideo = slice.some(d => d.video_3s_views !== null);
    out.push({
      start: slice[0].date, end: slice[slice.length - 1].date, endIndex: end,
      spend: sum(d => d.spend), impressions: sum(d => d.impressions), clicks: sum(d => d.clicks),
      reach: sum(d => d.reach), conversions: sum(d => d.conversions), lpv: sum(d => d.landing_page_views),
      video: anyVideo ? sum(d => d.video_3s_views ?? 0) : null,
    });
  }
  return out;
};

const ratio = (a: number, b: number) => (b > 0 ? a / b : null);
const cpa = (w: Win) => ratio(w.spend, w.conversions);
const ctr = (w: Win) => ratio(w.clicks, w.impressions);
const cpm = (w: Win) => (w.impressions > 0 ? (w.spend / w.impressions) * 1000 : null);
// Frequency over a window: impressions per person reached. Daily reach can't be summed into unique reach,
// so this overstates reach and understates frequency; the threshold is conservative as a result.
const frequency = (w: Win) => ratio(w.impressions, w.reach);
const hookRate = (w: Win) => (w.video === null ? null : ratio(w.video, w.impressions));
const lpCvr = (w: Win) => ratio(w.conversions, w.lpv);

export function computeHalfLife(input: AdDay[]): HalfLifeResult | null {
  const days = [...input].sort((a, b) => a.date.localeCompare(b.date));
  const wins = rollingWindows(days, THRESHOLDS.window).filter(w => w.impressions > 0);
  if (wins.length === 0) return null;

  const hasConversions = days.some(d => d.conversions > 0);
  const basis: 'cpa' | 'ctr' = hasConversions ? 'cpa' : 'ctr';
  const metric = basis === 'cpa' ? cpa : ctr;

  const scored = wins.map(w => ({ w, v: metric(w) })).filter((x): x is { w: Win; v: number } => x.v !== null);
  if (scored.length === 0) return null;
  const best = scored.reduce((b, x) => (basis === 'cpa' ? x.v < b.v : x.v > b.v) ? x : b);

  const after = wins.filter(w => w.endIndex > best.w.endIndex);

  // Half-Life: first later window 50% worse than the best
  const dead = after.find(w => {
    const v = metric(w);
    if (basis === 'cpa') return v === null ? w.spend > 0 : v >= best.v / THRESHOLDS.halfDecline;
    return v !== null && v <= best.v * THRESHOLDS.halfDecline;
  });

  // Cause of death: first threshold crossed after the best window
  const b = best.w;
  const bCpm = cpm(b), bHook = hookRate(b), bCvr = lpCvr(b);
  const crossed = (w: Win): Cause | null => {
    const f = frequency(w);
    if (f !== null && f > THRESHOLDS.frequency) return 'frequency';
    const h = hookRate(w);
    if (h !== null && bHook !== null && bHook > 0 && h < bHook * (1 - THRESHOLDS.hookRateDrop)) return 'hook_rate';
    const m = cpm(w);
    if (m !== null && bCpm !== null && bCpm > 0 && m > bCpm * (1 + THRESHOLDS.cpmRise)) return 'cpm';
    const c = lpCvr(w);
    if (c !== null && bCvr !== null && bCvr > 0 && c < bCvr * (1 - THRESHOLDS.lpCvrDrop)) return 'landing_page';
    return null;
  };
  let cause: HalfLifeResult['cause'] = null;
  for (const w of after) { const c = crossed(w); if (c) { cause = { metric: c, on: w.end }; break; } }

  const dayIndex = (date: string) => days.findIndex(d => d.date === date);
  return {
    basis,
    bestWindow: { start: b.start, end: b.end, value: best.v },
    halfLifeDays: dead ? dayIndex(dead.end) - dayIndex(b.end) : null,
    diedOn: dead ? dead.end : null,
    cause,
    daysSinceBest: days.length - 1 - dayIndex(b.end),
  };
}

export const CAUSE_LABEL: Record<Cause, string> = {
  frequency: 'Frequency',
  hook_rate: 'Hook rate',
  cpm: 'CPM',
  landing_page: 'Landing page',
};
