import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Meta Graph API base URL
const META_API_BASE = 'https://graph.facebook.com/v19.0';
const DATE_PRESET = 'last_90d'; // Sync last 90 days

// ── Inline objective classifier (mirrors src/lib/objective.ts) ──
const classifyObj = (o: string): string => {
  const u = (o || '').toUpperCase();
  if (u.includes('SALES') || u.includes('CONVERSIONS') || u.includes('PURCHASE') || u.includes('CATALOG')) return 'sales';
  if (u.includes('LEADS') || u.includes('LEAD_GENERATION')) return 'leads';
  if (u.includes('TRAFFIC') || u.includes('LINK_CLICKS')) return 'traffic';
  if (u.includes('AWARENESS') || u.includes('REACH') || u.includes('BRAND')) return 'awareness';
  if (u.includes('ENGAGEMENT')) return 'engagement';
  return 'unknown';
};

// ── Helper: extract lead count from a Meta actions array ──
const extractLeads = (actions: Array<{ action_type: string; value: string }> | undefined): number => {
  if (!actions) return 0;
  const leadAction = actions.find(
    (a) =>
      a.action_type === 'lead' ||
      a.action_type === 'onsite_conversion.lead_grouped' ||
      a.action_type === 'offsite_conversion.fb_pixel_lead'
  );
  return parseInt(leadAction?.value || '0');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { brand_id, ad_account_id } = await req.json();

    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // Service role to write campaigns
    );

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    // Get ad account + access token
    const { data: adAccount, error: accountError } = await supabase
      .from('ad_accounts')
      .select('*')
      .eq('id', ad_account_id)
      .eq('user_id', user.id)
      .single();

    if (accountError || !adAccount) throw new Error('Ad account not found');

    const accessToken = adAccount.access_token;

    // 1. Get campaigns from Meta API
    const campaignsUrl = new URL(`${META_API_BASE}/act_${adAccount.account_id}/campaigns`);
    campaignsUrl.searchParams.set('access_token', accessToken);
    campaignsUrl.searchParams.set('fields', 'id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time');
    campaignsUrl.searchParams.set('limit', '50');

    const campaignsRes = await fetch(campaignsUrl.toString());
    const campaignsData = await campaignsRes.json();

    if (campaignsData.error) throw new Error(`Meta API: ${campaignsData.error.message}`);

    const campaigns = campaignsData.data || [];
    let synced = 0;

    // 2. For each campaign, get insights
    for (const campaign of campaigns) {
      const insightsUrl = new URL(`${META_API_BASE}/${campaign.id}/insights`);
      insightsUrl.searchParams.set('access_token', accessToken);
      insightsUrl.searchParams.set('date_preset', DATE_PRESET);
      insightsUrl.searchParams.set('fields', 'spend,impressions,clicks,reach,frequency,cpm,cpc,actions,action_values,purchase_roas');

      const insightsRes = await fetch(insightsUrl.toString());
      const insightsData = await insightsRes.json();
      const insight = insightsData.data?.[0] || {};

      const spend = parseFloat(insight.spend || '0');
      const impressions = parseInt(insight.impressions || '0');
      const clicks = parseInt(insight.clicks || '0');

      // Classify objective to extract the right conversion metrics
      const goal = classifyObj(campaign.objective || '');

      let purchases = 0;
      let revenue = 0;
      let roas = 0;
      let leads = 0;
      let cpl = 0;

      if (goal === 'sales') {
        // Sales: extract purchases and ROAS
        const purchaseAction = (insight.actions || []).find(
          (a: { action_type: string }) =>
            a.action_type === 'offsite_conversion.fb_pixel_purchase' ||
            a.action_type === 'purchase'
        );
        purchases = parseInt(purchaseAction?.value || '0');

        const revenueAction = (insight.action_values || []).find(
          (a: { action_type: string }) =>
            a.action_type === 'offsite_conversion.fb_pixel_purchase' ||
            a.action_type === 'purchase'
        );
        revenue = parseFloat(revenueAction?.value || '0');

        const roasData = (insight.purchase_roas || []).find(
          (a: { action_type: string }) =>
            a.action_type === 'offsite_conversion.fb_pixel_purchase'
        );
        roas = parseFloat(roasData?.value || '0');

      } else if (goal === 'leads') {
        // Leads: extract lead count and calculate CPL
        const leadAction = (insight.actions || []).find(
          (a: { action_type: string }) =>
            a.action_type === 'lead' ||
            a.action_type === 'onsite_conversion.lead_grouped' ||
            a.action_type === 'offsite_conversion.fb_pixel_lead'
        );
        leads = parseInt(leadAction?.value || '0');
        cpl = leads > 0 ? spend / leads : 0;

      }
      // For traffic: clicks already captured above from API insights
      // For awareness: reach/frequency captured via separate fields below

      // Parse reach and frequency (available for all objectives)
      const reach = parseInt(insight.reach || '0');
      const frequency = parseFloat(insight.frequency || '0');

      // Upsert to DB
      const { error: upsertError } = await supabase
        .from('campaigns')
        .upsert({
          brand_id,
          ad_account_id,
          platform: 'meta',
          campaign_id_external: campaign.id,
          name: campaign.name,
          status: campaign.status,
          objective: campaign.objective || '',
          budget_daily: campaign.daily_budget ? parseInt(campaign.daily_budget) / 100 : null,
          budget_lifetime: campaign.lifetime_budget ? parseInt(campaign.lifetime_budget) / 100 : null,
          spend,
          impressions,
          clicks,
          purchases,
          revenue,
          roas,
          leads,
          cpl,
          reach,
          frequency,
          date_start: campaign.start_time,
          date_end: campaign.stop_time || null,
          synced_at: new Date().toISOString(),
        }, {
          onConflict: 'brand_id,platform,campaign_id_external',
        });

      if (!upsertError) synced++;
    }

    // ── Step 3: Daily breakdown per campaign (last 30 days) ──
    let dailyCount = 0;

    // Build map: campaign_id_external → DB internal UUID
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

    for (const campaign of campaigns) {
      try {
        const dailyUrl = new URL(`${META_API_BASE}/${campaign.id}/insights`);
        dailyUrl.searchParams.set('access_token', accessToken);
        dailyUrl.searchParams.set('date_preset', 'last_30d');
        dailyUrl.searchParams.set('time_increment', '1');
        dailyUrl.searchParams.set('fields', 'date_start,spend,impressions,clicks,actions');

        const dailyRes = await fetch(dailyUrl.toString());
        const dailyData = await dailyRes.json();
        const dailyRows = dailyData.data || [];

        const campaignUuid = externalToUuid.get(campaign.id);
        if (!campaignUuid) continue;

        const rows = dailyRows.map((row: {
          date_start: string;
          spend?: string;
          impressions?: string;
          clicks?: string;
          actions?: Array<{ action_type: string; value: string }>;
        }) => ({
          campaign_id: campaignUuid,
          brand_id,
          date: row.date_start,
          spend: parseFloat(row.spend || '0'),
          impressions: parseInt(row.impressions || '0'),
          clicks: parseInt(row.clicks || '0'),
          leads: extractLeads(row.actions),
        }));

        if (rows.length > 0) {
          const { error: dailyError } = await supabase
            .from('campaign_daily_stats')
            .upsert(rows, { onConflict: 'campaign_id,date' });

          if (!dailyError) dailyCount += rows.length;
        }
      } catch (dailyErr) {
        console.error(`Daily stats fetch failed for campaign ${campaign.id}:`, dailyErr);
      }
    }

    // ── Step 4: Ad-level insights ──
    let adsCount = 0;

    try {
      const adsUrl = new URL(`${META_API_BASE}/act_${adAccount.account_id}/ads`);
      adsUrl.searchParams.set('access_token', accessToken);
      adsUrl.searchParams.set(
        'fields',
        'id,name,campaign_id,insights.date_preset(last_30d){spend,impressions,clicks,ctr,actions}'
      );
      adsUrl.searchParams.set('limit', '100');

      const adsRes = await fetch(adsUrl.toString());
      const adsData = await adsRes.json();
      const ads = adsData.data || [];

      const adRows = ads
        .map((ad: {
          id: string;
          name: string;
          campaign_id: string;
          insights?: { data?: Array<{
            spend?: string;
            impressions?: string;
            clicks?: string;
            ctr?: string;
            actions?: Array<{ action_type: string; value: string }>;
          }> };
        }) => {
          const campaignUuid = externalToUuid.get(ad.campaign_id);
          if (!campaignUuid) return null;

          const insight = ad.insights?.data?.[0] || {};
          const adSpend = parseFloat(insight.spend || '0');
          const adImpressions = parseInt(insight.impressions || '0');
          const adClicks = parseInt(insight.clicks || '0');
          const adCtr = parseFloat(insight.ctr || '0');
          const adLeads = extractLeads(insight.actions);
          const adCpl = adLeads > 0 ? adSpend / adLeads : 0;

          return {
            campaign_id: campaignUuid,
            brand_id,
            ad_id_external: ad.id,
            ad_name: ad.name,
            spend: adSpend,
            impressions: adImpressions,
            clicks: adClicks,
            leads: adLeads,
            ctr: adCtr,
            cpl: adCpl,
            synced_at: new Date().toISOString(),
          };
        })
        .filter(Boolean);

      if (adRows.length > 0) {
        const { error: adsError } = await supabase
          .from('ad_creatives')
          .upsert(adRows, { onConflict: 'campaign_id,ad_id_external' });

        if (!adsError) adsCount = adRows.length;
      }
    } catch (adsErr) {
      console.error('Ad-level insights fetch failed:', adsErr);
    }

    // ── Step 5: Log system event ──
    try {
      await supabase.from('system_events').insert({
        brand_id,
        type: 'sync',
        label: `${synced} campaigns synced with Meta`,
        metadata: { synced, total: campaigns.length },
      });
    } catch (eventErr) {
      console.error('System event logging failed:', eventErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced,
        total: campaigns.length,
        daily_days: dailyCount,
        ads: adsCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
