import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentMonth = new Date().toISOString().slice(0, 7); // '2026-06'

    // Fetch subscription + plan + usage in parallel
    const [subResult, usageResult] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('*, plans(*)')
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('usage')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', currentMonth)
        .single(),
    ]);

    const subscription = subResult.data;
    const usage = usageResult.data || {
      chat_queries_used: 0,
      benchmark_audits_used: 0,
      executions_used: 0,
    };

    // Default to free plan if no subscription record
    const plan = subscription?.plans || {
      id: 'free',
      name: 'Benchmark Audit',
      price_monthly: 0,
      price_yearly: 0,
      max_brands: 0,
      max_ad_accounts: 0,
      chat_queries_monthly: 0,
      can_execute: false,
      has_white_label: false,
      has_agency_view: false,
      has_api_access: false,
    };

    return new Response(
      JSON.stringify({ subscription, usage, plan }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('get-subscription error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
