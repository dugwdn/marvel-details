// Every link on the site has to go somewhere: no empty or "#" hrefs, every
// site address has a file behind it, every #anchor exists on its page, and
// every page the site's data builds links to (scenes, callbacks, characters,
// rabbit holes, movie hubs) exists. Browser check: node tools/crawl-site.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { htmlFiles, exists, brokenLinks } from '../tools/check-links.mjs';

const ROOT = new URL('../public', import.meta.url).pathname;
const pages = htmlFiles(ROOT).map((f) => ({ rel: path.relative(ROOT, f), html: fs.readFileSync(f, 'utf8') }));
const data = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', p), 'utf8'));

// The file Cloudflare Pages serves for a site address.
function fileFor(address) {
  const u = address.split(/[?#]/)[0];
  const bare = u.replace(/\/$/, '');
  return [u === '/' ? '/index.html' : u, `${bare}.html`, `${bare}/index.html`]
    .map((c) => path.join(ROOT, c)).find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
}
const ids = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));

test('no link is empty, "#" or javascript:', () => {
  const bad = [];
  for (const { rel, html } of pages) {
    for (const [, href] of html.matchAll(/<a\b[^>]*?\shref="([^"]*)"/g)) {
      if (href.trim() === '' || href === '#' || /^javascript:/i.test(href)) bad.push(`${rel}: href="${href}"`);
    }
    if (/<a\b(?![^>]*\shref=)[^>]*>/.test(html)) bad.push(`${rel}: <a> without href`);
  }
  assert.deepEqual(bad, []);
});

test('scripts never build empty or "#" links', () => {
  const bad = [];
  for (const f of fs.readdirSync(path.join(ROOT, 'js'))) {
    const js = fs.readFileSync(path.join(ROOT, 'js', f), 'utf8');
    for (const m of js.matchAll(/href=(["'])(#?)\1|href = (["'])#\3/g)) bad.push(`js/${f}: ${m[0]}`);
  }
  assert.deepEqual(bad, []);
});

test('every site address on every page and in the sitemap has a page behind it', () => {
  assert.deepEqual(brokenLinks(ROOT), []);
});

test('every #anchor points at an id that exists', () => {
  const bad = [];
  for (const { rel, html } of pages) {
    for (const [, href] of html.matchAll(/<a\b[^>]*?\shref="((?:\/[^"#]*)?#[^"]+)"/g)) {
      const [address, anchor] = href.split('#');
      const target = address ? fileFor(address) : path.join(ROOT, rel);
      if (!target) continue; // reported by the page test above
      const targetHtml = fs.readFileSync(target, 'utf8');
      // Pages that draw their cards from data (scenes) give each card its id from the data.
      const dataIds = /-scenes\.html$/.test(target) ? new Set(data('deleted-scenes.json').deletedScenes.map((s) => s.id)) : new Set();
      if (!ids(targetHtml).has(anchor) && !dataIds.has(anchor)) bad.push(`${rel}: ${href}`);
    }
  }
  assert.deepEqual(bad, []);
});

test('pages the data links to exist', () => {
  const missing = [];
  const need = (addr, why) => { if (!exists(addr, ROOT)) missing.push(`${why}: ${addr}`); };
  for (const c of data('callbacks.json').callbacks) {
    need(`/callbacks/callback-${c.id}`, c.id);
    for (const a of c.relatedArticles || []) need(`/articles/${a}`, `${c.id} relatedArticles`);
  }
  for (const h of data('rabbit-holes.json').rabbitHoles) need(`/rabbit-holes/${h.slug}`, h.id);
  for (const c of data('characters.json').characters) need(`/characters/${c.slug}`, c.id);
  for (const s of data('deleted-scenes.json').deletedScenes) need(`/scenes/${s.movieId}-scenes`, s.id);
  for (const f of data('movie-hubs.json').films) {
    need(`/movies/${f.id}`, f.id);
    for (const d of f.details) if (d.link) need(d.link.href, `${f.id} "${d.title}"`);
  }
  assert.deepEqual(missing, []);
});

test('movie hubs: every detail and credits scene names a real source', () => {
  for (const f of data('movie-hubs.json').films) {
    assert.ok(f.details.length >= 5, `${f.id} has too few details`);
    for (const d of [f.facts, ...f.details, ...f.creditsScenes]) {
      assert.match(d.source?.url || '', /^https:\/\/\S+$/, `${f.id}: ${d.title || d.when || 'facts'}`);
      assert.ok(d.source.name, `${f.id}: source name`);
    }
    const hub = fs.readFileSync(path.join(ROOT, 'movies', `${f.id}.html`), 'utf8');
    for (const d of f.details) {
      const t = d.title.replace(/&/g, '&amp;').replace(/'/g, '&#039;').replace(/"/g, '&quot;');
      assert.ok(hub.includes(t), `${f.id} page is out of date; run node tools/build-hubs.mjs`);
    }
  }
});

test('cards on movie hubs that look like links are links', () => {
  for (const f of data('movie-hubs.json').films) {
    const hub = fs.readFileSync(path.join(ROOT, 'movies', `${f.id}.html`), 'utf8');
    // "Read more →" style text must sit inside a link.
    assert.doesNotMatch(hub.replace(/<a\b[^>]*>[\s\S]*?<\/a>/g, ''), /Read (Full Analysis|more)\s*→/i, f.id);
  }
});
