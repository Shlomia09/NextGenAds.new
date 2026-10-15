/**
 * meta-account-markets — country-level spend for one connected ad account.
 *
 * Read-only and stateless: one account-level insights call with
 * breakdowns=country over the last 90 days. Nothing is written to the DB,
 * and no brand is required, so it can run right after the Meta connection
 * (before onboarding has created a brand) to infer the account's markets.
 *
 * Body:     { ad_account_id: string }   // ad_accounts.id (row uuid), same as meta-sync
 * Response: { ad_account_id, account_id, currency, date_preset, total_spend,
 *             countries: [{ country, spend, share }] }  // sorted by spend desc
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_API_BASE = 'https://graph.facebook.com/v19.0';
const DATE_PRESET = 'last_90d';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { ad_account_id } = await req.json();
    if (!ad_account_id) return json({ error: 'missing_params', message: 'ad_account_id is required' }, 400);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'unauthorized', message: 'No authorization header' }, 401);

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) return json({ error: 'unauthorized', message: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: adAccount, error: accountError } = await supabase
      .from('ad_accounts')
      .select('id, account_id, access_token')
      .eq('id', ad_account_id)
      .eq('user_id', user.id)
      .single();
    if (accountError || !adAccount) return json({ error: 'not_found', message: 'Ad account not found' }, 404);
    if (!adAccount.access_token) return json({ error: 'no_token', message: 'Ad account has no access token' }, 400);

    // Account-level spend split by country. Paginated in case of many countries.
    const url = new URL(`${META_API_BASE}/act_${adAccount.account_id}/insights`);
    url.searchParams.set('access_token', adAccount.access_token);
    url.searchParams.set('level', 'account');
    url.searchParams.set('breakdowns', 'country');
    url.searchParams.set('date_preset', DATE_PRESET);
    url.searchParams.set('fields', 'spend,account_currency');
    url.searchParams.set('limit', '200');

    const byCountry = new Map<string, number>();
    let currency: string | null = null;
    let next: string | null = url.toString();
    while (next) {
      const res = await fetch(next);
      const body = await res.json();
      if (body.error) return json({ error: 'meta_api', message: body.error.message }, 502);
      for (const row of body.data ?? []) {
        const spend = parseFloat(row.spend ?? '0');
        if (!row.country || !(spend > 0)) continue;
        byCountry.set(row.country, (byCountry.get(row.country) ?? 0) + spend);
        currency ??= row.account_currency ?? null;
      }
      next = body.paging?.next ?? null;
    }

    const total = [...byCountry.values()].reduce((a, b) => a + b, 0);
    const countries = [...byCountry.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([country, spend]) => ({
        country,                                         // ISO 3166-1 alpha-2, as Meta returns it
        spend: Math.round(spend * 100) / 100,            // in the account currency
        share: total > 0 ? Math.round((spend / total) * 1000) / 1000 : 0,
      }));

    return json({
      ad_account_id: adAccount.id,
      account_id:    adAccount.account_id,
      currency,
      date_preset:   DATE_PRESET,
      total_spend:   Math.round(total * 100) / 100,
      countries,
    });
  } catch (error) {
    console.error('meta-account-markets error:', error);
    return json({ error: 'internal_error', message: error instanceof Error ? error.message : String(error) }, 500);
  }
});
