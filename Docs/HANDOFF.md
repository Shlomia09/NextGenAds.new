# NextAdsGen -- Handoff: Auto-Sync Fix + Repo Completeness
Date: 2026-09-18
HEAD before: 69a4afe
HEAD after:  5a3ffbc

## Commits (this session)

| SHA       | Task | What |
|-----------|------|------|
| 3e49313   | Task 2a+2b | auto-sync-all: Vault sanity check + system_events failure logging |
| 4b3153d   | Task 2c    | Staleness banner in Campaigns UI (>26h threshold) |
| 8ab733f   | Task 4     | Shared CONVERSION_EVENT_MAP -- closes drift risk |
| 5a3ffbc   | Task 5     | meta-history-backfill added to repo |

## Regression Verification (OUTCOME_LEADS)

Verified: conversion_event=Leads, conversion_value=0, leads=600.
Code reads campaign.leads (600) not conversion_value (0). No regression. No fix needed.
getCpaLabel now derived from CONVERSION_EVENT_MAP (no hardcoded strings).

## OUTCOME_SALES 0-purchases question

Sales campaigns show purchases=0, revenue=0 against EUR 2014 spend.
This is stale data from Genomes US (last synced 13 Aug 2026 -- one month old).
NOT a mapping bug. Re-check after Task 3 (backfill).

## Auto-sync: 30-day silent failure

Duration: 13 Aug -- 13 Sep 2026 (31 days).
Accounts affected: 2 (NeoBeauty, Genomes US). Campaigns: 56 total (51 from Genomes = month-stale).
Root cause: Vault secret supabase_service_role_key was 31 chars (truncated). Correct is ~220.
pg_cron reported succeeded because it only checks HTTP acceptance, not response body.
All 48 cron runs returned HTTP 401 -- no actual sync occurred.

Fix applied: auto-sync-all now checks key length >= 100 and starts with eyJ before
comparing to the Authorization header. Returns HTTP 500 with MISCONFIGURATION error
(not 401) when malformed, and writes to system_events (best-effort).

Task 1 (owner action still required):
  Re-store the full service_role JWT in Supabase Dashboard -> Vault -> supabase_service_role_key.
  Then verify: SELECT name, length(decrypted_secret) FROM vault.decrypted_secrets WHERE name=supabase_service_role_key;
  Expect length ~220.
  Then trigger manually and check net._http_response for HTTP 200.

Task 3 (backfill -- owner action still required):
  After Vault secret is fixed, trigger meta-history-backfill for account 152467265102727.
  Verify with: SELECT date, COUNT(*) FROM campaign_daily_stats cds JOIN campaigns c ON c.id=cds.campaign_id JOIN ad_accounts a ON a.id=c.ad_account_id WHERE a.account_id=152467265102727 AND date >= 2026-08-13 GROUP BY date ORDER BY date;
  Expect no gaps, no COUNT(*) > 1.

## Drift Risk -- CLOSED

supabase/functions/_shared/conversionEventMap.ts: source of truth for event -> column mapping.
src/lib/conversionEventMap.ts: exact mirror (Vite cannot import from outside src/).
generate-recommendations now imports from _shared/ -- no more hand-copy.
getCpaLabel in conversions.ts now derives from the map.

To add a new conversion event: edit _shared/conversionEventMap.ts, mirror in src/lib/conversionEventMap.ts,
update getCampaignConversionValue() in conversions.ts, and update meta-sync/auto-sync-all action_type lookups.

## Repo completeness (post Task 5)

All 12 deployed Supabase functions now have local counterparts.
Local-but-not-deployed (Stripe/Shopify -- out of scope, not committed):
  create-checkout-session, create-portal-session, stripe-webhook,
  get-subscription, shopify-oauth, woo-connect, ecommerce-sync.

## Staleness Banner

Campaigns page shows a warning banner when any account data is >26h old.
Derives from MAX(campaigns.synced_at) per ad_account_id -- no extra DB query.
Directs user to Sync Meta button and System Events for investigation.

## Open Items

1. OWNER: Fix Vault secret supabase_service_role_key (Task 1)
2. OWNER: Backfill Genomes US account 152467265102727 (Task 3)
3. Re-check OUTCOME_SALES 0-purchases after backfill
4. BillingTab: exists, no route. Not in scope.
5. vertical_benchmarks_computed: no conversion_value benchmark for Traffic/Awareness. Noted in previous session, not changed.

## jobid=3 note

jobid=3 (duplicate check-recommendation-outcomes cron, every 15 min) was present during the 13-Sep session
and was removed during that session. It did NOT appear in the 13-Sep session report -- corrected here.
It is gone as of 21:00 13-Sep. Do not run cron.unschedule(nextadsgen-check-outcomes) -- that targets jobid=1, the real job.

## Read From Chat
SELECT commit_sha, summary, open_items, blockers, created_at FROM public._dev_handoff ORDER BY created_at DESC LIMIT 1;