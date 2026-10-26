# Rouge — Landing visual upgrade (spec v3)

Supersedes the visual sections of `Docs/landing-spec.md`. Copy and structure from v2 stand
unless contradicted here. This document only adds the visual layer and the sections that
carry it.

---

## 0 · The reference images in the brief are rejected

Four dark "laptop on a marble desk" mockups were considered and are **not** going on the page.
Reasons, in order of severity:

1. **The UI in them is fake and unreadable.** Blurred placeholder glyphs where the product's
   text should be. On a page selling analytical precision, a screenshot nobody can read is an
   admission there is nothing to read. The product is live — use the real thing.
2. **Wrong palette.** Warm brown, gold, teal, rose. Rouge is bone, ink, one red. Those images
   are the brown palette we spent four commits removing.
3. **Model faces.** `CLAUDE.md` forbids stock faces. They also date the page instantly and
   signal "template".
4. **Gradients, bokeh, candle glow.** The system has no gradients and no shadows.

The instinct behind them is right — the page is too technical and has no beauty in it.
The fix is below, and none of it needs a stock photo.

---

## 1 · Three visual layers, in order of value

| Layer | What it is | Cost | Where |
| --- | --- | --- | --- |
| A — Product | Real screenshots of the live dashboard | €0 | Hero, operator section, new §6 |
| B — Material | Macro beauty stills, bone ground, no faces | Generated | Band dividers, split sections |
| C — Decay | The signature line chart, rebuilt | €0 | Problem section only |

Layer A is the single biggest gap. The landing page currently contains **zero** images of the
product it sells. A buyer has to take the whole thing on faith from type alone.

---

## 2 · Layer A — product screenshots

### Capture procedure (Claude Code runs this)

Write `scripts/capture-shots.mjs`:

```
Playwright, chromium, deviceScaleFactor: 2
viewport 1680 × 1050
goto the local dev server at /demo (never production)
wait for charts: await page.waitForFunction(() => document.querySelectorAll('canvas').length > 0)
await page.waitForTimeout(1500)   // chart animations settle
```

Capture **element screenshots, not full page**. Only screens that exist in `/demo` are captured
(option a): `shot-obituary` (first card only) and `shot-dashboard` (KPI strip and benchmarks, no
donut). `shot-workshop` and `shot-chat` wait for /demo to be completed with demo data
(known-issue #12). **Never a real client account — contractual.**

| File | Element | Why this one |
| --- | --- | --- |
| `shot-obituary.png` | The card that names the dying creative + its cause | This is the product. It is the headline made literal. |
| `shot-dashboard.png` | Dashboard top region — health donut + metric row | Breadth. Shows it is a system, not a widget. |
| `shot-workshop.png` | Campaign Workshop build panel | Proves "builds", not just "reports". |
| `shot-chat.png` | Intelligence chat, one question and its answer | Proves it is grounded in their own account. |

Output to `public/img/product/`, PNG, then run through `sharp` to produce a `.webp` sibling at
quality 82. Reference the `.webp` with a `<picture>` fallback to PNG.

### Rules for the shots

- **Dark mode.** Ink product against a bone page is the brand's whole contrast. Do not
  screenshot the light theme.
- **Demo data only.** Never a real client account. The demo account is already synthetic.
- **No browser chrome.** No fake macOS window, no rounded laptop bezel, no perspective tilt,
  no drop shadow. A flat rectangle with a 1px `--border` border and `border-radius: 3px`.
  The screenshot is evidence, not decoration.
- **Every number legible at the rendered size.** If a figure is illegible in the final layout,
  crop tighter rather than shrink. An unreadable screenshot is worse than none.
- **Check the numbers before shipping.** A screenshot is a published claim. Any figure visible
  in it is subject to the `CLAUDE.md` number-source gate exactly like body copy.

---

## 3 · Layer B — material stills

**Three** macro images are approved (2000×1300, supplied directly). Normalise and save to
`public/img/material/`:

| File | Subject | Ratio | Use |
| --- | --- | --- | --- |
| `lipstick-section.png` | Lipstick bullet cut across at an angle, deep matte crimson face on a cream body | 3:2 | Problem section split |
| `powder-arc.png` | Pale ivory powder swept in one measured arc | 3:2 | Full-bleed band before pricing |
| `pipette-drop.png` | Glass pipette with one deep red droplet at the tip | 3:2 | Final CTA band |

A fourth — a serum droplet on a glass slide — was generated and **rejected**: it reads as an
abstract glass object rather than as serum, and carries a heavy dark reflection. The brand-safety
section therefore gets no image and stays a two-column text block. Do not substitute a stock
photo for it.

**Added after review — the one face.** Shlomi asked for a face: a beauty-tech page with no person
on it read as missing something. `lips-profile.png` (2016×1344, 3:2) is a generated image, not a
real person and not stock: Higgsfield Soul 2.0, 2k, on the account's own credits. Prompt:
"Editorial beauty macro photograph, cropped partial face in profile: only the lower half of a woman's
face, lips, chin and jawline, turned three-quarters away. Lips in a flat matte true red lipstick, clean
sharp edge. Real skin with visible natural texture and fine pores, no retouching gloss. Single soft side
light from the left, gentle falloff, minimal shadow. Seamless plain warm off-white bone background,
evenly lit, no gradient, no vignette. Subject occupies the right third of the frame, wide empty negative
space on the left. No jewelry, no hair in frame, no text, no props. Minimal, quiet, high-end trade-press
still life aesthetic, like a macro product photograph. Shot on medium format, 100mm macro, f/8, neutral
colour." Of two variants, the other was rejected for a vertical seam through the face.
**Layout after review: no image bands.** Every still sits inside its section, beside its text, and
fades into the page; nothing stands in a separate block between sections. Lipstick: problem section
(unchanged). Face: Brand safety, opposite "Your brand book stays yours." (Shlomi's call; it is our own
marketing image, not client creative). Powder: beside the pricing heading (`PricingSection aside`,
landing only). Pipette: beside the final headline. Each still fades and rises in once on scroll
(`mk-reveal`). The face is cropped to 1496×1344 and gets a 240px separable fade on every edge
(`OPTIONS` in `match-bone.mjs`), so the skin dissolves into the page instead of ending in a cut.

### Colour match — required before committing the files

The generated backgrounds are warm cream, close to but not exactly `--bg` `#F3F0EA`. Dropped
onto the page as-is they read as a pale floating patch. Normalise each one:

```js
// scripts/match-bone.mjs
import sharp from 'sharp';
const BONE = { r: 0xF3, g: 0xF0, b: 0xEA };
for (const f of ['lipstick-section', 'powder-arc', 'pipette-drop']) {
  const img = sharp(`raw/${f}.png`);
  // sample the top-left 8x8 block — guaranteed background in all three
  const { data } = await img.clone().extract({ left: 0, top: 0, width: 8, height: 8 })
                            .raw().toBuffer({ resolveWithObject: true });
  const avg = [0, 1, 2].map(c => {
    let s = 0; for (let i = c; i < data.length; i += 3) s += data[i];
    return s / (data.length / 3);
  });
  await img
    .linear([BONE.r / avg[0], BONE.g / avg[1], BONE.b / avg[2]], [0, 0, 0])
    .toFile(`public/img/material/${f}.png`);
}
```

Then verify: the corner pixel of each output must be within 2 per channel of `#F3F0EA`.
If a shift pushes the red droplet or the crimson cut face off-hue, abandon the match for that
file and instead inset it with 48px of `--bg` padding so the seam is deliberate rather than
accidental.

Treatment, non-negotiable:

- Rendered at `filter: none`. No overlay, no tint, no multiply blend.
- The image's own background is already `#F3F0EA`, so it sits flush against the page with no
  visible edge. **Do not add a border to these.** The product shots get a border; the material
  shots do not. That difference is the point — one is evidence, the other is air.
- Never any text set over them.
- `loading="lazy"` on everything below the fold, and explicit `width`/`height` so nothing shifts.

If one of them reads as an advertisement rather than a specimen, cut it. The page works with
zero of these. It does not work with zero product screenshots, which is the state it is in now.

---

## 4 · Layer C — the decay visual

Currently drawn twice, identically, in the hero and in the problem section. Remove it from the
hero entirely. It keeps one home: the problem section, where the week axis gives it meaning.

Rebuild it there:

- Four lines, ink at 1.5px, the dying one in `--accent` at 2px.
- The red line's end point gets a 4px filled dot and a label to its right: `flagged`.
  No number, no date, no "day 19".
- Axis: `WEEK 1 … WEEK 4` in `--t-label` in `--font-mono`, `--text-3`.
- Animate the draw once on scroll into view, 900ms, `prefers-reduced-motion` respected.
  Once — not a loop. A looping chart is a screensaver.

---

## 5 · Section-by-section

### Hero

Replace the duplicated chart with `shot-obituary.png`.

Layout at ≥1024px: two columns, 5/7 split. Left — eyebrow, headline, subhead, both CTAs,
guarantee line. Right — the obituary card screenshot, bordered, bleeding 48px past the right
container edge so it reads as a window into the product rather than a framed picture.

Below 1024px: stacked, screenshot below the CTAs, full width, no bleed.

The headline stays exactly as it is. It is the best line on the page.

### Proof strip

`25,620 · 2018 · 1` — the `20,000+` must go, here and in the 22 other places it appears.

Set the three figures in `--t-metric` mono. Currently they are too close in weight to the labels
beneath them; the number should be roughly 3× the label's size, not 1.5×.

### The problem

Two columns. Left: the three existing paragraphs. Right: `lipstick-section.png`.
The decay chart moves to full width **below** both, with its week axis.

The cut lipstick next to "there is no calendar for this" is the whole argument in one picture:
you cannot see how much is left from the outside.

### An operator, not an advisor

Five grey cards in an uneven 3+2 grid is the most template-looking block on the page. Rebuild:

- First row: three cards — Watches, Runs it, Builds. These are the product.
- Then a full-width bordered figure: `shot-dashboard.png`, with a one-line caption beneath in
  `--t-label` in `--font-mono`, `--text-3`: `Live account. Demo data.` — that caption is a legal nicety and a
  credibility move at once.
- Then two cards — Writes the copy, Your tool your credits. These are reassurances, and they
  belong after the proof, not beside it.

Card interior: number in mono `--text-3`, title in `--t-h3`, body in `--text-2`. Remove the
grey fill, use `--bg2` with a 1px `--border` border. The solid grey blocks are heavy and they
fight the screenshots.

### It does the work. You approve the spend.

**Was "It runs the account. You set the ceiling." — replaced.** That heading is the claim
known-issue #8 blocks: the ceiling is marketed and not built. The new heading is true of the
approval flow as built and needs no change when the ceiling ships.

**The two-column "runs on its own / asks you first" table is removed for now.** Today every change
goes through approval, so two columns that both mean "approved" dramatise a distinction the code does
not make. It is replaced by one ordered list of what Rouge does — Reads, Diagnoses, Proposes, Drafts,
Builds, Publishes (the last carries the 48-hour watch, which the code schedules) — and one line beneath:
"Every change waits for you. Nothing moves in your account until you say yes."

**When the ceiling ships (known-issue #8), the two-column table comes back** — then the split is real.
Its last content, for reference: left "Pausing creatives below break-even / Moving budget between ads
inside a campaign / Audience tests inside the current budget / Pulling what's dying before it drains
the week"; right "Raising the budget / Launching a new campaign / Anything that increases spend".

The closing line "Rouge can move your money. It can't spend *more* of it without you." is deleted —
same claim. Card 02, the Growth plan feature and the "Scaling past your ceiling" row were rewritten in
approval-flow language.

Add `shot-workshop.png` beside the list at ≥1024px once #12 makes it capturable.

### Brand safety

Stays a text block — no image approved for it. But break the wall: pull the line
*"Your visuals are your brand's — built by the people you pay to build them"* out as a
standalone statement at `--t-h2`, with the surrounding paragraphs at `--text-2` beneath it.
This is the section buyers actually worry about, and the reassurance should be readable at a
glance rather than buried in the third sentence.

### Band before pricing

Full-bleed `powder-arc.png`, max-height 420px, `object-fit: cover`, `object-position: center`.
No text. One breath between the argument and the price.

### Pricing

Structure is fine. Three fixes:

1. The `RECOMMENDED` chip on Growth is red-on-red against a red border. Make the chip solid
   `--accent` with bone text, and the card border 1px `--accent`, not 2px.
2. Feature lists use `—` as a bullet. Switch to a 4px square in `--text-3`. The em-dash reads
   as a missing value, which the rest of the system now uses it for.
3. The guarantee line under the grid is `--text-3` at 13px and legally the most important line
   in the section. Raise to 15px, `--text-2`.

### Final CTA — new section

The page currently ends with a stray red button and a footer. Replace with:

Full-bleed `pipette-drop.png` at 520px max-height, and **below** it, on bone:

> **Connect the account. Read tomorrow's obituary.**
> Thirty days. If Rouge doesn't find what your reporting missed, you don't pay for the month.
> [ Get started ]  [ See how it works ]

Headline in `--t-h1`. One red word: *obituary*, set in Bodoni italic like `left` in the hero.
That rhyme between the first screen and the last is the page's one piece of craft.

---

## 6 · Video — dropped

No video on the page. The explainer predates the v3 brand, and the CRO note on file says an
autoplay hero video costs conversion. The product screenshots carry the page.

---

## 7 · Motion

Total motion budget for the whole page:

1. Decay chart draws once on scroll into view.
2. Section headlines fade up 12px over 400ms on first view.
3. Nothing else.

No parallax, no counters ticking up, no hover-lift on cards, no scroll-jacking. Every one of
those reads as a template. `@media (prefers-reduced-motion: reduce)` disables all of it.

---

## 8 · Verification gates

Run before the commit. These are scoped deliberately narrowly.

```bash
# 1 · No new hex in marketing CSS
rg -n '#[0-9a-fA-F]{6}' src/styles/marketing.css && echo FAIL || echo OK

# 2 · No stray 20,000 anywhere in src or index.html
rg -n '20,000|20000\+' src index.html && echo FAIL || echo OK

# 3 · Images carry explicit dimensions
rg -n '<img ' src/components/marketing src/pages/Landing.tsx | rg -v 'width=' && echo FAIL || echo OK

# 4 · No shadows on the landing
rg -n 'box-shadow|drop-shadow|filter:' src/styles/marketing.css && echo FAIL || echo OK

# 5 · No ceiling language anywhere in src/ until known-issue #8 ships.
#     Measures the concept, not a list of sentences (same lesson as the hex gate).
rg -n -i 'ceiling' src && echo FAIL || echo OK

# 6 · No real brand name on any visible surface or screenshot source. The demo brand is "Demo brand".
#     These are confidential benchmark sources (supabase/functions/claude-chat/index.ts); extend the
#     list whenever that list grows.
rg -n -i 'neolumo|oyb|obey your body|neobeauty|renovo' src public index.html scripts && echo FAIL || echo OK
```

Then by eye, at 390px, 768px and 1440px:

- Headline hierarchy survives at 390 — this broke once already at `--t-display`.
- No horizontal scroll at any width.
- Every number in every screenshot is legible at its rendered size.
- Red count on the page: the CTAs, the pricing chip and border, the one dying line, the two
  italic accent words. If it is more than that, something crept in.

---

## 9 · Commit plan

| # | Scope | Blocked by |
| --- | --- | --- |
| 1 | `25,620` propagation + meta tags + `public/og.png` + `summary_large_image` | — |
| 2 | Capture script + four product screenshots committed | — |
| 3 | Hero and problem section rebuilt, decay chart de-duplicated | 2 |
| 4 | Operator section, brand safety, material bands | 2, 3 |
| 5 | Pricing fixes + new final CTA section | 4 |

Commit 1 shipped on `main` (`ea1d624`, `2a5e284`, `7a1fd8d`, `043c476`, `385ca87`). Section 6 (video) is dropped.
