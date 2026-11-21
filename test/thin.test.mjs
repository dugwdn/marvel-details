// Thin page check (ADR-116 in dugwdn/wdn-website): every page Google may index passes scripts/thin-check.mjs.
// Never lower a bar or add a page to the baseline in thin-check.json to get a page through; give it its own words.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('no thin, copied or near-duplicate page can be published', () => {
  const r = spawnSync(process.execPath, ['scripts/thin-check.mjs'], { cwd: fileURLToPath(new URL('..', import.meta.url)), encoding: 'utf8' });
  assert.equal(r.status, 0, `thin page check failed:\n${r.stdout}${r.stderr}`);
});
