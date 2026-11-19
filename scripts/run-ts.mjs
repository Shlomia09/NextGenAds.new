// Runs a TypeScript script or test file with Node: bundles it with esbuild into a temp .mjs.
//   node scripts/run-ts.mjs scripts/load-reference-dataset.ts [args…]
//   node scripts/run-ts.mjs --test tests/*.test.ts
// (vitest/vite-node need rollup's native binary, which Application Control blocks on this machine.)
import { build } from 'esbuild';
import { mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const testMode = args[0] === '--test';

// Windows shells don't expand globs, so a 'dir/*.test.ts' argument is expanded here.
const expand = (p) => {
  if (!p.includes('*')) return [p];
  const pattern = new RegExp('^' + basename(p).split('*').map(s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
  return readdirSync(dirname(p)).filter(f => pattern.test(f)).sort().map(f => join(dirname(p), f));
};
const entries = (testMode ? args.slice(1) : [args[0]]).filter(Boolean).flatMap(expand);
const rest = testMode ? [] : args.slice(1);
if (!entries.length) { console.error('usage: node scripts/run-ts.mjs [--test] <file.ts> …'); process.exit(2); }

const out = mkdtempSync(join(tmpdir(), 'rouge-ts-'));
const outFiles = [];
for (const entry of entries) {
  const outfile = join(out, basename(entry).replace(/\.ts$/, '.mjs'));
  await build({
    entryPoints: [entry], outfile, bundle: true, platform: 'node', format: 'esm',
    packages: 'external', target: 'node20', logLevel: 'warning',
  });
  outFiles.push(outfile);
}
// Bundles run from the repo root, so relative paths (data/reference/, supabase/…) still resolve.
const res = spawnSync(process.execPath, testMode ? ['--test', ...outFiles] : [outFiles[0], ...rest], { stdio: 'inherit', cwd: process.cwd() });
process.exit(res.status ?? 1);
