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
    const f = path.join(ROOT, i.file);
    assert.ok(fs.statSync(f).size < 200_000, `${i.file} is over 200 KB`);
    assert.ok(i.width <= 1200 && i.height > 0, i.file);
  }
});

test('every photo on a page is credited, has size, alt text and a visible credit', () => {
  const credited = new Set(credits.images.map((i) => i.file));
  for (const file of htmlFiles(ROOT)) {
    const html = fs.readFileSync(file, 'utf8');
    for (const fig of html.matchAll(/<figure class="(?:actor|place)-photo">([\s\S]*?)<\/figure>/g)) {
      const img = fig[1].match(/<img[^>]*>/)[0];
      const src = img.match(/src="([^"]+)"/)[1];
      assert.ok(credited.has(src), `${src} on ${file} is not in media-credits.json`);
      assert.match(img, /width="\d+"/);
      assert.match(img, /height="\d+"/);
      assert.match(img, /alt="[^"]+"/);
      assert.match(fig[1], /<figcaption>[\s\S]*(CC BY|CC0)[\s\S]*<\/figcaption>/, `${src} has no visible credit`);
    }
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
  }
});

test('the credits page lists every image and video', () => {
  const html = fs.readFileSync(path.join(ROOT, 'credits.html'), 'utf8');
  for (const i of credits.images) assert.ok(html.includes(i.sourceUrl.replace(/&/g, '&amp;')), i.file);
  for (const v of credits.videos) assert.ok(html.includes(v.sourceUrl), v.youtubeId);
});
