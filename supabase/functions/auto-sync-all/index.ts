/**
 * auto-sync-all — Scheduled Meta sync for ALL ad accounts
 *
 * Called by pg_cron every hour (via pg_net HTTP POST) with the service_role key.
 * No user JWT required — authenticates with SUPABASE_SERVICE_ROLE_KEY.
 *
 * Flow:
 *   1. Verify caller is service_role (Authorization header = service_role JWT)
 *   2. Fetch all ad_accounts from DB (all users, all brands)
 *   3. For each ad_account: run full Meta sync (same logic as meta-sync)
 *   4. Return summary: { accounts_synced, total_campaigns, errors[] }
 *
 * Security: verify_jwt = false (pg_cron can't generate user JWTs).
 *           We manually verify the service_role key in the function body.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_API_BASE = 'https://graph.facebook.com/v19.0';
const DATE_PRESET   = 'last_90d';

// ── Helpers (identical to meta-sync) ────────────────────────────────────────

const classifyObj = (o: string): string => {
  const u = (o || '').toUpperCase();
  if (u.includes('SALES') || u.includes('CONVERSIONS') || u.includes('PURCHASE') || u.includes('CATALOG')) return 'sales';
  if (u.includes('LEADS') || u.includes('LEAD_GENERATION')) return 'leads';
  if (u.includes('TRAFFIC') || u.includes('LINK_CLICKS')) return 'traffic';
  if (u.includes('AWARENESS') || u.includes('REACH') || u.includes('BRAND')) return 'awareness';
  return 'unknown';
};

const META_CONVERSION_MAP: Record<string, { actionType: string; label: string }> = {
  PURCHASE:              { actionType: 'offsite_conversion.fb_pixel_purchase',              label: 'Purchases'        },
  ADD_TO_CART:           { actionType: 'offsite_conversion.fb_pixel_add_to_cart',           label: 'ATC'              },
  INITIATE_CHECKOUT:     { actionType: 'offsite_conversion.fb_pixel_initiate_checkout',     label: 'Checkout'         },
  ADD_PAYMENT_INFO:      { actionType: 'offsite_conversion.fb_pixel_add_payment_info',      label: 'Add Payment Info' },
  VIEW_CONTENT:          { actionType: 'offsite_conversion.fb_pixel_view_content',          label: 'View Content'     },
  LEAD:                  { actionType: 'offsite_conversion.fb_pixel_lead',                  label: 'Leads'            },
  COMPLETE_REGISTRATION: { actionType: 'offsite_conversion.fb_pixel_complete_registration', label: 'Registrations'    },
  SUBSCRIBE:             { actionType: 'offsite_conversion.fb_pixel_subscribe',             label: 'Subscriptions'    },
  LANDING_PAGE_VIEW:     { actionType: 'landing_page_view',                                label: 'Page Views'       },
  LINK_CLICK:            { actionType: 'link_click',                                       label: 'Clicks'           },
  REACH:                 { actionType: 'reach',                                            label: 'Reach'            },
};

const resolveConversionKey = (promoted: Record<string, string> | null, objective: string): string => {
  if (promoted?.custom_event_type) return promoted.custom_event_type.toUpperCase();
  const u = (objective || '').toUpperCase();
  if (u === 'LANDING_PAGE_VIEWS') return 'LANDING_PAGE_VIEW';
  if (u === 'LINK_CLICKS')        return 'LINK_CLICK';
  if (u === 'REACH')              return 'REACH';
  const g = classifyObj(objective);
  if (g === 'traffic')   return 'LANDING_PAGE_VIEW';
  if (g === 'awareness') return 'REACH';
  if (g === 'leads')     return 'LEAD';
  if (g === 'sales')     return 'PURCHASE';
  return 'LINK_CLICK';
};

const extractLeads = (actions: Array<{ action_type: string; value: string }> | undefined): number => {
  if (!actions) return 0;
  const a = actions.find(a =>
    a.action_type === 'lead' ||
    a.action_type === 'onsite_conversion.lead_grouped' ||
    a.action_type === 'offsite_conversion.fb_pixel_lead'
  );
  return parseInt(a?.value || '0');
};

// ── Sync one ad_account ──────────────────────────────────────────────────────

interface AdAccount {
  id: string;
  user_id: string;
  brand_id: string;
  account_id: string;   // Meta external account ID (act_XXXXXXX)
  access_token: string;
}

interface SyncResult {
  ad_account_id: string;
  account_id: string;
  synced: number;
  error?: string;
}

async function syncAccount(
  supabase: ReturnType<typeof createClient>,
  account: AdAccount,
): Promise<SyncResult> {
  const { id: adAccountId, account_id: externalAccountId, access_token: accessToken, brand_id, user_id } = account;
  const result: SyncResult = { ad_account_id: adAccountId, account_id: externalAccountId, synced: 0 };

  try {
    // ── Step 1: Fetch campaigns from Meta ──────────────────────────────────
    const campaignsUrl = new URL(`${META_API_BASE}/act_${externalAccountId}/campaigns`);
    campaignsUrl.searchParams.set('access_token', accessToken);
    campaignsUrl.searchParams.set(
      'fields',
      `id,name,status,objective,daily_budget,lifetime_budget,` +
      `insights.date_preset(${DATE_PRESET}){spend,impressions,clicks,reach,frequency,actions,` +
      `purchase_roas,cost_per_action_type,action_values},` +
      `promoted_object`
    );
    campaignsUrl.searchParams.set('limit', '100');

    const campaignsRes  = await fetch(campaignsUrl.toString());
    const campaignsData = await campaignsRes.json();
    if (campaignsData.error) throw new Error(`Meta API: ${campaignsData.error.message}`);

    const campaigns = campaignsData.data || [];
    if (campaigns.length === 0) return result;

    // ── Step 2: Upsert campaigns ───────────────────────────────────────────
    const campaignRows = campaigns.map((c: Record<string, unknown>) => {
      const insight = (c.insights as { data?: Record<string, unknown>[] } | undefined)?.data?.[0] || {};
      const actions  = (insight.actions  as Array<{ action_type: string; value: string }>) || [];
      const purchRoas = (insight.purchase_roas as Array<{ action_type: string; value: string }>) || [];
      const convKey   = resolveConversionKey(c.promoted_object as Record<string, string> | null, c.objective as string);
      const spend     = parseFloat((insight.spend as string) || '0');
      const impr      = parseInt((insight.impressions as string) || '0');
      const clicks    = parseInt((insight.clicks as string) || '0');
      const reach     = parseInt((insight.reach as string) || '0');
      const freq      = parseFloat((insight.frequency as string) || '0');
      const leads     = extractLeads(actions);
      const purchases = parseInt(actions.find((a) => a.action_type === 'offsite_conversion.fb_pixel_purchase')?.value || '0');
      const atc       = parseInt(actions.find((a) => a.action_type === 'offsite_conversion.fb_pixel_add_to_cart')?.value || '0');
      const pageViews = parseInt(actions.find((a) => a.action_type === 'landing_page_view')?.value || '0');
      const convValue = parseInt(actions.find((a) => a.action_type === META_CONVERSION_MAP[convKey]?.actionType)?.value || '0');
      const roasVal   = parseFloat(purchRoas.find((a) => a.action_type === 'offsite_conversion.fb_pixel_purchase')?.value || '0');
      const revenue   = parseFloat((insight.action_values as Array<{ action_type: string; value: string }> || []).find((a) => a.action_type === 'offsite_conversion.fb_pixel_purchase')?.value || '0');

      return {
        brand_id,
        ad_account_id:       adAccountId,
        user_id,
        platform:            'meta',
        campaign_id_external: c.id,
        name:                c.name,
        status:              c.status,
        objective:           c.objective,
        budget_daily:        c.daily_budget     ? parseInt(c.daily_budget as string) / 100     : null,
        budget_lifetime:     c.lifetime_budget  ? parseInt(c.lifetime_budget as string) / 100  : null,
        spend, impressions: impr, clicks, reach, frequency: freq,
        leads, cpl: leads > 0 ? spend / leads : 0,
        purchases, revenue, roas: roasVal,
        atc, page_views: pageViews,
        conversion_value: convValue,
        lead_quality_rate: 0, qualified_leads: 0, bookings: 0,
        date_start: new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0],
        synced_at: new Date().toISOString(),
      };
    });

    const { error: upsertErr } = await supabase
      .from('campaigns')
      .upsert(campaignRows, { onConflict: 'ad_account_id,campaign_id_external' });
    if (upsertErr) throw new Error(`DB upsert: ${upsertErr.message}`);

    result.synced = campaignRows.length;

    // ── Step 3: Log system event ───────────────────────────────────────────
    await supabase.from('system_events').insert({
      brand_id,
      user_id,
      type:     'auto_sync',
      label:    `Auto-sync: ${campaignRows.length} campaigns synced`,
      metadata: { ad_account_id: adAccountId, total: campaigns.length, trigger: 'pg_cron' },
    }).select(); // .select() prevents "Results contains 0 rows" warning

  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
    console.error(`[auto-sync-all] Account ${externalAccountId} failed:`, result.error);
  }

  return result;
}

// ── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Security: verify caller is service_role ──────────────────────────
    // pg_cron sends the service_role JWT in the Authorization header.
    // We compare the incoming JWT against the known service_role key.
    const authHeader = req.headers.get('Authorization') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    if (!authHeader.includes(serviceRoleKey)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized — service_role required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Service-role Supabase client ─────────────────────────────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      serviceRoleKey,
    );

    // ── Fetch all connected Meta ad accounts ─────────────────────────────
    const { data: adAccounts, error: accountsErr } = await supabase
      .from('ad_accounts')
      .select('id, user_id, brand_id, account_id, access_token')
      .eq('platform', 'meta')
      .eq('status', 'active');

    if (accountsErr) throw new Error(`Failed to fetch ad accounts: ${accountsErr.message}`);
    if (!adAccounts || adAccounts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No active Meta accounts found', accounts_synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Sync each account (sequential to avoid Meta rate limits) ─────────
    const results: SyncResult[] = [];
    let totalCampaigns = 0;

    for (const account of adAccounts as AdAccount[]) {
      const r = await syncAccount(supabase, account);
      results.push(r);
      totalCampaigns += r.synced;

      // Small delay between accounts to be kind to Meta API rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const errors = results.filter(r => r.error);

    console.log(`[auto-sync-all] Done: ${adAccounts.length} accounts, ${totalCampaigns} campaigns, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success:          true,
        accounts_checked: adAccounts.length,
        accounts_synced:  results.filter(r => !r.error).length,
        total_campaigns:  totalCampaigns,
        errors:           errors.map(r => ({ account: r.account_id, error: r.error })),
        timestamp:        new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[auto-sync-all] Fatal error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
