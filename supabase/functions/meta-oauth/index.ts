import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_APP_ID = Deno.env.get('META_APP_ID');
const META_APP_SECRET = Deno.env.get('META_APP_SECRET');
const APP_URL = Deno.env.get('APP_URL') || 'http://localhost:5173';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const userId = url.searchParams.get('state'); // Pass user ID as state param

    if (!code || !userId) {
      return Response.redirect(`${APP_URL}/connect?error=missing_params`);
    }

    // Exchange code for access token
    const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', META_APP_ID!);
    tokenUrl.searchParams.set('client_secret', META_APP_SECRET!);
    tokenUrl.searchParams.set('redirect_uri', `${APP_URL}/connect/meta/callback`);
    tokenUrl.searchParams.set('code', code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error('Meta token error:', tokenData.error);
      return Response.redirect(`${APP_URL}/connect?error=token_exchange_failed`);
    }

    const accessToken = tokenData.access_token;

    // Get ad accounts for this token
    const accountsRes = await fetch(
      `https://graph.facebook.com/v19.0/me/adaccounts?fields=account_id,name,account_status&access_token=${accessToken}`
    );
    const accountsData = await accountsRes.json();
    const adAccounts = accountsData.data || [];

    if (adAccounts.length === 0) {
      return Response.redirect(`${APP_URL}/connect?error=no_ad_accounts`);
    }

    // Use service role to store tokens (bypass RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Store the first ad account (or all of them)
    for (const account of adAccounts.slice(0, 1)) {
      await supabase.from('ad_accounts').upsert({
        user_id: userId,
        platform: 'meta',
        account_id: account.account_id,
        account_name: account.name,
        access_token: accessToken,
        status: account.account_status === 1 ? 'active' : 'error',
        connected_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,platform,account_id',
      });
    }

    return Response.redirect(`${APP_URL}/connect?success=meta_connected`);

  } catch (error) {
    console.error('Meta OAuth error:', error);
    return Response.redirect(`${APP_URL}/connect?error=${error.message}`);
  }
});
