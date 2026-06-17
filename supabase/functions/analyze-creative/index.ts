import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── 9-year benchmark copy data by conversion type ───────────────
const COPY_BENCHMARKS: Record<string, string> = {
  leads: `
COPY BENCHMARKS — Beauty Lead Generation (9-year dataset, 500+ accounts):
- Problem-first hooks: 67% better CTR than generic headlines
- Number specificity increases CTR 23%: "Free consultation in 48h" > "Book now"
- Local social proof outperforms global: "Milan women" > "thousands of women"
- Before/after visual + problem-first copy = highest lead volume combination
- CTA hierarchy: "Book free consultation" > "Learn more" > "Contact us"
- Urgency without scarcity works for clinics: "Spots are limited this week"
- Character limits: Primary 125 chars, Body 300 chars, CTA 25 chars
- Winning CTA formulas: "Book your free [service] →", "Reserve my spot →", "Get my free consultation →"
- Tone: Confident + empathetic. Avoid medical claims. Focus on transformation.
  `,
  ecommerce: `
COPY BENCHMARKS — Beauty eCommerce (9-year dataset, 500+ accounts):
- Benefit-led hooks outperform feature-led by 31% in beauty category
- AOV mention in copy increases average order: "Free shipping over €60" (+18% AOV)
- Risk reversal in body text reduces abandonment: "30-day return guarantee"
- Social proof with numbers: "4.8 stars from 2,300+ customers" crushes "customers love us"
- Sensory language for skincare: "silky", "glowing", "transformed"
- Urgency works: "Only 12 left" for limited products, "Ships in 24h" for all
- CTA hierarchy: "Shop now" > "Try it" > "Buy now" > "Get yours"
- Ingredient-led copy for premium (€100+): "8 active ingredients, clinically tested"
- Results-forward for mass market: "Glowing skin in 14 days"
  `,
  bookings: `
COPY BENCHMARKS — Beauty Service Bookings (9-year dataset):
- Outcome + timeline copy: "See results in one session" — 44% better conversion
- Seasonal/contextual hooks: "Summer body ready?" outperforms in May-July
- Free consultation offer: reduces CPL by 35% vs direct booking ask
- Scarcity for salons: "3 spots left this week" — 28% higher CTR
- Before/after CTA: "See your transformation" > "Book now"
- Pair: Social proof number + local reference + free offer = maximum CPL efficiency
  `,
};

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

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { image_base64, media_type, conversion_type, brand, is_video_thumbnail } = await req.json();

    if (!image_base64) throw new Error('No image data provided');
    if (!media_type) throw new Error('No media type provided');

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

    const benchmarkData = COPY_BENCHMARKS[conversion_type] || COPY_BENCHMARKS.leads;

    const brandContext = brand ? `
Brand: ${brand.name}
Category: ${brand.category || brand.business_type}
Markets: ${(brand.markets || []).join(', ')}
${brand.aov_min ? `AOV: €${brand.aov_min}–€${brand.aov_max}` : ''}
${brand.services ? `Services: ${brand.services.join(', ')}` : ''}
`.trim() : 'Beauty brand (no brand profile set)';

    const conversionLabel = conversion_type === 'ecommerce' ? 'eCommerce Purchase'
      : conversion_type === 'leads' ? 'Lead Generation (book consultation)'
      : conversion_type === 'bookings' ? 'Direct Booking'
      : 'Lead Generation';

    const prompt = `You are a direct response copywriter with 9 years of Beauty & Cosmetics advertising data.

${is_video_thumbnail ? 'You are looking at a thumbnail frame from a video ad.' : 'You are analyzing an image for use as a Meta ad creative.'}

CONVERSION GOAL: ${conversionLabel}

BRAND CONTEXT:
${brandContext}

BENCHMARK DATA:
${benchmarkData}

TASK:
1. First, analyze what you see in the ${is_video_thumbnail ? 'video thumbnail' : 'image'} (product shown, visual tone, setting, people/talent, colors, key visual elements)
2. Generate exactly 3 ad copy variants based on what you see + the conversion goal + benchmark data
3. Use these hook types: problem-first, result-first, social-proof

RULES:
- Primary text: max 125 characters (Meta limit)
- Body text: max 300 characters
- CTA: max 25 characters, action-oriented
- Be specific to what you see in the creative
- Match the brand's tone and market
- Return ONLY valid JSON, no markdown, no explanations

JSON FORMAT:
{
  "creative_analysis": "2-3 sentence description of what you see",
  "creative_type": "clinic_treatment|skincare_product|salon_service|spa_treatment|before_after|lifestyle|product_closeup",
  "variants": [
    {
      "hook_type": "problem",
      "hook_label": "Problem-first hook",
      "primary": "...",
      "body": "...",
      "cta": "..."
    },
    {
      "hook_type": "result",
      "hook_label": "Result-first hook",
      "primary": "...",
      "body": "...",
      "cta": "..."
    },
    {
      "hook_type": "social_proof",
      "hook_label": "Social proof hook",
      "primary": "...",
      "body": "...",
      "cta": "..."
    }
  ],
  "benchmark_recommendation": "problem|result|social_proof",
  "benchmark_reason": "One sentence why this hook type wins for this creative+conversion type combo"
}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: media_type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: image_base64,
            },
          },
          { type: 'text', text: prompt },
        ],
      }],
    });

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Claude did not return valid JSON');

    const result = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
