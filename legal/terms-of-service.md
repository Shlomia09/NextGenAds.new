DRAFT — for review by Israeli counsel before use. Not legal advice.

# Rouge — Terms of Service

`[ROUGE LTD. — Israeli company in formation, company no. TBD]` ("Rouge", "we"). Governing law: Israel.
Courts: Tel Aviv-Yafo. `[CONFIRM WITH COUNSEL]` — both.

> **Status of this draft:** the clauses below match the code as of 2026-11-19, except where a row in the
> table is marked **BLOCKED** — that clause is what the product must become, and it may not be published
> until the code enforces it. The full set of clauses (approvers, guardrails mode, 72-hour expiry, ceilings,
> liability, refund condition) is completed in legal-review stage 6, after stage 3 builds them.

## Values sourced from code

| Clause | Value | Source | State |
|---|---|---|---|
| Funds | Rouge never receives, holds or transfers advertising funds | no payment flow to or from ad accounts exists in the code; Stripe is used only for Rouge's own subscription (`create-checkout-session`, `stripe-webhook`) | true today |
| Approval | every change needs a person's explicit approval | `supabase/functions/execute-recommendation/index.ts` (runs only on a user's action) | true today |
| "It cannot add money" | Rouge cannot raise a budget or create a campaign | **`supabase/functions/meta-action/index.ts:73` `scale_budget` multiplies ad-set budgets; line ~203 duplicates a campaign with a "[Scale]" prefix** | **BLOCKED** — remove or block server-side in stage 3 |
| Benchmark | ≥30 campaigns and ≥90 campaign-days per cohort; own data excluded; no source brand identified | `supabase/migrations/20261118120000_reference_dataset.sql`, `rouge_benchmark()` | true once applied |
| Live client pool | off until legal sign-off | same migration, `feature_flags.benchmark_live_pool = false` | true once applied |
| Post-action check | 48 hours | `supabase/functions/_shared/actionLogging.ts` | true today |
| Money-back | 30 days | `src/components/marketing/PricingSection.tsx` | condition: `[CONFIRM WITH FOUNDER]` |

## 1 · What Rouge does

Rouge reads your ad accounts' campaign metrics, compares them with an anonymous beauty benchmark, explains
what is happening, proposes changes with the reason for each, and drafts copy. Text produced by AI is
labelled "AI-generated" in the product. Which capabilities are built, pilot-tested or generally available is
stated in the product `[stage 4: src/config/capabilities.ts]`.

## 2 · Money

**Rouge never receives, holds or transfers advertising funds.** You pay Meta and Google directly, under your
own agreements with them. Rouge's subscription is the only payment you make to Rouge.

**Rouge can move budget between ads. It cannot add money.** `[BLOCKED — see the table: the code can still
scale a budget; this sentence is published only after stage 3 removes that.]`

*Why this protects you:* your total spend is set by you in your ad accounts. Rouge can only redistribute
inside what you already chose to spend.

## 3 · Nothing happens without your approval

Every change Rouge proposes waits for a person on your side to approve it. If no one approves it, nothing
happens. Every change that runs is recorded and checked 48 hours later, and you can see the record.

*If you are worried about a mistake:* nothing reaches your account until someone you authorised says yes.

## 4 · Benchmarks and your data

Benchmarks are built from a historical beauty reference dataset and consenting clients. No source brand is
ever identified. You are never compared with your own data, and a comparison appears only when there is
enough comparable data behind it; otherwise Rouge says "Not enough comparable data yet".

Your data does not enter any other client's benchmark unless you consent, and even then only once that is
switched on after legal review. You can withdraw consent at any time; Rouge keeps working for you, with the
reference benchmark. Details: `legal/data-and-benchmark.md` `[stage 6]`.

*If you think we use your data to help competitors:* no one ever sees your name, your campaigns or your
numbers. What you get from the pool is the same thing anyone else gets from it — and you are in it only if
you choose to be.

## 5 · If Meta restricts access

If Meta limits Rouge's access to its platform, Rouge switches to read-only and tells you. That is not a
breach of these terms. `[BUILD — stage 3: the read-only fallback and notice.]`

## 6 · Money-back

`[CONFIRM WITH FOUNDER — stage 6: the measurable 30-day condition, identical to the site.]`

## 7 · Ending the service

You can cancel at any time; the subscription runs to the end of the period you paid for.
`[stage 3: "Pause Rouge" stops all execution immediately.]`

## 8 · Billing unit

A **Brand** is one trading name, under the responsibility of one legal entity. Plans are counted in Brands
and ad accounts, as shown on the pricing page.

`[stage 6: liability cap, exclusions, and the explicit exception for an action executed against the ceilings
or without a required approval.]`
