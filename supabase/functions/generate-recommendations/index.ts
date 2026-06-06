import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Fetch brand + campaigns
    const { data: brand } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brand_id)
      .single();

    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('*')
      .eq('brand_id', brand_id)
      .order('spend', { ascending: false });

    if (!brand) throw new Error('Brand not found');

    const avgAov = (brand.aov_min + brand.aov_max) / 2;
    const totalSpend = campaigns?.reduce((s: number, c: { spend: number }) => s + c.spend, 0) || 0;
    const totalRevenue = campaigns?.reduce((s: number, c: { revenue: number }) => s + c.revenue, 0) || 0;
    const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

    // Benchmark ROAS by AOV
    const benchmarkRoas = avgAov < 80 ? 3.8 : avgAov < 150 ? 3.2 : avgAov < 300 ? 2.8 : 2.2;

    // Build analysis prompt
    const analysisPrompt = `Analyze this brand and generate 3-5 specific, actionable recommendations in JSON format.

Brand: ${brand.name}
Category: ${brand.category}
AOV: €${brand.aov_min}–€${brand.aov_max} (average: €${avgAov})
Stage: ${brand.stage}
Markets: ${brand.markets.join(', ')}

Campaign Performance:
- Active campaigns: ${campaigns?.filter((c: { status: string }) => c.status === 'ACTIVE').length || 0}
- Total spend: €${totalSpend.toFixed(2)}
- Total revenue: €${totalRevenue.toFixed(2)}
- Average ROAS: ${avgRoas.toFixed(2)}x
- Benchmark ROAS for this AOV bracket: ${benchmarkRoas}x

Campaigns:
${campaigns?.slice(0, 5).map((c: { name: string; status: string; objective: string; spend: number; roas: number }) =>
  `- ${c.name}: ${c.status} | ${c.objective} | Spend: €${c.spend} | ROAS: ${c.roas}x`
).join('\n') || 'No campaigns synced'}

Generate recommendations as a JSON array:
[
  {
    "type": "funnel_structure|audience|budget|creative|scaling",
    "priority": "critical|high|medium",
    "title": "Short action title",
    "description": "Problem description (2-3 sentences)",
    "action": "Specific action to take",
    "reasoning": "Why this matters for their specific situation",
    "benchmark_reference": "The specific benchmark data that supports this recommendation"
  }
]

Focus on the most impactful issues first. Be specific to their AOV bracket and benchmark data.`;

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: analysisPrompt }],
    });

    const rawContent = response.content[0].type === 'text' ? response.content[0].text : '[]';

    // Parse JSON from response
    const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array in response');

    const recommendations = JSON.parse(jsonMatch[0]);

    // Store recommendations (remove old pending ones first)
    await supabase
      .from('recommendations')
      .update({ status: 'dismissed' })
      .eq('brand_id', brand_id)
      .eq('status', 'pending');

    for (const rec of recommendations) {
      await supabase.from('recommendations').insert({
        brand_id,
        type: rec.type,
        priority: rec.priority,
        title: rec.title,
        description: rec.description,
        action: rec.action,
        reasoning: rec.reasoning,
        benchmark_reference: rec.benchmark_reference,
        status: 'pending',
      });
    }

    return new Response(
      JSON.stringify({ success: true, count: recommendations.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
