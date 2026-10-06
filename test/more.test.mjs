import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { htmlFiles } from '../tools/check-links.mjs';

const more = fs.readFileSync(new URL('../public/more/index.html', import.meta.url), 'utf8');

test('More from us page lists our live sites and never names a person', () => {
  assert.match(more, /<title>More from us \| MCU Easter Eggs<\/title>/);
  assert.match(more, /<h1>More from us<\/h1>/);
  for (const host of ['partygamesarcade.com', 'kidslearningarcade.com', 'getrightplace.app', 'credibletheories.com', 'webdesignnerd.com', 'akronhomecosts.com', 'getgainsville.app']) {
    assert.ok(more.includes(`https://${host}`), host);
  }
  assert.ok(!more.includes('mcueastereggs.com"'), 'the page leaves itself out');
  assert.doesNotMatch(more, /More from Doug|Doug's sites|my sites/i);
});

test('every page footer says More from us and links /more/', () => {
  for (const f of htmlFiles(new URL('../public', import.meta.url).pathname)) {
    const h = fs.readFileSync(f, 'utf8');
    if (!h.includes('site-footer-projects')) continue;
    assert.ok(h.includes('<strong>More from us:</strong>') && h.includes('href="/more/"'), f);
    assert.doesNotMatch(h, /More from Doug/);
  }
});
