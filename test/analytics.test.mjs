import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { htmlFiles } from '../tools/check-links.mjs';
import { GA_ID, gaEnabled, gaSnippet } from '../tools/menu.mjs';

const ID = GA_ID;

test('every html page matches GA_ID in tools/menu.mjs: one tag when set, none when off', () => {
  const files = htmlFiles();
  assert.ok(files.length > 90);
  for (const f of files) {
    const html = fs.readFileSync(f, 'utf8');
    assert.ok(!html.includes('G-XXXXXXXXXX'), `${f}: no placeholder`);
    if (!gaEnabled(ID)) {
      assert.ok(!/googletagmanager|gtag\(/.test(html), `${f}: analytics off, no Google tag`);
      continue;
    }
    assert.equal(html.match(/gtag\('config'/g)?.length, 1, `${f}: one config`);
    assert.equal(html.match(/googletagmanager\.com\/gtag\/js/g)?.length, 1, `${f}: one loader`);
    assert.ok(html.includes(gaSnippet(ID)), `${f}: current snippet with privacy flags (run node tools/menu.mjs)`);
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

test('empty or placeholder GA4 ID means off: no Google tag at all', () => {
  for (const id of ['', undefined, 'G-XXXXXXXXXX', 'G-XXXX', 'UA-123']) {
    assert.equal(gaEnabled(id), false, String(id));
    assert.equal(gaSnippet(id), '', String(id));
  }
});

test('a set ID gives the tag with the privacy flags', () => {
  const s = gaSnippet('G-TEST12345');
  assert.ok(s.includes('googletagmanager.com/gtag/js?id=G-TEST12345'));
  assert.match(s, /allow_google_signals: false/);
  assert.match(s, /allow_ad_personalization_signals: false/);
  assert.match(s, /gtag\('consent', 'default', \{ ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted' \}\)/);
  assert.ok(s.indexOf("'consent'") < s.indexOf("'config'"), 'consent default comes before config');
});

test('page_location sent to GA4 has no query string or hash', () => {
  const inline = gaSnippet('G-TEST12345').match(/<script>([\s\S]*?)<\/script>/)[1];
  const window = { dataLayer: [] };
  const location = { origin: 'https://mcueastereggs.com', pathname: '/movies/endgame', search: '?q=thanos&email=a@b.c', hash: '#x', href: 'https://mcueastereggs.com/movies/endgame?q=thanos&email=a@b.c#x' };
  vm.runInNewContext(inline, { window, location, dataLayer: window.dataLayer });
  const config = [...window.dataLayer].map((a) => [...a]).find((a) => a[0] === 'config');
  assert.equal(config[2].page_location, 'https://mcueastereggs.com/movies/endgame');
  assert.ok(!JSON.stringify(window.dataLayer.map((a) => [...a])).includes('?'), 'no query anywhere');
});
