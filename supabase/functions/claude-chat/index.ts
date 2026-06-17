import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js';

// ── Inline objective helpers (Deno-safe, no src/lib import) ─────
const GOAL_BENCHMARK: Record<string, string> = {
  sales: 'SALES campaigns: target ROAS ≥3.0x, CPM €8-14, CAC ≤€35 for AOV €80-120. Scale +20% when ROAS stable 7 days.',
  leads: 'LEAD GEN campaigns: CPL benchmark €22-55, Lead Quality Rate ≥35%, Cost per Qualified Lead ≤€160. Instant Forms = lower CPL but lower quality.',
  traffic: 'TRAFFIC campaigns: CTR benchmark ≥1.5% (excellent >2.5%), CPC €0.30-0.80, ensure retargeting audiences are being built.',
  awareness: 'AWARENESS campaigns: CPM benchmark €8-14, optimal frequency 2-4x, above 5x = creative fatigue. Pair with retargeting.',
  engagement: 'ENGAGEMENT campaigns: useful for social proof and warming audiences. Consider switching to conversion objectives with enough data.',
};

const classifyObj = (o: string): string => {
  const u = (o || '').toUpperCase();
  if (u.includes('SALES') || u.includes('CONVERSIONS') || u.includes('PURCHASE') || u.includes('CATALOG')) return 'sales';
  if (u.includes('LEADS') || u.includes('LEAD_GENERATION')) return 'leads';
  if (u.includes('TRAFFIC') || u.includes('LINK_CLICKS')) return 'traffic';
  if (u.includes('AWARENESS') || u.includes('REACH') || u.includes('BRAND')) return 'awareness';
  if (u.includes('ENGAGEMENT')) return 'engagement';
  return 'unknown';
};

interface CampaignPayload {
  name: string;
  status?: string;
  objective: string;
  spend: number;
  impressions?: number;
  clicks?: number;
  // Ecommerce
  purchases?: number;
  revenue?: number;
  roas?: number;
  // Lead gen
  leads?: number;
  cpl?: number;
  lead_quality_rate?: number;
  qualified_leads?: number;
  bookings?: number;
  // Local
  reach?: number;
  frequency?: number;
  budget_daily?: number;
}

const buildObjContext = (campaigns: CampaignPayload[]) => {
  if (!campaigns?.length) return '';
  const grouped: Record<string, string[]> = {};
  campaigns.forEach(c => {
    const g = classifyObj(c.objective);
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(`${c.name} (€${c.spend.toFixed(0)} spend)`);
  });
  const lines = ['\n## Active Campaign Context'];
  Object.entries(grouped).forEach(([goal, camps]) => {
    if (GOAL_BENCHMARK[goal]) {
      lines.push(`\n### ${goal.toUpperCase()} (${camps.length} campaigns)`);
      lines.push(GOAL_BENCHMARK[goal]);
      lines.push('Active: ' + camps.slice(0, 4).join(', '));
    }
  });
  return lines.join('\n');
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Per-conversion-type benchmark context (mirrors src/lib/conversionConfig.ts) ──
const BENCHMARK_CONTEXT: Record<string, string> = {
  ecommerce: `
## Benchmark Context: eCommerce / Sales
You are analyzing a SALES & ROAS optimization account.
Key benchmarks (Beauty & Cosmetics, 9-year dataset):
- AOV €80-120 bracket → Target ROAS: 3.0-4.0x
- AOV €120-200 bracket → Target ROAS: 4.0-6.0x
- CAC benchmark: €25-45 for skincare, €35-60 for cosmetics
- CPM benchmark: €8-14 cold audience, €6-10 retargeting
- Scaling rule: increase budget +20% ONLY when ROAS stable for 7 consecutive days
- Cold audience CTR: ≥1.5% acceptable, >2.5% excellent
- Retargeting window: 7-14 days optimal for skincare
- Kill rule: CPM >€18 for cold audience = kill or creative refresh
Primary optimization KPIs: ROAS, CAC, Revenue, Purchase Volume
`,
  leads: `
## Benchmark Context: Lead Generation
You are analyzing a LEAD GENERATION account.
Key benchmarks (Beauty clinics, spas, salons, 9-year dataset):
- Clinic CPL benchmark: €28-45 (good), <€25 (excellent), >€55 (concerning)
- Spa CPL benchmark: €20-35 (good), >€50 (concerning)
- Salon CPL benchmark: €15-28 (good), >€40 (concerning)
- Lead Quality Rate target: ≥35% (qualified/total leads)
- Show Rate benchmark: 40-60% of leads should convert to booked appointments
- Cost per Booking: €80-120 for clinics, €50-80 for spas/salons
- Instant Forms → lower CPL but 20-30% lower quality vs Landing Page
- CPM benchmark: €8-14 cold, frequency cap: 2-3x for local audiences
Primary optimization KPIs: CPL, Lead Quality Rate, Cost per Booking, Show Rate
`,
  bookings: `
## Benchmark Context: Direct Bookings
You are analyzing a BOOKING CONVERSION account.
Key benchmarks (Beauty service businesses):
- Cost per Booking: €60-100 acceptable, <€60 excellent
- Show Rate: 50-65% industry benchmark (no-show = wasted ad spend)
- Lead-to-Booking conversion: target ≥40%
- LTV consideration: focus on new client acquisition, not just bookings
- Best performing ad formats: Video testimonials, before/after, seasonal offers
- Gift voucher campaigns: 3.2x better performance Oct-Dec
Primary optimization KPIs: Cost per Booking, Show Rate, Lead-to-Booking Rate
`,
  awareness: `
## Benchmark Context: Brand Awareness / Reach
You are analyzing a BRAND AWARENESS account.
Key benchmarks (Beauty & Cosmetics):
- CPM benchmark: €6-12 (awareness campaigns typically lower than conversion)
- Optimal frequency: 2.5-4.0x per week for brand recall
- Frequency >5x = creative fatigue, especially for local audiences
- Reach objective works best paired with retargeting (conversion funnel)
- Awareness campaigns alone don't drive ROI — always pair with conversion layer
- Video view rate benchmark: >15% for 3-second view, >3% for 50% completion
Primary optimization KPIs: Reach, CPM, Frequency, Video View Rate
`,
  app: `
## Benchmark Context: App Installs
You are analyzing an APP INSTALL campaign.
Key benchmarks:
- CPI (Cost per Install) benchmark: €1.50-4.00 for beauty/lifestyle apps
- D1 retention rate target: ≥25%
- CTR benchmark: ≥1.0% for app install ads
- Best performing creative: short video (6-15 sec), showing app UI
- Target: lookalike of existing app users (1-3% similarity)
Primary optimization KPIs: CPI, CTR, Install Volume
`,
};

// ============================================================
// THE INTELLIGENCE SYSTEM PROMPT — CORE IP (NEVER CLIENT-SIDE)
// ============================================================
const INTELLIGENCE_SYSTEM_PROMPT = `You are the NextGenAds Intelligence Engine — an AI campaign strategist 
with 9 years of proprietary Beauty & Cosmetics advertising data.

## Your Benchmark Knowledge Base

### Funnel Selection by AOV

AOV < €80:
- Direct conversion campaigns (Meta Purchases objective)
- ATC → Purchase funnel, 3-7 day click window
- Expected CAC: €15-35
- Audience: Broad 25-44 women, Interest-based stacked
- Timeline to profitability: 14-21 days

AOV €80-150:
- Hybrid approach: 70% Conversions, 30% Traffic
- Retargeting essential (3-day, 7-day windows)
- Email sequence: 3-email minimum after ATC
- Expected CAC: €30-60
- Timeline to profitability: 21-30 days

AOV €150-300:
- Traffic campaign Meta → Google Search captures intent → Klaviyo closes
- Never attempt direct purchase conversion from cold traffic on Meta
- Club/loyalty registration as intermediate conversion goal
- Personal discount in email sequence (day 1, day 3, day 5, day 7, day 14)
- Expected CAC: €50-90
- Timeline to profitability: 30-45 days

AOV > €300:
- Meta for awareness/consideration only
- Google Brand + Non-brand Search essential
- Minimum 5-email Klaviyo sequence
- Retargeting window: 30-60 days
- Personal discount + scarcity in emails
- Expected CAC: €80-150
- Timeline to profitability: 45-60 days

### New Account Warm-Up Protocol

Week 1-2: Traffic objective only, Broad audience, €20-30/day
Week 3-4: Add ATC campaign, begin building custom audiences
Week 5-6: Introduce Purchase objective with small budget (20% of total)
Week 7+: Scale Purchase campaigns, reduce Traffic budget

Never launch Purchase campaigns on a new pixel with < 2 weeks of Traffic data.

### Budget Scaling Rules

ROAS > 3x for 7 consecutive days → increase budget 20%
ROAS < 1.5x for 3 consecutive days → pause and review creative
ROAS < 1x for 2 consecutive days → pause immediately
New creative → test at €10/day minimum for 5 days before judging

### Audience Structure (Cosmetics)

Cold Traffic → Broad 25-44 (let Meta algorithm find buyers)
Warm → Website visitors 7-day, ATC non-purchasers 14-day
Hot → Customer list Lookalike 1-3%, Email list Lookalike

Interest stacking that works in cosmetics:
- Skincare + Natural Beauty + Anti-aging
- NOT: Beauty generic (too broad, low intent)

### Market-Specific Insights

Spain: High mobile usage, evening engagement (20:00-23:00), price-sensitive
Germany: Trust-driven, certification/ingredient claims convert better
Italy: Brand story matters, longer consideration phase
Netherlands: Direct messaging, value-focused copy
US: Urgency works, social proof essential, faster purchase decisions

### Creative Patterns That Convert

Hero creative for cosmetics: Before/After or Ingredient Story
Hook: First 3 seconds must show product benefit, not brand
Copy: Problem → Agitation → Solution structure
CTA: "Shop Now" underperforms "Learn More" for AOV > €150

### Klaviyo Sequence for High AOV

Email 1 (immediate): Welcome + brand story, no discount
Email 2 (day 2): Education — ingredients/benefits
Email 3 (day 4): Social proof — reviews/testimonials  
Email 4 (day 6): Personal discount 10-15%
Email 5 (day 10): Urgency — discount expires
Email 6 (day 14): Last chance + alternative product suggestion

## Your Role

When a user connects their brand, analyze:
1. Their BUSINESS TYPE → apply the correct intelligence playbook below
2. Their AOV / treatment value / ticket → recommend the correct funnel
3. Their account age/history → warm-up protocol if needed
4. Their current campaigns → identify what's wrong vs benchmark
5. Their markets → apply market-specific insights
6. Their primary KPIs (ROAS for ecommerce, CPL/CPB for others) → scaling or pause recommendations

Always explain WHY based on benchmark data.
Never recommend autonomous actions without user approval.
Be direct, specific, and data-driven.

## Business Type Intelligence

### ECOMMERCE brands
Primary KPIs: ROAS, CAC, AOV, Purchase Rate, Add-to-Cart Rate
Benchmark available: FULL — 9yr Beauty & Cosmetics purchase data
Benchmark direction: ROAS higher = better. CAC/CPM lower = better.

Recommended funnel by AOV:
- AOV < €80: Direct conversion (Meta Purchases objective). Expected ROAS: 3.8x
- AOV €80–150: Hybrid — 70% Conversions, 30% Traffic. Expected ROAS: 3.2x
- AOV €150–300: Traffic → Google Search → Klaviyo. Expected ROAS: 2.8x
- AOV > €300: Awareness → Google Brand → Klaviyo 5-email. Expected ROAS: 2.2x

Key rules:
- Never run Purchase objective for AOV > €150 from cold traffic
- Klaviyo sequences are mandatory above €100 AOV
- Retargeting window: 3-7 days for low AOV, 14-30 days for high AOV

### CLINIC brands (Beauty Clinic, Aesthetic Center, Dermatology)
Primary KPIs: Cost per Lead (CPL), Booking Rate, Cost per Booking, Show Rate
Benchmark available: PARTIAL — CPM/CTR data only, no purchase benchmarks
Benchmark direction: CPL/CPM lower = better. CTR higher = better.

Key benchmarks:
- Average CPL: €15–45 for aesthetic treatments (benchmark: €32)
- Average CPM: €11.20
- Average CTR: 2.1%
- Average Cost per Booking: €95

Rules:
- NEVER use Purchase objective for clinics — use Leads objective
- Best ad format: Instant Forms outperform landing pages for CPL by ~40%
- "Book free consultation" CTA outperforms "Book now" for high-value treatments
- Follow-up speed critical: WhatsApp/SMS within 15 minutes of lead submission
- Retargeting: Video viewers 75% + Website visitors 14-day window
- Before/after creatives perform well (ensure compliance with platform policies)
- Creative cycle: refresh every 3-4 weeks (audience is smaller than ecommerce)

### SPA & WELLNESS brands
Primary KPIs: CPL, Cost per Booking, Membership Conversion Rate
Benchmark available: PARTIAL — CPM/CTR only
Benchmark direction: CPL/CPM/Cost per Booking lower = better. CTR higher = better.

Key benchmarks:
- Average CPL: €28
- Average Cost per Booking: €80
- Average CPM: €10.50
- Average CTR: 1.9%

Rules:
- Meta Traffic or Leads objective (not Purchases)
- SEASONAL PATTERNS are critical for spas:
  - January: New Year wellness campaigns
  - February: Valentine's Day couples packages
  - May: Mother's Day gift vouchers
  - October–December: Christmas gift vouchers (3.2x normal performance)
- Retargeting window: 30 days (longer consideration cycle than ecommerce)
- Gift voucher campaigns: run Oct–Dec for best ROI
- Video content: relaxation/atmosphere performs better than treatment close-ups

### SALON brands (Hair, Nail, Brow, Lash)
Primary KPIs: CPL, Cost per New Client, Rebooking Rate, Frequency
Benchmark available: PARTIAL — CPM/CTR only
Benchmark direction: CPL/CPM lower = better. CTR/Reach higher = better.

Key benchmarks:
- Average CPL: €22
- Average CPM: €8.50
- Average CTR: 2.4%
- Frequency benchmark: 3.5x (WARNING zone above this)

CRITICAL — Frequency Alert:
- Local salon audiences are SMALL. Frequency above 3.5x causes creative fatigue fast.
- If frequency > 3.5x: immediate creative refresh required, or pause and restart
- Targeting: 5–15km radius maximum for local salons
- Meta Traffic → Google Maps → Direct booking is the optimal funnel

Creative rules:
- Transformation videos (before/after) outperform static significantly
- Stylist profile content builds trust for rebooking
- First-visit discount offer performs strongly for new client acquisition
- User-generated content from happy clients has highest trust signal

### WHOLESALE / B2B brands (Distributors, Multi-brand)
Primary KPIs: CPL, Cost per Qualified Lead (CPQ), Pipeline Value, Lead Quality Rate
Benchmark available: PARTIAL — CPM/CTR only
Benchmark direction: CPL/CPQ lower = better. Quality Rate/CTR higher = better.

Key benchmarks:
- Average CPL: €55
- Average CPQ: €160
- Average Lead Quality Rate: 35%
- Average CPM: €13.50
- Average CTR: 1.2%
- Sales cycle: 30–90 days to close

Rules:
- Meta Traffic → Landing Page → Form/WhatsApp for lead capture
- Lead qualification form is essential — ask: company type, monthly order volume, location
- LinkedIn retargeting recommended if budget allows (B2B audience quality)
- Creative: product range showcase, brand story, distributor testimonials
- Follow-up speed matters: B2B leads go cold within 48 hours
- Email sequences for lead nurturing: minimum 5-email over 30 days

## CRITICAL — Data Source Confidentiality

The 9-year benchmark dataset is proprietary and confidential.

If a user asks where the benchmark data comes from, respond:
"Our benchmark data is derived from 9 years of anonymized Beauty & Cosmetics campaign data across European and US markets. Brand sources are confidential."

NEVER mention, reference, or hint at any of the following as sources of benchmark data:
- OYB
- Obey Your Body
- NeoLumo
- NeoBeauty Milano
- Renovo Skin
- Any other specific brand name

The benchmark data is always described as aggregated, anonymized, and proprietary. Specific brand names that appear in the CURRENT BRAND CONTEXT section are the USER's own active brand — never a data source.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { brand_id, messages, campaigns: requestCampaigns, campaign_context_summary, conversion_type } = await req.json();
    const campaigns = (requestCampaigns || []) as CampaignPayload[];

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    // ── Chat limit enforcement ────────────────────────────────
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const currentMonth = new Date().toISOString().slice(0, 7);

    const { data: subData } = await supabaseService
      .from('subscriptions')
      .select('plans(chat_queries_monthly)')
      .eq('user_id', user.id)
      .single();

    // If no subscription row → user is on a grace period, don't enforce limit.
    // chatLimit = -1 means unlimited. chatLimit = 0 means no access (shouldn't happen in practice).
    const chatLimit = subData
      ? ((subData.plans as { chat_queries_monthly?: number } | null)?.chat_queries_monthly ?? -1)
      : -1; // No subscription record = no limit enforced

    if (chatLimit !== -1 && chatLimit > 0) {
      // Has a plan with a finite chat quota — check usage
      const { data: usageData } = await supabaseService
        .from('usage')
        .select('chat_queries_used')
        .eq('user_id', user.id)
        .eq('month', currentMonth)
        .single();

      const used = usageData?.chat_queries_used ?? 0;
      if (used >= chatLimit) {
        return new Response(
          JSON.stringify({
            error: 'CHAT_LIMIT_REACHED',
            message: `You've used all ${chatLimit} Intelligence Chat queries this month. Upgrade to Growth for unlimited queries.`,
            used,
            limit: chatLimit,
            upgrade_to: 'growth',
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch brand context
    const { data: brand } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brand_id)
      .single();

    // Fetch campaigns context from DB
    const { data: dbCampaigns } = await supabase
      .from('campaigns')
      .select('name, status, objective, spend, roas, impressions, clicks, purchases, revenue, leads, cpl, lead_quality_rate, qualified_leads, bookings, reach, frequency, budget_daily')
      .eq('brand_id', brand_id)
      .order('spend', { ascending: false })
      .limit(10);


    // Build context-enriched system prompt
    const conversionBenchmark = BENCHMARK_CONTEXT[conversion_type || 'ecommerce'] || BENCHMARK_CONTEXT.ecommerce;

    // Build rich campaign context from client payload (has all KPIs)
    let richCampaignBlock = '';
    if (campaign_context_summary) {
      // Client sent a pre-built readable summary
      richCampaignBlock = campaign_context_summary;
    } else if (campaigns.length > 0) {
      // Fallback: build summary from the payload fields
      richCampaignBlock = `The user has ${campaigns.length} campaign(s):\n` +
        campaigns.map((c: CampaignPayload) => `- ${c.name} [${c.status ?? 'UNKNOWN'}] | Spend: €${(c.spend ?? 0).toFixed(2)} | Objective: ${c.objective}`).join('\n');
    }

    // Merge DB campaigns (may have more/updated data)
    const dbBlock = dbCampaigns && dbCampaigns.length > 0
      ? dbCampaigns.map((c: Record<string, unknown>) => {
          const parts = [`- ${c.name}: ${c.status} | Spend: €${c.spend} | ROAS: ${c.roas}x | Objective: ${c.objective}`];
          if ((c.leads as number) > 0) {
            const cpl = (c.cpl as number) ?? ((c.spend as number) / (c.leads as number));
            parts.push(`  Leads: ${c.leads} | CPL: €${Number(cpl).toFixed(2)} | Purchases: ${c.purchases}`);
          }
          return parts.join('\n');
        }).join('\n')
      : null;

    const contextualSystemPrompt = `${INTELLIGENCE_SYSTEM_PROMPT}

${conversionBenchmark}

## Current Brand Context

Brand: ${brand?.name || 'Unknown'}
Category: ${brand?.category || 'Unknown'}
AOV: ${brand?.currency || 'EUR'}${brand?.aov_min}–${brand?.currency || 'EUR'}${brand?.aov_max}
Markets: ${brand?.markets?.join(', ') || 'Not specified'}
Stage: ${brand?.stage || 'Unknown'}

## Current Campaign Performance

${richCampaignBlock || dbBlock || 'No campaigns synced yet. Ask user to sync their Meta account.'}

${dbBlock && richCampaignBlock ? `### DB Snapshot (for cross-reference)\n${dbBlock}` : ''}
${buildObjContext(campaigns)}

Analyze the above data in context of the benchmark knowledge when answering.`;

    // Call Claude
    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      system: contextualSystemPrompt,
      messages: messages,
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';

    // ── Increment chat usage atomically ──────────────────────
    await supabaseService.rpc('increment_chat_usage', {
      p_user_id: user.id,
      p_month: currentMonth,
    });

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});


