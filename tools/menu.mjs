// Writes the same brand banner and site menu into every page in public/, so
// all pages share one look (styled in public/css/theme.css).
// Run after adding a page or changing the menu: node tools/menu.mjs
// Safe to run again: it replaces the menu it wrote last time.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { htmlFiles } from './check-links.mjs';

const SELF = fileURLToPath(import.meta.url);
const ROOT = path.join(path.dirname(SELF), '..', 'public');

// Ten buttons so the menu grid has no orphan (5 x 2, or 2 x 5 on phones).
// My Marvel lives in the header bar's member chip instead; About moved to the
// footer's legal line when Quiz took its button (2026-10-06).
export const MENU = [
  ['Home', '/', ''],
  ['Articles', '/articles/', 'articles'],
  ['Movies', '/movies/', 'movies'],
  ['Deleted Scenes', '/scenes/', 'scenes'],
  ['Callbacks', '/callbacks/', 'callbacks'],
  ['Characters', '/characters/', 'characters'],
  ['Universe Map', '/map/', 'map'],
  ['Rabbit Holes', '/rabbit-holes/', 'rabbit-holes'],
  ['Coming Soon', '/upcoming/', 'upcoming'],
  ['Quiz', '/quiz/', 'quiz'],
];

const FONT =
  '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
  '    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
  '    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bangers&display=swap">';
const STYLE = '<link rel="stylesheet" href="/css/theme.css">';
// Member perks (Seen it, Save, favorites, found counter): one module per page.
const MEMBERS = '<script type="module" src="/js/members.js"></script>';
const SEARCH = '<script type="module" src="/js/search.js"></script>';
// Typing boxes stay in view above the on-screen keyboard (Doug's standing rule, 2026-10-06; see CLAUDE.md).
const KEYBOARD = '<script type="module" src="/js/keyboard.js"></script>';
// Sign-in pop-up for signed-out visitors after 12 seconds (Doug's standing rule, 2026-10-07; see CLAUDE.md).
const SIGNIN_POPUP = '<script type="module" src="/js/signin-popup.js"></script>';
// Android Chrome shrinks the page above the keyboard instead of covering it.
export function viewportFor(html) {
  return html.replace(/<meta name="viewport" content="([^"]*)">/g, (all, c) =>
    /interactive-widget=/.test(c) ? all : `<meta name="viewport" content="${c}, interactive-widget=resizes-content">`);
}
// Google Analytics 4 for mcueastereggs.com: counts visits and pages read.
// THE ONE PLACE FOR THE GA4 ID. Empty (or a placeholder like G-XXXXXXXXXX)
// means analytics is off: no Google tag is written into any page.
// After changing it run `node tools/menu.mjs` and deploy.
export const GA_ID = 'G-NESPZD6XSQ';

// A real GA4 ID is G- plus letters and digits, and not the X-filled placeholder.
export function gaEnabled(id) {
  return /^G-[A-Z0-9]{4,}$/.test(id || '') && !/^G-X+$/.test(id);
}

// The snippet for one ID, or '' when analytics is off. Privacy defaults: no
// Google signals, no ad personalization, ad consent denied, and the page
// address is sent without its query string or #hash.
export function gaSnippet(id) {
  if (!gaEnabled(id)) return '';
  return '<!-- GA4 -->\n' +
    `    <script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>\n` +
    '    <script>\n' +
    '        window.dataLayer = window.dataLayer || [];\n' +
    '        function gtag(){dataLayer.push(arguments);}\n' +
    "        gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted' });\n" +
    "        gtag('js', new Date());\n" +
    `        gtag('config', '${id}', { allow_google_signals: false, allow_ad_personalization_signals: false, page_location: location.origin + location.pathname });\n` +
    '    </script>';
}
const GA = gaSnippet(GA_ID);
const PRIVACY = '<p class="site-legal"><a href="/privacy">Privacy</a> • <a href="/credits">Photos and Credits</a></p>';
const PRIVACY_ABOUT = '<p class="site-legal"><a href="/about">About</a> • <a href="/privacy">Privacy</a> • <a href="/credits">Photos and Credits</a></p>';

// Footer with project backlinks and Web Design Nerd credit
const FOOTER =
  '<div class="site-footer-links">\n' +
  '        <p class="site-footer-projects"><strong>More from us:</strong> <a href="https://partygamesarcade.com" target="_blank" rel="noopener">Party Games Arcade</a> • <a href="https://kidslearningarcade.com" target="_blank" rel="noopener">Kids Learning Arcade</a> • <a href="https://getrightplace.app" target="_blank" rel="noopener">RightPlace</a> • <a href="https://credibletheories.com" target="_blank" rel="noopener">Credible Theories</a> • <a href="/more/">All our sites</a></p>\n' +
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

// The compact header bar: logo and name on the left, a search box in the
// middle and the member chip on the right ("Found X of 69 · Rank"; the numbers
// are filled in by public/js/members.js, search by public/js/search.js, so
// without JavaScript it is just a "My Marvel" link and the search stays
// hidden). It carries the page's <h1> only when the page has no other one
// (the home page, for example), so pages keep a single h1. The bar sticks to
// the top of the screen and stays slim; the menu below it scrolls away.
export function brandFor(html) {
  const tag = /<h1[\s>]/.test(html) ? 'p' : 'h1';
  return (
    '<header class="site-brand site-bar">\n' +
    `        <${tag} class="site-brand-title"><a class="site-brand-link" href="/" aria-label="MCU Easter Eggs home">${ICON}` +
    '<span class="site-brand-name">MCU <em>Easter</em> Eggs</span></a></' + tag + '>\n' +
    '        <div class="site-search" hidden>\n' +
    '            <label class="site-search-label" for="site-q">Search the site</label>\n' +
    '            <input id="site-q" class="site-search-input" type="search" placeholder="Search movies, characters, easter eggs" inputmode="search" enterkeyhint="search" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" role="combobox" aria-expanded="false" aria-controls="site-results" aria-autocomplete="list">\n' +
    '            <ul id="site-results" class="site-results" role="listbox" aria-label="Search results" hidden></ul>\n' +
    '        </div>\n' +
    '        <button type="button" class="site-search-toggle" aria-label="Search" aria-expanded="false" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" stroke-width="3"/><path d="M15 15l6 6" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/></svg></button>\n' +
    '        <a class="site-member" href="/me/"><span class="site-member-text">My Marvel</span></a>\n' +
    '    </header>'
  );
}

// Titles and one-line descriptions of the articles and movie pages, for the
// search box (the other things it searches already have JSON data files).
export function searchPages(root = ROOT) {
  const out = [];
  for (const [dir, kind] of [['articles', 'Article'], ['movies', 'Movie']]) {
    const folder = path.join(root, dir);
    if (!fs.existsSync(folder)) continue;
    for (const name of fs.readdirSync(folder).sort()) {
      if (!name.endsWith('.html') || name === 'index.html') continue;
      const html = fs.readFileSync(path.join(folder, name), 'utf8');
      const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
      const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
      out.push({ t: title.replace(/\s*[|\u2013-]\s*MCU Easter Eggs\s*$/i, '').trim(), u: `/${dir}/${name.replace(/\.html$/, '')}`, k: kind, d: desc });
    }
  }
  return out;
}

// Our own CSS and JS links carry ?v=<first 8 of the file's md5>, so a new
// deploy is a new address. mcueastereggs.com's Cloudflare zone tells browsers
// (and its edge) to keep /css and /js for 4 hours; without this a visitor
// gets new HTML with old CSS, and new sections show up unstyled (2026-10-06).
const hashes = new Map();
export function assetVersion(file, root = ROOT) {
  const full = path.join(root, file);
  if (!hashes.has(full)) {
    hashes.set(full, fs.existsSync(full) ? crypto.createHash('md5').update(fs.readFileSync(full)).digest('hex').slice(0, 8) : '');
  }
  return hashes.get(full);
}
export function versionAssets(html, root = ROOT) {
  return html.replace(/(<(?:link|script)\b[^>]*?\s(?:href|src)=")(\/(?:css|js)\/[^"?#]+\.(?:css|js))(?:\?v=[0-9a-f]*)?"/g,
    (all, start, file) => {
      const v = assetVersion(file, root);
      return v ? `${start}${file}?v=${v}"` : `${start}${file}"`;
    });
}

// Ad placeholders: pages that load js/ads.js get the top box (below the
// menu) and the end box (above the footer) written into the HTML, with
// data-ad-placeholder so the site-health robot can count them without
// running scripts. Boxes a page writes by hand (the home page) are kept.
export const adBox = (name) =>
  `<div class="ad-box" data-ad-box="${name}" data-ad-placeholder="${name}" data-ad-stamp><div class="ad-label">Advertisement</div><div class="ad-ph">Ad space</div></div>`;
export function addAdBoxes(html) {
  html = html.replace(/\n?[ \t]*<div class="ad-box" data-ad-box="\w+" data-ad-placeholder="\w+" data-ad-stamp>.*?<\/div><\/div>/g, '');
  if (!html.includes('/js/ads.js')) return html;
  if (!html.includes('data-ad-box="top"')) html = html.replace(/(<nav class="site-nav"[\s\S]*?<\/nav>)/, `$1\n    ${adBox('top')}`);
  if (!html.includes('data-ad-box="end"') && /<footer[\s>]/.test(html)) html = html.replace(/(\n?)([ \t]*)(<footer[\s>])/, `$1$2${adBox('end')}\n$2$3`);
  return html;
}

export function addMenu(html, rel) {
  // Drop the banner from a previous run and the old plain "Details You Missed"
  // (or "MCU Easter Eggs")
  // headers, then write one fresh banner straight above the menu.
  html = html
    .replace(/\s*<header class="site-brand[^"]*">[\s\S]*?<\/header>/, '')
    .replace(/\s*<header>\s*<h1>(?:Details You Missed|MCU Easter Eggs)<\/h1>[\s\S]*?<\/header>/, '');
  const menu = `${brandFor(html)}\n    ${menuFor(rel)}`;
  // Our own menu from a previous run, or the plain <nav> the old pages had.
  // Other navs (like the callbacks' prev/next "navigation") have a class and stay.
  const existing = /<nav class="site-nav"[^>]*>[\s\S]*?<\/nav>|<nav>[\s\S]*?<\/nav>/;
  html = existing.test(html)
    ? html.replace(existing, menu)
    : html.replace(/(<body[^>]*>)/, `$1\n    ${menu}\n`);
  // One GA4 snippet per page: drop any earlier one (hand-written or ours), then
  // write it, or write nothing when GA_ID is empty (analytics off).
  html = html
    .replace(/[ \t]*<!-- GA4 -->[ \t]*\n?/g, '')
    .replace(/[ \t]*<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js[^"]*"><\/script>[ \t]*\n?/g, '')
    .replace(/[ \t]*<script>\s*window\.dataLayer[\s\S]*?<\/script>[ \t]*\n?/g, '')
    .replace('</head>', GA ? `    ${GA}\n</head>` : '</head>');
  if (!html.includes('family=Bangers')) html = html.replace('</head>', `    ${FONT}\n</head>`);
  if (!html.includes('/css/theme.css')) html = html.replace('</head>', `    ${STYLE}\n</head>`);
  if (!html.includes('/js/members.js')) html = html.replace('</body>', `    ${MEMBERS}\n</body>`);
  if (!html.includes('/js/search.js')) html = html.replace('</body>', `    ${SEARCH}\n</body>`);
  if (!html.includes('/js/keyboard.js')) html = html.replace('</body>', `    ${KEYBOARD}\n</body>`);
  if (!html.includes('/js/signin-popup.js')) html = html.replace('</body>', `    ${SIGNIN_POPUP}\n</body>`);
  html = viewportFor(html);
  // Remove the project links from a previous run (every copy) first.
  html = html.replace(/\n[ \t]*<div class="site-footer-links">[\s\S]*?<\/div>/g, '');
  // Pages with a footer get a Privacy link in it (once), plus About when the
  // page has no other link to it (the menu no longer has an About button).
  const rest = html.replace(/<nav class="site-nav"[\s\S]*?<\/nav>/, '').replace(/<p class="site-legal">[\s\S]*?<\/p>/, '');
  const legal = /href="\/about(\.html)?"/.test(rest) ? PRIVACY : PRIVACY_ABOUT;
  html = html.replace(/<p class="site-legal">[\s\S]*?<\/p>/, legal);
  if (/<footer[\s>]/.test(html) && !/<p class="site-legal">/.test(html) && !/href="\/privacy\/?"/.test(html)) {
    html = html.replace(/(<footer[^>]*>)([\s\S]*?)(\s*)<\/footer>/, (all, open, inner, ws) => `${open}${inner}${inner.includes('\n') ? '\n        ' : ''}${legal}${ws}</footer>`);
  }
  // Add footer with project links and Web Design Nerd credit.
  // Add it before the closing footer tag if a footer exists, or create one before </body>.
  if (/<\/footer>/.test(html)) {
    html = html.replace(/(\s*)<\/footer>/, `\n    ${FOOTER}$1</footer>`);
  } else {
    html = html.replace(/(<\/body>)/, `    <footer>\n${FOOTER}\n    </footer>\n$1`);
  }
  return versionAssets(addAdBoxes(html));
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
  const index = JSON.stringify(searchPages());
  const indexFile = path.join(ROOT, 'data', 'search-pages.json');
  if (!fs.existsSync(indexFile) || fs.readFileSync(indexFile, 'utf8') !== index) fs.writeFileSync(indexFile, index);
  console.log(`Menu written to ${changed} page(s).`);
}
