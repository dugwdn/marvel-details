// Link previews: every page sends a full Open Graph set so a texted link shows a
// picture, title and description (iMessage, Android Messages, Facebook, LinkedIn).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../public/', import.meta.url).pathname;
const pages = [];
(function walk(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p);
    else if (n.endsWith('.html')) pages.push(p);
  }
})(ROOT);

const meta = (html, key) => {
  const m = html.match(new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`));
  return m ? m[1] : null;
};

// JPEG/PNG width and height without a library.
function size(file) {
  const b = readFileSync(file);
  if (b[0] === 0x89) return [b.readUInt32BE(16), b.readUInt32BE(20)];
  let i = 2;
  while (i < b.length) {
    const marker = b[i + 1], len = b.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc2) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    i += 2 + len;
  }
  return [0, 0];
}

for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  if (page.endsWith('404.html') || !/<title/.test(html) || /http-equiv="refresh"/.test(html)) continue;
  test(`link preview tags: ${page.slice(ROOT.length)}`, () => {
    for (const k of ['og:title', 'og:description', 'og:url', 'og:image', 'og:image:alt', 'twitter:card']) {
      assert.ok(meta(html, k), `missing ${k}`);
    }
    assert.equal(meta(html, 'twitter:card'), 'summary_large_image');
    const img = meta(html, 'og:image');
    assert.match(img, /^https:\/\//, 'og:image must be a full https address');
    const local = join(ROOT, new URL(img).pathname);
    assert.ok(existsSync(local), `picture file missing: ${local}`);
    assert.deepEqual(size(local), [1200, 630], 'picture must be 1200 x 630');
  });
}
