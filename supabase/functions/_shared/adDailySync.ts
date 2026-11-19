/**
 * Daily, ad-level metrics for the last 30 days → ad_daily_stats.
 *
 * The only input to Half-Life and cause of death (src/lib/halfLife.ts). One account-level insights request,
 * broken down by ad and day, paged. Conversions are counted by each campaign's goal (leads for lead
 * campaigns, purchases otherwise); hook rate needs 3-second video plays, which Meta reports only for video
 * ads — for other ads the field stays null and hook rate is not evaluated.
 */
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.107.0';

const META_API_BASE = 'https://graph.facebook.com/v19.0';
type Act = { action_type: string; value: string };

const find = (list: Act[] | undefined, ...types: string[]) =>
  parseFloat((list ?? []).find(a => types.includes(a.action_type))?.value ?? '0') || 0;
const has = (list: Act[] | undefined, type: string) => (list ?? []).some(a => a.action_type === type);

export async function syncAdDaily(
  supabase: SupabaseClient,
  a: { brand_id: string; adAccountId: string; externalAccountId: string; accessToken: string },
): Promise<number> {
  const { data: camps } = await supabase
    .from('campaigns')
    .select('id, campaign_id_external, objective')
    .eq('brand_id', a.brand_id)
    .eq('ad_account_id', a.adAccountId);
  const byExternal = new Map((camps ?? []).map((c: { id: string; campaign_id_external: string; objective: string | null }) => [c.campaign_id_external, c]));

  const url = new URL(`${META_API_BASE}/act_${a.externalAccountId}/insights`);
  url.searchParams.set('access_token', a.accessToken);
  url.searchParams.set('level', 'ad');
  url.searchParams.set('date_preset', 'last_30d');
  url.searchParams.set('time_increment', '1');
  url.searchParams.set('fields', 'ad_id,ad_name,campaign_id,date_start,spend,impressions,clicks,reach,actions');
  url.searchParams.set('limit', '500');

  const rows: Record<string, unknown>[] = [];
  let next: string | null = url.toString();
  while (next) {
    const page = await (await fetch(next)).json();
    if (page.error) throw new Error(`Meta API (ad daily): ${page.error.message}`);
    for (const r of (page.data ?? []) as Record<string, unknown>[]) {
      const camp = byExternal.get(r.campaign_id as string);
      const actions = r.actions as Act[] | undefined;
      const leadGoal = /LEAD/i.test(camp?.objective ?? '');
      rows.push({
        brand_id:           a.brand_id,
        ad_account_id:      a.adAccountId,
        campaign_id:        camp?.id ?? null,
        ad_id_external:     r.ad_id,
        ad_name:            r.ad_name ?? null,
        date:               r.date_start,
        spend:              parseFloat((r.spend as string) || '0'),
        impressions:        parseInt((r.impressions as string) || '0'),
        clicks:             parseInt((r.clicks as string) || '0'),
        reach:              parseInt((r.reach as string) || '0'),
        conversions:        leadGoal
          ? find(actions, 'lead', 'onsite_conversion.lead_grouped', 'offsite_conversion.fb_pixel_lead')
          : find(actions, 'offsite_conversion.fb_pixel_purchase', 'purchase'),
        landing_page_views: find(actions, 'landing_page_view'),
        video_3s_views:     has(actions, 'video_view') ? find(actions, 'video_view') : null,
        synced_at:          new Date().toISOString(),
      });
    }
    next = page.paging?.next ?? null;
  }

  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from('ad_daily_stats').upsert(rows.slice(i, i + 500), { onConflict: 'ad_id_external,date' });
    if (error) throw new Error(`DB upsert (ad daily): ${error.message}`);
  }
  return rows.length;
}
