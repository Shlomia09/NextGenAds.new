/**
 * execute-recommendation — v5
 *
 * Executes an auto-executable recommendation:
 *   1. Validates the recommendation exists, is auto-executable, and has a campaign_id
 *   2. Fetches the campaign + ad_account for the baseline snapshot
 *   3. Delegates to the shared logAndExecuteAction helper (baseline → meta-action → log → monitor)
 *
 * Source of truth for monitoring logic: supabase/functions/_shared/actionLogging.ts
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js';
import { logAndExecuteAction } from '../_shared/actionLogging.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const allowedActions = ['pause_campaign', 'activate_campaign', 'scale_budget'] as const;

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

    const { recommendation_id } = await req.json();
    if (!recommendation_id) throw new Error('recommendation_id is required');

    // ── Fetch and validate recommendation ──────────────────────────────────
    const { data: rec, error: recErr } = await supabase
      .from('recommendations')
      .select('id, brand_id, campaign_id, action_type, auto_executable, status')
      .eq('id', recommendation_id)
      .single();
    if (recErr || !rec) throw new Error('Recommendation not found');
    if (rec.status === 'executed') throw new Error('Recommendation already executed');
    if (!rec.auto_executable) {
      throw new Error(
        `This recommendation is not auto-executable (action_type: ${rec.action_type || 'none'}). ` +
        `It requires manual work — there is no automated path for this action yet.`
      );
    }
    if (!rec.campaign_id) throw new Error('Recommendation has no linked campaign_id — cannot execute safely');
    if (!allowedActions.includes(rec.action_type)) {
      throw new Error(`Unsupported action_type for auto-execution: ${rec.action_type}`);
    }

    // ── Fetch campaign + ad account ────────────────────────────────────────
    const { data: campaign, error: campErr } = await supabase
      .from('campaigns')
      .select('id, campaign_id_external, ad_account_id, spend, roas, cpl, leads, purchases, revenue')
      .eq('id', rec.campaign_id)
      .single();
    if (campErr || !campaign) throw new Error('Campaign not found');

    const { data: adAccount, error: accErr } = await supabase
      .from('ad_accounts')
      .select('id, account_id, user_id')
      .eq('id', campaign.ad_account_id)
      .single();
    if (accErr || !adAccount || adAccount.user_id !== user.id) {
      throw new Error('Unauthorized — campaign does not belong to this user');
    }

    // ── Delegate to shared helper ──────────────────────────────────────────
    const result = await logAndExecuteAction({
      supabase,
      authHeader,
      brand_id:             rec.brand_id,
      user_id:              user.id,
      campaign_id:          campaign.id,
      campaign_id_external: campaign.campaign_id_external,
      ad_account_id:        adAccount.account_id,
      action_type:          rec.action_type as 'pause_campaign' | 'activate_campaign' | 'scale_budget',
      source:               'recommendation',
      recommendation_id:    rec.id,
      baseline: {
        spend:     campaign.spend,
        roas:      campaign.roas,
        cpl:       campaign.cpl,
        leads:     campaign.leads,
        purchases: campaign.purchases,
        revenue:   campaign.revenue,
      },
    });

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
