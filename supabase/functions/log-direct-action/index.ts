/**
 * log-direct-action — v1
 *
 * Drop-in replacement for direct meta-action calls from Quick Actions
 * (Campaigns page) and AI Chat (IntelligenceChat).
 *
 * Differences from calling meta-action directly:
 *   - Captures a baseline snapshot before acting
 *   - Writes to action_logs with source='quick_action'|'ai_chat'
 *   - Schedules 48h monitoring (same as execute-recommendation)
 *
 * Request body:
 *   {
 *     action:               'pause_campaign' | 'activate_campaign' | 'scale_budget',
 *     campaign_id_external: string,    // Meta's campaign ID
 *     ad_account_id:        string,    // Meta's ad account ID (e.g. "act_12345")
 *     campaign_id:          string,    // Internal UUID from campaigns table
 *     brand_id:             string,    // Internal UUID from brands table
 *     source:               'quick_action' | 'ai_chat',
 *     // Optional — passed through to meta-action for scale_budget
 *     new_budget?:          number,
 *   }
 *
 * Response shape: identical to meta-action + monitoring fields
 *   { success, action_log_id, baseline_snapshot, monitor_at, meta_result }
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js';
import { logAndExecuteAction, type ActionSource } from '../_shared/actionLogging.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const allowedActions = ['pause_campaign', 'activate_campaign', 'scale_budget'] as const;
const allowedSources: ActionSource[] = ['quick_action', 'ai_chat'];

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

    const body = await req.json();
    const {
      action,
      campaign_id_external,
      ad_account_id,
      campaign_id,
      brand_id,
      source,
      new_budget,
    } = body;

    // ── Validate inputs ────────────────────────────────────────────────────
    if (!action)               throw new Error('action is required');
    if (!campaign_id_external) throw new Error('campaign_id_external is required');
    if (!ad_account_id)        throw new Error('ad_account_id is required');
    if (!campaign_id)          throw new Error('campaign_id is required');
    if (!brand_id)             throw new Error('brand_id is required');
    if (!source || !allowedSources.includes(source as ActionSource)) {
      throw new Error(`source must be one of: ${allowedSources.join(', ')}`);
    }
    if (!allowedActions.includes(action)) {
      throw new Error(`action must be one of: ${allowedActions.join(', ')}`);
    }

    // ── Fetch baseline from DB ─────────────────────────────────────────────
    // Also verifies: campaign exists and belongs to this user's brand
    const { data: campaign, error: campErr } = await supabase
      .from('campaigns')
      .select('id, spend, roas, cpl, leads, purchases, revenue, ad_account_id')
      .eq('id', campaign_id)
      .single();
    if (campErr || !campaign) throw new Error('Campaign not found');

    // Ownership check: ad_account must belong to this user
    const { data: adAccount, error: accErr } = await supabase
      .from('ad_accounts')
      .select('user_id')
      .eq('id', campaign.ad_account_id)
      .single();
    if (accErr || !adAccount || adAccount.user_id !== user.id) {
      throw new Error('Unauthorized — campaign does not belong to this user');
    }

    // ── Delegate to shared helper ──────────────────────────────────────────
    const result = await logAndExecuteAction({
      supabase,
      authHeader,
      brand_id,
      user_id:              user.id,
      campaign_id,
      campaign_id_external,
      ad_account_id,
      action_type:          action as 'pause_campaign' | 'activate_campaign' | 'scale_budget',
      action_params:        new_budget !== undefined ? { new_budget } : undefined,
      source:               source as ActionSource,
      recommendation_id:    null,
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
