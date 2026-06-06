import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
1. Their AOV → recommend the correct funnel
2. Their account age/history → warm-up protocol if needed
3. Their current campaigns → identify what's wrong vs benchmark
4. Their markets → apply market-specific insights
5. Their ROAS trend → scaling or pause recommendations

Always explain WHY based on benchmark data.
Never recommend autonomous actions without user approval.
Be direct, specific, and data-driven.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { brand_id, messages } = await req.json();

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

    // Fetch brand context
    const { data: brand } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brand_id)
      .single();

    // Fetch campaigns context
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('name, status, objective, spend, roas, impressions, purchases')
      .eq('brand_id', brand_id)
      .order('spend', { ascending: false })
      .limit(10);

    // Build context-enriched system prompt
    const contextualSystemPrompt = `${INTELLIGENCE_SYSTEM_PROMPT}

## Current Brand Context

Brand: ${brand?.name || 'Unknown'}
Category: ${brand?.category || 'Unknown'}
AOV: ${brand?.currency || 'EUR'}${brand?.aov_min}–${brand?.currency || 'EUR'}${brand?.aov_max}
Markets: ${brand?.markets?.join(', ') || 'Not specified'}
Stage: ${brand?.stage || 'Unknown'}

## Current Campaign Performance

${campaigns && campaigns.length > 0
  ? campaigns.map((c: Record<string, unknown>) =>
    `- ${c.name}: ${c.status} | Spend: €${c.spend} | ROAS: ${c.roas}x | Objective: ${c.objective}`
  ).join('\n')
  : 'No campaigns synced yet. Ask user to sync their Meta account.'}

Analyze the above data in context of the benchmark knowledge when answering.`;

    // Call Claude
    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: contextualSystemPrompt,
      messages: messages,
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';

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
