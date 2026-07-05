import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { action, campaign_id_external, ad_account_id, ad_id_external, value, params } = await req.json();

    // ── Verify user owns the ad account & fetch token ──────────────────
    const { data: adAccount, error: accErr } = await supabase
      .from('ad_accounts')
      .select('access_token, account_id, account_name')
      .eq('user_id', user.id)
      .eq('account_id', ad_account_id)
      .eq('platform', 'meta')
      .single();

    if (accErr || !adAccount) throw new Error('Ad account not found or unauthorized');
    if (!adAccount.access_token) throw new Error('No access token. Please reconnect your Meta account.');

    const token = adAccount.access_token;
    const META_API = 'https://graph.facebook.com/v19.0';

    let result: Record<string, unknown> = {};

    switch (action) {
      case 'pause_campaign': {
        const res = await fetch(`${META_API}/${campaign_id_external}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'PAUSED', access_token: token }),
        });
        const data = await res.json();
        if (data.error) throw new Error(`Meta API: ${data.error.message}`);
        result = { success: true, message: 'Campaign paused successfully' };
        break;
      }

      case 'activate_campaign': {
        const res = await fetch(`${META_API}/${campaign_id_external}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ACTIVE', access_token: token }),
        });
        const data = await res.json();
        if (data.error) throw new Error(`Meta API: ${data.error.message}`);
        result = { success: true, message: 'Campaign activated successfully' };
        break;
      }

      case 'scale_budget': {
        // Get current ad sets for this campaign
        const setsRes = await fetch(
          `${META_API}/${campaign_id_external}/adsets?fields=id,name,daily_budget,lifetime_budget&access_token=${token}`
        );
        const setsData = await setsRes.json();
        if (setsData.error) throw new Error(`Meta API: ${setsData.error.message}`);

        const adSets: Array<{ id: string; name: string; daily_budget?: string; lifetime_budget?: string }> = setsData.data || [];
        const multiplier = value ?? 1.2; // default +20%
        const updated: string[] = [];

        for (const adSet of adSets) {
          if (adSet.daily_budget) {
            const newBudget = Math.round(parseInt(adSet.daily_budget) * multiplier);
            const updateRes = await fetch(`${META_API}/${adSet.id}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ daily_budget: newBudget, access_token: token }),
            });
            const updateData = await updateRes.json();
            if (!updateData.error) updated.push(adSet.name);
          }
        }

        result = {
          success: true,
          message: `Budget scaled +${Math.round((multiplier - 1) * 100)}% on ${updated.length} ad set(s): ${updated.join(', ')}`,
        };
        break;
      }

      case 'get_ads': {
        // Fetch ad-level insights for this campaign
        const adsRes = await fetch(
          `${META_API}/${campaign_id_external}/ads?fields=id,name,status,insights{spend,impressions,clicks,actions,cpm,cpc}&access_token=${token}&limit=20`
        );
        const adsData = await adsRes.json();
        if (adsData.error) throw new Error(`Meta API: ${adsData.error.message}`);
        result = { success: true, ads: adsData.data || [] };
        break;
      }

      case 'duplicate_ad': {
        // POST /{ad_id}/copies — duplicates ad into same campaign, starts PAUSED
        const adId = ad_id_external || params?.ad_id_external;
        if (!adId) throw new Error('ad_id_external is required for duplicate_ad');
        const res = await fetch(
          `${META_API}/${adId}/copies`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              campaign_id:    campaign_id_external,
              access_token:   token,
              status_option:  'PAUSED',
              rename_options: JSON.stringify({ rename_strategy: 'DEEP_RENAME', rename_prefix: '[Copy] ' }),
            }),
          }
        );
        const data = await res.json();
        if (data.error) throw new Error(`Meta API: ${data.error.message}`);
        result = {
          success:    true,
          message:    `✅ Ad duplicated successfully (PAUSED). New ad ID: ${data.copied_adset_id || data.id || 'see Ads Manager'}. Review and activate in Meta Ads Manager.`,
          new_ad_id:  data.copied_adset_id || data.id,
        };
        break;
      }

      case 'create_campaign': {
        // Full flow: Campaign → AdSet → Ad (copies creative from source_ad_id)
        if (!params) throw new Error('params is required for create_campaign');
        const META_V = 'https://graph.facebook.com/v19.0';
        const actId   = adAccount.account_id;

        // A: Create Campaign
        const campRes = await fetch(
          `${META_V}/act_${actId}/campaigns`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name:                  params.campaign_name,
              objective:             params.objective || 'LEAD_GENERATION',
              status:                'PAUSED',
              special_ad_categories: [],
              access_token:          token,
            }),
          }
        );
        const campData = await campRes.json();
        if (campData.error) throw new Error(`Create campaign: ${campData.error.message}`);
        const newCampaignId = campData.id;

        // B: Create AdSet
        const adsetBody: Record<string, unknown> = {
          name:              `${params.campaign_name} — AdSet`,
          campaign_id:       newCampaignId,
          daily_budget:      params.daily_budget_cents || 3000,
          billing_event:     'IMPRESSIONS',
          optimization_goal: params.objective === 'LEAD_GENERATION' ? 'LEAD_GENERATION' : 'REACH',
          targeting: {
            geo_locations: { countries: params.adset?.countries || ['IL'] },
            age_min:       params.adset?.age_min || 25,
            age_max:       params.adset?.age_max || 44,
          },
          status:            'PAUSED',
          access_token:      token,
        };
        const adsetRes  = await fetch(`${META_V}/act_${actId}/adsets`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(adsetBody),
        });
        const adsetData = await adsetRes.json();
        if (adsetData.error) throw new Error(`Create adset: ${adsetData.error.message}`);
        const newAdsetId = adsetData.id;

        // C: Duplicate source ad into the new campaign/adset
        let newAdId: string | null = null;
        if (params.source_ad_id) {
          const copyRes  = await fetch(`${META_V}/${params.source_ad_id}/copies`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              campaign_id:    newCampaignId,
              adset_id:       newAdsetId,
              access_token:   token,
              status_option:  'PAUSED',
              rename_options: JSON.stringify({ rename_strategy: 'DEEP_RENAME', rename_prefix: '[Scale] ' }),
            }),
          });
          const copyData = await copyRes.json();
          if (!copyData.error) newAdId = copyData.copied_adset_id || copyData.id;
          else console.warn('Ad copy warning:', copyData.error.message);
        }

        result = {
          success:         true,
          message:         `✅ Campaign "${params.campaign_name}" created (PAUSED) with 1 AdSet${newAdId ? ' and 1 Ad' : ''}. Review and activate in Meta Ads Manager when ready.`,
          new_campaign_id: newCampaignId,
          new_adset_id:    newAdsetId,
          new_ad_id:       newAdId,
        };
        break;
      }

      case 'duplicate_adset': {
        const adsetId = params?.adset_id_external;
        if (!adsetId) throw new Error('params.adset_id_external required for duplicate_adset');
        const res = await fetch(`${META_API}/${adsetId}/copies`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaign_id:   campaign_id_external,
            access_token:  token,
            status_option: 'PAUSED',
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(`Meta API: ${data.error.message}`);
        result = { success: true, message: `✅ AdSet duplicated (PAUSED). ID: ${data.id}`, new_adset_id: data.id };
        break;
      }

      case 'log_action': {
        // Log a proposed action to action_logs table
        const { data: logRow, error: logErr } = await supabase
          .from('action_logs')
          .insert({
            brand_id:    params?.brand_id,
            user_id:     user.id,
            action_type: params?.action_type,
            params:      params?.params || {},
            status:      'pending',
          })
          .select('id')
          .single();
        if (logErr) throw new Error(`Log error: ${logErr.message}`);
        result = { success: true, log_id: logRow?.id };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
