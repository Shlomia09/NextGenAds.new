import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.107.0';

// ── Spend guard ──────────────────────────────────────────────────────────────
// Every path to Meta comes through here with a user's JWT, so this is where the promise in the terms is
// kept: "Rouge never adds budget without your explicit approval, and never beyond the ceiling you set."
//   • actions that can add spend need { approved: true } from a user's explicit confirmation;
//   • scale_budget and activate_campaign must keep the account's total active daily budget ≤ the ceiling
//     (account_limits.max_daily_spend), and scale_budget may not exceed max_change_pct_per_action;
//   • with no ceiling set, they are refused.
// create_campaign and duplicate_adset create objects PAUSED (no spend until activated, which is checked),
// but still need explicit approval.
const NEEDS_APPROVAL = new Set(['scale_budget', 'activate_campaign', 'create_campaign', 'duplicate_adset']);

class SpendGuardError extends Error {}

type MetaPage<T> = { data?: T[]; paging?: { next?: string }; error?: { message: string } };
async function pageAll<T>(url: string): Promise<T[]> {
  const out: T[] = [];
  let next: string | undefined = url;
  while (next) {
    const page: MetaPage<T> = await (await fetch(next)).json();
    if (page.error) throw new Error(`Meta API: ${page.error.message}`);
    out.push(...(page.data ?? []));
    next = page.paging?.next;
  }
  return out;
}

// Total daily budget currently able to spend in the account, in minor units (cents): active campaigns with
// a campaign budget, plus active ad sets with their own daily budget.
async function activeDailyBudgetCents(api: string, actId: string, token: string): Promise<number> {
  const filter = encodeURIComponent(JSON.stringify(['ACTIVE']));
  const camps = await pageAll<{ daily_budget?: string }>(
    `${api}/act_${actId}/campaigns?fields=daily_budget&effective_status=${filter}&limit=200&access_token=${token}`);
  const sets = await pageAll<{ daily_budget?: string }>(
    `${api}/act_${actId}/adsets?fields=daily_budget&effective_status=${filter}&limit=200&access_token=${token}`);
  const sum = (xs: { daily_budget?: string }[]) => xs.reduce((s, x) => s + (parseInt(x.daily_budget ?? '0') || 0), 0);
  return sum(camps) + sum(sets);
}

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

    const { action, campaign_id_external, ad_account_id, ad_id_external, value, params, approved } = await req.json();

    // ── Verify user owns the ad account & fetch token ──────────────────
    const { data: adAccount, error: accErr } = await supabase
      .from('ad_accounts')
      .select('id, access_token, account_id, account_name')
      .eq('user_id', user.id)
      .eq('account_id', ad_account_id)
      .eq('platform', 'meta')
      .single();

    if (accErr || !adAccount) throw new Error('Ad account not found or unauthorized');
    if (!adAccount.access_token) throw new Error('No access token. Please reconnect your Meta account.');

    const token = adAccount.access_token;
    const META_API = 'https://graph.facebook.com/v19.0';

    // ── Spend guard: approval first, then the ceiling ────────────────────
    if (NEEDS_APPROVAL.has(action) && approved !== true) {
      throw new SpendGuardError('This action can add spend, so it needs your explicit approval. Nothing was changed.');
    }
    const { data: limits } = await supabase
      .from('account_limits')
      .select('max_daily_spend, max_change_pct_per_action')
      .eq('ad_account_id', adAccount.id)
      .maybeSingle();
    const ceilingCents = limits ? Math.round(Number(limits.max_daily_spend) * 100) : null;
    const requireCeiling = () => {
      if (ceilingCents === null) {
        throw new SpendGuardError('Set a daily spend ceiling for this ad account in Settings before Rouge can add budget. Nothing was changed.');
      }
      return ceilingCents;
    };
    const approval = NEEDS_APPROVAL.has(action) ? { approved_by: user.id, approved_at: new Date().toISOString() } : {};

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
        const ceiling = requireCeiling();
        const camp = await (await fetch(
          `${META_API}/${campaign_id_external}?fields=daily_budget,lifetime_budget,effective_status&access_token=${token}`)).json();
        if (camp.error) throw new Error(`Meta API: ${camp.error.message}`);
        if (camp.effective_status !== 'ACTIVE') {
          let campaignDaily = parseInt(camp.daily_budget ?? '0') || 0;
          if (!campaignDaily) {
            const sets = await pageAll<{ daily_budget?: string; lifetime_budget?: string }>(
              `${META_API}/${campaign_id_external}/adsets?fields=daily_budget,lifetime_budget&limit=200&access_token=${token}`);
            if (camp.lifetime_budget || sets.some(s => s.lifetime_budget && !s.daily_budget)) {
              throw new SpendGuardError('This campaign uses a lifetime budget, which a daily ceiling can\'t bound. Activate it in Ads Manager. Nothing was changed.');
            }
            campaignDaily = sets.reduce((s, x) => s + (parseInt(x.daily_budget ?? '0') || 0), 0);
          }
          const current = await activeDailyBudgetCents(META_API, adAccount.account_id, token);
          if (current + campaignDaily > ceiling) {
            throw new SpendGuardError(
              `Activating this campaign would take the account's daily budget to ${((current + campaignDaily) / 100).toFixed(2)}, above your ceiling of ${(ceiling / 100).toFixed(2)}. Nothing was changed.`);
          }
        }
        const res = await fetch(`${META_API}/${campaign_id_external}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ACTIVE', access_token: token }),
        });
        const data = await res.json();
        if (data.error) throw new Error(`Meta API: ${data.error.message}`);
        result = { success: true, message: 'Campaign activated successfully', ...approval };
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
        const multiplier = Number(value ?? 1.2); // default +20%
        if (!(multiplier > 0)) throw new SpendGuardError('Invalid budget multiplier. Nothing was changed.');
        const updated: string[] = [];

        if (multiplier > 1) {
          const ceiling = requireCeiling();
          const maxStep = Number(limits!.max_change_pct_per_action);
          if ((multiplier - 1) * 100 > maxStep + 1e-9) {
            throw new SpendGuardError(`A single change can raise a budget by at most ${maxStep}%. Nothing was changed.`);
          }
          const added = adSets.reduce((s, a) => s + (a.daily_budget ? Math.round(parseInt(a.daily_budget) * multiplier) - parseInt(a.daily_budget) : 0), 0);
          const current = await activeDailyBudgetCents(META_API, adAccount.account_id, token);
          if (current + added > ceiling) {
            throw new SpendGuardError(
              `This would take the account's daily budget to ${((current + added) / 100).toFixed(2)}, above your ceiling of ${(ceiling / 100).toFixed(2)}. Nothing was changed.`);
          }
        }

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
          ...approval,
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
          ...approval,
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
        result = { success: true, message: `✅ AdSet duplicated (PAUSED). ID: ${data.id}`, new_adset_id: data.id, ...approval };
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
      JSON.stringify({ error: error instanceof Error ? error.message : String(error), refused: error instanceof SpendGuardError }),
      { status: error instanceof SpendGuardError ? 403 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
