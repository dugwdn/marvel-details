// Our CSS and JS links carry ?v=<md5 of the file> so a deploy never pairs new
// HTML with a browser's (or Cloudflare's) 4-hour-old CSS. tools/menu.mjs writes them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { htmlFiles } from '../tools/check-links.mjs';
import { assetVersion, versionAssets } from '../tools/menu.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

test('every local CSS and JS link carries the current version of its file', () => {
  const bad = [];
  for (const file of htmlFiles(ROOT)) {
    const html = fs.readFileSync(file, 'utf8');
    const rel = path.relative(ROOT, file);
    for (const [, url] of html.matchAll(/<(?:link|script)\b[^>]*?\s(?:href|src)="(\/(?:css|js)\/[^"]+)"/g)) {
      const [asset, query] = url.split('?');
      if (!fs.existsSync(path.join(ROOT, asset))) continue;
      if (query !== `v=${assetVersion(asset)}`) bad.push(`${rel}: ${url}`);
    }
  }
  assert.deepEqual(bad, [], 'run node tools/menu.mjs');
});

test('versionAssets replaces an old version and leaves other links alone', () => {
  const v = assetVersion('/css/theme.css');
  const html = '<link rel="stylesheet" href="/css/theme.css?v=0000aaaa"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bangers"><a href="/js/x.js">x</a>';
  assert.equal(versionAssets(html),
    `<link rel="stylesheet" href="/css/theme.css?v=${v}"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bangers"><a href="/js/x.js">x</a>`);
});
