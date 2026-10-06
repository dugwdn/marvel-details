// Writes the body of the five movie hubs (public/movies/<id>.html) from
// public/data/movie-hubs.json plus the site's own data (deleted scenes,
// callbacks, characters, rabbit holes), so every card says something real,
// names its source and only links to pages that exist.
// Run: node tools/build-hubs.mjs   (then node tools/menu.mjs)
// Keeps whatever trailer block and figures are already on each hub.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { addFilmHeroes } from './build-media.mjs';
import { exists } from './check-links.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c]);

// Other films' ids in the site's data that mean one of our hubs.
const ALIAS = { 'avengers-endgame': 'endgame', 'iron-man': 'iron-man-1', avengers: 'avengers-1' };
const hubId = (id) => ALIAS[id] || id;

const sourceLink = (s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`;

function detailCard(d) {
  const title = d.link ? `<a href="${esc(d.link.href)}">${esc(d.title)}</a>` : esc(d.title);
  const more = d.link ? ` <a class="hub-more" href="${esc(d.link.href)}">${esc(d.link.label || 'Read more')} →</a>` : '';
  return `
            <div class="detail-item">
                <h3>${title}</h3>
                <p>${esc(d.text)}${more}</p>
                <p class="hub-source">Source: ${sourceLink(d.source)}</p>
            </div>`;
}

function linkList(items) {
  return `<ul class="hub-links">${items.map((i) => `
                <li><a href="${esc(i.href)}">${esc(i.label)}</a>${i.note ? ` <span class="hub-note">${esc(i.note)}</span>` : ''}</li>`).join('')}
            </ul>`;
}

export function hubBody(film, site, keep) {
  const f = film.facts;
  const facts = [
    `<strong>Release (US):</strong> ${esc(f.usRelease)}`,
    `<strong>${f.directors.length > 1 ? 'Directors' : 'Director'}:</strong> ${esc(f.directors.join(' and '))}`,
    f.runtimeMinutes ? `<strong>Runtime:</strong> ${esc(f.runtimeMinutes)} minutes` : '',
  ].filter(Boolean).join(' | ');

  const scenes = site.scenes.filter((s) => hubId(s.movieId) === film.id);
  const scenePage = `/scenes/${film.id}-scenes`;
  const callbacks = site.callbacks.filter((c) => [c.foreshadow?.movieId, c.fulfillment?.movieId].map(hubId).includes(film.id)
    && exists(`/callbacks/callback-${c.id}`));
  const chars = site.characters.filter((c) => (c.siteFilms || []).some((t) => t.startsWith(`${film.title} (${film.year})`))
    && exists(`/characters/${c.slug}`));
  const holes = site.holes.filter((h) => (h.movies || []).map(hubId).includes(film.id) && exists(`/rabbit-holes/${h.slug}`));

  const credits = film.creditsScenes.length
    ? film.creditsScenes.map((c) => `
            <div class="detail-item">
                <h3>${esc(c.when)}</h3>
                <p>${esc(c.text)}</p>
                <p class="hub-source">Source: ${sourceLink(c.source)}</p>
            </div>`).join('')
    : '';
  const creditsNote = film.creditsNote ? `
            <p>${esc(film.creditsNote.text || film.creditsNote)}${film.creditsNote.source ? ` <span class="hub-source">Source: ${sourceLink(film.creditsNote.source)}</span>` : ''}</p>` : '';

  const out = [];
  out.push(`<div class="container">
        <!-- Built by tools/build-hubs.mjs from public/data/movie-hubs.json. Edit the data, not this block. -->
        <a href="/movies/" class="back-button">← All movies</a>

        <div class="movie-header">
            <h2>${esc(film.title)} (${film.year})</h2>
            <p>${facts}</p>
            <p>${esc(film.summary)}</p>
            <p class="hub-source">Source: ${sourceLink(f.source)}</p>
        </div>
${keep}
        <div class="subsection">
            <h3 class="section-title">Hidden Details &amp; Easter Eggs</h3>
${film.details.map(detailCard).join('\n')}
        </div>

        <div class="subsection">
            <h3 class="section-title">${film.creditsScenes.length ? 'Credits Scenes' : 'After the Credits'}</h3>${creditsNote}${credits}
        </div>`);

  if (scenes.length && exists(scenePage)) {
    out.push(`
        <div class="subsection">
            <h3 class="section-title">Deleted Scenes</h3>
            <p>${scenes.length} scene${scenes.length > 1 ? 's' : ''} cut from the film and released as home-media extras. <a href="${scenePage}">See them all →</a></p>
            ${linkList(scenes.map((s) => ({ href: `${scenePage}#${s.id}`, label: s.title })))}
        </div>`);
  }
  if (callbacks.length) {
    out.push(`
        <div class="subsection">
            <h3 class="section-title">Setups and Payoffs</h3>
            <p>Moments in this film that pay off later, or pay off something earlier. <a href="/callbacks/">All callbacks →</a></p>
            ${linkList(callbacks.map((c) => ({ href: `/callbacks/callback-${c.id}`, label: c.title,
    note: `(${[c.foreshadow, c.fulfillment].filter(Boolean).map((x) => x.movieTitle).join(' → ')})` })))}
        </div>`);
  }
  if (chars.length) {
    out.push(`
        <div class="subsection">
            <h3 class="section-title">Characters in This Film</h3>
            ${linkList(chars.map((c) => ({ href: `/characters/${c.slug}`, label: c.heroName && c.heroName !== c.fullName ? `${c.heroName}` : c.fullName, note: c.actor ? `(${c.actor})` : '' })))}
        </div>`);
  }
  if (holes.length) {
    out.push(`
        <div class="subsection">
            <h3 class="section-title">Go Deeper</h3>
            ${linkList(holes.map((h) => ({ href: `/rabbit-holes/${h.slug}`, label: h.title })))}
        </div>`);
  }
  out.push('\n    </div>\n');
  return out.join('\n');
}

// Trailer blocks and figures (photos with credits) stay as they are on the page.
export function keptBlocks(container) {
  const blocks = container.match(/\n[ \t]*(?:<section class="(?:trailer-block|media-gallery)"[\s\S]*?<\/section>|<figure[\s\S]*?<\/figure>)/g) || [];
  return blocks.join('\n') + (blocks.length ? '\n' : '');
}

export function build() {
  const hubs = read('data/movie-hubs.json').films;
  const site = {
    scenes: read('data/deleted-scenes.json').deletedScenes,
    callbacks: read('data/callbacks.json').callbacks,
    characters: read('data/characters.json').characters,
    holes: read('data/rabbit-holes.json').rabbitHoles,
  };
  for (const film of hubs) {
    const file = path.join(ROOT, 'movies', `${film.id}.html`);
    const html = fs.readFileSync(file, 'utf8');
    const start = html.indexOf('<div class="container">');
    const end = html.search(/\n[ \t]*<footer/);
    if (start < 0 || end < start) throw new Error(`${film.id}: can't find the page body`);
    const keep = keptBlocks(html.slice(start, end));
    fs.writeFileSync(file, html.slice(0, start) + hubBody(film, site, keep) + html.slice(end));
    console.log(`movies/${film.id}.html: ${film.details.length} details, ${film.creditsScenes.length} credits scenes`);
  }
  addFilmHeroes(); // trailer + cast photos inside each movie header
}

if (process.argv[1] === fileURLToPath(import.meta.url)) build();
