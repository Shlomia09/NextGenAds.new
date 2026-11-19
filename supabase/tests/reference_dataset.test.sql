-- Database tests for 20261118120000_reference_dataset. Runs in one transaction and rolls back.
-- Run against a branch or clean database that has the migration applied, never production:
--   psql "$BRANCH_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/reference_dataset.test.sql
-- Each block raises an exception on failure; reaching the final NOTICE means every test passed.
begin;

-- ── fixtures: three users, three brands; the reference layer gets 40 campaigns × 3 days ──
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 't-a@test.invalid'),
  ('00000000-0000-0000-0000-0000000000b1', 't-b@test.invalid'),
  ('00000000-0000-0000-0000-0000000000c1', 't-c@test.invalid');
insert into brands (id, user_id, name, currency) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'Test A', 'EUR'),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', 'Test B', 'EUR'),
  ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-0000000000c1', 'Test C', 'EUR');

insert into reference_sources (source_key, platform, real_account_ref, purchase_tracking_complete)
  values ('ref_test_01', 'meta', 'test', true), ('ref_test_02', 'meta', 'test-untracked', false);
insert into reference_campaign_stats (source_key, platform, campaign_key, objective_normalized, period_start, period_end,
  granularity, currency_original, spend_original, spend_eur, impressions, clicks, purchases, purchase_value_eur)
select 'ref_test_01', 'meta', 'k' || g, 'sales', d, d, 'day', 'EUR', 10, 10, 1000, 20, 1, 30
from generate_series(1, 40) g, generate_series(date '2025-01-01', date '2025-01-03', interval '1 day') d;

-- two live clients (A, B) with consent; their numbers differ sharply from the reference layer
do $$
declare b uuid; acct uuid; camp uuid; i int;
begin
  foreach b in array array['00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b']::uuid[] loop
    insert into ad_accounts (user_id, platform, account_id, account_name, brand_id, status)
      select user_id, 'meta', 'act_' || left(b::text, 4), 'test', b, 'active' from brands where id = b
      returning id into acct;
    insert into data_sources (ad_account_id, benchmark_consent) values (acct, true);
    for i in 1..40 loop
      insert into campaigns (brand_id, ad_account_id, platform, campaign_id_external, name, objective)
        values (b, acct, 'meta', b::text || '-' || i, 'live', 'OUTCOME_SALES') returning id into camp;
      insert into campaign_daily_stats (campaign_id, brand_id, date, spend, impressions, clicks, purchases, revenue)
        select camp, b, d, 1000, 1000, 500, 50, 9000 from generate_series(date '2025-01-01', date '2025-01-03', interval '1 day') d;
    end loop;
  end loop;
end $$;

-- ── 1 · a signed-in user can't read the reference layer or its provenance ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
do $$ begin
  begin perform 1 from reference_campaign_stats limit 1; raise exception 'FAIL: authenticated read reference_campaign_stats';
  exception when insufficient_privilege then null; end;
  begin perform 1 from reference_sources limit 1; raise exception 'FAIL: authenticated read reference_sources';
  exception when insufficient_privilege then null; end;
  begin perform 1 from benchmark_pool limit 1; raise exception 'FAIL: authenticated read benchmark_pool';
  exception when insufficient_privilege then null; end;
end $$;

-- ── 2 · nobody can ask for another brand's benchmark (differencing attack) ──
do $$ begin
  begin perform * from rouge_benchmark('00000000-0000-0000-0000-00000000000a', 'meta', 'sales');
    raise exception 'FAIL: user C got brand A''s benchmark';
  exception when insufficient_privilege then null; end;
end $$;

-- ── 3 · with only 2 live clients, A's benchmark is the reference layer alone ──
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
do $$
declare r record;
begin
  select * into r from rouge_benchmark('00000000-0000-0000-0000-00000000000a', 'meta', 'sales');
  if r is null then raise exception 'FAIL: no benchmark returned'; end if;
  -- reference only: CPM 10/1000*1000 = 10, CTR 2%, ROAS 3. B's live data (CPM 1000, ROAS 9) must not move it.
  if r.cpm <> 10 or r.ctr <> 2 or r.roas <> 3 then
    raise exception 'FAIL: live data leaked into the benchmark (cpm %, ctr %, roas %)', r.cpm, r.ctr, r.roas;
  end if;
end $$;

-- ── 3b · a source without complete purchase tracking never contributes to ROAS ──
reset role;
insert into reference_campaign_stats (source_key, platform, campaign_key, objective_normalized, period_start, period_end,
  granularity, currency_original, spend_original, spend_eur, impressions, clicks, purchases, purchase_value_eur)
select 'ref_test_02', 'meta', 'u' || g, 'traffic', d, d, 'day', 'EUR', 10, 10, 1000, 20, 1, 5
from generate_series(1, 40) g, generate_series(date '2025-01-01', date '2025-01-03', interval '1 day') d;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
do $
declare r record;
begin
  select * into r from rouge_benchmark('00000000-0000-0000-0000-00000000000a', 'meta', 'traffic');
  if r is null then raise exception 'FAIL: traffic cohort returned nothing'; end if;
  if r.roas is not null then raise exception 'FAIL: ROAS came from an untracked source (%)', r.roas; end if;
  if r.cpm <> 10 then raise exception 'FAIL: other metrics should still come from the untracked source'; end if;
end $;

-- ── 4 · below the sample threshold there is no row at all ──
do $$ begin
  if exists (select 1 from rouge_benchmark('00000000-0000-0000-0000-00000000000a', 'meta', 'leads')) then
    raise exception 'FAIL: a cohort under the threshold returned a row';
  end if;
end $$;

-- ── 4b · a reference campaign owned by brand A is excluded from A's benchmark only ──
reset role;
-- 40 awareness campaigns with CPM 100 owned by A, 40 more with CPM 10 owned by nobody
insert into reference_campaign_stats (source_key, platform, campaign_key, objective_normalized, period_start, period_end,
  granularity, currency_original, spend_original, spend_eur, impressions, clicks)
select 'ref_test_01', 'meta', 'own' || g, 'awareness', d, d, 'day', 'EUR', 100, 100, 1000, 20
from generate_series(1, 40) g, generate_series(date '2025-01-01', date '2025-01-03', interval '1 day') d;
insert into reference_campaign_stats (source_key, platform, campaign_key, objective_normalized, period_start, period_end,
  granularity, currency_original, spend_original, spend_eur, impressions, clicks)
select 'ref_test_01', 'meta', 'free' || g, 'awareness', d, d, 'day', 'EUR', 10, 10, 1000, 20
from generate_series(1, 40) g, generate_series(date '2025-01-01', date '2025-01-03', interval '1 day') d;
insert into reference_campaign_owners (source_key, campaign_key, brand_id)
select 'ref_test_01', 'own' || g, '00000000-0000-0000-0000-00000000000a' from generate_series(1, 40) g;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
do $ declare r record; begin
  select * into r from rouge_benchmark('00000000-0000-0000-0000-00000000000a', 'meta', 'awareness');
  if r.cpm <> 10 then raise exception 'FAIL: brand A was compared with its own reference history (cpm %)', r.cpm; end if;
end $;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
do $ declare r record; begin
  select * into r from rouge_benchmark('00000000-0000-0000-0000-00000000000b', 'meta', 'awareness');
  if r.cpm <> 55 then raise exception 'FAIL: brand B should see both owned and unowned reference rows (cpm %)', r.cpm; end if;
end $;

-- ── 4c · the live pool flag: off by default, so live data never enters, even with 3 clients ──
reset role;
do $
declare acct uuid; camp uuid; i int;
begin
  -- a third consenting live client (C), so the 3-client rule alone would let live data in
  insert into ad_accounts (user_id, platform, account_id, account_name, brand_id, status)
    values ('00000000-0000-0000-0000-0000000000c1', 'meta', 'act_c', 'test', '00000000-0000-0000-0000-00000000000c', 'active')
    returning id into acct;
  insert into data_sources (ad_account_id, benchmark_consent) values (acct, true);
  for i in 1..40 loop
    insert into campaigns (brand_id, ad_account_id, platform, campaign_id_external, name, objective)
      values ('00000000-0000-0000-0000-00000000000c', acct, 'meta', 'c-' || i, 'live', 'OUTCOME_SALES') returning id into camp;
    insert into campaign_daily_stats (campaign_id, brand_id, date, spend, impressions, clicks, purchases, revenue)
      select camp, '00000000-0000-0000-0000-00000000000c', d, 1000, 1000, 500, 50, 9000
      from generate_series(date '2025-01-01', date '2025-01-03', interval '1 day') d;
  end loop;
  if (select enabled from feature_flags where key = 'benchmark_live_pool') then
    raise exception 'FAIL: benchmark_live_pool must default to off';
  end if;
end $;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
do $ declare r record; begin
  select * into r from rouge_benchmark('00000000-0000-0000-0000-00000000000a', 'meta', 'sales');
  if r.cpm <> 10 then raise exception 'FAIL: live data entered with the flag off (cpm %)', r.cpm; end if;
end $;
-- turning the flag on lets B and C in for A (3 consenting live clients in the cohort)
reset role;
update feature_flags set enabled = true where key = 'benchmark_live_pool';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
do $ declare r record; begin
  select * into r from rouge_benchmark('00000000-0000-0000-0000-00000000000a', 'meta', 'sales');
  if r.cpm = 10 then raise exception 'FAIL: with the flag on and 3 clients, live data should enter'; end if;
end $;
reset role;
update feature_flags set enabled = false where key = 'benchmark_live_pool';

-- ── 5 · anon can't run the benchmark or read the old view ──
reset role;
set local role anon;
do $$ begin
  begin perform * from rouge_benchmark('00000000-0000-0000-0000-00000000000a', 'meta', 'sales');
    raise exception 'FAIL: anon ran rouge_benchmark';
  exception when insufficient_privilege then null; end;
  if to_regclass('public.vertical_benchmarks_computed') is not null then
    raise exception 'FAIL: vertical_benchmarks_computed still exists';
  end if;
end $$;

reset role;
do $$ begin raise notice 'reference_dataset: all tests passed'; end $$;
rollback;
