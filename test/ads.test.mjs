import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { htmlFiles } from '../tools/check-links.mjs';

const root = new URL('../public', import.meta.url).pathname;
const src = fs.readFileSync(`${root}/js/ads.js`, 'utf8');

test('every ad box carries the AdSense slot and publisher', () => {
  assert.match(src, /var CLIENT = 'ca-pub-7178251279168670'/);
  assert.match(src, /var SLOT = '7081225657'/);
  assert.match(src, /SLOTS = \{ top: SLOT, mid: SLOT, end: SLOT \}/);
  assert.match(src, /setAttribute\('data-ad-slot', SLOTS\[name\]\)/);
  assert.match(src, /setAttribute\('data-ad-client', CLIENT\)/);
  assert.match(src, /Advertisement/);
  assert.match(src, /min-height/, 'reserves height');
  assert.match(src, /data-ad-status="filled"/, 'hidden until filled');
  const names = src.match(/var names = \[(.*?)\]/)[1].split(',');
  assert.equal(names.length, 3, 'no more than three boxes');
});

test('no ad boxes or ad script on account, sign-in or My Marvel pages', () => {
  assert.match(src, /account\|me/);
  for (const f of htmlFiles(root)) {
    const h = fs.readFileSync(f, 'utf8');
    if (/\/(account|me)(\/index)?\.html$/.test(f)) {
      assert.ok(!h.includes('js/ads.js') && !h.includes('adsbygoogle'), f);
    }
  }
});

test('hard-coded placeholder boxes carry no other slot id', () => {
  for (const f of htmlFiles(root)) {
    const h = fs.readFileSync(f, 'utf8');
    for (const m of h.matchAll(/data-ad-slot="([^"]*)"/g)) assert.equal(m[1], '7081225657', f);
  }
});
