import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── 9-year benchmark data by vertical ─────────────────────────────────────────
const VERTICAL_BENCHMARKS: Record<string, string> = {
  clinic: `
    Industry: Beauty Clinics / Aesthetic Centers (9-year benchmark, 200+ accounts)
    - CPL benchmark: €28–€38 (avg €32)
    - CPM benchmark: €10–€13 (avg €11.2)
    - CTR benchmark: 1.8%–2.4% (avg 2.1%)
    - CPC benchmark: €1.2–€1.9
    - Best performing objective: LEAD_GENERATION with Instant Forms
    - Best creative type: Before/After with real patient testimonials
    - Peak booking days: Monday-Wednesday (avoid weekend launches)
    - Frequency cap: 3.5x per week before creative fatigue
    - Budget scaling rule: 20% max weekly increase to avoid CPL spike
    - Audience: Women 28-55, interest: aesthetics, wellness, anti-aging
    - Warning signs: CPL > €50 = audience saturation or poor creative
    - Scale triggers: CPL < €25 for 7+ days = ready for 30% budget increase
  `,
  spa: `
    Industry: Spa & Wellness (9-year benchmark, 150+ accounts)
    - CPL benchmark: €22–€35 (avg €28)
    - CPM benchmark: €8–€13 (avg €10.5)
    - CTR benchmark: 1.6%–2.2% (avg 1.9%)
    - Best objective: Conversions → Leads or Appointment Booking
    - Peak periods: Dec-Jan (gift vouchers), May (Mother's Day), Oct-Nov (pre-winter)
    - Gift voucher campaigns: 3.2x better ROI in Oct-Dec
    - Frequency cap: 3.0x before fatigue
    - Audience: Women 30-60, couples, gift buyers
    - Scale triggers: CPL < €20 for 5+ days
  `,
  salon: `
    Industry: Hair/Nail/Brow Salons (9-year benchmark, 300+ accounts)
    - CPL benchmark: €18–€27 (avg €22)
    - CPM benchmark: €7–€10 (avg €8.5)
    - CTR benchmark: 2.0%–2.8% (avg 2.4%)
    - CRITICAL: Local audience is SMALL — frequency > 3.5x = severe fatigue
    - Best objective: Local Awareness + Lead Generation combo
    - Radius: 5-8km max for salons
    - Creative refresh cycle: every 14 days (faster than other verticals)
    - New client offers convert 40% better than general ads
    - Warning: If reach < 8,000 and frequency > 4x → pause and expand radius
  `,
  ecommerce: `
    Industry: Beauty eCommerce (9-year benchmark, 500+ accounts)
    - ROAS benchmarks by AOV: <€80 AOV → 3.8x | €80-150 → 3.2x | €150-300 → 2.8x | >€300 → 2.2x
    - CPM benchmark: €12–€16 (avg €14)
    - CTR benchmark: 1.5%–2.2% (avg 1.8%)
    - Add to Cart Rate: 3-5%
    - Purchase CR: 1.5-3%
    - Funnel: TOF (Awareness) → MOF (Retargeting 3-7d) → BOF (Cart abandoners 24h)
    - Scale when ROAS > target for 7 consecutive days
    - Cut when ROAS < 1.5x for 3 days
    - LTV multiplier for beauty: 2.8x (repurchase rate high)
  `,
  wholesale: `
    Industry: B2B Beauty / Wholesale (9-year benchmark, 80+ accounts)
    - CPL benchmark: €45–€65 (avg €55)
    - Lead Quality Rate benchmark: 30-40%
    - CPQ (Cost per Qualified Lead): €130-€190 (avg €160)
    - CPM benchmark: €12–€15 (avg €13.5)
    - Sales cycle: 30-90 days
    - Best objective: Lead Generation with multi-question form
    - Add qualification questions (min order, location, license)
    - LinkedIn retargeting parallel to Meta for B2B
  `,
  default: `
    Beauty industry general benchmarks (9-year data):
    - CPL: €25-€40 | CPM: €10-€14 | CTR: 1.8-2.4%
    - Creative refresh every 3 weeks
    - Frequency cap: 3.5x/week
    - Scale when performance is 20% above benchmark for 7 days
  `,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { brand_id } = await req.json();

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    // ── Fetch brand + ALL campaigns ──────────────────────────────────────
    const { data: brand } = await supabase.from('brands').select('*').eq('id', brand_id).single();
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('*')
      .eq('brand_id', brand_id)
      .order('spend', { ascending: false });

    if (!brand) throw new Error('Brand not found');

    const allCampaigns = campaigns || [];
    const activeCampaigns = allCampaigns.filter((c: { status: string }) => c.status === 'ACTIVE');

    // ── Aggregate metrics ────────────────────────────────────────────────
    const totalSpend    = allCampaigns.reduce((s: number, c: { spend: number }) => s + c.spend, 0);
    const totalLeads    = allCampaigns.reduce((s: number, c: { leads: number }) => s + c.leads, 0);
    const totalRevenue  = allCampaigns.reduce((s: number, c: { revenue: number }) => s + c.revenue, 0);
    const totalPurchases = allCampaigns.reduce((s: number, c: { purchases: number }) => s + c.purchases, 0);
    const totalImpr     = allCampaigns.reduce((s: number, c: { impressions: number }) => s + c.impressions, 0);
    const totalClicks   = allCampaigns.reduce((s: number, c: { clicks: number }) => s + c.clicks, 0);
    const avgRoas       = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const avgCpl        = totalLeads > 0 ? totalSpend / totalLeads : 0;
    const avgCpm        = totalImpr > 0 ? (totalSpend / totalImpr) * 1000 : 0;
    const avgCtr        = totalImpr > 0 ? (totalClicks / totalImpr) * 100 : 0;
    const avgFrequency  = allCampaigns.reduce((s: number, c: { frequency: number }) => s + (c.frequency || 0), 0) / Math.max(allCampaigns.length, 1);

    // ── Get vertical benchmarks ──────────────────────────────────────────
    const vertical = brand.business_type || brand.category?.toLowerCase() || 'default';
    const benchmarkData = VERTICAL_BENCHMARKS[vertical] || VERTICAL_BENCHMARKS.default;

    // ── Build per-campaign analysis ──────────────────────────────────────
    const campaignDetails = allCampaigns.slice(0, 8).map((c: {
      name: string; status: string; objective: string; spend: number;
      leads: number; cpl: number; roas: number; revenue: number;
      impressions: number; clicks: number; frequency: number; reach: number;
      campaign_id_external: string;
    }) => {
      const cpm = c.impressions > 0 ? (c.spend / c.impressions) * 1000 : 0;
      const ctr = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0;
      return `  - "${c.name}" [${c.status}] | Obj: ${c.objective} | Spend: €${c.spend.toFixed(2)} | ${
        c.leads > 0 ? `Leads: ${c.leads} | CPL: €${c.cpl.toFixed(2)}` : ''
      }${c.roas > 0 ? ` | ROAS: ${c.roas.toFixed(2)}x | Revenue: €${c.revenue.toFixed(2)}` : ''} | CPM: €${cpm.toFixed(2)} | CTR: ${ctr.toFixed(2)}% | Freq: ${c.frequency?.toFixed(1) || '—'}`;
    }).join('\n');

    // ── AI Optimization Prompt ───────────────────────────────────────────
    const prompt = `You are an expert Meta Ads strategist with 9 years of beauty industry data. Analyze these campaigns and generate 4-6 specific, actionable optimization recommendations.

BRAND:
- Name: ${brand.name}
- Vertical: ${brand.business_type || brand.category}
- Stage: ${brand.stage}
- Markets: ${(brand.markets || []).join(', ')}

ACCOUNT PERFORMANCE (AGGREGATE):
- Total Spend: €${totalSpend.toFixed(2)}
- Active Campaigns: ${activeCampaigns.length} / ${allCampaigns.length}
${totalLeads > 0 ? `- Total Leads: ${totalLeads} | Avg CPL: €${avgCpl.toFixed(2)}` : ''}
${totalRevenue > 0 ? `- Total Revenue: €${totalRevenue.toFixed(2)} | ROAS: ${avgRoas.toFixed(2)}x | Purchases: ${totalPurchases}` : ''}
- Avg CPM: €${avgCpm.toFixed(2)} | Avg CTR: ${avgCtr.toFixed(2)}% | Avg Frequency: ${avgFrequency.toFixed(1)}x

CAMPAIGN BREAKDOWN:
${campaignDetails || 'No campaign data available yet.'}

INDUSTRY BENCHMARKS (9 Years of Data):
${benchmarkData}

Generate 4-6 recommendations as a JSON array. Each must be SPECIFIC to their actual data above (mention actual numbers). Include the action_type for automated execution:

[
  {
    "type": "funnel_structure|audience|budget|creative|scaling",
    "priority": "critical|high|medium",
    "title": "Short, specific title with numbers",
    "description": "What's wrong and why it matters (mention actual campaign name and metrics)",
    "action": "Exact step-by-step action to take",
    "action_type": "pause_campaign|scale_budget|refresh_creative|audit_audience|optimize_bidding|structural_fix",
    "reasoning": "Benchmark comparison: their metric vs industry benchmark",
    "benchmark_reference": "Specific data point from the 9-year benchmark",
    "impact": "Expected improvement (e.g., CPL -20% in 7 days)",
    "campaign_name": "Name of specific campaign this applies to (or null if account-level)"
  }
]

Prioritize: 1) critical performance issues first 2) scaling opportunities 3) structural fixes.
Be direct and confident. If CPL is excellent, say so and recommend scaling.`;

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawContent = response.content[0].type === 'text' ? response.content[0].text : '[]';
    const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array in response');

    const recommendations = JSON.parse(jsonMatch[0]);

    // ── Store (dismiss old pending, insert new) ──────────────────────────
    await supabase
      .from('recommendations')
      .update({ status: 'dismissed' })
      .eq('brand_id', brand_id)
      .eq('status', 'pending');

    for (const rec of recommendations) {
      await supabase.from('recommendations').insert({
        brand_id,
        type:                rec.type,
        priority:            rec.priority,
        title:               rec.title,
        description:         rec.description,
        action:              rec.action,
        reasoning:           rec.reasoning,
        benchmark_reference: rec.benchmark_reference,
        status:              'pending',
      });
    }

    return new Response(
      JSON.stringify({ success: true, count: recommendations.length, recommendations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

