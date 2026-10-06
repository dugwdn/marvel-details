import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { htmlFiles } from '../tools/check-links.mjs';

const root = fileURLToPath(new URL('../public', import.meta.url));
const src = fs.readFileSync(`${root}/js/ads.js`, 'utf8');

test('every ad box carries the AdSense slot and publisher', () => {
  assert.match(src, /var CLIENT = 'ca-pub-7178251279168670'/);
  assert.match(src, /var SLOT = '7081225657'/);
  assert.match(src, /SLOTS = \{ top: SLOT, mid: SLOT, end: SLOT \}/);
  assert.match(src, /setAttribute\('data-ad-slot', SLOTS\[name\]\)/);
  assert.match(src, /setAttribute\('data-ad-client', CLIENT\)/);
  assert.match(src, /Advertisement/);
  assert.match(src, /Ad space/);
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

test('every box is an always-visible "Ad space" placeholder with reserved height', () => {
  const css = fs.readFileSync(`${root}/css/theme.css`, 'utf8');
  const rule = css.match(/html body \.ad-box \{([^}]*)\}/)[1];
  assert.match(rule, /min-height: 280px/);
  assert.match(rule, /max-width: 100%/);
  assert.match(rule, /box-sizing: border-box/);
  assert.match(rule, /border: 1px dashed/);
  assert.doesNotMatch(rule, /display: none|height: 0/, 'never hidden');
  assert.match(css, /min-width: 768px\) \{ html body \.ad-box \{ min-height: 250px/);
  assert.match(css, /data-ad-status="filled"\]\) \.ad-ph \{ display: none/);
  assert.match(css, /data-ad-status="filled"\]\) \.ad-label \{ display: block/);
  assert.match(src, /setAttribute\('data-ad-placeholder', name\)/);
});

test('pages with ads carry top and end placeholders in their HTML', () => {
  for (const f of htmlFiles(root)) {
    const h = fs.readFileSync(f, 'utf8');
    if (!h.includes('/js/ads.js')) {
      assert.ok(!h.includes('data-ad-placeholder'), f);
      continue;
    }
    for (const n of ['top', 'end']) {
      const c = h.split(`data-ad-placeholder="${n}"`).length - 1;
      assert.equal(c, 1, `${f}: one ${n} box`);
    }
    assert.ok(!h.includes('class="ad-slot"'), `${f}: old ad-slot box`);
  }
});
