import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_API_BASE = 'https://graph.facebook.com/v19.0';

const CHUNK_DAYS = 90;
const MAX_CHUNKS = 20;
const MAX_EMPTY_CHUNKS_IN_A_ROW = 3;

const fmt = (d: Date) => d.toISOString().slice(0, 10);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { brand_id, ad_account_id, months_back } = await req.json();

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { data: adAccount, error: accountError } = await supabase
      .from('ad_accounts')
      .select('*')
      .eq('id', ad_account_id)
      .eq('user_id', user.id)
      .single();

    if (accountError || !adAccount) throw new Error('Ad account not found');

    const accessToken = adAccount.access_token;

    const { data: dbCampaigns } = await supabase
      .from('campaigns')
      .select('id, campaign_id_external')
      .eq('brand_id', brand_id);

    const externalToUuid = new Map<string, string>(
      (dbCampaigns || []).map((c: { id: string; campaign_id_external: string }) => [
        c.campaign_id_external,
        c.id,
      ])
    );

    if (externalToUuid.size === 0) {
      throw new Error('No campaigns found for this brand yet — run meta-sync first so campaigns exist, then backfill history.');
    }

    const campaignsUrl = new URL(`${META_API_BASE}/act_${adAccount.account_id}/campaigns`);
    campaignsUrl.searchParams.set('access_token', accessToken);
    campaignsUrl.searchParams.set('fields', 'id,name');
    campaignsUrl.searchParams.set('limit', '200');
    const campaignsRes = await fetch(campaignsUrl.toString());
    const campaignsData = await campaignsRes.json();
    if (campaignsData.error) throw new Error(`Meta API: ${campaignsData.error.message}`);
    const campaigns = campaignsData.data || [];

    const capMonths = Math.min(months_back || 37, 60);
    const overallStart = new Date();
    overallStart.setMonth(overallStart.getMonth() - capMonths);

    let totalRowsWritten = 0;
    let chunksPulled = 0;
    let emptyStreak = 0;
    let oldestDateReached: string | null = null;
    const perCampaignRowCount: Record<string, number> = {};

    let windowEnd = new Date();

    for (let i = 0; i < MAX_CHUNKS; i++) {
      const windowStart = new Date(windowEnd);
      windowStart.setDate(windowStart.getDate() - CHUNK_DAYS);
      if (windowStart < overallStart) windowStart.setTime(overallStart.getTime());

      const since = fmt(windowStart);
      const until = fmt(windowEnd);
      chunksPulled++;

      let rowsThisChunk = 0;

      for (const campaign of campaigns) {
        const campaignUuid = externalToUuid.get(campaign.id);
        if (!campaignUuid) continue;

        const dailyUrl = new URL(`${META_API_BASE}/${campaign.id}/insights`);
        dailyUrl.searchParams.set('access_token', accessToken);
        dailyUrl.searchParams.set('time_range', JSON.stringify({ since, until }));
        dailyUrl.searchParams.set('time_increment', '1');
        dailyUrl.searchParams.set('fields', 'date_start,spend,impressions,clicks,reach,actions,action_values');

        let dailyRows: Array<Record<string, unknown>> = [];
        try {
          const dailyRes = await fetch(dailyUrl.toString());
          const dailyData = await dailyRes.json();
          if (dailyData.error) {
            console.error(`Meta API error for ${campaign.id} [${since}..${until}]:`, dailyData.error.message);
            continue;
          }
          dailyRows = dailyData.data || [];
        } catch (fetchErr) {
          console.error(`Fetch failed for ${campaign.id} [${since}..${until}]:`, fetchErr);
          continue;
        }

        if (dailyRows.length === 0) continue;

        const rows = dailyRows.map((row: any) => {
          const purchaseAction = (row.actions || []).find(
            (a: { action_type: string }) =>
              a.action_type === 'offsite_conversion.fb_pixel_purchase' || a.action_type === 'purchase'
          );
          const purchases = parseInt(purchaseAction?.value || '0');

          const revenueAction = (row.action_values || []).find(
            (a: { action_type: string }) =>
              a.action_type === 'offsite_conversion.fb_pixel_purchase' || a.action_type === 'purchase'
          );
          const revenue = parseFloat(revenueAction?.value || '0');

          const leadAction = (row.actions || []).find(
            (a: { action_type: string }) =>
              a.action_type === 'lead' ||
              a.action_type === 'onsite_conversion.lead_grouped' ||
              a.action_type === 'offsite_conversion.fb_pixel_lead'
          );
          const leads = parseInt(leadAction?.value || '0');

          const atcAction = (row.actions || []).find(
            (a: { action_type: string }) =>
              a.action_type === 'offsite_conversion.fb_pixel_add_to_cart' || a.action_type === 'add_to_cart'
          );
          const atc = parseInt(atcAction?.value || '0');

          const pageViewAction = (row.actions || []).find(
            (a: { action_type: string }) => a.action_type === 'landing_page_view'
          );
          const page_views = parseInt(pageViewAction?.value || '0');

          return {
            campaign_id:      campaignUuid,
            brand_id,
            date:             row.date_start,
            spend:            parseFloat(row.spend as string || '0'),
            impressions:      parseInt(row.impressions as string || '0'),
            clicks:           parseInt(row.clicks as string || '0'),
            leads,
            purchases,
            revenue,
            atc,
            page_views,
            reach:            parseInt(row.reach as string || '0'),
            conversion_value: purchases || leads || 0,
          };
        });

        const { error: upsertErr } = await supabase
          .from('campaign_daily_stats')
          .upsert(rows, { onConflict: 'campaign_id,date' });

        if (upsertErr) {
          console.error(`Upsert error for ${campaign.id}:`, upsertErr.message);
        } else {
          rowsThisChunk += rows.length;
          perCampaignRowCount[campaign.id] = (perCampaignRowCount[campaign.id] || 0) + rows.length;
          oldestDateReached = since;
        }
      }

      totalRowsWritten += rowsThisChunk;
      emptyStreak = rowsThisChunk === 0 ? emptyStreak + 1 : 0;

      windowEnd = new Date(windowStart);
      windowEnd.setDate(windowEnd.getDate() - 1);

      if (windowStart <= overallStart) break;
      if (emptyStreak >= MAX_EMPTY_CHUNKS_IN_A_ROW) break;
    }

    await supabase.from('system_events').insert({
      brand_id,
      type: 'sync',
      label: `Historical backfill: ${totalRowsWritten} daily rows across ${chunksPulled} chunks`,
      metadata: { totalRowsWritten, chunksPulled, oldestDateReached, perCampaignRowCount },
    });

    return new Response(
      JSON.stringify({
        success: true,
        total_rows_written: totalRowsWritten,
        chunks_pulled: chunksPulled,
        oldest_date_reached: oldestDateReached,
        stopped_reason: emptyStreak >= MAX_EMPTY_CHUNKS_IN_A_ROW ? 'meta_returned_no_more_data' : 'reached_months_back_cap',
        per_campaign_row_count: perCampaignRowCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
