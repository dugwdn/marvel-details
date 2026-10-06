import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { htmlFiles } from '../tools/check-links.mjs';

const ID = 'G-NESPZD6XSQ';

test('every html page has exactly one GA4 loader and one config, with the real ID', () => {
  const files = htmlFiles();
  assert.ok(files.length > 90);
  for (const f of files) {
    const html = fs.readFileSync(f, 'utf8');
    assert.equal(html.match(/gtag\('config'/g)?.length, 1, `${f}: one config`);
    assert.equal(html.match(/googletagmanager\.com\/gtag\/js/g)?.length, 1, `${f}: one loader`);
    assert.ok(html.includes(`gtag('config', '${ID}')`), `${f}: ID`);
    assert.ok(html.includes(`gtag/js?id=${ID}`), `${f}: loader ID`);
    assert.ok(!html.includes('G-XXXXXXXXXX'), `${f}: no placeholder`);
  }
});

test('GA4 is sent no user data', () => {
  for (const f of htmlFiles()) {
    const html = fs.readFileSync(f, 'utf8');
    assert.ok(!/gtag\('(set|event)'|user_id|setUserId/.test(html), `${f}: no extra gtag calls`);
  }
  for (const f of ['members.js', 'account.js']) {
    const js = fs.readFileSync(new URL(`../public/js/${f}`, import.meta.url), 'utf8');
    assert.ok(!/gtag\(/.test(js), `${f} does not call gtag`);
  }
});
