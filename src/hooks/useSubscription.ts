import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  stripe_price_monthly: string | null;
  stripe_price_yearly: string | null;
  max_brands: number;
  max_ad_accounts: number;
  chat_queries_monthly: number;  // -1 = unlimited
  can_execute: boolean;
  has_white_label: boolean;
  has_agency_view: boolean;
  has_api_access: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  billing_cycle: 'monthly' | 'yearly' | null;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
  plans?: Plan;
}

export interface Usage {
  id?: string;
  user_id?: string;
  month?: string;
  chat_queries_used: number;
  benchmark_audits_used: number;
  executions_used: number;
}

interface SubscriptionState {
  subscription: Subscription | null;
  usage: Usage;
  plan: Plan;
  isLoading: boolean;
  error: string | null;
}

const FREE_PLAN: Plan = {
  id: 'free',
  name: 'Benchmark Audit',
  price_monthly: 0,
  price_yearly: 0,
  stripe_price_monthly: null,
  stripe_price_yearly: null,
  max_brands: 0,
  max_ad_accounts: 0,
  chat_queries_monthly: 0,
  can_execute: false,
  has_white_label: false,
  has_agency_view: false,
  has_api_access: false,
};

const EMPTY_USAGE: Usage = {
  chat_queries_used: 0,
  benchmark_audits_used: 0,
  executions_used: 0,
};

export const useSubscription = (): SubscriptionState & { refetch: () => void } => {
  const [state, setState] = useState<SubscriptionState>({
    subscription: null,
    usage: EMPTY_USAGE,
    plan: FREE_PLAN,
    isLoading: true,
    error: null,
  });

  const fetchSubscription = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setState({ subscription: null, usage: EMPTY_USAGE, plan: FREE_PLAN, isLoading: false, error: null });
        return;
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-subscription`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        }
      );

      if (!res.ok) {
        // User has no subscription record yet — default to free
        setState({ subscription: null, usage: EMPTY_USAGE, plan: FREE_PLAN, isLoading: false, error: null });
        return;
      }

      const data = await res.json();
      setState({
        subscription: data.subscription,
        usage: data.usage || EMPTY_USAGE,
        plan: data.plan || FREE_PLAN,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load subscription',
      }));
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return { ...state, refetch: fetchSubscription };
};

// ── Billing API helpers ───────────────────────────────────────

export const createCheckoutSession = async (
  planId: string,
  billingCycle: 'monthly' | 'yearly'
): Promise<{ url: string }> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ planId, billingCycle }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create checkout session');
  }

  return res.json();
};

export const createPortalSession = async (): Promise<{ url: string }> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create portal session');
  }

  return res.json();
};
