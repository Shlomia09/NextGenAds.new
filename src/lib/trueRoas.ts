import { supabase } from './supabase';

export interface TrueRoasResult {
  meta_roas: number;            // Meta claimed ROAS
  true_roas: number;            // Shopify/WooCommerce actual ROAS
  attribution_gap: number;      // meta_roas - true_roas
  gap_pct: number;              // gap as % of meta_roas
  meta_spend: number;
  meta_claimed_revenue: number;
  true_revenue: number;         // from ecommerce_orders
  utm_coverage_pct: number;     // % of orders with utm_source
  has_ecommerce: boolean;       // is Shopify/WooCommerce connected?
}

export const calculateTrueROAS = async (
  brandId: string,
  dateFrom: string,  // YYYY-MM-DD
  dateTo: string
): Promise<TrueRoasResult> => {
  // 1. Check if ecommerce account exists for this brand
  const { data: ecomAccount } = await supabase
    .from('ecommerce_accounts')
    .select('id')
    .eq('brand_id', brandId)
    .eq('status', 'active')
    .maybeSingle();

  const has_ecommerce = !!ecomAccount;

  // 2. Get Meta spend + claimed revenue from campaigns
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('spend, revenue, roas')
    .eq('brand_id', brandId);

  const meta_spend           = (campaigns || []).reduce((s, c) => s + (c.spend || 0), 0);
  const meta_claimed_revenue = (campaigns || []).reduce((s, c) => s + (c.revenue || 0), 0);
  const meta_roas            = meta_spend > 0 ? meta_claimed_revenue / meta_spend : 0;

  if (!has_ecommerce) {
    return {
      meta_roas,
      true_roas: 0,
      attribution_gap: 0,
      gap_pct: 0,
      meta_spend,
      meta_claimed_revenue,
      true_revenue: 0,
      utm_coverage_pct: 0,
      has_ecommerce: false,
    };
  }

  // 3. Get Shopify/WooCommerce revenue attributed to Meta/Facebook
  const { data: allOrders } = await supabase
    .from('ecommerce_orders')
    .select('revenue, utm_source')
    .eq('brand_id', brandId)
    .gte('order_date', dateFrom)
    .lte('order_date', dateTo);

  const orders = allOrders || [];
  const metaOrders = orders.filter((o) =>
    ['facebook', 'fb', 'ig', 'instagram', 'meta'].includes((o.utm_source || '').toLowerCase())
  );

  const true_revenue   = metaOrders.reduce((s, o) => s + (Number(o.revenue) || 0), 0);
  const true_roas      = meta_spend > 0 ? true_revenue / meta_spend : 0;
  const attribution_gap = meta_roas - true_roas;
  const gap_pct        = meta_roas > 0 ? (attribution_gap / meta_roas) * 100 : 0;

  const ordersWithUtm   = orders.filter((o) => o.utm_source).length;
  const utm_coverage_pct = orders.length > 0 ? (ordersWithUtm / orders.length) * 100 : 0;

  return {
    meta_roas,
    true_roas,
    attribution_gap,
    gap_pct,
    meta_spend,
    meta_claimed_revenue,
    true_revenue,
    utm_coverage_pct,
    has_ecommerce: true,
  };
};
