-- Migration: 20261118120000_reference_dataset
--
-- The reference layer (historical beauty campaigns) and the live client layer, merged into one
-- benchmark that customers can query only through rouge_benchmark(). Every protection here is
-- enforced in the database, not the UI:
--   • reference rows carry no brand, campaign, collection or real account identifiers;
--     the mapping to the real source lives in reference_sources, readable by service_role only;
--   • a cohort returns a row only above the sample threshold, otherwise the next wider cohort,
--     otherwise nothing ("Not enough comparable data yet");
--   • the viewer's own data is always excluded from what they're compared with;
--   • live clients enter the pool only with benchmark_consent, and only once a cohort has at least
--     3 consenting live clients — below that, everyone sees the reference layer only, so two clients
--     can't derive each other's numbers;
--   • nothing returns source counts, brand counts, account counts or per-source breakdowns.
--
-- Also closes vertical_benchmarks_computed: a SECURITY DEFINER view granted to anon, i.e. readable
-- without signing in, returning cross-account aggregates with account_count and date ranges.

-- ── 0 · Admin ────────────────────────────────────────────────────────────────
create table if not exists public.app_admins (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;
drop policy if exists app_admins_read_self on public.app_admins;
create policy app_admins_read_self on public.app_admins
  for select to authenticated using (user_id = auth.uid());
revoke all on public.app_admins from anon;
-- Admins are added manually with the service role:
--   insert into public.app_admins (user_id) values ('<founder auth.users id>');

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.app_admins where user_id = auth.uid()) $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ── 1 · Close the anonymous benchmark view ───────────────────────────────────
drop view if exists public.vertical_benchmarks_computed;

-- ── 2 · Import batches (one per load; reports kept for audit) ────────────────
create table if not exists public.import_batches (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('reference_dataset', 'csv_import')),
  status      text not null default 'running' check (status in ('running', 'completed', 'failed', 'rolled_back')),
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  report      jsonb not null default '{}'::jsonb
);
alter table public.import_batches enable row level security;
drop policy if exists import_batches_admin_read on public.import_batches;
create policy import_batches_admin_read on public.import_batches
  for select to authenticated using (public.is_admin());
revoke all on public.import_batches from anon;

-- ── 3 · Reference provenance (service_role only: no policy for anyone) ───────
create table if not exists public.reference_sources (
  source_key       text primary key,               -- opaque, e.g. ref_meta_01
  platform         text not null check (platform in ('meta', 'google')),
  real_account_ref text not null,                  -- the real ad account id; never leaves this table
  owner_entity     text,
  relationship     text check (relationship in ('own', 'client_contract', 'pilot')),
  usage_basis      text,                           -- which agreement or consent allows this use
  -- ROAS comes only from sources whose purchase values are fully tracked. Off by default:
  -- the Meta reference export's purchase values are incomplete (ROAS ≈ 0.12 on its own totals).
  purchase_tracking_complete boolean not null default false,
  notes            text,
  created_at       timestamptz not null default now()
);
alter table public.reference_sources enable row level security;
revoke all on public.reference_sources from anon, authenticated;

-- ── 4 · Reference layer ──────────────────────────────────────────────────────
create table if not exists public.reference_campaign_stats (
  id                   bigint generated always as identity primary key,
  source_key           text not null references public.reference_sources(source_key),
  platform             text not null check (platform in ('meta', 'google')),
  campaign_key         text not null,              -- sha-256 of the platform campaign id; never the name
  objective_normalized text not null check (objective_normalized in ('sales', 'leads', 'traffic', 'awareness', 'engagement', 'unknown')),
  campaign_type        text,                       -- Google campaign type (Search, Performance Max, …)
  period_start         date not null,
  period_end           date not null,
  granularity          text not null check (granularity in ('day', 'month', 'year')),
  currency_original    text not null,
  spend_original       numeric(14,2) not null default 0,
  spend_eur            numeric(14,2) not null default 0,
  impressions          bigint not null default 0,
  reach                bigint,
  clicks               bigint not null default 0,
  link_clicks          bigint,
  landing_page_views   bigint,
  add_to_cart          bigint,
  initiate_checkout    bigint,
  purchases            numeric(14,2),               -- Google conversions can be fractional
  purchase_value_eur   numeric(14,2),
  leads                bigint,
  vertical             text not null default 'beauty',
  category             text,
  market               text,                       -- ISO code when known
  imported_at          timestamptz not null default now(),
  import_batch_id      uuid references public.import_batches(id),
  constraint reference_campaign_stats_period check (period_end >= period_start),
  constraint reference_campaign_stats_unique unique (source_key, campaign_key, period_start, granularity)
);
create index if not exists reference_campaign_stats_cohort
  on public.reference_campaign_stats (vertical, objective_normalized, platform);
alter table public.reference_campaign_stats enable row level security;
revoke all on public.reference_campaign_stats from anon, authenticated;

-- Reference campaigns that belong to a live client (the reference account also ran house brands that
-- are clients today). Tying them to the client's brand lets the pool exclude them from that client's
-- own benchmark, the same way its live data is excluded. service_role only.
create table if not exists public.reference_campaign_owners (
  source_key   text not null,
  campaign_key text not null,
  brand_id     uuid not null references public.brands(id) on delete cascade,
  primary key (source_key, campaign_key)
);
alter table public.reference_campaign_owners enable row level security;
revoke all on public.reference_campaign_owners from anon, authenticated;

-- ── 5 · Currency ─────────────────────────────────────────────────────────────
create table if not exists public.fx_rates_monthly (
  month        date not null,                      -- first day of the month
  currency     text not null,
  usd_per_eur  numeric(12,6),
  eur_per_unit numeric(12,6) not null,
  primary key (month, currency)
);
alter table public.fx_rates_monthly enable row level security;
drop policy if exists fx_rates_read on public.fx_rates_monthly;
create policy fx_rates_read on public.fx_rates_monthly for select to authenticated using (true);
revoke all on public.fx_rates_monthly from anon;
-- Values: supabase/seed/fx_rates_monthly.sql (ECB monthly averages, source documented there).

-- ── 6 · Live data: provenance, consent, reference flag ───────────────────────
create table if not exists public.data_sources (
  ad_account_id     uuid primary key references public.ad_accounts(id) on delete cascade,
  owner_entity      text,
  relationship      text check (relationship in ('own', 'client_contract', 'pilot')),
  usage_basis       text,
  benchmark_consent boolean not null default false,
  consent_date      date,
  purchase_tracking_complete boolean not null default false,   -- see reference_sources
  notes             text,
  updated_at        timestamptz not null default now()
);
alter table public.data_sources enable row level security;
drop policy if exists data_sources_admin_all on public.data_sources;
create policy data_sources_admin_all on public.data_sources
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.data_sources from anon;

alter table public.ad_accounts add column if not exists is_reference_source boolean not null default false;
alter table public.brands      add column if not exists is_reference_source boolean not null default false;

-- Reference-source brands are visible to admins only, even to their owner. No client-side change:
-- the brand selector already reads brands through this policy.
drop policy if exists "Users see own brands" on public.brands;
create policy "Users see own brands" on public.brands
  for all using (auth.uid() = user_id and (not is_reference_source or public.is_admin()))
  with check (auth.uid() = user_id);

-- ── 7 · Objective taxonomy (mirror of src/lib/objective.ts, kept in sync by a test) ──
create or replace function public.rouge_goal(p_platform text, p_raw text)
returns text language sql immutable as $$
  select case
    when p_platform = 'google' then case upper(coalesce(p_raw, ''))
      when 'PERFORMANCE MAX' then 'sales'
      when 'SHOPPING'        then 'sales'
      when 'SMART'           then 'sales'
      when 'SEARCH'          then 'traffic'
      when 'DISPLAY'         then 'awareness'
      when 'VIDEO'           then 'awareness'
      when 'DEMAND GEN'      then 'engagement'
      else 'unknown' end
    else case
      when upper(coalesce(p_raw, '')) ~ '(SALES|CONVERSIONS|PURCHASE|CATALOG)' then 'sales'
      when upper(coalesce(p_raw, '')) ~ '(LEADS|LEAD_GENERATION)'               then 'leads'
      when upper(coalesce(p_raw, '')) ~ '(TRAFFIC|LINK_CLICKS)'                 then 'traffic'
      when upper(coalesce(p_raw, '')) ~ '(AWARENESS|REACH|BRAND)'               then 'awareness'
      when upper(coalesce(p_raw, '')) ~ '(ENGAGEMENT|POST_ENGAGEMENT|PAGE_LIKES)' then 'engagement'
      else 'unknown' end
  end
$$;

-- ── 7b · Feature flags ───────────────────────────────────────────────────────
-- benchmark_live_pool: whether live clients' data may enter anyone else's benchmark. OFF until legal
-- sign-off on Meta's platform terms for cross-client use of advertiser data. While off, every
-- benchmark is the reference layer only, whatever the consent settings say.
create table if not exists public.feature_flags (
  key        text primary key,
  enabled    boolean not null default false,
  note       text,
  updated_at timestamptz not null default now()
);
alter table public.feature_flags enable row level security;
drop policy if exists feature_flags_admin_all on public.feature_flags;
create policy feature_flags_admin_all on public.feature_flags
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.feature_flags from anon;
insert into public.feature_flags (key, enabled, note) values
  ('benchmark_live_pool', false, 'Off until legal sign-off on Meta platform terms (founder, 2026-11-19).')
on conflict (key) do nothing;

-- ── 8 · The pool (internal: no grants; read only through rouge_benchmark) ────
-- coverage_days: one unit per campaign-day, so the sample threshold means the same thing across
-- daily, monthly and yearly rows (a campaign-month counts as 30 campaign-days).
create or replace view public.benchmark_pool with (security_invoker = true) as
select
  'reference'::text                         as layer,
  o.brand_id                                as contributor_brand_id,   -- null unless owned by a live client
  r.platform, r.vertical, r.category, r.market,
  null::text                                as spend_band,
  r.objective_normalized                    as objective,
  r.source_key || ':' || r.campaign_key     as campaign_ref,
  r.granularity,
  case r.granularity when 'day' then 1 when 'month' then 30 else 365 end as coverage_days,
  r.spend_eur, r.impressions, r.clicks, r.add_to_cart,
  coalesce(r.purchases, 0)                  as conversions,
  coalesce(r.purchase_value_eur, 0)         as revenue_eur,
  rs.purchase_tracking_complete             as tracks_purchases
from public.reference_campaign_stats r
join public.reference_sources rs on rs.source_key = r.source_key
left join public.reference_campaign_owners o on o.source_key = r.source_key and o.campaign_key = r.campaign_key
union all
select
  'live',
  c.brand_id,
  coalesce(c.platform, 'meta'),
  'beauty',
  b.category,
  case when array_length(b.markets, 1) = 1 then b.markets[1] end,
  b.ad_spend_range,
  public.rouge_goal(coalesce(c.platform, 'meta'), c.objective),
  'live:' || c.id::text,
  'day',
  1,
  -- live spend is in the account currency; converted to EUR by month when it isn't EUR
  round(d.spend * coalesce(case when coalesce(b.currency, 'EUR') = 'EUR' then 1 end, fx.eur_per_unit, 1), 2),
  d.impressions, d.clicks, coalesce(d.atc, 0),
  case when public.rouge_goal(coalesce(c.platform, 'meta'), c.objective) = 'leads' then d.leads else d.purchases end,
  round(coalesce(d.revenue, 0) * coalesce(case when coalesce(b.currency, 'EUR') = 'EUR' then 1 end, fx.eur_per_unit, 1), 2),
  ds.purchase_tracking_complete
from public.campaign_daily_stats d
join public.campaigns    c  on c.id = d.campaign_id
join public.brands       b  on b.id = d.brand_id
join public.ad_accounts  a  on a.id = c.ad_account_id
join public.data_sources ds on ds.ad_account_id = a.id and ds.benchmark_consent
left join public.fx_rates_monthly fx
  on fx.currency = b.currency and fx.month = date_trunc('month', d.date)::date
where not a.is_reference_source
  and not b.is_reference_source;
revoke all on public.benchmark_pool from anon, authenticated;

-- ── 9 · The benchmark a brand sees ───────────────────────────────────────────
-- Thresholds (the only place they are defined): ≥30 campaigns and ≥90 campaign-days per cohort;
-- live clients join a cohort's pool only when ≥3 consenting live clients are in it.
create or replace function public.rouge_benchmark(p_brand_id uuid, p_platform text, p_objective text)
returns table (
  cohort_level    text,     -- which cohort answered: market_spend_band | market | base
  cpm             numeric,
  ctr             numeric,  -- %
  cpc             numeric,
  cpa             numeric,
  roas            numeric,
  conversion_rate numeric,  -- conversions per click, %
  atc_rate        numeric   -- add-to-carts per click, %
)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_market     text;
  v_spend_band text;
  v_level      text;
  c_min_campaigns constant int := 30;
  c_min_days      constant int := 90;
  c_min_live      constant int := 3;
  v_live_pool     boolean := coalesce((select enabled from feature_flags where key = 'benchmark_live_pool'), false);
begin
  -- A brand can only ask for its own benchmark: asking for another brand's would let the
  -- difference between two answers reveal that brand's numbers.
  if not exists (select 1 from brands where id = p_brand_id and user_id = auth.uid())
     and not public.is_admin() then
    raise exception 'not your brand' using errcode = '42501';
  end if;

  select case when array_length(markets, 1) = 1 then markets[1] end, ad_spend_range
    into v_market, v_spend_band
  from brands where id = p_brand_id;

  foreach v_level in array array['market_spend_band', 'market', 'base'] loop
    continue when v_level = 'market_spend_band' and (v_market is null or v_spend_band is null);
    continue when v_level = 'market' and v_market is null;

    return query
    with cohort as (
      select p.* from benchmark_pool p
      where p.vertical  = 'beauty'
        and p.platform  = p_platform
        and p.objective = p_objective
        and (p.contributor_brand_id is null or p.contributor_brand_id <> p_brand_id)
        and (v_level = 'base' or p.market = v_market)
        and (v_level <> 'market_spend_band' or p.spend_band = v_spend_band)
    ),
    live_ok as (
      -- the viewer counts toward the 3, but their own rows are already excluded above
      select (count(distinct contributor_brand_id) filter (where layer = 'live')
              + case when exists (
                  select 1 from campaigns c join data_sources ds on ds.ad_account_id = c.ad_account_id
                  where c.brand_id = p_brand_id and ds.benchmark_consent) then 1 else 0 end) >= c_min_live as ok
      from cohort
    ),
    pool as (
      select c.* from cohort c, live_ok
      where c.layer = 'reference' or (v_live_pool and live_ok.ok)
    ),
    agg as (
      select count(distinct campaign_ref) as campaigns, sum(coverage_days) as days,
             sum(spend_eur) spend, sum(impressions) impr, sum(clicks) clicks,
             sum(add_to_cart) atc, sum(conversions) conv,
             -- ROAS only from fully tracked sources; null when no tracked source is in the pool
             sum(revenue_eur) filter (where tracks_purchases) revenue_tracked,
             sum(spend_eur)   filter (where tracks_purchases) spend_tracked
      from pool
    )
    select v_level,
           round(spend / nullif(impr, 0) * 1000, 2),
           round(clicks::numeric / nullif(impr, 0) * 100, 2),
           round(spend / nullif(clicks, 0), 2),
           round(spend / nullif(conv, 0), 2),
           round(revenue_tracked / nullif(spend_tracked, 0), 2),
           round(conv / nullif(clicks, 0) * 100, 2),
           round(atc::numeric / nullif(clicks, 0) * 100, 2)
    from agg
    where campaigns >= c_min_campaigns and days >= c_min_days;

    if found then return; end if;
  end loop;
  -- no cohort passed: zero rows, the UI shows "Not enough comparable data yet"
end;
$$;
revoke all on function public.rouge_benchmark(uuid, text, text) from public, anon;
grant execute on function public.rouge_benchmark(uuid, text, text) to authenticated, service_role;

-- ── 10 · Admin: pool size and import progress ────────────────────────────────
create or replace function public.admin_pool_stats()
returns table (layer text, platform text, campaigns bigint, first_period date, last_period date, spend_eur numeric)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  return query
    select 'reference', r.platform, count(distinct r.source_key || r.campaign_key),
           min(r.period_start), max(r.period_end), sum(r.spend_eur)
    from reference_campaign_stats r group by r.platform
    union all
    select 'live', coalesce(c.platform, 'meta'), count(distinct c.id), min(d.date), max(d.date), sum(d.spend)
    from campaign_daily_stats d join campaigns c on c.id = d.campaign_id
    join ad_accounts a on a.id = c.ad_account_id
    where not a.is_reference_source
    group by coalesce(c.platform, 'meta');
end;
$$;
revoke all on function public.admin_pool_stats() from public, anon;
grant execute on function public.admin_pool_stats() to authenticated;
