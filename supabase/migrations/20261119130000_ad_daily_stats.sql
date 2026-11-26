-- Migration: 20261119130000_ad_daily_stats
--
-- Daily, ad-level metrics for live clients — the only input to Half-Life and cause of death
-- (src/lib/halfLife.ts, definition in Docs/founder-decisions.md item 4). Written by auto-sync-all from
-- Meta insights (level=ad, time_increment=1, last 30 days). The reference dataset never writes here.

create table if not exists public.ad_daily_stats (
  id                 bigint generated always as identity primary key,
  brand_id           uuid not null references public.brands(id) on delete cascade,
  ad_account_id      uuid not null references public.ad_accounts(id) on delete cascade,
  campaign_id        uuid references public.campaigns(id) on delete cascade,
  ad_id_external     text not null,
  ad_name            text,
  date               date not null,
  spend              numeric(12,2) not null default 0,
  impressions        bigint not null default 0,
  clicks             bigint not null default 0,
  reach              bigint not null default 0,
  conversions        numeric(12,2) not null default 0,   -- leads or purchases, by the campaign's goal
  landing_page_views bigint not null default 0,
  video_3s_views     bigint,                             -- null for non-video ads (no hook rate)
  synced_at          timestamptz not null default now(),
  constraint ad_daily_stats_unique unique (ad_id_external, date)
);
create index if not exists ad_daily_stats_by_campaign on public.ad_daily_stats (campaign_id, date);

alter table public.ad_daily_stats enable row level security;
drop policy if exists "Users see own ad daily stats" on public.ad_daily_stats;
create policy "Users see own ad daily stats" on public.ad_daily_stats
  for select using (exists (select 1 from public.brands b where b.id = ad_daily_stats.brand_id and b.user_id = auth.uid()));
revoke all on public.ad_daily_stats from anon;
