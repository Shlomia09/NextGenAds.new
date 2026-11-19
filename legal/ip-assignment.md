DRAFT — for review by Israeli counsel before use. Not legal advice.

# Intellectual Property and Asset Assignment

**Between** `[FOUNDER FULL NAME]`, ID `[FILL IN]` (the "Founder"),
**and** `[ROUGE LTD. — Israeli company in formation, company no. TBD]` (the "Company").

Effective on the date the Company is incorporated `[FILL IN]`. Governing law: Israel. Courts: Tel Aviv-Yafo.
`[CONFIRM WITH COUNSEL]` — both.

## Why this exists

Rouge was built by the Founder before the Company existed. Investors need the Company — not a person — to
own everything the product depends on, so the product survives if the Founder is unavailable and no one can
later dispute who owns a critical asset. This assignment moves all of it, for the consideration in
section 6.

## 1 · What is assigned

The Founder assigns to the Company, with full title and free of any claim, all right, title and interest
worldwide in:

| # | Asset | Identifier (from the code and config) | Held today by |
|---|---|---|---|
| 1 | Source code, history and documentation of the Rouge product | GitHub repository `Shlomia09/NextGenAds.new`, all branches | Founder's GitHub account `[CONFIRM]` |
| 2 | The **Rouge** name, logo and brand assets, and any goodwill in them | marks in `public/brand`, `src/components/brand` | Founder `[FILL IN: any trademark filings]` |
| 3 | Domain **askrouge.com** (and the former domain nextadsgen) | registrar `[FILL IN]` | `[FILL IN]` |
| 4 | Meta app **"nexgen"** and its configuration | app `1447393263178826`, login configuration `26657910060554513`, business portfolio "Nextgenads" `2254133095019840` | portfolio verified as **"Saleoution"** — see section 2 |
| 5 | Hosting and data projects | Supabase project `nplbghydqjapkycoiucl`; Vercel project `prj_R3wjAMAVN1Zn60LNJY6TYdFCQ8V7` | Founder's accounts `[CONFIRM]` |
| 6 | Payments and APIs | Stripe account `[FILL IN]`; Anthropic API organisation `[FILL IN]`; Google Workspace `[FILL IN]` | `[FILL IN]` |
| 7 | **The Rouge reference dataset** — the anonymised compilation, its schema, the loading scripts and every derived benchmark | `reference_campaign_stats`, `scripts/load-reference-dataset.ts` | see section 2 |
| 8 | Everything else created for Rouge before the effective date: designs, copy, prompts, specifications, know-how | — | Founder |

No API key, token or password is written in this document. They are rotated and re-issued to Company-held
accounts during the transfer (section 4).

## 2 · What the Founder can only assign with someone else's consent

The Founder assigns the Founder's own rights. Two assets also involve other parties, and their consent is a condition
of closing:

- **Meta app and business verification.** The business portfolio holding the app is verified as
  **Saleoution** `[FILL IN: Saleoution's legal form, registration no. and the Founder's role in it]`.
  Saleoution confirms in writing that it claims no right in the app and will move it (or allow it to be
  moved) to a portfolio verified as the Company. Meta's App Review and verification are re-done under the
  Company (`Docs/meta-platform-compliance.md`).
- **The underlying campaign data in the reference dataset.** It comes from ad accounts
  `355719742225476` (Meta) and `263034418` (Google), which advertised several brands. The compilation is
  the Founder's work; the underlying advertiser data belongs to whoever owns those accounts and brands
  `[FILL IN: entity per account]`. Each such owner signs a short licence to the Company: perpetual,
  irrevocable, to use the data aggregated and de-identified in benchmarks, with no source brand ever
  identified. (This matches the wording in the terms of service: "Benchmarks are built from a historical
  beauty reference dataset and consenting clients. No source brand is ever identified.")

## 3 · Founder's confirmations

The Founder confirms that, to the Founder's knowledge: the Founder wrote the code or has the right to assign it; no employer,
client or former partner has a claim on it `[FILL IN: any exceptions]`; the third-party open-source
components are used under their licences, listed in `Docs/licenses.md` (no GPL/AGPL; weak-copyleft
components are build-time tools only); and the Founder has not granted anyone else rights in these assets.

## 4 · Transfer steps

Within `[30]` days of the effective date the Founder does what each provider requires to put the asset in
the Company's name, and the Company pays the providers' fees. The checklist, with today's holder of each
asset and the step to move it, is `Docs/asset-register.md`. Credentials are rotated at handover.

## 5 · Moral rights and further assurance

The Founder waives moral rights to the extent the law allows `[CONFIRM WITH COUNSEL]`, and signs any further
document reasonably needed to record the Company's ownership.

## 6 · Consideration

`[FILL IN WITH COUNSEL: e.g. founder shares under the founders' agreement — out of scope of this draft.]`

---

**Signed** — Founder: `[FILL IN]` · For the Company: `[FILL IN]` · For Saleoution (section 2 consent): `[FILL IN]`
