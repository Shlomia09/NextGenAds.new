-- Migration: 20261119120000_account_limits
--
-- Spending ceilings per ad account, enforced in supabase/functions/meta-action (the only path to Meta):
--   • an action that adds spend (scale_budget, activate_campaign) runs only with the user's explicit
--     approval and only if the account's total active daily budget stays at or under max_daily_spend;
--   • scale_budget may not raise a budget by more than max_change_pct_per_action in one step;
--   • with no ceiling set, actions that add spend are refused.
-- The terms of service quote these rules ("Rouge never adds budget without your explicit approval,
-- and never beyond the ceiling you set."), so a change here is a change there.

create table if not exists public.account_limits (
  ad_account_id             uuid primary key references public.ad_accounts(id) on delete cascade,
  max_daily_spend           numeric(12,2) not null check (max_daily_spend > 0),  -- in the account's currency
  max_change_pct_per_action numeric(5,2)  not null default 20 check (max_change_pct_per_action > 0 and max_change_pct_per_action <= 100),
  set_by                    uuid references auth.users(id),
  updated_at                timestamptz not null default now()
);
alter table public.account_limits enable row level security;

-- The owner of the ad account reads and sets its ceiling.
drop policy if exists account_limits_owner on public.account_limits;
create policy account_limits_owner on public.account_limits
  for all to authenticated
  using (exists (select 1 from public.ad_accounts a where a.id = ad_account_id and a.user_id = auth.uid()))
  with check (exists (select 1 from public.ad_accounts a where a.id = ad_account_id and a.user_id = auth.uid())
              and set_by = auth.uid());
revoke all on public.account_limits from anon;
