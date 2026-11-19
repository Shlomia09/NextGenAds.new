# EU AI Act — classification of Rouge

Working analysis for counsel, not legal advice. `[CONFIRM WITH COUNSEL]` on the conclusions.
Regulation (EU) 2024/1689. Based on the code as of 2026-11-19.

## What the system is

Rouge is a SaaS tool for beauty brands. It reads the brand's own Meta (and, where connected, Google
and e-commerce) campaign metrics, compares them with an anonymous beauty benchmark, and:

- explains performance and answers questions in a chat;
- proposes changes to the brand's own campaigns (pause, budget, audience tests), each with its reason;
- drafts ad copy from the brand's own creative;
- executes a change in the brand's ad account **only after a person approves it**
  (`execute-recommendation`, `meta-action`; no autonomous execution exists in the code).

The language model is Anthropic Claude, called server-side from Supabase edge functions
(`claude-sonnet-4-5-20250929` in two functions, `claude-sonnet-4-6` in one). Rouge does not train or
fine-tune a model.

## Role under the Act

- **Deployer and provider of an AI system** built on a general-purpose AI model supplied by Anthropic.
  Rouge is not a GPAI model provider (it does not place a model on the market).
- Users are **businesses** (B2B). Rouge does not interact with the brands' end customers; it never
  receives data about individual people who see the ads — only aggregated campaign metrics.

## Why it is not high-risk

High-risk systems are those in Annex I (safety components of regulated products) or Annex III. Rouge is
in neither:

| Annex III area | Rouge |
|---|---|
| Biometrics | No biometric data. |
| Critical infrastructure | No. |
| Education, employment, worker management | No. It does not evaluate people. |
| Access to essential private or public services, creditworthiness, insurance | No. |
| Law enforcement, migration, justice, democratic processes | No. |

It optimises a business's advertising spend on aggregated metrics. No decision about a natural
person is made, and no profiling of natural persons takes place in Rouge (Art. 6(3)).

## Prohibited practices (Art. 5) — none

No subliminal or manipulative techniques aimed at people, no exploitation of vulnerabilities, no social
scoring, no biometric categorisation, no emotion recognition. Rouge works on campaign-level numbers,
not on individuals. Targeting choices stay inside Meta's and Google's own ad systems and policies.

## Transparency (Art. 50) — what Rouge does

Applies from 2 August 2026.

| AI output | Where it appears | Disclosure |
|---|---|---|
| Chat answers | Intelligence chat (`src/components/intelligence/IntelligenceChat.tsx`) | Each answer carries an **"AI-generated"** label; the assistant is presented as Rouge, an AI analyst. |
| Recommendations | Dashboard "Needs your attention" (`src/pages/Dashboard.tsx`), `RecommendationCard` (all dashboard variants) | **"AI-generated"** label on each recommendation. |
| Copy variants | Creative Studio (`src/pages/CreativeStudio.tsx`, from `analyze-creative`) | **"AI-generated"**; becomes **"AI-drafted · edited"** once the user changes the text. |
| Targeting suggestion | Campaign Workshop "AI insight" (`src/pages/CampaignWorkshop.tsx`) | **"AI-generated"** label. |
| Exports | Campaigns CSV (`src/lib/exportCsv.ts`) | Contains metrics only, no model output — no label needed. Any future export that includes model text must carry the label. |

The label is one component, `src/components/ui/AiLabel.tsx`; this table and that component change
together.

Ad copy that a brand publishes is its own advertising; Art. 50(4) (text published to inform the public
on matters of public interest) does not apply to it. The brand reviews and approves every piece of copy
before it is published.

## Human oversight and accountability

- Every change to an ad account requires explicit approval by a user with access (approve-all).
- Every executed action is logged in `action_logs` and checked 48 hours later.
- `[BUILD — legal-review stage 3]`: approver roles, the 72-hour expiry of unapproved recommendations,
  the "Pause Rouge" kill switch, server-side ceilings. Until they exist, the documents must not claim
  them.

## Not built (do not describe as AI capabilities yet)

- **Half-Life and cause of death**: defined (`Docs/founder-decisions.md`, item 4) but not computed
  anywhere in the code yet.
- **Copy generation in Campaign Workshop**: the "Analyze creative & generate copy" button has an empty
  handler (`src/pages/CampaignWorkshop.tsx`). Copy generation exists in Creative Studio only.
