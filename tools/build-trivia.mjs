// Writes the scene trivia pages (ADR-018) from public/data/trivia.json:
//   /trivia/          "Ask about any scene" box (public/js/trivia.js) and every film and show
//   /trivia/<slug>    one film or show: its facts grouped by kind, with the wiki credit
// The facts come from the fan-run MCU Wiki (CC BY-SA): python3 tools/import-wiki-trivia.py
// Run after importing: node tools/build-trivia.mjs && node tools/menu.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sitemapBlock } from './sitemap-block.mjs';

const SELF = fileURLToPath(import.meta.url);
const ROOT = path.join(path.dirname(SELF), '..', 'public');
const SITE = 'https://mcueastereggs.com';
const esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Order of the groups on a title page and of the filter chips on /trivia/.
export const KINDS = ['Scene details', 'MCU connections', 'Comics references', 'Behind the scenes', 'Pop culture', 'Episode titles'];
const KIND_ID = k => k.toLowerCase().replace(/[^a-z]+/g, '-');

export const trivia = (root = ROOT) => JSON.parse(fs.readFileSync(path.join(root, 'data', 'trivia.json'), 'utf8'));

export function credit(data, w) {
  const src = w ? `the <a href="${esc(w.source)}" rel="noopener" target="_blank">${esc(w.work)} trivia page</a> on ` : '';
  return `<p class="tv-credit">From ${src}the fan-written Marvel Cinematic Universe Wiki, split into single facts. We have not checked each one yet; if one is wrong, say so in the discussion. <a href="/credits#trivia">License and credits</a>.</p>`;
}

function page({ url, title, desc, body, jsonld = null, script = false }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <title>${esc(title)} | MCU Easter Eggs</title>
    <meta name="description" content="${esc(desc)}">
    <link rel="canonical" href="${SITE}${url}">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(desc)}">
    <meta property="og:url" content="${SITE}${url}">
    <meta property="og:type" content="website">
${jsonld ? `    <script type="application/ld+json">${JSON.stringify(jsonld)}</script>\n` : ''}    <link rel="stylesheet" href="/css/trivia.css">
</head>
<body>
    <main class="container tv">
${body}
    </main>
    <footer><p>&copy; 2026 MCU Easter Eggs. Not affiliated with Marvel or Disney.</p></footer>
    <script src="/js/ads.js" defer></script>
${script ? '    <script type="module" src="/js/trivia.js"></script>\n' : ''}</body>
</html>
`;
}

export function askBox() {
  return `            <form class="tv-ask" role="search" action="/trivia/" method="get" data-trivia-ask data-kb-block>
                <label class="tv-ask-label" for="tv-q">Ask about any scene</label>
                <p class="tv-ask-help" id="tv-q-help">Type a few words: a thing, a line, a character or a film. Try <a href="/trivia/?q=shawarma">shawarma</a>, <a href="/trivia/?q=clock">clock</a>, <a href="/trivia/?q=stan+lee">Stan Lee</a> or <a href="/trivia/?q=iron+man+suit">Iron Man suit</a>.</p>
                <div class="tv-ask-row">
                    <input id="tv-q" name="q" type="search" placeholder="What do you want to know?" aria-describedby="tv-q-help" inputmode="search" enterkeyhint="search" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
                    <button type="submit">Ask</button>
                </div>
            </form>`;
}

export function hub(data) {
  const works = [...data.works].sort((a, b) => a.work.localeCompare(b.work));
  const chips = ['All', ...KINDS].map((k, i) => `<button type="button" class="tv-chip" data-kind="${i ? esc(k) : ''}" aria-pressed="${i ? 'false' : 'true'}">${esc(k)}</button>`).join('');
  return page({
    url: '/trivia/',
    title: 'MCU Trivia: Ask About Any Scene',
    desc: 'Ask about any Marvel movie or show scene and get the background details, easter eggs, comic references and behind-the-scenes facts fans have spotted.',
    script: true,
    jsonld: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'MCU Trivia', url: `${SITE}/trivia/` },
    body: `            <p><a class="back-button" href="/">&larr; Home</a></p>
            <h1>MCU Trivia</h1>
            <p class="tv-lede">The small stuff: what is on the screen behind Tony, which comic a line comes from, what the actors made up on the day. Ask, or pick a film or show.</p>
${askBox()}
            <div class="tv-chips" role="group" aria-label="Show only" data-trivia-chips hidden>${chips}</div>
            <p class="tv-status" data-trivia-status aria-live="polite"></p>
            <ol class="tv-results" data-trivia-results></ol>
            <p data-trivia-more-wrap hidden><button type="button" class="tv-more" data-trivia-more>Show more answers</button></p>
            <section aria-labelledby="h-works" data-ad-mid><h2 id="h-works">Pick a film or show</h2>
            <ul class="tv-works">
${works.map(w => `                <li><a href="/trivia/${w.slug}">${esc(w.work)}</a></li>`).join('\n')}
            </ul></section>
            ${credit(data, null)}`,
  });
}

export function workPage(data, w) {
  const groups = KINDS.map(k => [k, w.facts.filter(f => f.kind === k)]).filter(([, fs]) => fs.length);
  const toc = groups.length > 1 ? `            <div class="tv-toc" role="navigation" aria-label="On this page">${groups.map(([k]) => `<a href="#${KIND_ID(k)}">${esc(k)}</a>`).join('')}</div>\n` : '';
  const desc = `${w.work} trivia: ${w.facts[0].text}`.slice(0, 155).replace(/\s+\S*$/, '') + '…';
  return page({
    url: `/trivia/${w.slug}`,
    title: `${w.work} Trivia and Easter Eggs`,
    desc,
    jsonld: { '@context': 'https://schema.org', '@type': 'WebPage', name: `${w.work} Trivia`, url: `${SITE}/trivia/${w.slug}`, isBasedOn: w.source, license: data.licenseUrl },
    body: `            <p><a class="back-button" href="/trivia/">&larr; All trivia</a></p>
            <h1>${esc(w.work)} trivia</h1>
            <p class="tv-lede">Background details, easter eggs and behind-the-scenes facts fans have spotted in ${esc(w.work)}.</p>
${toc}${groups.map(([k, list]) => `            <section aria-labelledby="${KIND_ID(k)}"><h2 id="${KIND_ID(k)}">${esc(k)}</h2>
            <ul class="tv-facts">
${list.map(f => `                <li id="${esc(f.id)}">${esc(f.text)}</li>`).join('\n')}
            </ul></section>`).join('\n')}
            <p><a class="tv-ask-link" href="/trivia/">Ask about another scene</a></p>
            ${credit(data, w)}`,
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === SELF) {
  const data = trivia();
  const dir = path.join(ROOT, 'trivia');
  fs.mkdirSync(dir, { recursive: true });
  const keep = new Set(['index.html', ...data.works.map(w => `${w.slug}.html`)]);
  for (const name of fs.readdirSync(dir)) if (name.endsWith('.html') && !keep.has(name)) fs.unlinkSync(path.join(dir, name));
  fs.writeFileSync(path.join(dir, 'index.html'), hub(data));
  for (const w of data.works) fs.writeFileSync(path.join(dir, `${w.slug}.html`), workPage(data, w));
  sitemapBlock(ROOT, 'trivia', 'scene trivia (ADR-018, tools/build-trivia.mjs)', ['/trivia/', ...data.works.map(w => `/trivia/${w.slug}`)], data.imported);
  console.log(`Wrote ${data.works.length + 1} trivia pages.`);
}
