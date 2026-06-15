// Meta Ads API helpers — client-side only calls the Edge Function
import { supabase } from './supabase';

export const initiateMetaOAuth = () => {
  const META_APP_ID = import.meta.env.VITE_META_APP_ID;
  const redirectUri  = `${window.location.origin}/connect/meta/callback`;

  // Facebook Login for Business uses config_id (not scope) in the OAuth URL.
  // config_id references the Business Configuration that defines which
  // permissions (ads_read, ads_management, business_management) are requested.
  // Configuration ID is found in Meta App Dashboard →
  //   Facebook Login for Business → Configurations
  const CONFIG_ID = import.meta.env.VITE_META_CONFIG_ID || '26657910060554513';

  const url = [
    'https://www.facebook.com/v19.0/dialog/oauth',
    `?client_id=${META_APP_ID}`,
    `&redirect_uri=${encodeURIComponent(redirectUri)}`,
    `&config_id=${CONFIG_ID}`,
    '&response_type=code',
  ].join('');

  window.location.href = url;
};

export const syncMetaCampaigns = async (brandId: string, adAccountId: string) => {
  const { data, error } = await supabase.functions.invoke('meta-sync', {
    body: { brand_id: brandId, ad_account_id: adAccountId },
  });
  if (error) throw error;
  return data;
};

export const getMetaAccounts = async () => {
  const { data, error } = await supabase.functions.invoke('meta-get-accounts', {
    body: {},
  });
  if (error) throw error;
  return data;
};
