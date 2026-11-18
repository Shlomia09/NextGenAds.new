// Runs a TypeScript script or test file with Node: bundles it with esbuild into a temp .mjs.
//   node scripts/run-ts.mjs scripts/load-reference-dataset.ts [args…]
//   node scripts/run-ts.mjs --test tests/*.test.ts
// (vitest/vite-node need rollup's native binary, which Application Control blocks on this machine.)
import { build } from 'esbuild';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const testMode = args[0] === '--test';
const entries = testMode ? args.slice(1) : [args[0]];
const rest = testMode ? [] : args.slice(1);
if (!entries.length || !entries[0]) { console.error('usage: node scripts/run-ts.mjs [--test] <file.ts> …'); process.exit(2); }

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
