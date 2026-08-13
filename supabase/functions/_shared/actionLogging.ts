/**
 * _shared/actionLogging.ts
 *
 * Shared helper for baseline snapshot, meta-action call, action_logs write,
 * and 48h monitoring scheduling.
 *
 * Used by:
 *   - execute-recommendation  (source: 'recommendation')
 *   - log-direct-action       (source: 'quick_action' | 'ai_chat')
 *
 * Calling code must pass a Supabase service-role client and the auth header
 * from the original request (forwarded to meta-action for JWT validation).
 */

import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js';

export type ActionSource = 'recommendation' | 'quick_action' | 'ai_chat';

export interface LogActionParams {
  /** Supabase service-role client — do NOT pass anon client */
  supabase: SupabaseClient;
  /** Original Authorization header from the incoming request — forwarded to meta-action */
  authHeader: string;
  /** ID of the brand this action belongs to */
  brand_id: string;
  /** ID of the authenticated user performing the action */
  user_id: string;
  /** Internal campaign UUID (from campaigns table) */
  campaign_id: string;
  /** campaign_id_external (Meta's campaign ID, used for the API call) */
  campaign_id_external: string;
  /** Meta ad account ID (e.g. "act_12345") */
  ad_account_id: string;
  /** The action to perform — must match meta-action's allowed actions */
  action_type: 'pause_campaign' | 'activate_campaign' | 'scale_budget';
  /** Optional: additional params for the action (e.g. { new_budget: 100 } for scale_budget) */
  action_params?: Record<string, unknown>;
  /** Where this action was triggered from */
  source: ActionSource;
  /** If triggered from a recommendation, pass its ID. Otherwise null. */
  recommendation_id: string | null;
  /** Current campaign metrics — captured as the before-state for monitoring */
  baseline: {
    spend: number;
    roas: number;
    cpl: number;
    leads: number;
    purchases: number;
    revenue: number;
  };
}

export interface LogActionResult {
  success: true;
  action_log_id: string;
  baseline_snapshot: Record<string, unknown>;
  monitor_at: string;
  meta_result: unknown;
  bookkeeping_warnings?: string[];
}

const MONITOR_DELAY_HOURS = 48;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;

/**
 * Performs the full action lifecycle:
 *   1. Writes a 'pending' action_log row with baseline snapshot
 *   2. Calls meta-action Edge Function (the real side-effect)
 *   3. On success: updates action_log to 'success', schedules monitoring, writes system_event
 *   4. On failure: updates action_log to 'failed', throws (caller sees the error)
 *
 * IMPORTANT: once meta-action is called, bookkeeping errors are non-fatal.
 * The function will still return success with warnings if meta-action succeeded
 * but a DB write failed — because the actual Meta action already happened.
 */
export async function logAndExecuteAction(p: LogActionParams): Promise<LogActionResult> {
  const baseline_snapshot = {
    spend: p.baseline.spend,
    roas: p.baseline.roas,
    cpl: p.baseline.cpl,
    leads: p.baseline.leads,
    purchases: p.baseline.purchases,
    revenue: p.baseline.revenue,
    captured_at: new Date().toISOString(),
  };

  // ── 1. Write pending action_log ──────────────────────────────────────────
  const { data: logRow, error: logErr } = await p.supabase
    .from('action_logs')
    .insert({
      brand_id:          p.brand_id,
      user_id:           p.user_id,
      campaign_id:       p.campaign_id,
      recommendation_id: p.recommendation_id,
      action_type:       p.action_type,
      source:            p.source,
      params: {
        campaign_id_external: p.campaign_id_external,
        ad_account_id:        p.ad_account_id,
        ...(p.action_params ?? {}),
      },
      status:            'pending',
      baseline_snapshot,
      monitoring_status: 'not_scheduled',
    })
    .select('id')
    .single();

  if (logErr) throw new Error(`Failed to create action_log: ${logErr.message}`);

  // ── 2. Call meta-action (real side-effect — everything after is bookkeeping) ─
  const metaBody: Record<string, unknown> = {
    action:               p.action_type,
    campaign_id_external: p.campaign_id_external,
    ad_account_id:        p.ad_account_id,
    ...(p.action_params ?? {}),
  };

  const metaRes = await fetch(`${SUPABASE_URL}/functions/v1/meta-action`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: p.authHeader },
    body:    JSON.stringify(metaBody),
  });
  const metaResult = await metaRes.json();

  if (!metaRes.ok || metaResult.error) {
    // meta-action failed — mark the log row as failed, then re-throw
    const { error: failErr } = await p.supabase
      .from('action_logs')
      .update({ status: 'failed', result: metaResult, executed_at: new Date().toISOString() })
      .eq('id', logRow.id);
    if (failErr) console.error('action_logs failed-update error:', failErr.message);

    throw new Error(metaResult.error || 'meta-action call failed');
  }

  // ── 3. Meta action succeeded — best-effort bookkeeping below ─────────────
  const monitor_at = new Date(Date.now() + MONITOR_DELAY_HOURS * 3_600_000).toISOString();
  const warnings: string[] = [];

  const { error: successErr } = await p.supabase
    .from('action_logs')
    .update({
      status:            'success',
      result:            metaResult,
      executed_at:       new Date().toISOString(),
      monitor_at,
      monitoring_status: 'pending',
    })
    .eq('id', logRow.id);
  if (successErr) {
    console.error('action_logs success-update error:', successErr.message);
    warnings.push(`action_logs update: ${successErr.message}`);
  }

  // If triggered by a recommendation, mark it as executed
  if (p.recommendation_id) {
    const { error: recErr } = await p.supabase
      .from('recommendations')
      .update({ status: 'executed', executed_at: new Date().toISOString() })
      .eq('id', p.recommendation_id);
    if (recErr) {
      console.error('recommendations executed-update error:', recErr.message);
      warnings.push(`recommendations update: ${recErr.message}`);
    }
  }

  // system_events — non-critical
  try {
    const sourceLabel = p.source === 'recommendation' ? 'Dashboard recommendation'
      : p.source === 'quick_action' ? 'Quick Action'
      : 'AI Chat';
    await p.supabase.from('system_events').insert({
      brand_id: p.brand_id,
      type:     'action_executed',
      message:  `Executed "${p.action_type}" on campaign ${p.campaign_id_external} via ${sourceLabel}. Monitoring result in ${MONITOR_DELAY_HOURS}h.`,
    });
  } catch (e) {
    console.error('system_events insert error:', e instanceof Error ? e.message : String(e));
  }

  return {
    success:              true,
    action_log_id:        logRow.id,
    baseline_snapshot,
    monitor_at,
    meta_result:          metaResult,
    bookkeeping_warnings: warnings.length ? warnings : undefined,
  };
}
