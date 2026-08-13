import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function pctChange(before: number, after: number): number | null {
  if (before === 0) return null;
  return ((after - before) / Math.abs(before)) * 100;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: dueLogs, error: dueErr } = await supabase
      .from('action_logs')
      .select('id, brand_id, campaign_id, action_type, baseline_snapshot')
      .eq('monitoring_status', 'pending')
      .lte('monitor_at', new Date().toISOString())
      .limit(50);

    if (dueErr) throw new Error(`Failed to load due action_logs: ${dueErr.message}`);

    const results: Array<Record<string, unknown>> = [];

    for (const log of dueLogs || []) {
      if (!log.campaign_id || !log.baseline_snapshot) {
        await supabase.from('action_logs').update({ monitoring_status: 'skipped_no_baseline' }).eq('id', log.id);
        continue;
      }

      const { data: campaign, error: campErr } = await supabase
        .from('campaigns')
        .select('spend, roas, cpl, leads, purchases, revenue')
        .eq('id', log.campaign_id)
        .single();

      if (campErr || !campaign) {
        await supabase.from('action_logs').update({ monitoring_status: 'skipped_campaign_missing' }).eq('id', log.id);
        continue;
      }

      const baseline = log.baseline_snapshot as Record<string, number>;
      const roas_change_pct = pctChange(baseline.roas ?? 0, campaign.roas ?? 0);
      const cpl_change_pct = pctChange(baseline.cpl ?? 0, campaign.cpl ?? 0);
      const spend_change_pct = pctChange(baseline.spend ?? 0, campaign.spend ?? 0);

      let verdict: 'improved' | 'degraded' | 'neutral' = 'neutral';
      if ((roas_change_pct ?? 0) > 5 || (cpl_change_pct ?? 0) < -5) verdict = 'improved';
      else if ((roas_change_pct ?? 0) < -10 || (cpl_change_pct ?? 0) > 15) verdict = 'degraded';

      const monitoring_result = {
        baseline,
        current: campaign,
        roas_change_pct,
        cpl_change_pct,
        spend_change_pct,
        verdict,
        checked_at: new Date().toISOString(),
      };

      const { error: updErr } = await supabase.from('action_logs').update({
        monitoring_status: verdict,
        monitoring_result,
      }).eq('id', log.id);
      if (updErr) console.error('action_logs monitoring update failed:', updErr.message);

      // Non-critical alert — wrapped so it can never crash the batch.
      if (verdict === 'degraded') {
        try {
          const { error: eventErr } = await supabase.from('system_events').insert({
            brand_id: log.brand_id,
            type: 'action_degraded_alert',
            message: `⚠️ Action "${log.action_type}" on campaign did not improve performance (ROAS ${roas_change_pct?.toFixed(1)}%, CPL ${cpl_change_pct?.toFixed(1)}%). Review recommended.`,
          });
          if (eventErr) console.error('system_events insert failed:', eventErr.message);
        } catch (e) {
          console.error('system_events insert threw:', e instanceof Error ? e.message : String(e));
        }
      }

      results.push({ action_log_id: log.id, verdict, roas_change_pct, cpl_change_pct });
    }

    return new Response(JSON.stringify({ checked: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
