// Normalise the material stills to the page background (--bg in light: #F3F0EA).
//
//   node scripts/match-bone.mjs <raw dir>
//
// Expects <raw dir>/{powder-arc,lipstick-section,pipette-drop}.{png,webp,jpg}.
// For each file: divide out the uneven background light so it lands on #F3F0EA, feather the edges to it, then verify
//   (1) the corner is within 2 per channel of #F3F0EA, and
//   (2) the red in the image did not drift off-hue (> 4°).
// If (2) fails, the match is abandoned for that file and it is inset with 48px of #F3F0EA
// instead, so the seam is deliberate rather than accidental.
import sharp from 'sharp';
import { readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';

const RAW = process.argv[2];
if (!RAW) throw new Error('usage: node scripts/match-bone.mjs <raw dir>');
const OUT = 'public/img/material';
const BONE = [0xF3, 0xF0, 0xEA];
const NAMES = ['powder-arc', 'lipstick-section', 'pipette-drop'];
await mkdir(OUT, { recursive: true });

const rgb = async (img) => {
  const { data, info } = await img.clone().removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, info };
};
const cornerAvg = ({ data, info }) => {
  const s = [0, 0, 0]; let n = 0;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const i = (y * info.width + x) * 3; s[0] += data[i]; s[1] += data[i + 1]; s[2] += data[i + 2]; n++;
  }
  return s.map(v => v / n);
};
// The generated backgrounds are lit unevenly (brighter in the middle, darker toward the corners),
// so a single scale leaves a pale patch around the object. Instead, estimate that light falloff from
// the background pixels alone (bright, low-chroma), smoothed over ~1/8 of the frame, and divide it
// out: every background pixel lands on bone, and the object keeps its own exposure.
const isBg = (r, g, b) => r + g + b > 600 && Math.max(r, g, b) - Math.min(r, g, b) < 28;
const flatField = ({ data, info }) => {
  const { width: W, height: H } = info, CELL = 16;
  const gw = Math.ceil(W / CELL), gh = Math.ceil(H / CELL);
  const sum = new Float64Array(gw * gh * 3), cnt = new Float64Array(gw * gh);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3, r = data[i], g = data[i + 1], b = data[i + 2];
    if (!isBg(r, g, b)) continue;
    const c = ((y / CELL) | 0) * gw + ((x / CELL) | 0);
    sum[c * 3] += r; sum[c * 3 + 1] += g; sum[c * 3 + 2] += b; cnt[c]++;
  }
  // normalised box blur over the grid (masked cells contribute nothing), repeated for a smooth field
  const R = Math.round(Math.max(gw, gh) / 16);
  let S = sum, N = cnt;
  for (let pass = 0; pass < 3; pass++) {
    const S2 = new Float64Array(S.length), N2 = new Float64Array(N.length);
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
      let a = 0, b = 0, c = 0, n = 0;
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        const yy = y + dy, xx = x + dx;
        if (yy < 0 || xx < 0 || yy >= gh || xx >= gw) continue;
        const k = yy * gw + xx; a += S[k * 3]; b += S[k * 3 + 1]; c += S[k * 3 + 2]; n += N[k];
      }
      const k = y * gw + x; S2[k * 3] = a; S2[k * 3 + 1] = b; S2[k * 3 + 2] = c; N2[k] = n;
    }
    S = S2; N = N2;
  }
  const grid = new Float64Array(gw * gh * 3);
  for (let k = 0; k < gw * gh; k++) for (let c = 0; c < 3; c++) grid[k * 3 + c] = N[k] ? S[k * 3 + c] / N[k] : BONE[c];
  // bilinear upsample to a per-pixel gain that maps the local background to bone
  const out = Buffer.alloc(data.length);
  for (let y = 0; y < H; y++) {
    const gy = Math.min(gh - 1, Math.max(0, (y + 0.5) / CELL - 0.5)), y0 = Math.floor(gy), y1 = Math.min(gh - 1, y0 + 1), fy = gy - y0;
    for (let x = 0; x < W; x++) {
      const gx = Math.min(gw - 1, Math.max(0, (x + 0.5) / CELL - 0.5)), x0 = Math.floor(gx), x1 = Math.min(gw - 1, x0 + 1), fx = gx - x0;
      const i = (y * W + x) * 3;
      for (let c = 0; c < 3; c++) {
        const v = (grid[(y0 * gw + x0) * 3 + c] * (1 - fx) + grid[(y0 * gw + x1) * 3 + c] * fx) * (1 - fy)
                + (grid[(y1 * gw + x0) * 3 + c] * (1 - fx) + grid[(y1 * gw + x1) * 3 + c] * fx) * fy;
        out[i + c] = Math.max(0, Math.min(255, Math.round(data[i + c] * BONE[c] / v)));
      }
    }
  }
  return out;
};
// Mean hue of strongly red pixels (r well above g and b); null if the image has none.
const redHue = ({ data }) => {
  let sx = 0, sy = 0, n = 0;
  for (let i = 0; i < data.length; i += 3) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    if (r > 90 && r - g > 60 && r - b > 40) {
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
      let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60; const a = h * Math.PI / 180; sx += Math.cos(a); sy += Math.sin(a); n++;
    }
  }
  return n < 200 ? null : (Math.atan2(sy, sx) * 180 / Math.PI + 360) % 360;
};
const hueDiff = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

const files = await readdir(RAW);
for (const name of NAMES) {
  const file = files.find(f => path.parse(f).name === name);
  if (!file) throw new Error(`missing ${name} in ${RAW}`);
  const src = sharp(path.join(RAW, file)).removeAlpha();
  const before = await rgb(src);
  const { width, height } = before.info;
  const matched = sharp(flatField(before), { raw: { width, height, channels: 3 } });
  const after = await rgb(sharp(await matched.png().toBuffer()));
  const h0 = redHue(before), h1 = redHue(after);
  const hueOk = h0 === null || hueDiff(h0, h1) <= 4;

  if (hueOk) {
    // The generated backgrounds vignette slightly, so the other edges can sit off bone even when
    // the sampled corner is exact. Bake a 96px fade to bone into the image edges: the photo then
    // meets the page with no seam, and the page CSS stays flat (no overlay, no blend).
    const FEATHER = 96;
    const frame = Buffer.alloc(width * height * 4);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const d = Math.min(x, y, width - 1 - x, height - 1 - y);
      const a = d >= FEATHER ? 0 : Math.round(255 * Math.pow(1 - d / FEATHER, 2));
      const i = (y * width + x) * 4;
      frame[i] = BONE[0]; frame[i + 1] = BONE[1]; frame[i + 2] = BONE[2]; frame[i + 3] = a;
    }
    const feathered = await sharp(await matched.png().toBuffer())
      .composite([{ input: frame, raw: { width, height, channels: 4 } }]).png().toBuffer();
    const corner = cornerAvg(await rgb(sharp(feathered))).map(Math.round);
    if (!corner.every((v, c) => Math.abs(v - BONE[c]) <= 2)) throw new Error(`${name}: corner ${corner} not within 2 of #F3F0EA`);
    await sharp(feathered).toFile(`${OUT}/${name}.png`);
    await sharp(`${OUT}/${name}.png`).webp({ quality: 82 }).toFile(`${OUT}/${name}.webp`);
    console.log(`${name}: matched · corner ${corner} · red hue ${h0?.toFixed(1) ?? '—'}→${h1?.toFixed(1) ?? '—'} · ${width}×${height}`);
  } else {
    const inset = sharp(path.join(RAW, file)).removeAlpha()
      .extend({ top: 48, bottom: 48, left: 48, right: 48, background: { r: BONE[0], g: BONE[1], b: BONE[2] } });
    await inset.clone().png().toFile(`${OUT}/${name}.png`);
    await inset.clone().webp({ quality: 82 }).toFile(`${OUT}/${name}.webp`);
    console.log(`${name}: INSET (red hue drifted: ${h0?.toFixed(1)}→${h1?.toFixed(1)}) · ${width + 96}×${height + 96}`);
  }
}
