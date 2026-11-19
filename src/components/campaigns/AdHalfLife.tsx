import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { computeHalfLife, CAUSE_LABEL, type AdDay, type HalfLifeResult } from '../../lib/halfLife';
import { isRoadmap } from '../../config/capabilities';

// Half-Life and cause of death for each ad in a campaign, from the client's own daily ad-level data
// (ad_daily_stats). Shown only when there is data; a missing value is "—" in --text-3.
interface Row { ad: string; name: string; r: HalfLifeResult | null }

export function AdHalfLife({ campaignId }: { campaignId: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('ad_daily_stats')
        .select('ad_id_external, ad_name, date, spend, impressions, clicks, reach, conversions, landing_page_views, video_3s_views')
        .eq('campaign_id', campaignId)
        .order('date');
      if (cancelled) return;
      const byAd = new Map<string, { name: string; days: AdDay[] }>();
      for (const d of data ?? []) {
        const e: { name: string; days: AdDay[] } = byAd.get(d.ad_id_external) ?? { name: d.ad_name ?? d.ad_id_external, days: [] };
        e.days.push({
          date: d.date, spend: Number(d.spend), impressions: Number(d.impressions), clicks: Number(d.clicks),
          reach: Number(d.reach), conversions: Number(d.conversions), landing_page_views: Number(d.landing_page_views),
          video_3s_views: d.video_3s_views === null ? null : Number(d.video_3s_views),
        });
        byAd.set(d.ad_id_external, e);
      }
      setRows([...byAd].map(([ad, e]) => ({ ad, name: e.name, r: computeHalfLife(e.days) })));
    })();
    return () => { cancelled = true; };
  }, [campaignId]);

  if (!rows || rows.length === 0) return null;

  const missing = <span style={{ color: 'var(--text-3)' }}>—</span>;
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div className="section-eyebrow" style={{ marginBottom: 0 }}>Creative Half-Life</div>
        {isRoadmap('half_life') && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', border: '1px solid var(--border)', borderRadius: 3, padding: '1px 5px' }}>
            Roadmap
          </span>
        )}
      </div>
      <div className="table-wrapper">
        <table className="data-table">
          <thead><tr><th>Ad</th><th>Best 7 days</th><th>Half-Life</th><th>Cause of death</th></tr></thead>
          <tbody>
            {rows.map(({ ad, name, r }) => (
              <tr key={ad}>
                <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</td>
                <td className="numeric">
                  {r ? `${r.bestWindow.end.slice(5)} · ${r.basis === 'cpa' ? `CPA ${r.bestWindow.value.toFixed(2)}` : `CTR ${(r.bestWindow.value * 100).toFixed(2)}%`}` : missing}
                </td>
                <td className="numeric">
                  {r?.halfLifeDays != null ? `${r.halfLifeDays} days` : r ? <span style={{ color: 'var(--text-2)' }}>not reached</span> : missing}
                </td>
                <td>{r?.cause ? `${CAUSE_LABEL[r.cause.metric]} · ${r.cause.on.slice(5)}` : missing}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
        From this campaign's own daily ad data, last 30 days. Needs at least 7 days per ad.
      </p>
    </div>
  );
}
