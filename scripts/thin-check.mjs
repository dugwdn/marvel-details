#!/usr/bin/env node
// WDN thin page checker, version 2.2 (2026-11-21: H1s and controls inside scripts no longer count; a quote repeated on more than boiler_pages pages is template, not copied text). Source: dugwdn/wdn-website tools/thin-check/thin-check.mjs.
// Sites keep a copy at scripts/thin-check.mjs; change the source, then copy it out (README.md says how).
//
// Doug 2026-11-20: "any web pages we build cannot be considered thin by google. this should be a standard part of any
// web page we build." Rule picked: STRICT. Every public page that Google may index must pass. Pages that already
// failed on the day a site joined are listed in its thin-check.json "baseline"; with --write they get
// noindex, follow and leave the sitemap, so they stay live for readers but out of Google until they are fixed.
//
// It reads the finished HTML files (no JavaScript is run), so words that only appear after a script runs do not count,
// the same way a page that is empty until JavaScript loads looks thin to a crawler.
// Google's guidance it follows: developers.google.com/search/docs/fundamentals/creating-helpful-content and
// developers.google.com/search/docs/essentials/spam-policies (scaled content abuse). Google says it has no preferred
// word count; the own-words bar is a floor, and the duplicate, copied-text and template checks do the real work.
//
// Usage: node scripts/thin-check.mjs [--config thin-check.json] [--dir public] [--write] [--report file.json] [--baseline]
//   (no flags)  check and print; exit 1 when an indexable page fails
//   --write     also put noindex on baseline pages in the built files and drop them from sitemap.xml (build step only)
//   --baseline  write today's failing pages into the config's baseline (only when a site first joins)
//   --report    save every page's numbers as JSON
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULTS = {
  dir: 'public',
  domain: '',                 // e.g. "example.com"; links to other hosts count as outside sources
  min_words: 300,             // own words an indexable content page needs
  tool_words: 150,            // own words a tool page needs, plus a working control (form, input, button, select, canvas)
  boiler_pages: 5,            // a line found on more than this many pages is template, not the page's own words
  dup_fail: 0.50,             // share of a page's own text found on one other page that fails it (a second copy of a page)
  dup_warn: 0.30,             // a big shared block, such as the same source summary pasted onto two pages
  quote_fail: 0.50,           // quoted or reprinted share of the main text that fails it
  template_warn: 0.40,        // own words under this share of the main text warns
  title: [20, 65], description: [70, 160],
  skip: {},                   // {"path or prefix/": "why"}: not public (sign-in screens, app, thank-you pages)
  no_word_check: [],          // checked for titles and links but not words (home, contact, privacy)
  tools: [],                  // pages (or prefixes) that are tools
  facts: [],                  // prefixes for pages that state facts; they should link an outside source
  articles: [],               // prefixes for articles; they should carry a byline
  skip_classes: ['share', 'crumbs', 'breadcrumb', 'ad-ph', 'skip-link', 'vh', 'visually-hidden', 'sr-only'],
  phrases: null,              // optional {"page": "searched phrase (range)"}; when present, indexable pages without one warn
  baseline: {},               // {"page": "date and reason"}: failed on the day the site joined; noindexed by --write
};

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const DROP = new Set(['script', 'style', 'noscript', 'template', 'svg', 'nav', 'aside', 'form', 'select', 'button', 'iframe']);
const QUOTE = new Set(['blockquote', 'q', 'pre']);
const BLOCK = new Set(['p', 'div', 'section', 'article', 'main', 'li', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'tr', 'td', 'th', 'table', 'dt', 'dd', 'dl', 'figcaption', 'figure', 'br', 'hr', 'details', 'summary', 'label']);

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '-', ndash: '-', hellip: '...', rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"', middot: '·', copy: '©' };
export function decode(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') { const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
    return ENT[e.toLowerCase()] ?? m;
  });
}
const attr = (a, name) => { const m = a.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i')); return m ? decode(m[2] ?? m[3] ?? m[4] ?? '') : null; };
const words = (s) => (s.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;
const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

// One page's facts: title, description, robots, H1 count, its main text split into lines, quoted words, links, controls.
export function parsePage(html, opts = {}) {
  const skipCls = new Set(opts.skip_classes || DEFAULTS.skip_classes);
  html = html.replace(/<!--[\s\S]*?-->/g, '');
  const head = (html.match(/<head[\s\S]*?<\/head>/i) || [''])[0];
  const out = { title: '', description: '', robots: '', h1: 0, lines: [], quoteWords: 0, quoteLines: [], links: [], controls: 0, byline: false };
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i); out.title = t ? decode(t[1]).replace(/\s+/g, ' ').trim() : '';
  for (const m of head.matchAll(/<meta\b([^>]*)>/gi)) {
    const n = (attr(m[1], 'name') || '').toLowerCase();
    if (n === 'description') out.description = (attr(m[1], 'content') || '').replace(/\s+/g, ' ').trim();
    if (n === 'robots') out.robots = (attr(m[1], 'content') || '').toLowerCase();
  }
  if (/"author"\s*:/.test(html) || /rel=["']?author/i.test(html)) out.byline = true;
  // Tags inside scripts and templates are not on the page yet (a script that draws a second screen holds its own <h1>).
  const live = html.replace(/<(script|template|style)\b[\s\S]*?<\/\1>/gi, '');
  out.h1 = (live.match(/<h1\b/gi) || []).length;   // anywhere in the page: many heroes sit above <main>
  out.controls = (live.match(/<(form|input|select|textarea|canvas|button)\b/gi) || []).length;
  // The whole body is read, not only <main>: a page's hero often sits above it. Site headers and footers repeat on
  // every page, so the template rule below removes them; menus, scripts, forms, sidebars and hidden parts are skipped here.
  const body = (html.match(/<body\b[\s\S]*<\/body>/i) || [html])[0];
  const stack = []; let drop = 0, quote = 0, buf = '', qbuf = '';
  const flush = () => {
    const s = buf.replace(/\s+/g, ' ').trim(); if (s) out.lines.push(s); buf = '';
    const q = qbuf.replace(/\s+/g, ' ').trim(); if (q) out.quoteLines.push(q); qbuf = '';
  };
  const re = /<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>|([^<]+)/g; let m;
  while ((m = re.exec(body))) {
    if (m[5] !== undefined) {
      if (!drop) { const txt = decode(m[5]); if (quote) { out.quoteWords += words(txt); qbuf += txt; } else buf += txt; }
      continue;
    }
    const close = m[1] === '/', tag = m[2].toLowerCase(), a = m[3] || '';
    if (BLOCK.has(tag)) flush();
    if (!close && tag === 'a') { const h = attr(a, 'href'); if (h) out.links.push({ href: h, inMain: !drop }); }
    if (!close && /\bbyline\b|\bauthor\b/i.test(attr(a, 'class') || '')) out.byline = true;
    if (VOID.has(tag) || m[4] === '/') continue;
    if (!close) {
      const cls = (attr(a, 'class') || '').split(/\s+/);
      const d = DROP.has(tag) || cls.some((c) => skipCls.has(c)) || attr(a, 'hidden') !== null || attr(a, 'aria-hidden') === 'true';
      const q = QUOTE.has(tag);
      stack.push([tag, d, q]); drop += d; quote += q;
    } else {
      if (QUOTE.has(tag)) flush();
      while (stack.length) { const [tg, d, q] = stack.pop(); drop -= d; quote -= q; if (tg === tag) break; }
    }
  }
  flush();
  return out;
}

// Sentences or lines of a page, normalized, so the same template sentence on many pages is recognized.
export function segments(lines) {
  const segs = [];
  for (const l of lines) for (const s of l.split(/(?<=[.!?])\s+/)) { const n = norm(s); if (n) segs.push([s, n]); }
  return segs;
}
function shingles(text, k = 5) {
  const w = text.split(' ').filter(Boolean); const set = new Set();
  for (let i = 0; i + k <= w.length; i++) set.add(w.slice(i, i + k).join(' '));
  return set;
}
const matches = (key, list) => list.some((p) => key === p || (p.endsWith('/') && key.startsWith(p)) || key === p.replace(/\/$/, '') + '/index.html');
export function pageKey(rel) { return rel.split(path.sep).join('/'); }
// Every way a link can name a page: /a/, /a/index.html, /a.html, /a
function urlKeys(key) {
  const k = '/' + key; const ks = [k];
  if (k.endsWith('/index.html')) ks.push(k.slice(0, -10), k.slice(0, -11) || '/');
  else if (k.endsWith('.html')) ks.push(k.slice(0, -5));
  return ks;
}
function resolveLink(href, fromKey, domain) {
  if (/^(mailto:|tel:|sms:|javascript:|#|data:)/i.test(href)) return null;
  let u;
  try { u = new URL(href, 'https://site.invalid/' + fromKey); } catch { return null; }
  const host = u.hostname.replace(/^www\./, '');
  if (host !== 'site.invalid' && (!domain || host !== domain.replace(/^www\./, ''))) return { external: true, host };
  let p = decodeURIComponent(u.pathname); if (p.endsWith('/')) p += 'index.html';
  return { external: false, path: p };
}

export function checkSite(pages, cfg) {
  cfg = { ...DEFAULTS, ...cfg };
  const keys = Object.keys(pages).sort();
  const parsed = {}; for (const k of keys) parsed[k] = parsePage(pages[k], cfg);
  const skip = Object.keys(cfg.skip);
  const seen = new Map();
  for (const k of keys) for (const n of new Set(segments(parsed[k].lines).map((s) => s[1]))) seen.set(n, (seen.get(n) || 0) + 1);
  // The same quote on more than boiler_pages pages (a site-wide reviews strip) is template, like a repeated footer line.
  const seenQ = new Map();
  for (const k of keys) for (const n of new Set(parsed[k].quoteLines.map(norm))) seenQ.set(n, (seenQ.get(n) || 0) + 1);
  // address -> page, for inbound links
  const byUrl = new Map(); for (const k of keys) for (const u of urlKeys(k)) byUrl.set(u, k);
  const inbound = new Map(keys.map((k) => [k, 0]));
  const res = {};
  for (const k of keys) {
    const p = parsed[k];
    const segs = segments(p.lines);
    const own = segs.filter((s) => seen.get(s[1]) <= cfg.boiler_pages);
    const ownWords = own.reduce((n, s) => n + words(s[0]), 0);
    const allWords = segs.reduce((n, s) => n + words(s[0]), 0);
    let outInt = new Set(), outExt = new Set();
    for (const l of p.links) {
      const r = resolveLink(l.href, k, cfg.domain); if (!r) continue;
      if (r.external) { if (l.inMain) outExt.add(r.host); continue; }
      const tgt = byUrl.get(r.path) || byUrl.get(r.path.replace(/\/index\.html$/, '')) || byUrl.get(r.path + '.html');
      if (tgt && tgt !== k) outInt.add(tgt);
    }
    for (const t of outInt) inbound.set(t, inbound.get(t) + 1);
    res[k] = {
      page: k, skipped: matches(k, skip) ? cfg.skip[skip.find((s) => matches(k, [s]))] : null,
      noindex: /noindex/.test(p.robots), title: p.title, description: p.description, h1: p.h1,
      ownWords, allWords, quoteWords: p.quoteLines.filter((q) => seenQ.get(norm(q)) <= cfg.boiler_pages).reduce((n, q) => n + words(q), 0), internalOut: outInt.size, externalHosts: [...outExt],
      controls: p.controls, byline: p.byline, inbound: 0, dupWith: null, dupShare: 0,
      _sh: shingles(own.map((s) => s[1]).join(' ')),
      fails: [], warns: [],
    };
  }
  for (const k of keys) res[k].inbound = inbound.get(k);
  const live = keys.filter((k) => !res[k].skipped && !res[k].noindex);
  // near-duplicates among pages Google may index: share of this page's own 5-word runs found on one other page.
  // Baseline pages are left out as the other page: they get noindex, so a page that repeats one is not a copy in Google.
  const base0 = cfg.baseline || {};
  const idx = new Map();
  for (const k of live.filter((x) => !base0[x])) for (const s of res[k]._sh) { let a = idx.get(s); if (!a) idx.set(s, a = []); a.push(k); }
  for (const k of live) {
    const r = res[k]; if (r._sh.size < 20) continue;
    const c = new Map();
    for (const s of r._sh) for (const o of idx.get(s) || []) if (o !== k) c.set(o, (c.get(o) || 0) + 1);
    for (const [o, n] of c) { const sh = n / r._sh.size; if (sh > r.dupShare) { r.dupShare = sh; r.dupWith = o; } }
  }
  const titles = new Map(), descs = new Map();
  for (const k of live) {
    const t = norm(res[k].title), d = norm(res[k].description);
    if (t) titles.set(t, [...(titles.get(t) || []), k]);
    if (d) descs.set(d, [...(descs.get(d) || []), k]);
  }
  const hasAbout = keys.some((k) => /(^|\/)about(\/|\.html|-)/.test(k));
  const pct = (x) => Math.round(x * 100) + '%';
  for (const k of live) {
    const r = res[k], F = r.fails, W = r.warns;
    const wordCheck = !matches(k, cfg.no_word_check);
    const tool = matches(k, cfg.tools);
    if (!r.title) F.push('no title');
    else if (titles.get(norm(r.title)).length > 1) F.push(`same title as ${titles.get(norm(r.title)).filter((x) => x !== k)[0]}`);
    else if (r.title.length < cfg.title[0] || r.title.length > cfg.title[1]) W.push(`title is ${r.title.length} characters (aim for ${cfg.title[0]} to ${cfg.title[1]})`);
    if (!r.description) F.push('no search description');
    else if (descs.get(norm(r.description)).length > 1) F.push(`same search description as ${descs.get(norm(r.description)).filter((x) => x !== k)[0]}`);
    else if (r.description.length < cfg.description[0] || r.description.length > cfg.description[1]) W.push(`search description is ${r.description.length} characters (aim for ${cfg.description[0]} to ${cfg.description[1]})`);
    if (r.h1 !== 1) F.push(`${r.h1} H1 headings (needs exactly 1)`);
    if (wordCheck) {
      const bar = tool ? cfg.tool_words : cfg.min_words;
      if (r.ownWords < bar) F.push(`${r.ownWords} own words (needs ${bar}${tool ? ' for a tool page' : ''})`);
      if (tool && !r.controls) F.push('tool page has no form, button or input in its HTML');
      if (r.dupShare > cfg.dup_fail) F.push(`${pct(r.dupShare)} of its own text is also on ${r.dupWith}`);
      else if (r.dupShare > cfg.dup_warn) W.push(`${pct(r.dupShare)} of its own text is also on ${r.dupWith}`);
      const main = r.allWords + r.quoteWords;
      if (main && r.quoteWords / main > cfg.quote_fail) F.push(`${pct(r.quoteWords / main)} of the text is quoted or reprinted`);
      if (r.allWords && r.ownWords / r.allWords < cfg.template_warn) W.push(`only ${pct(r.ownWords / r.allWords)} of the text is its own (the rest repeats on other pages)`);
    }
    if (r.inbound < 1 && k !== 'index.html') W.push('no other page links to it');
    if (r.internalOut < 2) W.push(`links to ${r.internalOut} other page${r.internalOut === 1 ? '' : 's'} on the site (aim for 2+)`);
    if (matches(k, cfg.facts) && !r.externalHosts.length) W.push('states facts but links no outside source');
    if (matches(k, cfg.articles) && !r.byline) W.push('article has no byline or author');
    if (cfg.phrases && !cfg.phrases[k] && wordCheck) W.push('no measured search phrase listed for it');
  }
  if (!hasAbout) for (const k of live.slice(0, 1)) res[k].warns.push('the site has no About page naming who runs it');
  for (const k of keys) delete res[k]._sh;
  const base = cfg.baseline || {};
  const failing = live.filter((k) => res[k].fails.length && !base[k]);
  const listed = live.filter((k) => res[k].fails.length && base[k]);
  const fixed = Object.keys(base).filter((k) => res[k] && !res[k].skipped && !res[k].fails.length && res[k].noindex === false);
  const missing = Object.keys(base).filter((k) => !res[k]);
  return { pages: res, failing, listed, fixed, missing, checked: live.length, total: keys.length };
}

export function readSite(dir) {
  const pages = {};
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f); else if (e.name.endsWith('.html')) pages[pageKey(path.relative(dir, f))] = fs.readFileSync(f, 'utf8');
  } };
  walk(dir); return pages;
}

// Put noindex, follow on a page's HTML (replacing any robots tag) and take its address out of a sitemap.
export function addNoindex(html) {
  const tag = '<meta name="robots" content="noindex, follow">';
  if (/<meta\s+name=["']robots["'][^>]*>/i.test(html)) return html.replace(/<meta\s+name=["']robots["'][^>]*>/i, tag);
  return html.replace(/<head([^>]*)>/i, (m) => m + tag);
}
export function dropFromSitemap(xml, keys) {
  const drop = new Set(keys.flatMap(urlKeys));
  return xml.replace(/\s*<url>[\s\S]*?<\/url>/g, (u) => {
    const loc = (u.match(/<loc>([^<]+)<\/loc>/) || [])[1]; if (!loc) return u;
    let p; try { p = new URL(loc.trim()).pathname; } catch { return u; }
    return drop.has(p) || drop.has(p.replace(/\/$/, '')) ? '' : u;
  });
}

function main(argv) {
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  const cfgPath = arg('--config') || 'thin-check.json';
  const cfg = fs.existsSync(cfgPath) ? JSON.parse(fs.readFileSync(cfgPath, 'utf8')) : {};
  const dir = arg('--dir') || cfg.dir || DEFAULTS.dir;
  if (!fs.existsSync(dir)) { console.error(`thin-check: folder ${dir} not found (build the site first)`); return 2; }
  const r = checkSite(readSite(dir), cfg);
  if (argv.includes('--baseline')) {
    const day = new Date().toISOString().slice(0, 10);
    cfg.baseline = { ...(cfg.baseline || {}) };
    for (const k of r.failing) cfg.baseline[k] = `${day}: ${r.pages[k].fails.join('; ')}`;
    fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n');
    console.log(`thin-check: ${r.failing.length} failing pages added to the baseline in ${cfgPath}`);
    r.listed.push(...r.failing); r.failing = [];
  }
  if (argv.includes('--write')) {
    const list = Object.keys(cfg.baseline || {}).filter((k) => r.pages[k] && !r.pages[k].skipped);
    for (const k of list) { const f = path.join(dir, k); fs.writeFileSync(f, addNoindex(fs.readFileSync(f, 'utf8'))); }
    // sitemap.xml, or the sitemap-0.xml style files Astro and others write
    for (const f of fs.readdirSync(dir).filter((n) => /^sitemap.*\.xml$/.test(n))) {
      const sm = path.join(dir, f); fs.writeFileSync(sm, dropFromSitemap(fs.readFileSync(sm, 'utf8'), list));
    }
    console.log(`thin-check: ${list.length} baseline pages set to noindex and left out of the sitemap`);
  }
  if (arg('--report')) fs.writeFileSync(arg('--report'), JSON.stringify(r, null, 1));
  const warnCount = Object.values(r.pages).reduce((n, p) => n + p.warns.length, 0);
  for (const k of r.failing) console.log(`FAIL ${k}\n  - ${r.pages[k].fails.join('\n  - ')}`);
  if (argv.includes('--warnings')) for (const p of Object.values(r.pages)) if (p.warns.length) console.log(`warn ${p.page}\n  - ${p.warns.join('\n  - ')}`);
  if (r.fixed.length) console.log(`Ready to leave the baseline (they pass now): ${r.fixed.join(', ')}`);
  if (r.missing.length) console.log(`In the baseline but no longer on the site (remove them): ${r.missing.join(', ')}`);
  console.log(`thin-check: ${r.checked} indexable pages checked of ${r.total}; ${r.failing.length} fail; ${r.listed.length} on the baseline (noindex); ${warnCount} warnings${argv.includes('--warnings') ? '' : ' (--warnings lists them)'}`);
  return r.failing.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
