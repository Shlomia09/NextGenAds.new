import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'method_not_allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { user_id, brand_id, store_url, consumer_key, consumer_secret } = await req.json();

    if (!user_id || !brand_id || !store_url || !consumer_key || !consumer_secret) {
      return new Response(
        JSON.stringify({ error: 'missing_params', message: 'All fields are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize store URL
    const normalizedUrl = store_url.replace(/\/$/, '');

    // 1. Validate by fetching orders
    const credentials = btoa(`${consumer_key}:${consumer_secret}`);
    const testRes = await fetch(
      `${normalizedUrl}/wp-json/wc/v3/orders?per_page=1`,
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!testRes.ok) {
      const errText = await testRes.text();
      console.error('WooCommerce validation failed:', testRes.status, errText);
      return new Response(
        JSON.stringify({
          error:   'validation_failed',
          message: `Could not connect to WooCommerce store (HTTP ${testRes.status}). Check your store URL and API credentials.`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await testRes.json();

    // 2. Upsert into ecommerce_accounts
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error: upsertError } = await supabase.from('ecommerce_accounts').upsert({
      user_id,
      brand_id,
      platform:        'woocommerce',
      store_url:       normalizedUrl,
      consumer_key,
      consumer_secret,
      status:          'active',
      connected_at:    new Date().toISOString(),
    }, { onConflict: 'user_id,store_url' });

    if (upsertError) {
      console.error('Supabase upsert error:', upsertError);
      return new Response(
        JSON.stringify({ error: 'save_failed', message: upsertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Return success
    return new Response(
      JSON.stringify({ success: true, orders_count: Array.isArray(data) ? data.length : 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('woo-connect error:', error);
    return new Response(
      JSON.stringify({ error: 'internal_error', message: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
