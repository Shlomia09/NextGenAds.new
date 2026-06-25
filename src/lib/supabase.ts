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
