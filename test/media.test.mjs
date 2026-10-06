// Every photo and trailer on the site has to be in media-credits.json,
// with a free license, a size limit, reserved space and an official channel.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { htmlFiles } from '../tools/check-links.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const credits = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/media-credits.json'), 'utf8'));
const FREE = /^(CC BY(-SA)? [0-9.]+|CC0.*|Public domain)$/;
// Doug 2026-10-06: official Marvel/Sony/Disney channels, plus the licensed trailer channels.
const OFFICIAL = /^(Marvel Entertainment|Marvel Studios|Disney Plus|Spider-Man \(Sony Pictures official channel\)|Sony Pictures Entertainment|Movieclips|Movieclips Trailers|Rotten Tomatoes Trailers|Rotten Tomatoes Classic Trailers|Fandango)$/;

test('every credited image is a free license, under 200 KB and 1200 px wide', () => {
  for (const i of credits.images) {
    assert.match(i.license, FREE, i.file);
    assert.ok(i.author && i.sourceUrl.startsWith('https://commons.wikimedia.org/wiki/File:'), i.file);
    for (const f of [i.file, ...Object.values(i.srcset || {})]) {
      assert.ok(fs.statSync(path.join(ROOT, f)).size < 200_000, `${f} is over 200 KB`);
    }
    assert.ok(i.width <= 1200 && i.height > 0, i.file);
    assert.ok(!/(^|[^a-z])(poster|screenshot)([^a-z]|$)/i.test(i.sourceUrl), `${i.file} looks like studio art`);
    if (i.kind === 'place') assert.match(i.factSource || '', /^https:\/\//, `${i.file}: a place needs a source for its film fact`);
  }
});

test('photos are not credited twice and every list portrait names its character', () => {
  const files = credits.images.map((i) => i.file);
  assert.equal(new Set(files).size, files.length);
  const ids = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mcu-characters.json'), 'utf8')).characters.map((c) => c.id));
  for (const i of credits.images) if (i.character) assert.ok(ids.has(i.character), `${i.file}: unknown character ${i.character}`);
});

// Doug 2026-10-06: no source or license lines on the pages; credits live on /credits,
// which every footer links to (the CC licenses need the credit to be reachable).
test('every photo on a page is in media-credits.json, has size and alt, and no caption credit', () => {
  const credited = new Set(credits.images.map((i) => i.file));
  for (const file of htmlFiles(ROOT)) {
    const html = fs.readFileSync(file, 'utf8');
    for (const tag of html.match(/<img[^>]*src="\/img\/[^>]*>/g) || []) {
      const src = tag.match(/src="([^"]+)"/)[1];
      assert.ok(credited.has(src), `${src} on ${file} is not in media-credits.json`);
      assert.match(tag, /width="\d+"/);
      assert.match(tag, /height="\d+"/);
      assert.match(tag, /alt="[^"]*"/, `${src} on ${file} has no alt`);
    }
    if (path.basename(file) === 'credits.html') continue;
    assert.ok(!/Wikimedia Commons|CC BY|class="(?:yt|trailer)-credit"/.test(html), `${file} still shows a source line`);
    if (/<img[^>]*src="\/img\/|data-yt=/.test(html)) assert.match(html, /<a href="\/credits">Photos and Credits<\/a>/, `${file} has media but no footer link to /credits`);
  }
});

test('movie, deleted-scene and callback pages have a trailer in the header', () => {
  const pages = ['movies', 'scenes', 'callbacks'].flatMap((d) => fs.readdirSync(path.join(ROOT, d))
    .filter((f) => /^(?!index)[a-z0-9-]+\.html$/.test(f)).map((f) => path.join(ROOT, d, f)));
  assert.ok(pages.length >= 40);
  for (const file of pages) {
    const html = fs.readFileSync(file, 'utf8');
    const head = html.match(/class="(?:movie-header|detail-header) has-hero"[\s\S]*?<!-- \/media:film-hero -->/);
    assert.ok(head && /class="yt-play film-trailer-btn" data-yt="/.test(head[0]), `${file} has no trailer in its header`);
  }
});

test('every embedded video is a credited official or licensed-channel upload, nocookie, lazy and titled', () => {
  const ids = new Map(credits.videos.map((v) => [v.youtubeId, v]));
  for (const v of credits.videos) assert.match(v.channel, OFFICIAL, v.youtubeId);
  for (const file of htmlFiles(ROOT)) {
    const html = fs.readFileSync(file, 'utf8');
    assert.ok(!/youtube\.com\/embed/.test(html), `${file} embeds youtube.com, use youtube-nocookie.com`);
    for (const m of html.matchAll(/<iframe[^>]*youtube-nocookie\.com\/embed\/([A-Za-z0-9_-]{11})[^>]*>/g)) {
      assert.ok(ids.has(m[1]), `${m[1]} on ${file} is not in media-credits.json`);
      assert.match(m[0], /loading="lazy"/);
      assert.match(m[0], /title="[^"]+"/);
    }
    for (const m of html.matchAll(/<button[^>]*data-yt="([^"]*)"[^>]*>/g)) {
      assert.ok(ids.has(m[1]), `trailer card ${m[1]} on ${file} is not in media-credits.json`);
      assert.match(m[0], /data-title="[^"]+"/);
      assert.match(m[0], /aria-label="[^"]+"/);
    }
    assert.ok(!/i\.ytimg\.com|img\.youtube\.com/.test(html), `${file} shows a YouTube thumbnail outside the player`);
  }
});

test('the home page carries the photo wall, the spotlight and every film trailer', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const films = credits.videos.filter((v) => v.film && v.page === '/');
  assert.ok(films.length >= 40, 'expected trailers for every MCU film and series');
  for (const v of films) assert.ok(html.includes(`data-yt="${v.youtubeId}"`), `${v.film} trailer is missing from the home page`);
  assert.ok((html.match(/class="face-tile"/g) || []).length >= 24, 'photo wall is too small');
  assert.match(html, /class="faces-spotlight"/);
  assert.match(html, /src="\/js\/media\.js(\?v=[0-9a-f]{8})?"/);
  // Only the first spotlight photo loads eagerly; everything else waits until it is near the screen.
  assert.equal((html.match(/fetchpriority="high"/g) || []).length, 1);
});

test('the credits page lists every image and video', () => {
  const html = fs.readFileSync(path.join(ROOT, 'credits.html'), 'utf8');
  for (const i of credits.images) assert.ok(html.includes(i.sourceUrl.replace(/&/g, '&amp;')), i.file);
  for (const v of credits.videos) assert.ok(html.includes(v.sourceUrl), v.youtubeId);
});

// Doug 2026-10-06: the home spotlight shows abilities, allies, enemies and every title, all linked.
test('spotlight data names real characters and has a source; every spotlight link is a real page', () => {
  const mcu = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mcu-characters.json'), 'utf8'));
  const ids = new Set(mcu.characters.map((c) => c.id));
  const spot = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/spotlight.json'), 'utf8')).characters;
  for (const [id, s] of Object.entries(spot)) {
    assert.ok(ids.has(id), `spotlight: unknown character ${id}`);
    for (const x of [...s.allies, ...s.enemies]) assert.ok(ids.has(x), `${id}: unknown ally or enemy ${x}`);
    assert.match(s.source, /^https:\/\//, `${id}: needs a source`);
  }
  const home = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const box = home.slice(home.indexOf('class="faces-spotlight"'), home.indexOf('class="faces-wall"'));
  const hrefs = [...box.matchAll(/href="([^"]+)"/g)].map((x) => x[1]);
  assert.ok(hrefs.length > 100, 'spotlight should carry its title, ally and enemy links');
  for (const h of hrefs) {
    const q = h.match(/^\/characters\/all\/\?in=(\d+)$/);
    if (q) { assert.ok(+q[1] < mcu.titles.length, h); continue; }
    const [p, hash] = h.split('#');
    const file = p.endsWith('/') ? `${p}index.html` : `${p}.html`;
    assert.ok(fs.existsSync(path.join(ROOT, file)), `${h}: no page`);
    if (hash) assert.ok(ids.has(hash), `${h}: no such character row`);
  }
});
