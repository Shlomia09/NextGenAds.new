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

// ── Meta custom_event_type → { action_type, label } ─────────────────────────
// Maps what Meta stores in promoted_object.custom_event_type
// to the action_type key in the insights actions array and a friendly label.
const META_CONVERSION_MAP: Record<string, { actionType: string; label: string }> = {
  PURCHASE:               { actionType: 'offsite_conversion.fb_pixel_purchase',            label: 'Purchases'       },
  ADD_TO_CART:            { actionType: 'offsite_conversion.fb_pixel_add_to_cart',         label: 'ATC'             },
  INITIATE_CHECKOUT:      { actionType: 'offsite_conversion.fb_pixel_initiate_checkout',   label: 'Checkout'        },
  ADD_PAYMENT_INFO:       { actionType: 'offsite_conversion.fb_pixel_add_payment_info',    label: 'Add Payment Info' },
  VIEW_CONTENT:           { actionType: 'offsite_conversion.fb_pixel_view_content',        label: 'View Content'    },
  LEAD:                   { actionType: 'offsite_conversion.fb_pixel_lead',                label: 'Leads'           },
  COMPLETE_REGISTRATION:  { actionType: 'offsite_conversion.fb_pixel_complete_registration', label: 'Registrations' },
  SUBSCRIBE:              { actionType: 'offsite_conversion.fb_pixel_subscribe',           label: 'Subscriptions'   },
  SEARCH:                 { actionType: 'offsite_conversion.fb_pixel_search',              label: 'Searches'        },
  ADD_TO_WISHLIST:        { actionType: 'offsite_conversion.fb_pixel_add_to_wishlist',     label: 'Wishlist Adds'   },
  // Traffic fallbacks
  LANDING_PAGE_VIEW:      { actionType: 'landing_page_view',                              label: 'Page Views'      },
  LINK_CLICK:             { actionType: 'link_click',                                     label: 'Clicks'          },
  // Awareness fallback
  REACH:                  { actionType: 'reach',                                          label: 'Reach'           },
};

/** Given a campaign's promoted_object and objective/optimization_goal, return the conversion key to use */
const resolveConversionKey = (promotedObject: Record<string, string> | null, objective: string): string => {
  // 1. Use custom_event_type from promoted_object if available
  if (promotedObject?.custom_event_type) {
    return promotedObject.custom_event_type.toUpperCase();
  }
  // 2. Direct optimization_goal mapping (adset-level goals)
  const u = (objective || '').toUpperCase();
  if (u === 'LANDING_PAGE_VIEWS') return 'LANDING_PAGE_VIEW';
  if (u === 'LINK_CLICKS')        return 'LINK_CLICK';
  if (u === 'REACH')              return 'REACH';
  // 3. Fall back to campaign-objective-based defaults
  const goal = classifyObj(objective);
  if (goal === 'traffic')   return 'LANDING_PAGE_VIEW';
  if (goal === 'awareness') return 'REACH';
  if (goal === 'leads')     return 'LEAD';
  if (goal === 'sales')     return 'PURCHASE';
  return 'LINK_CLICK';
};

/** Extract the conversion count from the insights actions array */
const extractConversionValue = (
  actions: Array<{ action_type: string; value: string }> | undefined,
  conversionKey: string,
): number => {
  if (!actions || !conversionKey) return 0;
  const mapping = META_CONVERSION_MAP[conversionKey];
  if (!mapping) return 0;
  const action = actions.find((a) => a.action_type === mapping.actionType);
  return parseInt(action?.value || '0');
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
    campaignsUrl.searchParams.set('fields', 'id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time,promoted_object');
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
      // Extracted for ALL objectives (available regardless of campaign type)
      let page_views = 0; // landing_page_view — primary KPI for Traffic
      let atc = 0;        // add_to_cart — funnel metric for Sales

      // ── Extract page views (landing_page_view) — all campaigns ──────────
      const pageViewAction = (insight.actions || []).find(
        (a: { action_type: string }) => a.action_type === 'landing_page_view'
      );
      page_views = parseInt(pageViewAction?.value || '0');

      // ── Extract ATC (add_to_cart) — all campaigns ────────────────────────
      const atcAction = (insight.actions || []).find(
        (a: { action_type: string }) =>
          a.action_type === 'offsite_conversion.fb_pixel_add_to_cart' ||
          a.action_type === 'add_to_cart'
      );
      atc = parseInt(atcAction?.value || '0');

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
      // Traffic: page_views already extracted above (primary KPI)
      // Awareness: reach/frequency captured below

      // Parse reach and frequency (available for all objectives)
      const reach = parseInt(insight.reach || '0');
      const frequency = parseFloat(insight.frequency || '0');

      // ── Resolve the actual conversion event configured in this campaign ──
      // Uses promoted_object.custom_event_type from Meta — the event the client actually set.
      const conversionKey   = resolveConversionKey(campaign.promoted_object || null, campaign.objective || '');
      const conversion_event = META_CONVERSION_MAP[conversionKey]?.label ?? conversionKey;
      const conversion_value = extractConversionValue(insight.actions, conversionKey);

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
          page_views,   // landing_page_view from Meta actions
          purchases,
          revenue,
          roas,
          atc,          // add_to_cart from Meta actions
          leads,
          cpl,
          reach,
          frequency,
          conversion_event,  // friendly label of the campaign's configured conversion event
          conversion_value,  // count of that event from Meta insights
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

    // ── Step 4: Ad-level insights (with status, adset_id, purchases, roas) ──
    let adsCount = 0;

    try {
      const adsUrl = new URL(`${META_API_BASE}/act_${adAccount.account_id}/ads`);
      adsUrl.searchParams.set('access_token', accessToken);
      adsUrl.searchParams.set(
        'fields',
        'id,name,status,effective_status,adset_id,campaign_id,insights.date_preset(last_30d){spend,impressions,clicks,ctr,actions,action_values,purchase_roas}'
      );
      adsUrl.searchParams.set('limit', '100');

      const adsRes = await fetch(adsUrl.toString());
      const adsData = await adsRes.json();
      const ads = adsData.data || [];

      const adRows = ads
        .map((ad: {
          id: string;
          name: string;
          status: string;
          effective_status: string;
          adset_id?: string;
          campaign_id: string;
          insights?: { data?: Array<{
            spend?: string;
            impressions?: string;
            clicks?: string;
            ctr?: string;
            actions?: Array<{ action_type: string; value: string }>;
            action_values?: Array<{ action_type: string; value: string }>;
            purchase_roas?: Array<{ action_type: string; value: string }>;
          }> };
        }) => {
          const campaignUuid = externalToUuid.get(ad.campaign_id);
          if (!campaignUuid) return null;

          const insight = ad.insights?.data?.[0] || {};
          const adSpend       = parseFloat(insight.spend || '0');
          const adImpressions = parseInt(insight.impressions || '0');
          const adClicks      = parseInt(insight.clicks || '0');
          const adCtr         = parseFloat(insight.ctr || '0');
          const adLeads       = extractLeads(insight.actions);
          const adCpl         = adLeads > 0 ? adSpend / adLeads : 0;

          // Purchases
          const purchaseAction = (insight.actions || []).find(
            (a: { action_type: string }) =>
              a.action_type === 'offsite_conversion.fb_pixel_purchase' ||
              a.action_type === 'purchase'
          );
          const adPurchases = parseInt(purchaseAction?.value || '0');

          // ROAS
          const roasData = (insight.purchase_roas || []).find(
            (a: { action_type: string }) =>
              a.action_type === 'offsite_conversion.fb_pixel_purchase'
          );
          const adRoas = parseFloat(roasData?.value || '0');

          return {
            campaign_id:        campaignUuid,
            brand_id,
            ad_id_external:     ad.id,
            ad_name:            ad.name,
            status:             ad.effective_status || ad.status || 'UNKNOWN',
            adset_id_external:  ad.adset_id || null,
            spend:              adSpend,
            impressions:        adImpressions,
            clicks:             adClicks,
            leads:              adLeads,
            purchases:          adPurchases,
            roas:               adRoas,
            ctr:                adCtr,
            cpl:                adCpl,
            synced_at:          new Date().toISOString(),
          };
        })
        .filter(Boolean);

      if (adRows.length > 0) {
        const { error: adsError } = await supabase
          .from('ad_creatives')
          .upsert(adRows, { onConflict: 'campaign_id,ad_id_external' });

        if (!adsError) adsCount = adRows.length;
        else console.error('Ad creatives upsert error:', adsError);
      }
    } catch (adsErr) {
      console.error('Ad-level insights fetch failed:', adsErr);
    }

    // ── Step 5: Ad Sets with optimization_goal + insights ─────────────────────────
    // Fetches per-adset goal, results count, cost-per-result.
    // Builds campaignConvEvents map to determine campaign-level conversion_event.
    let adSetsCount = 0;
    // Map: external campaign id → Set of unique conversion event labels
    const campaignConvEvents = new Map<string, Set<string>>();
    try {
      for (const campaign of campaigns) {
        const adsetsUrl = new URL(`${META_API_BASE}/${campaign.id}/adsets`);
        adsetsUrl.searchParams.set('access_token', accessToken);
        adsetsUrl.searchParams.set(
          'fields',
          'id,name,status,daily_budget,lifetime_budget,targeting,optimization_goal,promoted_object,' +
          `insights.date_preset(last_30d){spend,impressions,clicks,actions,cost_per_action_type}`
        );
        adsetsUrl.searchParams.set('limit', '50');

        const adsetsRes  = await fetch(adsetsUrl.toString());
        const adsetsData = await adsetsRes.json();
        const adsets     = adsetsData.data || [];

        const campaignUuid = externalToUuid.get(campaign.id);
        if (!campaignUuid) continue;

        const convEventsForCampaign = new Set<string>();

        const adsetRows = adsets.map((adset: {
          id: string;
          name: string;
          status: string;
          daily_budget?: string;
          lifetime_budget?: string;
          targeting?: Record<string, unknown>;
          optimization_goal?: string;
          promoted_object?: Record<string, string>;
          insights?: { data?: Array<{
            spend?: string;
            impressions?: string;
            clicks?: string;
            actions?: Array<{ action_type: string; value: string }>;
            cost_per_action_type?: Array<{ action_type: string; value: string }>;
          }> };
        }) => {
          const insight = adset.insights?.data?.[0] || {};

          // Resolve the conversion event for this adset from promoted_object + optimization_goal
          const adsetConvKey   = resolveConversionKey(adset.promoted_object || null, adset.optimization_goal || '');
          const adsetConvEvent = META_CONVERSION_MAP[adsetConvKey]?.label ?? adsetConvKey;
          convEventsForCampaign.add(adsetConvEvent);

          // Extract results count: find the matching action_type in insights.actions
          const mapping = META_CONVERSION_MAP[adsetConvKey];
          const resultAction = mapping
            ? (insight.actions || []).find((a: { action_type: string }) => a.action_type === mapping.actionType)
            : null;
          const results = parseInt(resultAction?.value || '0');

          // Cost per result from cost_per_action_type
          const costAction = mapping
            ? (insight.cost_per_action_type || []).find((a: { action_type: string }) => a.action_type === mapping.actionType)
            : null;
          const costPerResult = parseFloat(costAction?.value || '0');

          return {
            campaign_id:        campaignUuid,
            brand_id,
            adset_id_external:  adset.id,
            adset_name:         adset.name,
            status:             adset.status,
            optimization_goal:  adset.optimization_goal  || null,
            conversion_event:   adsetConvEvent,
            spend:              parseFloat(insight.spend || '0'),
            impressions:        parseInt(insight.impressions || '0'),
            clicks:             parseInt(insight.clicks || '0'),
            results,
            cost_per_result:    costPerResult,
            daily_budget:       adset.daily_budget    ? parseInt(adset.daily_budget)    / 100 : null,
            lifetime_budget:    adset.lifetime_budget ? parseInt(adset.lifetime_budget) / 100 : null,
            targeting:          adset.targeting || null,
            synced_at:          new Date().toISOString(),
          };
        });

        campaignConvEvents.set(campaign.id, convEventsForCampaign);

        if (adsetRows.length > 0) {
          const { error: adsetErr } = await supabase
            .from('ad_sets')
            .upsert(adsetRows, { onConflict: 'campaign_id,adset_id_external' });
          if (!adsetErr) adSetsCount += adsetRows.length;
          else console.error('Adset upsert error:', adsetErr);
        }
      }
    } catch (adSetsErr) {
      console.error('Ad sets sync failed:', adSetsErr);
    }

    // ── Step 5.5: Update campaign conversion_event from adset analysis ────────────
    // If all adsets share one goal  → campaign.conversion_event = that label
    // If multiple different goals   → campaign.conversion_event = 'Multiple'
    // (mirrors Meta Ads Manager "Multiple conversions" display)
    for (const campaign of campaigns) {
      const campaignUuid = externalToUuid.get(campaign.id);
      if (!campaignUuid) continue;

      const convEvents = campaignConvEvents.get(campaign.id);
      if (!convEvents || convEvents.size === 0) continue;

      const uniqueEvents       = Array.from(convEvents);
      const campaignConvEvent  = uniqueEvents.length === 1 ? uniqueEvents[0] : 'Multiple';

      await supabase
        .from('campaigns')
        .update({ conversion_event: campaignConvEvent })
        .eq('id', campaignUuid);
    }

    // ── Step 6: Log system event ─────────────────────────────────────────────
    try {
      await supabase.from('system_events').insert({
        brand_id,
        type:     'sync',
        label:    `${synced} campaigns synced with Meta`,
        metadata: { synced, total: campaigns.length, ads: adsCount, ad_sets: adSetsCount },
      });
    } catch (eventErr) {
      console.error('System event logging failed:', eventErr);
    }

    return new Response(
      JSON.stringify({
        success:    true,
        synced,
        total:      campaigns.length,
        daily_days: dailyCount,
        ads:        adsCount,
        ad_sets:    adSetsCount,
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


