// Meta Ads API helpers — client-side only calls the Edge Function
import { supabase } from './supabase';

export const initiateMetaOAuth = () => {
  const META_APP_ID = import.meta.env.VITE_META_APP_ID;
  const redirectUri = `${window.location.origin}/connect/meta/callback`;
  const scope = [
    'ads_read',
    'ads_management',
    'business_management',
    'read_insights',
  ].join(',');

  const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`;
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
