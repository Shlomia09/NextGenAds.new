// Normalise the material stills to the page background (--bg in light: #F3F0EA).
//
//   node scripts/match-bone.mjs <raw dir>
//
// Expects <raw dir>/{powder-arc,lipstick-section,pipette-drop}.{png,webp,jpg}.
// For each file: scale RGB so the top-left 8×8 block lands on #F3F0EA, then verify
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
  const avg = cornerAvg(before);
  const matched = src.clone().linear(BONE.map((v, c) => v / avg[c]), [0, 0, 0]);
  const after = await rgb(sharp(await matched.png().toBuffer()));
  const corner = cornerAvg(after).map(Math.round);
  const cornerOk = corner.every((v, c) => Math.abs(v - BONE[c]) <= 2);
  const h0 = redHue(before), h1 = redHue(after);
  const hueOk = h0 === null || hueDiff(h0, h1) <= 4;

  const { width, height } = before.info;
  if (cornerOk && hueOk) {
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
    await sharp(feathered).toFile(`${OUT}/${name}.png`);
    await sharp(`${OUT}/${name}.png`).webp({ quality: 82 }).toFile(`${OUT}/${name}.webp`);
    console.log(`${name}: matched · corner ${corner} · red hue ${h0?.toFixed(1) ?? '—'}→${h1?.toFixed(1) ?? '—'} · ${width}×${height}`);
  } else {
    const inset = sharp(path.join(RAW, file)).removeAlpha()
      .extend({ top: 48, bottom: 48, left: 48, right: 48, background: { r: BONE[0], g: BONE[1], b: BONE[2] } });
    await inset.clone().png().toFile(`${OUT}/${name}.png`);
    await inset.clone().webp({ quality: 82 }).toFile(`${OUT}/${name}.webp`);
    console.log(`${name}: INSET (corner ok ${cornerOk}, hue ok ${hueOk}; corner ${corner}, red hue ${h0?.toFixed(1)}→${h1?.toFixed(1)}) · ${width + 96}×${height + 96}`);
  }
}
