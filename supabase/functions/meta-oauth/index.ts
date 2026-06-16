import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_APP_ID     = Deno.env.get('META_APP_ID');
const META_APP_SECRET = Deno.env.get('META_APP_SECRET');
const APP_URL         = Deno.env.get('APP_URL') || 'https://next-gen-ads-new.vercel.app';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url    = new URL(req.url);
    const code   = url.searchParams.get('code');
    const userId = url.searchParams.get('state'); // user ID passed as state

    if (!code || !userId) {
      return new Response(
        JSON.stringify({ error: 'missing_params', message: 'Missing code or state parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Exchange code for access token ──────────────────────────
    const redirectUri = `${APP_URL}/connect/meta/callback`;
    const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id',     META_APP_ID!);
    tokenUrl.searchParams.set('client_secret', META_APP_SECRET!);
    tokenUrl.searchParams.set('redirect_uri',  redirectUri);
    tokenUrl.searchParams.set('code',          code);

    const tokenRes  = await fetch(tokenUrl.toString());
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error('Meta token exchange error:', tokenData.error);
      return new Response(
        JSON.stringify({ error: 'token_exchange_failed', message: tokenData.error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = tokenData.access_token;

    // ── Get long-lived token (optional but recommended) ──────────
    // Short-lived tokens expire in ~1 hour; long-lived in 60 days
    let longLivedToken = accessToken;
    try {
      const extendUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
      extendUrl.searchParams.set('grant_type',        'fb_exchange_token');
      extendUrl.searchParams.set('client_id',         META_APP_ID!);
      extendUrl.searchParams.set('client_secret',     META_APP_SECRET!);
      extendUrl.searchParams.set('fb_exchange_token', accessToken);

      const extendRes  = await fetch(extendUrl.toString());
      const extendData = await extendRes.json();
      if (extendData.access_token) longLivedToken = extendData.access_token;
    } catch (e) {
      console.warn('Could not extend token, using short-lived:', e);
    }

    // ── Fetch ad accounts ────────────────────────────────────────
    const accountsRes  = await fetch(
      `https://graph.facebook.com/v19.0/me/adaccounts?fields=account_id,name,account_status,currency,timezone_name&access_token=${longLivedToken}`
    );
    const accountsData = await accountsRes.json();

    if (accountsData.error) {
      return new Response(
        JSON.stringify({ error: 'accounts_fetch_failed', message: accountsData.error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adAccounts = accountsData.data || [];

    if (adAccounts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'no_ad_accounts', message: 'No ad accounts found on this Meta account.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Store in Supabase (service role bypasses RLS) ────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // ── First delete ALL stale accounts for this user (pending and active) ──
    // so we can INSERT fresh rows without constraint issues
    await supabase
      .from('ad_accounts')
      .delete()
      .eq('user_id', userId)
      .eq('platform', 'meta')
      .eq('status', 'pending');

    // ── Store all accounts as 'pending' — user picks in the UI ────
    const stored = [];
    for (const account of adAccounts) {
      // Delete existing row first (avoids unique constraint issues)
      await supabase
        .from('ad_accounts')
        .delete()
        .eq('user_id', userId)
        .eq('platform', 'meta')
        .eq('account_id', account.account_id);

      const { error: insertError } = await supabase
        .from('ad_accounts')
        .insert({
          user_id:      userId,
          platform:     'meta',
          account_id:   account.account_id,
          account_name: account.name,
          access_token: longLivedToken,
          status:       'pending',
          connected_at: new Date().toISOString(),
        });

      if (!insertError) stored.push(account.account_id);
      else console.error('Insert error:', insertError);
    }

    return new Response(
      JSON.stringify({
        success:         true,
        accounts_stored: stored.length,
        // Return the token so the frontend can save it directly
        // (fallback if DB insert failed for any account)
        access_token:    longLivedToken,
        accounts:        adAccounts.map((a: { account_id: string; name: string }) => ({
          account_id: a.account_id,
          name:       a.name,
        })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('meta-oauth error:', error);
    return new Response(
      JSON.stringify({ error: 'internal_error', message: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
