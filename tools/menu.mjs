// Writes the same brand banner and site menu into every page in public/, so
// all pages share one look (styled in public/css/theme.css).
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
  ['My Marvel', '/me/', 'me'],
];

const FONT =
  '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
  '    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
  '    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bangers&display=swap">';
const STYLE = '<link rel="stylesheet" href="/css/theme.css">';
// Member perks (Seen it, Save, favorites, found counter): one module per page.
const MEMBERS = '<script type="module" src="/js/members.js"></script>';
const PRIVACY = '<p class="site-legal"><a href="/privacy">Privacy</a> • <a href="/credits">Credits</a></p>';

// Footer with project backlinks and Web Design Nerd credit
const FOOTER =
  '<div class="site-footer-links">\n' +
  '        <p class="site-footer-projects"><strong>More from Doug:</strong> <a href="https://partygamesarcade.com" target="_blank" rel="noopener">Party Games Arcade</a> • <a href="https://kidslearningarcade.com" target="_blank" rel="noopener">Kids Learning Arcade</a> • <a href="https://getrightplace.app" target="_blank" rel="noopener">RightPlace</a> • <a href="https://credibletheories.com" target="_blank" rel="noopener">Credible Theories</a></p>\n' +
  '        <p class="site-footer-credit"><a href="https://www.webdesignnerd.com" target="_blank" rel="noopener">Powered by Web Design Nerd</a></p>\n' +
  '    </div>';

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

// Magnifying glass with a "!" in it: the site's own mark, drawn here.
const ICON =
  '<svg class="site-brand-icon" viewBox="0 0 64 64" aria-hidden="true">' +
  '<path d="M41 41 58 58" stroke="#000" stroke-width="11" stroke-linecap="round"/>' +
  '<path d="M41 41 58 58" stroke="#7b3fc4" stroke-width="5" stroke-linecap="round"/>' +
  '<circle cx="26" cy="26" r="20" fill="#fff" stroke="#000" stroke-width="5"/>' +
  '<circle cx="26" cy="26" r="15" fill="none" stroke="#ffd60a" stroke-width="4"/>' +
  '<path d="M26 14v14" stroke="#e23636" stroke-width="6" stroke-linecap="round"/>' +
  '<circle cx="26" cy="36" r="3.5" fill="#e23636"/></svg>';

// The brand banner. It carries the page's <h1> only when the page has no
// other one (the home page, for example), so pages keep a single h1.
export function brandFor(html) {
  const tag = /<h1[\s>]/.test(html) ? 'p' : 'h1';
  return (
    '<header class="site-brand">\n' +
    `        <${tag} class="site-brand-title"><a class="site-brand-link" href="/">${ICON}` +
    '<span class="site-brand-name">Details <em>You</em><br>Missed</span></a></' + tag + '>\n' +
    '        <p class="site-brand-tag">Hidden details, easter eggs &amp; analysis from Marvel movies</p>\n' +
    '    </header>'
  );
}

export function addMenu(html, rel) {
  // Drop the banner from a previous run and the old plain "Details You Missed"
  // headers, then write one fresh banner straight above the menu.
  html = html
    .replace(/\s*<header class="site-brand">[\s\S]*?<\/header>/, '')
    .replace(/\s*<header>\s*<h1>Details You Missed<\/h1>[\s\S]*?<\/header>/, '');
  const menu = `${brandFor(html)}\n    ${menuFor(rel)}`;
  // Our own menu from a previous run, or the plain <nav> the old pages had.
  // Other navs (like the callbacks' prev/next "navigation") have a class and stay.
  const existing = /<nav class="site-nav"[^>]*>[\s\S]*?<\/nav>|<nav>[\s\S]*?<\/nav>/;
  html = existing.test(html)
    ? html.replace(existing, menu)
    : html.replace(/(<body[^>]*>)/, `$1\n    ${menu}\n`);
  if (!html.includes('family=Bangers')) html = html.replace('</head>', `    ${FONT}\n</head>`);
  if (!html.includes('/css/theme.css')) html = html.replace('</head>', `    ${STYLE}\n</head>`);
  if (!html.includes('/js/members.js')) html = html.replace('</body>', `    ${MEMBERS}\n</body>`);
  // Pages with a footer get a Privacy link in it (once).
  html = html.replace(/<p class="site-legal">[\s\S]*?<\/p>/, PRIVACY);
  if (/<footer[\s>]/.test(html) && !/href="\/privacy\/?"/.test(html)) {
    html = html.replace(/(<footer[^>]*>)([\s\S]*?)(\s*)<\/footer>/, (all, open, inner, ws) => `${open}${inner}${inner.includes('\n') ? '\n        ' : ''}${PRIVACY}${ws}</footer>`);
  }
  // Add footer with project links and Web Design Nerd credit.
  // Remove from a previous run first.
  html = html.replace(/\s*<div class="site-footer-links">[\s\S]*?<\/div>\n(\s*)<\/footer>/, '\n$1</footer>');
  // Add it before the closing footer tag if a footer exists, or create one before </body>.
  if (/<\/footer>/.test(html)) {
    html = html.replace(/(\s*)<\/footer>/, `\n    ${FOOTER}\n$1</footer>`);
  } else {
    html = html.replace(/(<\/body>)/, `    <footer>\n${FOOTER}\n    </footer>\n$1`);
  }
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
