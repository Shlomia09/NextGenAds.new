import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

// Auth helpers
export const signInWithGoogle = () =>
  supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/dashboard`,
    },
  });

export const signInWithEmail = (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email, password });

export const signUpWithEmail = (email: string, password: string) =>
  supabase.auth.signUp({ email, password });

export const signOut = () => supabase.auth.signOut();

export const getUser = () => supabase.auth.getUser();

// Brand queries
export const getBrands = async (userId: string) => {
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const createBrand = async (brand: {
  user_id: string;
  name: string;
  category: string;
  aov_min: number;
  aov_max: number;
  currency: string;
  markets: string[];
  stage: string;
}) => {
  const { data, error } = await supabase.from('brands').insert(brand).select().single();
  if (error) throw error;
  return data;
};

// Campaign queries
export const getCampaigns = async (brandId: string) => {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('brand_id', brandId)
    .order('spend', { ascending: false });
  if (error) throw error;
  return data;
};

// Recommendation queries
export const getRecommendations = async (brandId: string) => {
  const { data, error } = await supabase
    .from('recommendations')
    .select('*')
    .eq('brand_id', brandId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const updateRecommendationStatus = async (
  id: string,
  status: 'approved' | 'executed' | 'dismissed'
) => {
  const { data, error } = await supabase
    .from('recommendations')
    .update({ status, executed_at: status === 'executed' ? new Date().toISOString() : null })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// Ad accounts — only returns accounts the user actively selected (status=active)
export const getAdAccounts = async (userId: string) => {
  const { data, error } = await supabase
    .from('ad_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active');       // excludes 'pending' (not yet picked by user)
  if (error) throw error;
  return data;
};


// ── Intelligence sessions ────────────────────────────────────────

export const getIntelligenceSessions = async (brandId: string) => {
  const { data, error } = await supabase
    .from('intelligence_sessions')
    .select('id, brand_id, user_id, title, messages, created_at, updated_at')
    .eq('brand_id', brandId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
};

export const createIntelligenceSession = async (session: {
  brand_id: string;
  user_id: string;
  title?: string;
  messages?: unknown[];
}) => {
  const { data, error } = await supabase
    .from('intelligence_sessions')
    .insert({
      brand_id: session.brand_id,
      user_id:  session.user_id,
      title:    session.title ?? 'New Session',
      messages: session.messages ?? [],
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateIntelligenceSession = async (
  id: string,
  messages: unknown[],
) => {
  const { data, error } = await supabase
    .from('intelligence_sessions')
    .update({ messages })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateSessionTitle = async (id: string, title: string) => {
  const { error } = await supabase
    .from('intelligence_sessions')
    .update({ title })
    .eq('id', id);
  if (error) console.warn('Could not update session title:', error.message);
};

/**
 * Returns up to `limit` recent sessions for a brand (excluding current session),
 * each with just the first user message (used as memory context for the AI).
 */
export const getRecentSessionContext = async (
  brandId: string,
  excludeSessionId?: string,
  limit = 4,
): Promise<{ title: string; firstMessage: string; date: string }[]> => {
  let q = supabase
    .from('intelligence_sessions')
    .select('title, messages, created_at')
    .eq('brand_id', brandId)
    .order('updated_at', { ascending: false })
    .limit(limit + 1);

  if (excludeSessionId) q = q.neq('id', excludeSessionId);

  const { data, error } = await q;
  if (error || !data) return [];

  return data
    .filter((s) => Array.isArray(s.messages) && s.messages.length > 0)
    .slice(0, limit)
    .map((s) => {
      const msgs = s.messages as { role: string; content: string }[];
      const firstUser = msgs.find((m) => m.role === 'user');
      return {
        title:        s.title ?? 'Session',
        firstMessage: firstUser?.content?.substring(0, 200) ?? '',
        date:         s.created_at ?? '',
      };
    });
};

// ── Daily stats (for 30-day trend chart) ─────────────────────────────────
// Aggregates spend + leads per day across ALL campaigns for a brand
export const getDailyStats = async (brandId: string, days = 30): Promise<{ date: string; spend: number; leads: number }[]> => {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data, error } = await supabase
    .from('campaign_daily_stats')
    .select('date, spend, leads')
    .eq('brand_id', brandId)
    .gte('date', since.toISOString().split('T')[0])
    .order('date', { ascending: true });
  if (error) {
    console.warn('getDailyStats error:', error.message);
    return [];
  }
  // Aggregate multiple campaigns per day
  const map = new Map<string, { spend: number; leads: number }>();
  (data ?? []).forEach(row => {
    const existing = map.get(row.date) ?? { spend: 0, leads: 0 };
    map.set(row.date, { spend: existing.spend + (row.spend ?? 0), leads: existing.leads + (row.leads ?? 0) });
  });
  return Array.from(map.entries()).map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date));
};

// ── Top creatives (for Top Creative card) ────────────────────────────────
export const getTopCreatives = async (brandId: string, limit = 3) => {
  const { data, error } = await supabase
    .from('ad_creatives')
    .select('id, ad_name, campaign_id, spend, impressions, clicks, leads, ctr, cpl, thumbnail_url, synced_at')
    .eq('brand_id', brandId)
    .gt('spend', 0)
    .order('leads', { ascending: false })
    .limit(limit);
  if (error) {
    console.warn('getTopCreatives error:', error.message);
    return [];
  }
  return data ?? [];
};

// ── System events (for Live Activity feed) ───────────────────────────────
export const getSystemEvents = async (brandId: string, limit = 10) => {
  const { data, error } = await supabase
    .from('system_events')
    .select('id, type, label, metadata, created_at')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.warn('getSystemEvents error:', error.message);
    return [];
  }
  return data ?? [];
};

// ── Campaign Drafts (Workshop) ────────────────────────────────────────────

export interface CampaignDraftRow {
  id: string;
  user_id: string;
  brand_id: string;
  platform: string;
  goal: string | null;
  campaign_name: string | null;
  status: 'draft' | 'published';
  draft_data: Record<string, unknown>;
  published_campaign_id: string | null;
  created_at: string;
  updated_at: string;
}

/** Upsert a draft — pass draftId to update existing, omit to create new */
export const saveDraft = async (payload: {
  draftId?: string;
  userId: string;
  brandId: string;
  platform: string;
  goal: string;
  campaignName: string;
  draftData: Record<string, unknown>;
}): Promise<CampaignDraftRow> => {
  const row = {
    user_id:       payload.userId,
    brand_id:      payload.brandId,
    platform:      payload.platform,
    goal:          payload.goal,
    campaign_name: payload.campaignName,
    status:        'draft' as const,
    draft_data:    payload.draftData,
  };

  if (payload.draftId) {
    // Update existing
    const { data, error } = await supabase
      .from('campaign_drafts')
      .update({ ...row })
      .eq('id', payload.draftId)
      .select()
      .single();
    if (error) throw error;
    return data as CampaignDraftRow;
  } else {
    // Insert new
    const { data, error } = await supabase
      .from('campaign_drafts')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return data as CampaignDraftRow;
  }
};

/** Fetch all drafts for a brand (both draft + published via workshop) */
export const getDrafts = async (brandId: string): Promise<CampaignDraftRow[]> => {
  const { data, error } = await supabase
    .from('campaign_drafts')
    .select('*')
    .eq('brand_id', brandId)
    .order('updated_at', { ascending: false });
  if (error) {
    console.warn('getDrafts error:', error.message);
    return [];
  }
  return (data ?? []) as CampaignDraftRow[];
};

/** Publish a draft — mark it published and link to campaigns row */
export const publishDraft = async (
  draftId: string,
  publishedCampaignId?: string,
): Promise<CampaignDraftRow> => {
  const { data, error } = await supabase
    .from('campaign_drafts')
    .update({
      status: 'published',
      published_campaign_id: publishedCampaignId ?? null,
    })
    .eq('id', draftId)
    .select()
    .single();
  if (error) throw error;
  return data as CampaignDraftRow;
};

/** Delete a draft */
export const deleteDraft = async (draftId: string): Promise<void> => {
  const { error } = await supabase
    .from('campaign_drafts')
    .delete()
    .eq('id', draftId);
  if (error) throw error;
};

