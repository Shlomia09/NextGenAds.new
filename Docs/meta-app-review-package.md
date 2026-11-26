# Meta App Review — submission package (under Saleoution)

Everything to prepare before submitting app **"nexgen" (`1447393263178826`)** for Advanced access. The
founder submits; nothing here is submitted automatically. State of the app on 2026-11-19 is in
`Docs/meta-platform-compliance.md`.

Order matters: **Tech Provider → URLs and settings → screencasts → submit.**

---

## A · Register as a Tech Provider (do this first)

The dashboard blocks App Review until the app is a Tech Provider ("Become a Tech Provider to submit to App
Review and request access to user data and data from other businesses").

1. Meta for Developers → app **nexgen** → **Dashboard** → **Become a Tech Provider**.
2. Confirm the business portfolio: **Nextgenads** (`2254133095019840`). It is already **business-verified as
   Saleoution** (25 July 2025), which is what Meta checks.
3. Accept the Tech Provider terms when shown. `[CONFIRM WITH COUNSEL before accepting: these bind Saleoution.]`
4. Complete **Access verification** if Meta asks for it (how Rouge handles data from other businesses). Use
   section D below as the description.
5. Check that **App settings → Basic** shows the business and that **Required actions** is 0. (It showed 1
   at the top bar on 2026-11-19 — open it and clear it first.)

## B · App settings → Basic (required fields)

| Field | Value |
|---|---|
| App display name | Rouge `[the app is named "nexgen" today — rename before review]` |
| App icon (1024×1024) | `public/brand/` mark `[FILL IN: export at 1024×1024]` |
| Privacy policy URL | `https://askrouge.com/privacy` (live once branch `legal-stage-8` is merged) |
| Terms of service URL | `https://askrouge.com/terms` |
| User data deletion | "Data deletion instructions URL" → `https://askrouge.com/privacy` (section 8 explains it) |
| Category | Business and Pages |
| Contact email | `[FILL IN]` |

**Before submitting, the two pages must be final:** replace every `[FILL IN]` and remove the DRAFT line
after counsel signs off. Reviewers read them.

## C · What to request (Advanced access)

Request only what the product uses. Remove the rest in **Use cases → Customize** — unused permissions are
a common reason for rejection.

| Permission / feature | Request? | Used by |
|---|---|---|
| `ads_read` | **Yes** | reading campaign, ad set and ad metrics (sync) |
| `ads_management` | **Yes** | executing a change the user approved (pause, budget within the ceiling, activate) and publishing a campaign the user built |
| `business_management` | **Yes** | listing the ad accounts a client's business grants |
| Marketing API Access Tier (Standard) | **Yes** | rate limits and more than a few ad accounts |
| `pages_show_list`, `pages_read_engagement` | **No — remove** unless a feature reads Pages (none does in the code today) | — |

### Use-case text per permission (paste into the request)

**ads_read** — "Rouge is a campaign analytics tool for beauty brands. After a brand connects its ad account,
Rouge reads campaign, ad set and ad performance metrics (spend, impressions, clicks, conversions) every hour
and shows the brand which ads are losing efficiency and why, compared with an anonymous benchmark. We read
only aggregated campaign metrics; we do not access data about the people who see the ads."

**ads_management** — "Rouge proposes changes to the brand's own campaigns (pause an ad, adjust a budget,
switch a paused campaign on) with the reason for each. Nothing is changed until a person on the brand's team
approves it in Rouge. Budget increases are refused unless the brand has set a daily spending ceiling, and
never exceed it. The brand can also publish a campaign it built in Rouge; campaigns are created paused."

**business_management** — "When a brand connects through Facebook Login for Business, Rouge lists the ad
accounts in the brand's business portfolio so the brand chooses which ones to connect."

## D · Data handling description (Tech Provider / Data Use Checkup)

- Data received: ad account metrics at campaign, ad set and ad level; account names and ids. No end-user
  personal data.
- Storage: Supabase (EU, Frankfurt). Access tokens stored server-side `[stage 3: encrypt in Vault]`.
- Use: shown only to the brand that connected the account. Benchmarks use the historical reference dataset
  only; live clients' data is not pooled (`feature_flags.benchmark_live_pool = false`).
- Deletion: on disconnect tokens are removed; full deletion on request within `[30]` days (privacy §8).
- Sharing: no sale; processors listed in the privacy policy.

## E · Screencast script (one video per permission, or one video covering all, 2–4 minutes)

Record in a clean browser at 1280×800 or larger, English UI, with a **test business and test ad account**
that Meta reviewers can recognise as yours. No real client data on screen.

1. **Open askrouge.com** → click **Get started** → sign in to Rouge. *(Shows the app is live and has a login.)*
2. **Connect → Meta Ads → Connect**. The Facebook Login for Business dialog opens. Pause on the permissions
   screen so `ads_read`, `ads_management` and `business_management` are readable. Approve.
   *(Covers `business_management`: the next screen lists the ad accounts.)*
3. **Choose the test ad account** from the list → it appears as connected.
4. **Sync** → open **Campaigns**. Point at the metrics table and a chart. *(Covers `ads_read`.)*
5. **Settings → Spending ceilings** → set a daily ceiling for the test account → Save.
6. Open a campaign → **Quick actions → Pause** (or a recommendation → **Approve & Execute**). Show the
   confirmation step, then the success message.
7. **Open Meta Ads Manager in a second tab** and show the same campaign now paused. *(Covers
   `ads_management`: the change happened only after approval.)*
8. Back in Rouge: **Scale +20%** → show that it needs a second click to approve, and that it is refused if
   it would pass the ceiling. *(Shows the safeguard.)*
9. **Connect → Disconnect** the account → open **askrouge.com/privacy** section 8 (data deletion).

Narrate or caption each step in one short sentence: what the user does and why Rouge needs the permission.

## F · After approval

- Re-verify the business under `[ROUGE LTD.]` once the company exists, and move the app to its portfolio
  (`legal/ip-assignment.md` §2, `Docs/asset-register.md`).
- Keep the privacy policy and the code in step; Meta's annual Data Use Checkup asks the same questions.
