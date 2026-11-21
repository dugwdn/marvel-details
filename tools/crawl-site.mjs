// Opens every page of public/ in a real browser (after its scripts run),
// collects every link and checks that each site address has a page and each
// #anchor exists there; also reports script errors.
// Run: node tools/crawl-site.mjs    (needs Playwright with Chromium installed)
// Exit code 1 if anything is broken.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { htmlFiles } from './check-links.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.txt': 'text/plain', '.xml': 'application/xml' };

async function loadPlaywright() {
  try { return await import('playwright'); } catch { /* fall through */ }
  for (const dir of [process.env.PLAYWRIGHT_NODE_MODULES, '/opt/node-tools/node_modules/'].filter(Boolean)) {
    try { return createRequire(dir)('playwright'); } catch { /* next */ }
  }
  throw new Error('Playwright not found. Install it, or set PLAYWRIGHT_NODE_MODULES.');
}

// Serves files the way Cloudflare Pages does: /x from x.html or x/index.html.
export function resolve(urlPath) {
  const u = decodeURIComponent(urlPath.split(/[?#]/)[0]);
  const bare = u.replace(/\/$/, '');
  for (const c of [u === '/' ? '/index.html' : u, `${bare}.html`, `${bare}/index.html`]) {
    const p = path.join(ROOT, c);
    if (p.startsWith(ROOT) && fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }
  return null;
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) { res.writeHead(401, { 'content-type': 'application/json' }); return res.end('{}'); }
  const file = resolve(req.url);
  if (!file) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const { chromium } = await loadPlaywright();
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const context = await browser.newContext();
// Keep the crawl offline: no ads, analytics, fonts or video players.
await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());

const problems = [];
const idCache = new Map();
const pages = htmlFiles(ROOT).map((f) => '/' + path.relative(ROOT, f).split(path.sep).join('/').replace(/index\.html$/, '').replace(/\.html$/, ''));

async function idsOn(page, address) {
  if (!idCache.has(address)) {
    await page.goto(base + address, { waitUntil: 'networkidle' });
    idCache.set(address, new Set(await page.$$eval('[id]', (els) => els.map((e) => e.id))));
  }
  return idCache.get(address);
}

const page = await context.newPage();
const checker = await context.newPage();
for (const address of pages) {
  const errors = [];
  page.removeAllListeners('pageerror');
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base + address, { waitUntil: 'networkidle' });
  await page.waitForTimeout(150);
  for (const e of errors) problems.push(`${address}: script error: ${e}`);
  // Text that promises a click ("Read more →", "Explore →") must be inside a link or button.
  const fakes = await page.evaluate(() => {
    const out = [];
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n; (n = walk.nextNode());) {
      if (/[A-Za-z]\s*→\s*$|Read (more|full)|Learn more|Click here/i.test(n.textContent) && !n.parentElement.closest('a, button, label, option, script, style, [aria-hidden="true"]')
        && n.parentElement.closest('body') && n.parentElement.offsetParent !== null) out.push(n.textContent.trim().slice(0, 60));
    }
    return out;
  });
  for (const t of fakes) problems.push(`${address}: "${t}" looks clickable but is not a link`);
  const links = await page.$$eval('a', (as) => as.map((a) => ({ raw: a.getAttribute('href'), abs: a.href, text: a.textContent.trim().slice(0, 50) })));
  for (const l of links) {
    if (l.raw === null || l.raw.trim() === '' || l.raw === '#' || /^javascript:/i.test(l.raw)) { problems.push(`${address}: link "${l.text}" goes nowhere (href=${JSON.stringify(l.raw)})`); continue; }
    const u = new URL(l.abs);
    if (u.origin !== base) continue;
    if (!resolve(u.pathname)) { problems.push(`${address}: "${l.text}" -> ${u.pathname} (no page)`); continue; }
    if (u.hash.length > 1) {
      const id = decodeURIComponent(u.hash.slice(1));
      const ids = u.pathname === new URL(page.url()).pathname ? new Set(await page.$$eval('[id]', (els) => els.map((e) => e.id))) : await idsOn(checker, u.pathname);
      if (!ids.has(id)) problems.push(`${address}: "${l.text}" -> ${u.pathname}#${id} (no such anchor)`);
    }
  }
}
await browser.close();
server.close();
const unique = [...new Set(problems)];
for (const p of unique) console.log(p);
console.log(unique.length ? `${unique.length} problem(s) on ${pages.length} pages.` : `All links work on ${pages.length} pages.`);
process.exit(unique.length ? 1 : 0);
