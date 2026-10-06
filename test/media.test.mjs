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

test('every photo on a page is credited, has size, alt text and a visible credit', () => {
  const credited = new Set(credits.images.map((i) => i.file));
  for (const file of htmlFiles(ROOT)) {
    const html = fs.readFileSync(file, 'utf8');
    let inFigures = 0;
    for (const fig of html.matchAll(/<figure class="[^"]*">([\s\S]*?)<\/figure>/g)) {
      const tag = fig[1].match(/<img[^>]*src="\/img\/[^>]*>/);
      if (!tag) continue;
      inFigures++;
      const img = tag[0];
      const src = img.match(/src="([^"]+)"/)[1];
      assert.ok(credited.has(src), `${src} on ${file} is not in media-credits.json`);
      assert.match(img, /width="\d+"/);
      assert.match(img, /height="\d+"/);
      assert.match(img, /alt="[^"]+"/);
      assert.match(fig[1], /<figcaption>[\s\S]*(CC BY|CC0|Public domain)[\s\S]*<\/figcaption>/, `${src} has no visible credit`);
    }
    const all = (html.match(/<img[^>]*src="\/img\//g) || []).length;
    assert.equal(all, inFigures, `${file} has a photo outside a credited figure`);
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
