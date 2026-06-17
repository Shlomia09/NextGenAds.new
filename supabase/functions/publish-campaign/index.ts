import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_API = 'https://graph.facebook.com/v19.0';

// ── Meta Objective Maps ───────────────────────────────────────
const META_OBJECTIVE: Record<string, string> = {
  leads:    'OUTCOME_LEADS',
  sales:    'OUTCOME_SALES',
  traffic:  'OUTCOME_TRAFFIC',
  awareness:'OUTCOME_AWARENESS',
};
const META_OPT_GOAL: Record<string, string> = {
  leads:    'LEAD_GENERATION',
  sales:    'OFFSITE_CONVERSIONS',
  traffic:  'LINK_CLICKS',
  awareness:'REACH',
};
const META_BILLING: Record<string, string> = {
  leads: 'IMPRESSIONS', sales: 'IMPRESSIONS',
  traffic: 'LINK_CLICKS', awareness: 'IMPRESSIONS',
};

// ── Helper: fetch JSON from Meta API ─────────────────────────
async function metaPost(endpoint: string, payload: Record<string, unknown>) {
  const res = await fetch(`${META_API}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Meta API (${endpoint}): ${data.error.message} [code: ${data.error.code}]`);
  return data;
}
async function metaGet(url: string) {
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(`Meta API GET: ${data.error.message}`);
  return data;
}

// ── Log publish attempt ───────────────────────────────────────
async function logAttempt(supabase: ReturnType<typeof createClient>, userId: string, draftId: string | undefined, platform: string, payload: unknown, status: string, result?: unknown, error?: string) {
  await supabase.from('campaign_publish_log').insert({
    user_id: userId,
    draft_id: draftId || null,
    platform,
    status,
    request_payload: payload,
    response_payload: result || null,
    error_message: error || null,
  });
}

// ── Main: Meta full end-to-end publisher ─────────────────────
async function publishToMeta(campaign: Record<string, unknown>, token: string) {
  const adAccountId = campaign.ad_account_id as string;
  const actId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
  const creative = campaign.creative as Record<string, unknown>;
  const targeting = campaign.targeting as Record<string, unknown>;
  const objective = campaign.objective as string;

  // ── Step 1: Get Facebook Page ID ─────────────────────────
  let pageId: string | null = null;
  try {
    const pagesData = await metaGet(
      `${META_API}/me/accounts?fields=id,name,access_token&access_token=${token}&limit=5`
    );
    if (pagesData.data?.length > 0) {
      pageId = pagesData.data[0].id;
    }
  } catch {
    // No page found — will use link ad format without page
  }

  // ── Step 2: Upload image to Meta ─────────────────────────
  let imageHash: string | null = null;
  if (creative.image_base64) {
    const imgData = await metaPost(`/${actId}/adimages`, {
      bytes: creative.image_base64,
      access_token: token,
    });
    const images = imgData.images as Record<string, { hash: string }>;
    const firstKey = Object.keys(images)[0];
    imageHash = images[firstKey]?.hash || null;
  }

  // ── Step 3: Create Ad Creative ───────────────────────────
  let creativeId: string | null = null;
  if (imageHash && pageId) {
    const creativePayload: Record<string, unknown> = {
      name: `${campaign.campaign_name} — Creative`,
      object_story_spec: {
        page_id: pageId,
        link_data: {
          image_hash: imageHash,
          link: creative.destination_url,
          message: creative.primary_text,
          name: creative.headline,
          ...(creative.body ? { description: creative.body } : {}),
          call_to_action: {
            type: creative.cta,
            value: { link: creative.destination_url },
          },
        },
      },
      access_token: token,
    };
    const creativeData = await metaPost(`/${actId}/adcreatives`, creativePayload);
    creativeId = creativeData.id;
  } else if (imageHash && !pageId) {
    // Fallback: use photo ad without page (works for some account types)
    const creativeData = await metaPost(`/${actId}/adcreatives`, {
      name: `${campaign.campaign_name} — Creative`,
      object_story_spec: {
        photo_data: {
          image_hash: imageHash,
          link: creative.destination_url,
          message: creative.primary_text,
          call_to_action: {
            type: creative.cta,
            value: { link: creative.destination_url },
          },
        },
      },
      access_token: token,
    });
    creativeId = creativeData.id;
  }

  // ── Step 4: Create Campaign ───────────────────────────────
  const campaignData = await metaPost(`/${actId}/campaigns`, {
    name: campaign.campaign_name,
    objective: META_OBJECTIVE[objective] || 'OUTCOME_LEADS',
    status: 'PAUSED',     // Always start paused — client activates when ready
    special_ad_categories: [],
    access_token: token,
  });
  const campaignId = campaignData.id;

  // ── Step 5: Create Ad Set ─────────────────────────────────
  const countries = (targeting.countries as string[]) || ['IT'];
  const adsetPayload: Record<string, unknown> = {
    name: `${campaign.campaign_name} — Ad Set`,
    campaign_id: campaignId,
    daily_budget: campaign.daily_budget_cents,
    billing_event: META_BILLING[objective] || 'IMPRESSIONS',
    optimization_goal: META_OPT_GOAL[objective] || 'LEAD_GENERATION',
    start_time: campaign.start_time,
    targeting: {
      geo_locations: { countries },
      age_min: targeting.age_min || 25,
      age_max: targeting.age_max || 55,
      ...(targeting.gender === 'male'   ? { genders: [1] } : {}),
      ...(targeting.gender === 'female' ? { genders: [2] } : {}),
    },
    status: 'PAUSED',
    access_token: token,
  };
  if (campaign.end_time) adsetPayload.end_time = campaign.end_time;
  const adsetData = await metaPost(`/${actId}/adsets`, adsetPayload);
  const adsetId = adsetData.id;

  // ── Step 6: Create Ad ────────────────────────────────────
  let adId: string | null = null;
  if (creativeId) {
    const adData = await metaPost(`/${actId}/ads`, {
      name: `${campaign.campaign_name} — Ad`,
      adset_id: adsetId,
      creative: { creative_id: creativeId },
      status: 'PAUSED',
      access_token: token,
    });
    adId = adData.id;
  }

  const adsManagerUrl = `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${adAccountId}&campaign_ids=${campaignId}`;

  return {
    success: true,
    platform: 'meta',
    campaign_id: campaignId,
    adset_id: adsetId,
    ad_id: adId,
    creative_id: creativeId,
    image_hash: imageHash,
    ads_manager_url: adsManagerUrl,
    status: 'PAUSED',
    message: adId
      ? `Campaign, ad set, and ad created successfully (paused). Activate in Meta Ads Manager when ready.`
      : `Campaign and ad set created. Creative could not be attached — add it manually in Meta Ads Manager.`,
  };
}

// ── Edge Function ─────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const body = await req.json();
    const { campaign, draft_id } = body as { campaign: Record<string, unknown>; draft_id?: string };

    if (!campaign) throw new Error('No campaign data provided');

    const platform = campaign.platform as string;
    const adAccountId = campaign.ad_account_id as string;

    // ── Verify user owns the ad account & fetch token ────────
    const { data: adAccount, error: accErr } = await supabaseAdmin
      .from('ad_accounts')
      .select('access_token, account_id, account_name')
      .eq('user_id', user.id)
      .eq('account_id', adAccountId)
      .eq('platform', platform)
      .single();

    if (accErr || !adAccount) throw new Error('Ad account not found or unauthorized');
    if (!adAccount.access_token) throw new Error('No access token. Reconnect your Meta account.');

    // Log pending
    await logAttempt(supabaseAdmin, user.id, draft_id, platform, campaign, 'pending');

    // Update draft status
    if (draft_id) {
      await supabaseAdmin
        .from('campaign_drafts')
        .update({ status: 'publishing', updated_at: new Date().toISOString() })
        .eq('id', draft_id);
    }

    let result: Record<string, unknown>;

    if (platform === 'meta') {
      result = await publishToMeta(campaign, adAccount.access_token);
    } else if (platform === 'google') {
      throw new Error('Google Ads publisher not available yet. Apply for a Google Ads Developer Token at https://developers.google.com/google-ads/api/docs/access-levels and contact support when approved.');
    } else if (platform === 'tiktok') {
      throw new Error('TikTok publisher coming soon. Contact support to join the waitlist.');
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    // Update draft to published
    if (draft_id) {
      await supabaseAdmin
        .from('campaign_drafts')
        .update({
          status: 'published',
          publish_result: result,
          updated_at: new Date().toISOString(),
        })
        .eq('id', draft_id);
    }

    // Log success
    await logAttempt(supabaseAdmin, user.id, draft_id, platform, campaign, 'success', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);

    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
