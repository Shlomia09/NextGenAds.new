# Founder decisions — legal review & reference dataset

Decisions that code and the legal drafts must both follow. Each entry: what was decided, and where it is
enforced. If code changes one of these, the legal draft that cites it changes in the same PR.

## 2026-11-18

1. **`vertical_benchmarks_computed` closed.** Dropped in production on 2026-11-18 (it was a
   SECURITY DEFINER view granted to `anon`). Also dropped by migration `20261118120000_reference_dataset`.

2. **Benchmark wording (legal drafts and product).** No minimum-sources rule. Every draft uses:
   > Benchmarks are built from a historical beauty reference dataset and consenting clients.
   > No source brand is ever identified.

   The earlier promise of "a cohort of at least 5 brands" (k≥5) is removed from all drafts. What *is*
   enforced, and may be stated: ≥30 campaigns and ≥90 campaign-days per cohort, the viewer's own data
   excluded, live clients only from 3 consenting in a cohort, consent off by default
   (`rouge_benchmark()` in the migration above).

3. **25,620 and 2018 stay unchanged** on the site and in the app. Actual counts are reported, not
   substituted:
   - Reference layer after load: 180 campaigns (71 Meta, 109 Google).
   - Meta account `355719742225476`: ~764 ad sets over its full history (all statuses, via the Meta
     Ads API, 2026-11-18). Ads: counted by the full sync (legal-review stage 1).
   - Google account `263034418`: campaign-level exports only; ad groups and ads need an ad-group or ad
     report export (see `Docs/how-to-export.md`).

4. **Half-Life — definition.** Days from an ad's best 7-day window (by CPA; by CTR when the ad has no
   conversions) until the metric is 50% worse than that window. **Cause of death** = the first metric
   to cross its threshold: frequency > 3; hook rate down > 30%; CPM up > 30%; landing-page CVR down
   > 30%. Computed only from **daily, ad-level** data. The reference layer does not contribute to
   Half-Life. Marked `BUILT` only after it has run on a live client.

5. **Google campaign types → goals** (approved): Performance Max, Shopping, Smart → sales;
   Search → traffic; Display, Video → awareness; Demand Gen → engagement.
   `src/lib/objective.ts` (`GOOGLE_CAMPAIGN_TYPE_GOAL`), mirrored by `public.rouge_goal()`.

6. **ROAS only from fully tracked sources.** `purchase_tracking_complete` on `reference_sources` and
   `data_sources`, default `false`; `rouge_benchmark()` computes ROAS only from rows where it is true
   and returns no ROAS otherwise. Both current reference sources are `false` (Meta purchase values are
   partial; Google has none).

7. **Test database:** a Supabase branch was quoted at $0.01344/hour on 2026-11-18 and **not created**
   ("not now"). The migration and `supabase/tests/reference_dataset.test.sql` are untested against a
   database until one is approved.

8. **Push and the reference load** are run or approved by the founder.

9. **A live client is never compared with its own reference history.** The Meta reference account also
   ran house brands that are clients today. Reference campaigns are tied to the client's brand in
   `reference_campaign_owners` (service_role only) and excluded from that client's benchmark; other
   clients still see them. The matching rules name brands, so they live in the git-ignored
   `data/reference/owners.json`, not in code. Current load: 6 Google campaigns (≈€12,857) tied to one
   live client; 0 in the Meta export (that client's Meta campaigns predate its October 2023 start).
