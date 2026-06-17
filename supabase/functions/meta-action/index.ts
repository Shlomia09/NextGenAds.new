import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { action, campaign_id_external, ad_account_id, value } = await req.json();

    // ── Verify user owns the ad account & fetch token ──────────────────
    const { data: adAccount, error: accErr } = await supabase
      .from('ad_accounts')
      .select('access_token, account_id, account_name')
      .eq('user_id', user.id)
      .eq('account_id', ad_account_id)
      .eq('platform', 'meta')
      .single();

    if (accErr || !adAccount) throw new Error('Ad account not found or unauthorized');
    if (!adAccount.access_token) throw new Error('No access token. Please reconnect your Meta account.');

    const token = adAccount.access_token;
    const META_API = 'https://graph.facebook.com/v19.0';

    let result: Record<string, unknown> = {};

    switch (action) {
      case 'pause_campaign': {
        const res = await fetch(`${META_API}/${campaign_id_external}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'PAUSED', access_token: token }),
        });
        const data = await res.json();
        if (data.error) throw new Error(`Meta API: ${data.error.message}`);
        result = { success: true, message: 'Campaign paused successfully' };
        break;
      }

      case 'activate_campaign': {
        const res = await fetch(`${META_API}/${campaign_id_external}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ACTIVE', access_token: token }),
        });
        const data = await res.json();
        if (data.error) throw new Error(`Meta API: ${data.error.message}`);
        result = { success: true, message: 'Campaign activated successfully' };
        break;
      }

      case 'scale_budget': {
        // Get current ad sets for this campaign
        const setsRes = await fetch(
          `${META_API}/${campaign_id_external}/adsets?fields=id,name,daily_budget,lifetime_budget&access_token=${token}`
        );
        const setsData = await setsRes.json();
        if (setsData.error) throw new Error(`Meta API: ${setsData.error.message}`);

        const adSets: Array<{ id: string; name: string; daily_budget?: string; lifetime_budget?: string }> = setsData.data || [];
        const multiplier = value ?? 1.2; // default +20%
        const updated: string[] = [];

        for (const adSet of adSets) {
          if (adSet.daily_budget) {
            const newBudget = Math.round(parseInt(adSet.daily_budget) * multiplier);
            const updateRes = await fetch(`${META_API}/${adSet.id}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ daily_budget: newBudget, access_token: token }),
            });
            const updateData = await updateRes.json();
            if (!updateData.error) updated.push(adSet.name);
          }
        }

        result = {
          success: true,
          message: `Budget scaled +${Math.round((multiplier - 1) * 100)}% on ${updated.length} ad set(s): ${updated.join(', ')}`,
        };
        break;
      }

      case 'get_ads': {
        // Fetch ad-level insights for this campaign
        const adsRes = await fetch(
          `${META_API}/${campaign_id_external}/ads?fields=id,name,status,insights{spend,impressions,clicks,actions,cpm,cpc}&access_token=${token}&limit=20`
        );
        const adsData = await adsRes.json();
        if (adsData.error) throw new Error(`Meta API: ${adsData.error.message}`);
        result = { success: true, ads: adsData.data || [] };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
