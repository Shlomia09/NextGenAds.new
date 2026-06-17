// ── Universal Campaign Object ─────────────────────────────────

export type Platform = 'meta' | 'google' | 'tiktok';
export type Objective = 'leads' | 'sales' | 'traffic' | 'awareness';
export type Currency = 'EUR' | 'USD' | 'GBP';
export type Gender = 'all' | 'male' | 'female';
export type CTAType = 'LEARN_MORE' | 'SIGN_UP' | 'SHOP_NOW' | 'BOOK_NOW' | 'CONTACT_US' | 'GET_QUOTE';

export interface UniversalTargeting {
  countries: string[];     // ['IT', 'ES', 'DE']
  age_min: number;
  age_max: number;
  gender: Gender;
  interests?: string[];
}

export interface UniversalCreative {
  type: 'image' | 'video';
  /** Base64 encoded image data (no prefix) — used for direct upload to platform */
  image_base64?: string;
  media_type?: string;     // 'image/jpeg' | 'image/png' | 'image/webp'
  /** Public URL (if already uploaded to a CDN / Supabase Storage) */
  url?: string;
  primary_text: string;    // up to 125 chars (Meta) or multiple headlines (Google)
  headline: string;
  body?: string;
  cta: CTAType;
  destination_url: string;
}

export interface UniversalCampaign {
  // Identity
  draft_id?: string;
  brand_id: string;
  platform: Platform;
  ad_account_id: string;

  // Goal
  objective: Objective;
  conversion_type: 'leads' | 'ecommerce' | 'bookings';

  // Budget
  daily_budget_cents: number;
  currency: Currency;

  // Schedule
  start_time: string;   // ISO string
  end_time?: string;

  // Audience
  targeting: UniversalTargeting;

  // Creative + Copy
  creative: UniversalCreative;

  // Meta name
  campaign_name: string;
}

// ── Meta Objective Mapper ─────────────────────────────────────

export const META_OBJECTIVE_MAP: Record<Objective, string> = {
  leads:    'OUTCOME_LEADS',
  sales:    'OUTCOME_SALES',
  traffic:  'OUTCOME_TRAFFIC',
  awareness:'OUTCOME_AWARENESS',
};

export const META_OPTIMIZATION_GOAL: Record<Objective, string> = {
  leads:    'LEAD_GENERATION',
  sales:    'OFFSITE_CONVERSIONS',
  traffic:  'LINK_CLICKS',
  awareness:'REACH',
};

export const META_BILLING_EVENT: Record<Objective, string> = {
  leads:    'IMPRESSIONS',
  sales:    'IMPRESSIONS',
  traffic:  'LINK_CLICKS',
  awareness:'IMPRESSIONS',
};

// ── Google Objective Mapper (for future use) ─────────────────

export const GOOGLE_CHANNEL_MAP: Record<Objective, string> = {
  leads:    'SEARCH',
  sales:    'PERFORMANCE_MAX',
  traffic:  'DISPLAY',
  awareness:'VIDEO',
};

// ── Draft helpers (for Supabase) ─────────────────────────────

export interface CampaignDraft {
  id?: string;
  user_id?: string;
  brand_id?: string;
  status?: 'draft' | 'publishing' | 'published' | 'failed';
  platform?: Platform;
  ad_account_id?: string;
  copy_primary?: string;
  copy_body?: string;
  copy_cta?: string;
  copy_hook_type?: string;
  conversion_type?: string;
  creative_filename?: string;
  creative_media_type?: string;
  creative_thumbnail?: string;
  campaign_name?: string;
  daily_budget_cents?: number;
  currency?: Currency;
  start_time?: string;
  end_time?: string;
  destination_url?: string;
  target_countries?: string[];
  age_min?: number;
  age_max?: number;
  gender?: Gender;
  publish_result?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export const COUNTRY_OPTIONS = [
  { code: 'IT', name: 'Italy 🇮🇹' },
  { code: 'ES', name: 'Spain 🇪🇸' },
  { code: 'DE', name: 'Germany 🇩🇪' },
  { code: 'FR', name: 'France 🇫🇷' },
  { code: 'GB', name: 'UK 🇬🇧' },
  { code: 'NL', name: 'Netherlands 🇳🇱' },
  { code: 'BE', name: 'Belgium 🇧🇪' },
  { code: 'AT', name: 'Austria 🇦🇹' },
  { code: 'CH', name: 'Switzerland 🇨🇭' },
  { code: 'PT', name: 'Portugal 🇵🇹' },
  { code: 'US', name: 'USA 🇺🇸' },
  { code: 'AU', name: 'Australia 🇦🇺' },
];

export const CTA_OPTIONS: { value: CTAType; label: string }[] = [
  { value: 'SIGN_UP',     label: 'Sign Up' },
  { value: 'LEARN_MORE',  label: 'Learn More' },
  { value: 'BOOK_NOW',    label: 'Book Now' },
  { value: 'SHOP_NOW',    label: 'Shop Now' },
  { value: 'CONTACT_US',  label: 'Contact Us' },
  { value: 'GET_QUOTE',   label: 'Get Quote' },
];
