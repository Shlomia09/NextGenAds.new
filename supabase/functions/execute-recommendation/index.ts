import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MONITOR_DELAY_HOURS = 48;
const allowedActions = ['pause_campaign', 'activate_campaign', 'scale_budget'];

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

    const baseline_snapshot = {
      spend: campaign.spend,
      roas: campaign.roas,
      cpl: campaign.cpl,
      leads: campaign.leads,
      purchases: campaign.purchases,
      revenue: campaign.revenue,
      captured_at: new Date().toISOString(),
    };

    const { data: logRow, error: logErr } = await supabase
      .from('action_logs')
      .insert({
        brand_id: rec.brand_id,
        user_id: user.id,
        campaign_id: campaign.id,
        recommendation_id: rec.id,
        action_type: rec.action_type,
        params: { campaign_id_external: campaign.campaign_id_external, ad_account_id: adAccount.account_id },
        status: 'pending',
        baseline_snapshot,
        monitoring_status: 'not_scheduled',
      })
      .select('id')
      .single();
    if (logErr) throw new Error(`Failed to create action log: ${logErr.message}`);

    // Call the existing meta-action function — THIS is the real, external side effect.
    // Everything after this point is bookkeeping. If bookkeeping fails, we must NOT
    // report failure to the user, because the actual Meta action already happened.
    const metaActionRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/meta-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        action: rec.action_type,
        campaign_id_external: campaign.campaign_id_external,
        ad_account_id: adAccount.account_id,
      }),
    });
    const metaActionResult = await metaActionRes.json();

    if (!metaActionRes.ok || metaActionResult.error) {
      // NOTE: action_logs.status has a DB CHECK constraint allowing only
      // 'pending' | 'success' | 'failed' — 'confirmed' is NOT a valid value.
      const { error: failUpdErr } = await supabase.from('action_logs').update({
        status: 'failed',
        result: metaActionResult,
        executed_at: new Date().toISOString(),
      }).eq('id', logRow.id);
      if (failUpdErr) console.error('Failed to mark action_logs as failed:', failUpdErr.message);

      throw new Error(metaActionResult.error || 'meta-action call failed');
    }

    // ── Meta action succeeded. From here on: best-effort bookkeeping only. ──
    const monitor_at = new Date(Date.now() + MONITOR_DELAY_HOURS * 60 * 60 * 1000).toISOString();
    const bookkeepingWarnings: string[] = [];

    const { error: logUpdErr } = await supabase.from('action_logs').update({
      status: 'success',
      result: metaActionResult,
      executed_at: new Date().toISOString(),
      monitor_at,
      monitoring_status: 'pending',
    }).eq('id', logRow.id);
    if (logUpdErr) {
      console.error('action_logs success update failed:', logUpdErr.message);
      bookkeepingWarnings.push(`action_logs update: ${logUpdErr.message}`);
    }

    const { error: recUpdErr } = await supabase.from('recommendations').update({
      status: 'executed',
      executed_at: new Date().toISOString(),
    }).eq('id', rec.id);
    if (recUpdErr) {
      console.error('recommendations executed update failed:', recUpdErr.message);
      bookkeepingWarnings.push(`recommendations update: ${recUpdErr.message}`);
    }

    try {
      const { error: eventErr } = await supabase.from('system_events').insert({
        brand_id: rec.brand_id,
        type: 'action_executed',
        message: `Executed "${rec.action_type}" on campaign ${campaign.campaign_id_external}, approved by user. Monitoring result in ${MONITOR_DELAY_HOURS}h.`,
      });
      if (eventErr) console.error('system_events insert failed:', eventErr.message);
    } catch (e) {
      console.error('system_events insert threw:', e instanceof Error ? e.message : String(e));
    }

    return new Response(JSON.stringify({
      success: true,
      action_log_id: logRow.id,
      baseline_snapshot,
      monitor_at,
      meta_result: metaActionResult,
      bookkeeping_warnings: bookkeepingWarnings.length ? bookkeepingWarnings : undefined,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
