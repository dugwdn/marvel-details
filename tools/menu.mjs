// Writes the same site menu into every page in public/, so all pages share
// one set of big menu buttons (styled in public/css/style.css).
// Run after adding a page or changing the menu: node tools/menu.mjs
// Safe to run again: it replaces the menu it wrote last time.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { htmlFiles } from './check-links.mjs';

const SELF = fileURLToPath(import.meta.url);
const ROOT = path.join(path.dirname(SELF), '..', 'public');

export const MENU = [
  ['Home', '/', ''],
  ['Articles', '/articles/', 'articles'],
  ['Movies', '/movies/', 'movies'],
  ['Deleted Scenes', '/scenes/', 'scenes'],
  ['Callbacks', '/callbacks/', 'callbacks'],
  ['Characters', '/characters/', 'characters'],
  ['Universe Map', '/map/', 'map'],
  ['Rabbit Holes', '/rabbit-holes/', 'rabbit-holes'],
  ['About', '/about', 'about'],
];

const FONT =
  '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
  '    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
  '    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bangers&display=swap">';
const STYLE = '<link rel="stylesheet" href="/css/style.css">';

// rel is the page's path inside public/, with forward slashes.
export function menuFor(rel) {
  const section = rel === 'index.html' ? '' : rel.replace(/\.html$/, '').split('/')[0];
  const isSectionHome = rel === 'index.html' || rel === 'about.html' || rel === `${section}/index.html`;
  const links = MENU.map(([label, href, key]) => {
    const current = key === section ? ` aria-current="${isSectionHome ? 'page' : 'true'}"` : '';
    return `        <a href="${href}"${current}>${label}</a>`;
  });
  return `<nav class="site-nav" aria-label="Main menu">\n${links.join('\n')}\n    </nav>`;
}

export function addMenu(html, rel) {
  const menu = menuFor(rel);
  // Our own menu from a previous run, or the plain <nav> the old pages had.
  // Other navs (like the callbacks' prev/next "navigation") have a class and stay.
  const existing = /<nav class="site-nav"[^>]*>[\s\S]*?<\/nav>|<nav>[\s\S]*?<\/nav>/;
  html = existing.test(html)
    ? html.replace(existing, menu)
    : html.replace(/(<body[^>]*>)/, `$1\n    ${menu}\n`);
  if (!html.includes('family=Bangers')) html = html.replace('</head>', `    ${FONT}\n</head>`);
  if (!html.includes('/css/style.css')) html = html.replace('</head>', `    ${STYLE}\n</head>`);
  return html;
}

if (process.argv[1] && path.resolve(process.argv[1]) === SELF) {
  let changed = 0;
  for (const file of htmlFiles(ROOT)) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    const before = fs.readFileSync(file, 'utf8');
    const after = addMenu(before, rel);
    if (after !== before) {
      fs.writeFileSync(file, after);
      changed++;
    }
  }
  console.log(`Menu written to ${changed} page(s).`);
}
