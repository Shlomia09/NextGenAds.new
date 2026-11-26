# Meta platform compliance

State of the Meta app as read from the Meta for Developers dashboard and Business Settings on
**2026-11-19** (read-only; nothing was changed), and from the code. Re-check before relying on it:
Meta changes access levels and requirements without notice.

## The app

| | |
|---|---|
| App | "nexgen", ID `1447393263178826` |
| Business portfolio | "Nextgenads", ID `2254133095019840` |
| App status | Published |
| Login | Facebook Login for Business, configuration `26657910060554513` (`src/lib/meta-api.ts:13`) |
| Graph API version in code | `v19.0`, hard-coded in every function (`meta-sync`, `auto-sync-all`, `meta-action`, `meta-oauth`, `meta-history-backfill`, `publish-campaign`) |
| Use cases added | Create & manage ads with Marketing API; Create & manage app ads with Ads Manager; Advertise on your app with Audience Network; Fundraisers; Manage everything on your Page |

**API version** `[VERIFY]`: v19.0 dates from early 2024. Meta retires each version about two years after
release and silently upgrades calls to the oldest version still available, which can change field
behaviour. Move to a current version deliberately rather than wait for the upgrade.

## Permissions (Marketing API use case)

"Ready for testing" is **Standard access**: it works only for people who have a role on the app, and
only on assets they own or administer. It is not Advanced access.

| Permission / feature | Access | API calls (dashboard) | Used by |
|---|---|---|---|
| `ads_read` | Standard ("Ready for testing") | 705 | insights sync (`meta-sync`, `auto-sync-all`, `meta-history-backfill`) |
| `ads_management` | Standard ("Ready for testing") | 705 | actions (`meta-action`), publishing (`publish-campaign`) |
| `business_management` | Standard ("Ready for testing") | 236 | listing ad accounts in the business |
| `pages_show_list` | Standard ("Ready for testing") | 0 | — |
| `pages_read_engagement` | Standard ("Ready for testing") | 0 | — |
| `public_profile` | Standard (granted to all apps) | 3 | login |
| Marketing API Access Tier | **Limited access** (development tier) | 936 | rate limits, ad-account limits |
| `catalog_management`, `email`, `pages_manage_ads`, `threads_business_basic`, Business Asset User Profile Access | not added | — | — |

The exact scopes the login requests are defined in configuration `26657910060554513` on Meta's side,
not in the code. `[FILL IN: export the configuration's permission list]`

## App Review, Tech Provider, business verification

| Item | State on 2026-11-19 |
|---|---|
| App Review | **Not submitted.** One request drafted and never sent: Marketing API Access Tier. No previous submissions. |
| Tech Provider | **Not registered.** The dashboard shows: "Become a Tech Provider to submit to App Review and request access to user data and data from other businesses." |
| Business verification | **Verified, as "Saleoution"**, on 25 July 2025 (use case: "App requires access to permissions on Meta for Developers"). This is the legal entity Meta knows today — not Rouge. |
| Privacy policy URL, terms URL, data deletion | No `/privacy` or `/terms` route exists in the app (`src/App.tsx`), so the URLs App Review requires do not resolve yet. Legal-review stage 6 adds them. |

## What works today, and what an external client needs

**Today:** accounts connect because the founder has a role on the app and admin access to those ad
accounts. That is all Standard access allows.

**An external client** — a business whose people have no role on the app — cannot authorise Rouge until:

1. **Tech Provider** registration for the app.
2. **Privacy policy, terms and data-deletion** URLs live on the site and entered in App settings → Basic.
3. **App Review** for **Advanced access** to `ads_read`, `ads_management` and `business_management`
   (plus `pages_show_list` / `pages_read_engagement` only if a feature actually uses them — otherwise
   remove them), each with a screencast of the real flow and a written use case.
4. **Marketing API Access Tier** moved off the development tier (part of the same review).
5. **Business verification under the entity that will own the app.** After the transfer to
   `[ROUGE LTD.]`, the app should sit in a portfolio verified as that company, not as Saleoution
   (`Docs/asset-register.md`, `legal/ip-assignment.md`).
6. Ongoing: the annual Data Use Checkup, and keeping the privacy policy consistent with what the code
   collects.

## If Meta restricts the app

Rouge falls back to **read-only** and tells the client; this is not a breach of the terms
(`legal/terms-of-service.md`, "If Meta restricts access"). `[BUILD: the read-only fallback and the
client notice are not implemented yet — legal-review stage 3.]`

## Cross-client use of advertiser data

The shared benchmark pool of live clients is **off** (`feature_flags.benchmark_live_pool = false`,
migration `20261118120000_reference_dataset`) until counsel confirms that Meta's Platform Terms and
the Marketing API terms allow advertiser data obtained through the app to be used, aggregated and
de-identified, in benchmarks shown to other businesses. `[CONFIRM WITH COUNSEL]` Until then every
benchmark is the historical reference layer only.

## Security of the business portfolio (from Security Center, same date)

- One business admin only — add a second admin to avoid lock-out.
- Two-factor authentication required for: no one. Recommend requiring it for everyone with access.
- No peer approval on ads; no trusted domains; one user with a public email domain; one inactive ad
  account.
