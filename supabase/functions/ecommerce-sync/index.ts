import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper: extract UTM params from a landing_site URL string
function extractUtm(landingSite: string) {
  try {
    const fullUrl = landingSite.startsWith('http')
      ? landingSite
      : 'https://placeholder.com' + landingSite;
    const u = new URL(fullUrl);
    return {
      utm_source:   u.searchParams.get('utm_source'),
      utm_medium:   u.searchParams.get('utm_medium'),
      utm_campaign: u.searchParams.get('utm_campaign'),
      utm_content:  u.searchParams.get('utm_content'),
    };
  } catch {
    return {};
  }
}

// Helper: extract UTM params from WooCommerce order meta_data array
function extractUtmFromMeta(metaData: Array<{ key: string; value: string }>) {
  const utm: Record<string, string | null> = {};
  for (const item of metaData || []) {
    if (item.key === '_utm_source')   utm.utm_source   = item.value;
    if (item.key === '_utm_medium')   utm.utm_medium   = item.value;
    if (item.key === '_utm_campaign') utm.utm_campaign = item.value;
    if (item.key === '_utm_content')  utm.utm_content  = item.value;
  }
  return utm;
}

// Helper: try to parse UTM from a string (e.g. customer_note)
function extractUtmFromString(str: string) {
  try {
    const u = new URL('https://placeholder.com?' + str);
    return {
      utm_source:   u.searchParams.get('utm_source'),
      utm_medium:   u.searchParams.get('utm_medium'),
      utm_campaign: u.searchParams.get('utm_campaign'),
      utm_content:  u.searchParams.get('utm_content'),
    };
  } catch {
    return {};
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Parse optional body
    let ecommerceAccountId: string | null = null;
    try {
      const body = await req.json();
      ecommerceAccountId = body?.ecommerce_account_id ?? null;
    } catch { /* no body */ }

    // Fetch accounts to sync
    let query = supabase
      .from('ecommerce_accounts')
      .select('*')
      .eq('status', 'active');

    if (ecommerceAccountId) {
      query = query.eq('id', ecommerceAccountId);
    }

    const { data: accounts, error: accountsError } = await query;

    if (accountsError) {
      return new Response(
        JSON.stringify({ error: 'accounts_fetch_failed', message: accountsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!accounts || accounts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No accounts to sync', synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const account of accounts) {
      const since = new Date();
      since.setDate(since.getDate() - 90);
      const sinceIso = since.toISOString().split('T')[0];

      let syncedCount = 0;

      if (account.platform === 'shopify') {
        // ── Shopify sync ──────────────────────────────────────────
        const ordersRes = await fetch(
          `https://${account.store_url}/admin/api/2024-01/orders.json?status=any&limit=250&created_at_min=${sinceIso}&fields=id,created_at,total_price,currency,landing_site,note_attributes`,
          { headers: { 'X-Shopify-Access-Token': account.access_token } }
        );

        if (!ordersRes.ok) {
          results.push({ id: account.id, error: `Shopify API error ${ordersRes.status}` });
          continue;
        }

        const ordersData = await ordersRes.json();
        const orders     = ordersData.orders || [];

        for (const order of orders) {
          const utm = extractUtm(order.landing_site || '');
          await supabase.from('ecommerce_orders').upsert({
            ecommerce_account_id: account.id,
            brand_id:             account.brand_id,
            order_id_external:    String(order.id),
            order_date:           order.created_at.split('T')[0],
            revenue:              parseFloat(order.total_price),
            currency:             order.currency,
            ...utm,
          }, { onConflict: 'ecommerce_account_id,order_id_external' });
          syncedCount++;
        }

      } else if (account.platform === 'woocommerce') {
        // ── WooCommerce sync ─────────────────────────────────────
        const credentials = btoa(`${account.consumer_key}:${account.consumer_secret}`);
        let page          = 1;
        let hasMore       = true;

        while (hasMore) {
          const wooRes = await fetch(
            `${account.store_url}/wp-json/wc/v3/orders?per_page=100&after=${sinceIso}T00:00:00&page=${page}`,
            { headers: { Authorization: `Basic ${credentials}` } }
          );

          if (!wooRes.ok) {
            results.push({ id: account.id, error: `WooCommerce API error ${wooRes.status}` });
            hasMore = false;
            break;
          }

          const wooOrders = await wooRes.json();
          if (!Array.isArray(wooOrders) || wooOrders.length === 0) {
            hasMore = false;
            break;
          }

          for (const order of wooOrders) {
            // Try meta_data first, then customer_note
            let utm = extractUtmFromMeta(order.meta_data || []);
            if (!utm.utm_source && order.customer_note) {
              utm = extractUtmFromString(order.customer_note);
            }

            await supabase.from('ecommerce_orders').upsert({
              ecommerce_account_id: account.id,
              brand_id:             account.brand_id,
              order_id_external:    String(order.id),
              order_date:           (order.date_created || '').split('T')[0],
              revenue:              parseFloat(order.total || '0'),
              currency:             order.currency || 'USD',
              ...utm,
            }, { onConflict: 'ecommerce_account_id,order_id_external' });
            syncedCount++;
          }

          page++;
          if (wooOrders.length < 100) hasMore = false;
        }
      }

      // Update last_synced_at
      await supabase
        .from('ecommerce_accounts')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', account.id);

      results.push({ id: account.id, platform: account.platform, synced: syncedCount });
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('ecommerce-sync error:', error);
    return new Response(
      JSON.stringify({ error: 'internal_error', message: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
