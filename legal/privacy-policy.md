DRAFT — for review by Israeli counsel before use. Not legal advice.

# Rouge — Privacy Policy

`[ROUGE LTD. — Israeli company in formation, company no. TBD]` ("Rouge", "we") runs askrouge.com and the Rouge
app. This policy says what we collect, why, how long we keep it, and what you can ask us to do with it.
Contact: `[FILL IN: privacy email]`. Last updated: `[FILL IN]`.

<!-- internal -->
## Values sourced from code

| What | Source |
|---|---|
| No analytics or advertising trackers on the site | `index.html`, `src/main.tsx` (none loaded) |
| Fonts from Google Fonts | `index.html` |
| Browser storage: theme, selected brand and ad account, notification read time, sign-in session | `src/context/ThemeContext.tsx`, `src/contexts/BrandContext.tsx`, `src/contexts/ActiveAccountContext.tsx`, `src/components/ui/NotificationsPanel.tsx`, Supabase auth |
| Chat history stored | `intelligence_sessions` (`src/lib/supabase.ts`) |
| Ad-platform tokens stored | `ad_accounts.access_token` — `[stage 3: move to Vault and block client reads]` |
| Sub-processors | `legal/dpa.md` `[stage 6]`, `Docs/licenses.md` |
<!-- /internal -->

## 1 · Visitors to askrouge.com

We do not use analytics, advertising pixels or tracking cookies on the site. Our hosting provider (Vercel)
keeps standard server logs, such as IP address and request time, for security and operations. Fonts load
from Google Fonts, so your browser contacts Google when a page opens.

## 2 · People who use Rouge

| We collect | Why | Kept |
|---|---|---|
| Your email and sign-in details | to create and secure your account | while your account exists |
| The ad accounts you connect (Meta, Google) and an access token for each | to read your campaign metrics and, only when you approve, make the change you approved | until you disconnect the account or delete your Rouge account |
| Campaign, ad set and ad metrics from those accounts | to analyse performance, benchmark and recommend | while your account exists, then deleted `[FILL IN: within N days]` |
| Store data from Shopify or WooCommerce, if you connect it (orders and revenue for attribution) | to check ad results against real sales | as above |
| Your chats with Rouge and the recommendations it gives you | so you can return to them, and to show what was proposed and approved | as above |
| A record of every change made in your ad accounts through Rouge, with who approved it | accountability and the 48-hour check after each change | `[FILL IN: e.g. 7 years]` |
| Billing details, handled by Stripe | to charge your subscription | as required by tax law |

**We do not collect data about the people who see your ads.** We receive aggregated campaign numbers, not
information about individuals.

**Your browser** stores a few preferences (theme, selected brand and ad account) and your sign-in session.
These are needed for the app to work; we do not use them for tracking.

## 3 · AI

Rouge uses Anthropic's Claude to answer questions, write recommendations and draft copy. What you ask and the
relevant campaign metrics are sent to Anthropic to produce the answer. Anthropic does not use API data to train
its models `[CONFIRM WITH COUNSEL against Anthropic's current commercial terms]`. Anything written by AI is
labelled "AI-generated" in the product.

## 4 · Benchmarks

Benchmarks are built from a historical beauty reference dataset and consenting clients. No source brand is ever
identified. Your data enters another client's benchmark only with your consent, and you can withdraw it at any time.

## 5 · Who we share data with

Only the providers that run Rouge for us, under contract: Supabase (database and functions), Vercel (hosting),
Anthropic (AI), Stripe (payments), Google Fonts, and the platforms you connect (Meta, Google Ads, Shopify,
WooCommerce). The full list with locations is in the data processing addendum `[legal/dpa.md — stage 6]`.
We do not sell personal data.

## 6 · Where data is stored

Our database is hosted in the EU (Frankfurt). Some providers process data in other countries, including Israel
and the US, under the safeguards described in the data processing addendum `[CONFIRM WITH COUNSEL]`.

## 7 · Your rights

You can ask to see, correct, export or delete your data, and to withdraw consent, by writing to
`[FILL IN: privacy email]`. If you are in the EU or UK you can also complain to your data protection
authority; in Israel, to the Privacy Protection Authority.

## 8 · Deleting your data

To delete your Rouge data, including data that came from Facebook or Instagram through Meta:

1. In Rouge, disconnect your ad accounts (Connect → Disconnect). This removes the stored access tokens.
2. Email `[FILL IN: privacy email]` from your account's address with the subject "Delete my data".
3. We delete your account, connected-account data, campaign metrics and chats within `[FILL IN: 30]` days,
   and confirm by email. Records we must keep by law are kept only for that purpose.

You can also remove Rouge's access at any time from your Facebook settings (Settings → Business Integrations).
`[BUILD: Meta's data-deletion callback URL, if Meta requires it instead of these instructions.]`

## 9 · Changes

If we change this policy in a way that matters, we will tell you by email or in the app before it takes effect.
