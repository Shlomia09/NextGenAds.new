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

    return new Response(
      JSON.stringify({ success: true, synced, total: campaigns.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
