// Link previews: writes the full Open Graph set into every page in public/ so a texted
// link shows a picture, title and description. Safe to run again: it replaces the old set.
// Run after any tool that writes pages:  node tools/share-tags.mjs
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const SITE = 'MCU Easter Eggs';
const BASE = 'https://mcueastereggs.com';
const IMAGE = '/img/share-2026-10.jpg';
const ALT = 'MCU Easter Eggs: hidden details in every Marvel movie';
const ROOT = new URL('../public/', import.meta.url).pathname;
const SKIP = new Set(['404.html']);

const esc = (s) => s.replace(/&(?![a-z]+;|#\d+;|#x[0-9a-f]+;)/gi, '&amp;').replace(/"/g, '&quot;');
const plain = (s) => s.replace(/\s+/g, ' ').trim();

function pageUrl(file, html) {
  const c = html.match(/<link rel="canonical" href="([^"]+)"/);
  if (c) return c[1];
  let p = '/' + relative(ROOT, file).split(sep).join('/');
  p = p.endsWith('index.html') ? p.slice(0, -'index.html'.length) : p.replace(/\.html$/, '');
  return BASE + p;
}

export function tag(file, html) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/);
  if (!title || /http-equiv="refresh"/i.test(html)) return html;
  const desc = html.match(/<meta name="description" content="([^"]*)"/);
  html = html.replace(/[ \t]*<meta (?:property="og:[^"]*"|name="twitter:[^"]*")[^>]*>\r?\n?/g, '');
  const url = pageUrl(file, html);
  const indent = (html.match(/\n([ \t]*)<title/) || [, ''])[1];
  const tags = [
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${esc(SITE)}">`,
    `<meta property="og:title" content="${esc(plain(title[1]))}">`,
    `<meta property="og:description" content="${desc ? desc[1] : ''}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${BASE}${IMAGE}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${esc(ALT)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
  ];
  if (!/rel="canonical"/.test(html)) tags.push(`<link rel="canonical" href="${esc(url)}">`);
  const at = html.match(/<meta name="description"[^>]*>\r?\n?/) || html.match(/<\/title>\r?\n?/);
  const i = at.index + at[0].length;
  const lead = at[0].endsWith('\n') ? '' : '\n';
  return html.slice(0, i) + lead + tags.map((t) => indent + t + '\n').join('') + html.slice(i);
}

function walk(d, out = []) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (n.endsWith('.html') && !SKIP.has(n)) out.push(p);
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let n = 0;
  for (const f of walk(ROOT)) {
    const before = readFileSync(f, 'utf8');
    const after = tag(f, before);
    if (after !== before) { writeFileSync(f, after); n++; }
  }
  console.log(`share-tags: ${n} pages updated`);
}
