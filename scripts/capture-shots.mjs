// Product screenshots for the landing page — reproducible, demo data only.
//
//   npm run dev                       (in another terminal)
//   node scripts/capture-shots.mjs    [base url, default http://localhost:5173]
//
// Captures /demo in dark mode at 2× and writes PNG + WebP (q82) to public/img/product/.
// Never point this at production or at a real client account: /demo is synthetic data,
// and that rule is contractual (Docs/known-issues.md #12).
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const BASE = process.argv[2] ?? 'http://localhost:5173';
const OUT = 'public/img/product';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) {
  throw new Error(`Refusing to capture ${BASE}: local dev server only.`);
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1680, height: 1050 }, deviceScaleFactor: 2 });
// Dark product theme — set before any page script runs
await context.addInitScript(() => localStorage.setItem('nag-theme', 'dark'));
const page = await context.newPage();

await page.goto(`${BASE}/demo`, { waitUntil: 'networkidle' });
await page.waitForSelector('[data-shot="obituary"]');
await page.waitForFunction(() => document.querySelectorAll('svg.recharts-surface').length > 0);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);   // chart animations and theme transitions settle

const save = async (name, buffer) => {
  await sharp(buffer).png().toFile(`${OUT}/${name}.png`);
  await sharp(buffer).webp({ quality: 82 }).toFile(`${OUT}/${name}.webp`);
  const { width, height } = await sharp(buffer).metadata();
  console.log(`${name}: ${width}×${height}`);
};

// 1 · The obituary — the first recommendation card only (the dying creative + its cause)
await save('shot-obituary', await page.locator('[data-shot="obituary"]').screenshot());

// 2 · Dashboard — page header with the KPI strip, plus the top of the three-column grid
//     (benchmarks, recommendations, chat). No health donut: it does not exist in /demo.
const header = await page.locator('[data-shot="dash-header"]').boundingBox();
const grid = await page.locator('[data-shot="dash-grid"]').boundingBox();
const pad = 24;
const clip = {
  x: Math.max(0, Math.min(header.x, grid.x) - pad),
  y: Math.max(0, header.y - pad),
  width: Math.max(header.width, grid.width) + pad * 2,
  height: Math.min(grid.y + 420, grid.y + grid.height) - header.y + pad * 2,
};
await save('shot-dashboard', await page.screenshot({ clip }));

await browser.close();
