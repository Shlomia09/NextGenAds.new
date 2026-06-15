import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHOPIFY_API_KEY    = Deno.env.get('SHOPIFY_API_KEY') || 'ae12618c295fedb6fbfd709085463074';
const SHOPIFY_API_SECRET = Deno.env.get('SHOPIFY_API_SECRET')!;
const APP_URL            = Deno.env.get('APP_URL') || 'https://next-gen-ads-new.vercel.app';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url    = new URL(req.url);
    const action = url.searchParams.get('action');

    // ── Step A: Initiate OAuth ──────────────────────────────────
    if (action === 'initiate') {
      const shop    = url.searchParams.get('store');
      const userId  = url.searchParams.get('user_id');
      const brandId = url.searchParams.get('brand_id');

      if (!shop || !userId || !brandId) {
        return new Response(
          JSON.stringify({ error: 'missing_params', message: 'Missing store, user_id, or brand_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const state       = encodeURIComponent(`${userId}:${brandId}`);
      const redirectUri = encodeURIComponent(`${APP_URL}/connect/shopify/callback`);
      const scope       = 'read_orders,read_analytics';
      const authUrl     = `https://${shop}/admin/oauth/authorize?client_id=${SHOPIFY_API_KEY}&scope=${scope}&redirect_uri=${redirectUri}&state=${state}`;

      return Response.redirect(authUrl, 302);
    }

    // ── Step B: Handle OAuth callback (code + shop + state) ─────
    const code  = url.searchParams.get('code');
    const shop  = url.searchParams.get('shop');
    const state = url.searchParams.get('state');

    if (!code || !shop || !state) {
      return Response.redirect(`${APP_URL}/connect?error=shopify_missing_params`, 302);
    }

    // 1. Exchange code for access token
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id:     SHOPIFY_API_KEY,
        client_secret: SHOPIFY_API_SECRET,
        code,
      }),
    });

    if (!tokenRes.ok) {
      console.error('Shopify token exchange failed:', tokenRes.status, await tokenRes.text());
      return Response.redirect(`${APP_URL}/connect?error=shopify_token_failed`, 302);
    }

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return Response.redirect(`${APP_URL}/connect?error=shopify_no_token`, 302);
    }

    // 2. Fetch shop info to get currency
    const shopRes = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
      headers: { 'X-Shopify-Access-Token': tokenData.access_token },
    });

    let currency = 'USD';
    if (shopRes.ok) {
      const shopInfo = await shopRes.json();
      currency = shopInfo?.shop?.currency ?? 'USD';
    }

    // 3. Upsert into ecommerce_accounts
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const decodedState = decodeURIComponent(state);
    const [userId, brandId] = decodedState.split(':');

    const { error: upsertError } = await supabase.from('ecommerce_accounts').upsert({
      user_id:      userId,
      brand_id:     brandId,
      platform:     'shopify',
      store_url:    shop,
      access_token: tokenData.access_token,
      currency,
      status:       'active',
      connected_at: new Date().toISOString(),
    }, { onConflict: 'user_id,store_url' });

    if (upsertError) {
      console.error('Supabase upsert error:', upsertError);
      return Response.redirect(`${APP_URL}/connect?error=shopify_save_failed`, 302);
    }

    // 4. Redirect back to app
    return Response.redirect(`${APP_URL}/connect?success=shopify_connected`, 302);

  } catch (error) {
    console.error('shopify-oauth error:', error);
    return Response.redirect(
      `${APP_URL}/connect?error=shopify_internal_error`,
      302
    );
  }
});
