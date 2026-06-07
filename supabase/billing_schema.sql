-- ============================================================
-- NextAdsGen — Billing Schema
-- Run in Supabase SQL Editor AFTER schema_full.sql
-- ============================================================

-- Subscription plans (static reference table)
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_monthly INTEGER,
  price_yearly INTEGER,
  stripe_price_monthly TEXT,
  stripe_price_yearly TEXT,
  max_brands INTEGER NOT NULL DEFAULT 0,
  max_ad_accounts INTEGER NOT NULL DEFAULT 0,
  chat_queries_monthly INTEGER NOT NULL DEFAULT 0,
  can_execute BOOLEAN NOT NULL DEFAULT false,
  has_white_label BOOLEAN NOT NULL DEFAULT false,
  has_agency_view BOOLEAN NOT NULL DEFAULT false,
  has_api_access BOOLEAN NOT NULL DEFAULT false
);

-- Seed plans (NULL stripe IDs — fill after creating in Stripe Dashboard)
INSERT INTO plans (id, name, price_monthly, price_yearly, stripe_price_monthly, stripe_price_yearly, max_brands, max_ad_accounts, chat_queries_monthly, can_execute, has_white_label, has_agency_view, has_api_access)
VALUES
  ('free',    'Benchmark Audit', 0,     0,      NULL, NULL, 0, 0, 0,   false, false, false, false),
  ('starter', 'Starter',         14900, 149000, NULL, NULL, 1, 1, 20,  false, false, false, false),
  ('growth',  'Growth',          34900, 349000, NULL, NULL, 2, 2, -1,  true,  false, false, false),
  ('scale',   'Scale',           74900, 749000, NULL, NULL, 5, 5, -1,  true,  true,  true,  true)
ON CONFLICT (id) DO UPDATE SET
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  max_brands = EXCLUDED.max_brands,
  max_ad_accounts = EXCLUDED.max_ad_accounts,
  chat_queries_monthly = EXCLUDED.chat_queries_monthly,
  can_execute = EXCLUDED.can_execute,
  has_white_label = EXCLUDED.has_white_label,
  has_agency_view = EXCLUDED.has_agency_view,
  has_api_access = EXCLUDED.has_api_access;

-- User subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT REFERENCES plans(id) DEFAULT 'free',
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own subscription" ON subscriptions;
CREATE POLICY "Users see own subscription"
  ON subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Usage tracking (per month)
CREATE TABLE IF NOT EXISTS usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  chat_queries_used INTEGER NOT NULL DEFAULT 0,
  benchmark_audits_used INTEGER NOT NULL DEFAULT 0,
  executions_used INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, month)
);

ALTER TABLE usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own usage" ON usage;
CREATE POLICY "Users see own usage"
  ON usage FOR SELECT USING (auth.uid() = user_id);

-- Billing events log
CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT,
  stripe_event_id TEXT UNIQUE,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RPC: increment chat usage atomically
CREATE OR REPLACE FUNCTION increment_chat_usage(p_user_id UUID, p_month TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO usage (user_id, month, chat_queries_used)
  VALUES (p_user_id, p_month, 1)
  ON CONFLICT (user_id, month)
  DO UPDATE SET
    chat_queries_used = usage.chat_queries_used + 1,
    updated_at = now();
END;
$$;

-- RPC: increment benchmark audit usage
CREATE OR REPLACE FUNCTION increment_audit_usage(p_user_id UUID, p_month TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO usage (user_id, month, benchmark_audits_used)
  VALUES (p_user_id, p_month, 1)
  ON CONFLICT (user_id, month)
  DO UPDATE SET
    benchmark_audits_used = usage.benchmark_audits_used + 1,
    updated_at = now();
END;
$$;
