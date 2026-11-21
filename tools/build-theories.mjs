// Writes the fan theory pages (ADR-018) from public/data/theories.json:
//   /theories/          every theory as a stamped card (Still open first)
//   /theories/<id>      one theory: what fans think, an evidence board of clues from the
//                       films, the case for and against, where it started, sources
// Theories come from Reddit and fan forums, told in our own words and linked to where
// they started. A "Confirmed" or "Debunked" stamp needs a source that settles it.
// Run after editing theories.json: node tools/build-theories.mjs && node tools/menu.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sitemapBlock } from './sitemap-block.mjs';

const SELF = fileURLToPath(import.meta.url);
const ROOT = path.join(path.dirname(SELF), '..', 'public');
const SITE = 'https://mcueastereggs.com';
const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export const STATUS = {
  open: { label: 'Still open', order: 0, blurb: 'Nobody knows yet. The films or the next one will settle it.' },
  partly: { label: 'Partly true', order: 1, blurb: 'Fans got part of it right.' },
  confirmed: { label: 'Confirmed', order: 2, blurb: 'The films or the people who made them said yes.' },
  debunked: { label: 'Debunked', order: 3, blurb: 'The films went another way.' },
};

export const theories = (root = ROOT) => JSON.parse(fs.readFileSync(path.join(root, 'data', 'theories.json'), 'utf8')).theories;

const stamp = s => `<span class="th-stamp ${esc(s)}">${esc(STATUS[s].label)}</span>`;
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
const ext = (u, text) => `<a href="${esc(u)}" rel="noopener nofollow" target="_blank">${esc(text || host(u))}</a>`;
const place = t => { const w = t.origin?.where || ''; return /^unknown/i.test(w) ? '' : w.split(' (')[0]; };
// Card line: "Started on r/FanTheories, 2019", "Fans talking since 2024" or nothing.
const startedIn = t => { const p = place(t), when = t.origin?.when; return p ? `Started on ${p}${when ? `, ${when}` : ''}` : when ? `Fans talking since ${when}` : ''; };
// Page line: the full note, or that nobody knows the first post.
const originNote = t => { const w = t.origin?.where || '', when = t.origin?.when; const extra = (w.match(/\((.*)\)\s*$/) || [])[1];
  if (/^unknown/i.test(w)) return `We could not find the first post${when ? `; fans have talked about it since ${when}` : ''}.`;
  return `Started on ${w.split(' (')[0]}${when ? ` in ${when}` : ''}${extra ? ` (${extra})` : ''}.`; };

function page({ url, title, desc, body, jsonld, starter = '', script = false }) {
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
    <meta property="og:type" content="article">
    <script type="application/ld+json">${JSON.stringify(jsonld)}</script>
${starter ? `    <meta name="discuss-starter" content="${esc(starter)}">\n` : ''}    <link rel="stylesheet" href="/css/trivia.css">
</head>
<body>
    <main class="container tv">
${body}
    </main>
    <footer><p>&copy; 2026 MCU Easter Eggs. Not affiliated with Marvel or Disney.</p></footer>
    <script src="/js/ads.js" defer></script>
${script ? '    <script type="module" src="/js/theory.js"></script>\n' : ''}</body>
</html>
`;
}

export function card(t) {
  const from = startedIn(t);
  return `<li><article class="th-card">${stamp(t.status)}<h3><a href="/theories/${esc(t.id)}">${esc(t.title)}</a></h3><p>${esc(t.one_line)}</p>${from ? `<p class="th-from">${esc(from)}</p>` : ''}</article></li>`;
}

export function hub(list) {
  const groups = Object.keys(STATUS).map(s => [s, list.filter(t => t.status === s)]).filter(([, l]) => l.length);
  return page({
    url: '/theories/',
    title: 'MCU Fan Theories: Confirmed, Debunked and Still Open',
    desc: 'The most popular Marvel fan theories from Reddit and fan forums, with the clues from the films, the case for and against, and what happened.',
    jsonld: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'MCU Fan Theories', url: `${SITE}/theories/` },
    body: `            <p><a class="back-button" href="/">&larr; Home</a></p>
            <h1>MCU fan theories</h1>
            <p class="tv-lede">The theories fans argue about most on Reddit and fan forums. Each one lays out the clues from the films, the best case for and against, and whether it came true. Got your own? Post it on the <a href="/boards/fan-theories">Fan Theories board</a>.</p>
            <div class="tv-toc" role="navigation" aria-label="Jump to">${groups.map(([s]) => `<a href="#${s}">${esc(STATUS[s].label)}</a>`).join('')}</div>
${groups.map(([s, l], i) => `            <section aria-labelledby="${s}"${i === 1 ? ' data-ad-mid' : ''}><h2 id="${s}">${esc(STATUS[s].label)}</h2>
            <p>${esc(STATUS[s].blurb)}</p>
            <ul class="th-grid">
${l.map(t => `                ${card(t)}`).join('\n')}
            </ul></section>`).join('\n')}`,
  });
}

export function theoryPage(t, list, next) {
  const sources = [...new Set([t.origin?.origin_url, t.status_source, ...(t.evidence || []).map(e => e.source), ...(t.against || []).map(a => a.source), ...(t.coverage || [])].filter(Boolean))];
  const related = list.filter(x => x.id !== t.id && x.films?.some(f => t.films?.includes(f))).slice(0, 3);
  return page({
    url: `/theories/${t.id}`,
    title: `${t.title}: MCU Fan Theory`,
    desc: `${t.one_line} ${STATUS[t.status].label}.`.slice(0, 158),
    starter: t.open_question || '',
    script: true,
    jsonld: { '@context': 'https://schema.org', '@type': 'Article', headline: t.title, description: t.one_line, url: `${SITE}/theories/${t.id}`, about: (t.films || []).map(f => ({ '@type': 'Movie', name: f })) },
    body: `            <p><a class="back-button" href="/theories/">&larr; All fan theories</a></p>
            ${stamp(t.status)}
            <h1>${esc(t.title)}</h1>
            <p class="tv-lede">${esc(t.one_line)}</p>
${t.hook ? `            <aside class="th-hook" aria-label="Why fans can't let it go"><b>Why fans can't let it go</b><p>${esc(t.hook)}</p></aside>\n` : ''}            <section aria-labelledby="h-what"><h2 id="h-what">What fans think</h2>
            <p>${esc(t.summary)}</p></section>
            <section class="th-board" aria-labelledby="h-board"><h2 id="h-board">The evidence board</h2>
            <ol class="th-clues">
${(t.evidence || []).map(e => `                <li class="th-clue"><p>${esc(e.point)}</p><span class="th-where">${esc(e.scene)}</span></li>`).join('\n')}
            </ol></section>
            <div class="th-sides">
            <section aria-labelledby="h-against"><h2 id="h-against">The case against</h2><ul>${(t.against || []).map(a => `<li>${esc(a.point)}</li>`).join('')}</ul></section>
            <section aria-labelledby="h-verdict"><h2 id="h-verdict">${esc(STATUS[t.status].label)}</h2><p>${esc(t.status_note)}</p></section>
            </div>
            <section class="th-vote" data-vote="theories/${esc(t.id)}" aria-labelledby="h-vote"><h2 id="h-vote">Do you buy it?</h2>
            <div class="th-vbtns"><button type="button" data-v="buy">Buy it</button><button type="button" data-v="unsure">Not sure</button><button type="button" data-v="no">No way</button></div>
            <div class="th-bars" data-vote-bars hidden></div>
            <p class="th-vnote" data-vote-note>One tap. No account needed.</p>
            <button type="button" class="th-share" data-share="${esc(t.title)}" data-url="${SITE}/theories/${esc(t.id)}">Ask a friend</button>
            <p class="th-vnote" data-share-out aria-live="polite" hidden></p></section>
            <section aria-labelledby="h-origin" data-ad-mid><h2 id="h-origin">Where it started</h2>
            <p>${esc(originNote(t))} ${t.origin?.origin_url ? `${ext(t.origin.origin_url, 'The original post')}. ` : ''}${esc(t.popularity || '')}</p></section>
${related.length ? `            <section aria-labelledby="h-more"><h2 id="h-more">More theories about these films</h2><ul class="th-grid">${related.map(card).join('')}</ul></section>\n` : ''}            <section class="th-oq" aria-labelledby="h-oq" data-trail-id="${esc(t.id)}" data-trail-title="${esc(t.title)}"><h2 id="h-oq">The open question</h2>
            <p class="th-oq-q">${esc(t.open_question || `Do you buy it? What would change your mind?`)}</p>
            <div class="th-oq-row"><a class="th-talk" href="#discuss">Argue it below</a>${next ? `<a class="th-next" href="/theories/${esc(next.id)}">Next theory: ${esc(next.title)}</a>` : ''}</div>
            <div class="th-trail" data-trail hidden><b>Your trail</b><ol></ol></div></section>
            <section class="th-sources" aria-labelledby="h-sources"><h2 id="h-sources">Sources</h2>
            <ul>${sources.map(u => `<li>${ext(u, host(u))}</li>`).join('')}</ul></section>`,
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === SELF) {
  const list = theories().sort((a, b) => STATUS[a.status].order - STATUS[b.status].order || (a.rank ?? 99) - (b.rank ?? 99));
  const dir = path.join(ROOT, 'theories');
  fs.mkdirSync(dir, { recursive: true });
  const keep = new Set(['index.html', ...list.map(t => `${t.id}.html`)]);
  for (const name of fs.readdirSync(dir)) if (name.endsWith('.html') && !keep.has(name)) fs.unlinkSync(path.join(dir, name));
  fs.writeFileSync(path.join(dir, 'index.html'), hub(list));
  list.forEach((t, i) => fs.writeFileSync(path.join(dir, `${t.id}.html`), theoryPage(t, list, list[(i + 1) % list.length])));
  sitemapBlock(ROOT, 'theories', 'fan theories (ADR-018, tools/build-theories.mjs)', ['/theories/', ...list.map(t => `/theories/${t.id}`)]);
  console.log(`Wrote ${list.length + 1} theory pages.`);
}
