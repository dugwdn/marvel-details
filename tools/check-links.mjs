// Fails when a page in public/ links to a site address that has no file behind it,
// or when sitemap.xml lists one. Run: node tools/check-links.mjs
// Cloudflare Pages serves /x from x.html or x/index.html, so both count.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

export function htmlFiles(dir = ROOT) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? htmlFiles(p) : p.endsWith('.html') ? [p] : [];
  });
}

const isFile = (p) => fs.existsSync(p) && fs.statSync(p).isFile();

export function exists(address, root = ROOT) {
  const u = address.split(/[?#]/)[0];
  if (u === '' || u === '/') return true;
  const bare = u.replace(/\/$/, '');
  return [u, `${bare}.html`, `${bare}/index.html`].some((c) => isFile(path.join(root, c)));
}

export function brokenLinks(root = ROOT) {
  const broken = [];
  for (const file of htmlFiles(root)) {
    const html = fs.readFileSync(file, 'utf8');
    for (const [, url] of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
      if (!exists(url, root)) broken.push({ page: path.relative(root, file).split(path.sep).join('/'), url });
    }
  }
  const sitemap = path.join(root, 'sitemap.xml');
  if (isFile(sitemap)) {
    for (const [, loc] of fs.readFileSync(sitemap, 'utf8').matchAll(/<loc>https?:\/\/[^/<]+(\/[^<]*)<\/loc>/g)) {
      if (!exists(loc, root)) broken.push({ page: 'sitemap.xml', url: loc });
    }
  }
  return broken;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const broken = brokenLinks();
  for (const b of broken) console.log(`${b.page}: ${b.url}`);
  console.log(broken.length ? `${broken.length} broken link(s).` : 'No broken links.');
  process.exit(broken.length ? 1 : 0);
}
