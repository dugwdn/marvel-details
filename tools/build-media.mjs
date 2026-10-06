// Writes the photo and trailer sections from public/data/media-credits.json:
//   home page      "Faces of the MCU" (rotating spotlight + photo wall), "Watch the trailers",
//                  "Where they filmed"
//   5 movie hubs   "The cast in real life" + place photos (section.media-gallery, kept by build-hubs)
//   character pages "Watch the trailers" for every film or series the character is in
// Add a row to media-credits.json (python3 tools/fetch-media.py or tools/find-trailers.py),
// then: node tools/build-media.mjs && node tools/build-credits.mjs && node tools/menu.mjs
// Trailer cards are text and color only (no YouTube thumbnail: a still outside the player).
// Clicking one swaps in the youtube-nocookie player (js/media.js), so nothing loads up front.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const htmlFilesUnder = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? htmlFilesUnder(p) : e.name.endsWith('.html') ? [p] : [];
});
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const HUB_FILMS = {
  'iron-man-1': 'Iron Man', 'iron-man-2': 'Iron Man 2', 'iron-man-3': 'Iron Man 3',
  'avengers-1': 'The Avengers', endgame: 'Avengers: Endgame',
};

// A character's one photo is the actor who plays them now. Where another actor played them
// in a film, that photo stays off that film's pages (Terrence Howard was Rhodey in Iron Man).
const RECAST = {
  'Iron Man': ['james-rhodey-rhodes'], 'The Incredible Hulk': ['bruce-banner'],
  'The Avengers': ['thanos'], 'Captain America: The First Avenger': ['howard-stark'],
};
// Top-billed first on the five movie pages (Wikipedia "Starring" lists); others follow.
const LEADS = {
  'Iron Man': ['tony-stark', 'virginia-pepper-potts', 'obadiah-stane', 'harold-happy-hogan', 'phil-coulson', 'ho-yinsen'],
  'Iron Man 2': ['tony-stark', 'virginia-pepper-potts', 'james-rhodey-rhodes', 'natasha-romanoff', 'justin-hammer', 'nick-fury'],
  'Iron Man 3': ['tony-stark', 'virginia-pepper-potts', 'james-rhodey-rhodes', 'harold-happy-hogan', 'trevor-slattery', 'ho-yinsen'],
  'The Avengers': ['tony-stark', 'steve-rogers', 'thor', 'bruce-banner', 'natasha-romanoff', 'clint-barton', 'loki', 'nick-fury'],
  'Avengers: Endgame': ['tony-stark', 'steve-rogers', 'bruce-banner', 'thor', 'natasha-romanoff', 'clint-barton', 'james-rhodey-rhodes', 'nebula'],
};
export function filmCast(m, film) {
  const lead = LEADS[film] || [];
  const rank = (f) => (lead.includes(f.c.id) ? lead.indexOf(f.c.id) : lead.length);
  return m.faces.filter((f) => f.c.titles.includes(film) && !(RECAST[film] || []).includes(f.c.id))
    .map((f, i) => ({ f, i })).sort((a, b) => rank(a.f) - rank(b.f) || a.i - b.i).map((x) => x.f);
}

export function loadMedia() {
  const credits = read('data/media-credits.json');
  const mcu = read('data/mcu-characters.json');
  const titleInfo = new Map(mcu.titles.map((t) => [t.title, t]));
  const byPage = new Map(mcu.characters.filter((c) => c.page).map((c) => [c.page, c]));
  const byId = new Map(mcu.characters.map((c) => [c.id, c]));
  // One photo per character: the list portrait, or the photo on the character's own page.
  const faces = [];
  const seen = new Set();
  for (const img of credits.images) {
    const c = img.character ? byId.get(img.character) : byPage.get(img.page);
    if (!c || seen.has(c.id)) continue;
    seen.add(c.id);
    faces.push({ img, c, href: c.page || `/characters/all/#${c.id}` });
  }
  faces.sort((a, b) => b.c.titles.length - a.c.titles.length || a.c.firstDate.localeCompare(b.c.firstDate));
  const trailers = credits.videos.filter((v) => v.film && titleInfo.has(v.film))
    .map((v) => ({ ...v, date: titleInfo.get(v.film).date, kind: titleInfo.get(v.film).kind }))
    .sort((a, b) => b.date.localeCompare(a.date));
  const places = credits.images.filter((i) => i.kind === 'place' || /^\/img\/places\//.test(i.file));
  return { credits, mcu, faces, trailers, places, byPage };
}

// Doug 2026-10-06: no source or license lines next to photos and trailers. Every credit
// (author, license, Commons link, channel) lives on /credits, linked from every footer.

function img(i, sizes, eager = false) {
  const set = i.srcset ? ` srcset="${Object.entries(i.srcset).map(([w, f]) => `${f} ${w}w`).join(', ')}" sizes="${sizes}"` : '';
  const load = eager ? ' fetchpriority="high"' : ' loading="lazy"';
  return `<img src="${i.file}"${set} alt="${esc(i.alt || i.subject)}" width="${i.width}" height="${i.height}"${load} decoding="async">`;
}

function face(f, sizes, eager) {
  const actor = f.img.subject;
  return `<figure class="face-tile">
                <a href="${f.href}">${img(f.img, sizes, eager)}<span class="face-name">${esc(f.c.name)}</span><span class="face-actor">${esc(actor)}</span></a>
            </figure>`;
}

export function trailerCard(v, i = 0) {
  const hue = (i * 47) % 360;
  const label = `${v.film} (${v.date.slice(0, 4)})`;
  return `<div class="yt-tile" style="--hue:${hue}">
                <button type="button" class="yt-play" data-yt="${v.youtubeId}" data-title="${esc(v.title)}" aria-label="Play trailer: ${esc(label)}">
                    <span class="yt-kind">${v.kind === 'series' ? 'Series' : 'Movie'} · ${v.date.slice(0, 4)}</span>
                    <span class="yt-film">${esc(v.film)}</span>
                    <span class="yt-icon" aria-hidden="true"></span>
                </button>
            </div>`;
}

const rail = (cards, label) => `<div class="media-rail" role="region" aria-label="${esc(label)}" tabindex="0">
            ${cards.join('\n            ')}
        </div>`;

function placeFig(p) {
  return `<figure class="place-photo place-tile">
                ${img(p, '(max-width: 640px) 100vw, 480px')}
                <figcaption><strong>${esc(p.subject)}</strong>${p.caption ? ` ${esc(p.caption)}` : ''}</figcaption>
            </figure>`;
}

export function homeTop(m) {
  const spot = m.faces.slice(0, 12);
  const wall = m.faces.slice(0, 48);
  return `<section class="media-faces" aria-labelledby="faces-title">
        <h2 class="section-title" id="faces-title">Faces of the MCU</h2>
        <p class="media-lead">The actors behind ${m.faces.length} characters, in real life. Tap a face to see the character.</p>
        <div class="faces-spotlight" data-rotate="6000" aria-roledescription="carousel" aria-label="Actor spotlight">
            ${spot.map((f, i) => `<div class="spot-slide"${i ? ' hidden' : ''} aria-roledescription="slide" aria-label="${i + 1} of ${spot.length}">
            ${face(f, '(max-width: 640px) 60vw, 280px', i === 0)}
            <div class="spot-text"><p class="spot-kicker">Spotlight</p><h3><a href="${f.href}">${esc(f.c.name)}</a></h3><p>${f.img.role === 'voices' ? 'Voiced' : 'Played'} by ${esc(f.img.subject)}. In ${f.c.titles.length} MCU titles, first in ${esc(f.c.first)}.</p></div>
            </div>`).join('\n            ')}
            <div class="spot-controls"><button type="button" class="spot-prev" aria-label="Previous actor">‹</button><button type="button" class="spot-pause" aria-label="Pause">❚❚</button><button type="button" class="spot-next" aria-label="Next actor">›</button></div>
        </div>
        <div class="faces-wall">
            ${wall.map((f) => face(f, '(max-width: 640px) 30vw, 160px', false)).join('\n            ')}
        </div>
        <p class="media-more"><a href="/characters/all/">See all ${m.mcu.characters.length} characters</a></p>
    </section>`;
}

export function homeWatch(m) {
  const films = m.trailers.filter((t) => t.kind === 'film');
  const shows = m.trailers.filter((t) => t.kind !== 'film');
  const places = m.places.filter((p) => p.home !== false);
  return `<section class="media-watch" aria-labelledby="watch-title">
        <h2 class="section-title" id="watch-title">Watch the Trailers</h2>
        <p class="media-lead">Official trailers for all ${films.length} MCU movies and ${shows.length} series, newest first. They play in YouTube's own player.</p>
        <h3 class="media-sub">Movies</h3>
        ${rail(films.map(trailerCard), 'Movie trailers')}
        <h3 class="media-sub">Series</h3>
        ${rail(shows.map((t, i) => trailerCard(t, i + 3)), 'Series trailers')}
    </section>${places.length ? `
    <section class="media-places" aria-labelledby="places-title">
        <h2 class="section-title" id="places-title">Where They Filmed</h2>
        <div class="places-grid">
            ${places.map(placeFig).join('\n            ')}
        </div>
    </section>` : ''}`;
}

export function hubGallery(m, film) {
  const cast = filmCast(m, film).slice(0, 18);
  const places = m.places.filter((p) => (p.films || []).includes(film));
  if (!cast.length && !places.length) return '';
  return `
        <section class="media-gallery" id="cast">
            <h3 class="section-title">The Cast in Real Life</h3>
            <div class="faces-wall">
            ${cast.map((f) => face(f, '(max-width: 640px) 30vw, 160px', false)).join('\n            ')}
            </div>${places.length ? `
            <div class="places-grid">
            ${places.map(placeFig).join('\n            ')}
            </div>` : ''}
        </section>`;
}

export function characterRail(m, c) {
  const list = m.trailers.filter((t) => c.titles.includes(t.film));
  if (!list.length) return '';
  return `<section class="media-watch media-watch-char" aria-label="Trailers">
            <h3>Watch: ${esc(c.name)} on screen</h3>
            <p class="media-lead">Official trailers for the ${list.length} MCU ${list.length === 1 ? 'title' : 'titles'} ${esc(c.name)} appears in.</p>
            ${rail(list.map(trailerCard), `Trailers with ${c.name}`)}
        </section>`;
}

function between(html, name, body, fallback) {
  const a = `<!-- media:${name} -->`, b = `<!-- /media:${name} -->`;
  const block = `${a}\n    ${body}\n    ${b}`;
  if (html.includes(a)) return html.slice(0, html.indexOf(a)) + block + html.slice(html.indexOf(b) + b.length);
  const at = html.search(fallback);
  if (at < 0) throw new Error(`no place for media:${name}`);
  return html.slice(0, at) + block + '\n    ' + html.slice(at);
}

// Strips the old per-photo and per-trailer source lines from hand-written pages
// (character portraits, place photos, article trailers). Safe to run again.
export function stripCredits(html) {
  return html
    .replace(/\s*(?:Photo|Photos?):\s[^<]*?,\s*<a href="[^"]*"[^>]*>[^<]*<\/a>,\s*(?:via\s*)?<a href="https:\/\/commons\.wikimedia\.org[^"]*"[^>]*>Wikimedia Commons<\/a>\.?/g, '')
    .replace(/\s*See <a href="\/credits">all credits<\/a>\./g, '')
    .replace(/\n[ \t]*<p class="(?:trailer-credit|yt-credit)">[\s\S]*?<\/p>/g, '')
    .replace(/<figcaption>\s*<\/figcaption>/g, '')
    .replace(/\n[ \t]*<figcaption><\/figcaption>/g, '');
}

// Header media for every page about one film: a click-to-play official trailer whose
// cover is a mosaic of the film's cast photos, plus a strip of cast faces.
const filmYear = (m, film) => (m.mcu.titles.find((t) => t.title === film) || {}).date?.slice(0, 4) || '';

function trailerFor(m, film, page) {
  const own = m.credits.videos.find((v) => page && v.page === page);
  return own || m.credits.videos.find((v) => v.film === film && v.page === '/') || m.credits.videos.find((v) => v.film === film);
}

export function heroTrailer(m, film, page, label = 'Watch the official trailer') {
  const v = trailerFor(m, film, page);
  if (!v) return '';
  const cast = filmCast(m, film).slice(0, 4);
  const year = filmYear(m, film);
  return `<div class="yt-tile film-trailer">
                <button type="button" class="yt-play film-trailer-btn" data-yt="${v.youtubeId}" data-title="${esc(v.title)}" aria-label="Play the official trailer: ${esc(film)}${year ? ` (${year})` : ''}">
                    <span class="film-mosaic" aria-hidden="true">${cast.map((f) => `<img src="${f.img.file}" alt="" width="${f.img.width}" height="${f.img.height}" loading="lazy" decoding="async">`).join('')}</span>
                    <span class="yt-kind">${esc(label)}</span>
                    <span class="yt-film">${esc(film)}${year ? ` (${year})` : ''}</span>
                    <span class="yt-icon" aria-hidden="true"></span>
                </button>
            </div>`;
}

export function castStrip(m, film, more) {
  const cast = filmCast(m, film);
  if (!cast.length) return '';
  const shown = cast.slice(0, more ? 5 : 6);
  return `<ul class="film-cast" aria-label="Cast of ${esc(film)}">
                ${shown.map((f) => `<li><a href="${f.href}"><img src="${f.img.file}" alt="${esc(f.img.subject)}" width="${f.img.width}" height="${f.img.height}" loading="lazy" decoding="async"><span class="fc-name">${esc(f.c.name.split(' / ').pop())}</span><span class="fc-actor">${esc(f.img.subject)}</span></a></li>`).join('\n                ')}${more && cast.length > shown.length ? `
                <li class="fc-more"><a href="${more}"><span>+${Math.min(cast.length, 18) - shown.length}</span> more</a></li>` : ''}
            </ul>`;
}

export function filmHero(m, film, page, more) {
  const t = heroTrailer(m, film, page);
  if (!t) return '';
  return `<div class="film-hero">
            ${t}
            ${castStrip(m, film, more)}
        </div>`;
}

// Callback pages: one trailer for the film that sets it up, one for the film that pays it off.
export function callbackHero(m, films) {
  const tiles = films.map((f, i) => heroTrailer(m, f, null, i ? 'Paid off in' : 'Set up in')).filter(Boolean);
  if (!tiles.length) return '';
  return `<div class="film-hero film-hero-pair">
            ${tiles.join('\n            ')}
        </div>`;
}

// Puts body inside the page's header box, right after its title (on wide screens it
// floats to the right of the text, on a device it sits under the title), or at its end.
export function intoHeader(html, open, body, close = null) {
  const a = '<!-- media:film-hero -->', b = '<!-- /media:film-hero -->';
  if (html.includes(a)) html = html.slice(0, html.indexOf(a)).replace(/\n[ \t]*$/, '') + html.slice(html.indexOf(b) + b.length);
  html = html.replace(/ has-hero"/, '"');
  const at = html.indexOf(open);
  if (!body || at < 0) return html;
  // After the title, or (with close) at the end of the header box.
  const title = close ? html.lastIndexOf('\n', html.indexOf(close, at)) - at : html.slice(at).search(/<\/h[12]>/) + 5;
  if (title < 5) return html;
  const end = at + title;
  return html.slice(0, at) + open.replace(/"$/, ' has-hero"') + html.slice(at + open.length, end)
    + `\n            ${a}\n            ${body}\n            ${b}` + html.slice(end);
}

const SCENE_PAGES = Object.fromEntries(Object.entries(HUB_FILMS).map(([id, f]) => [`${id}-scenes`, [id, f]]));

// Header media on movie hubs, deleted-scene pages and callback pages. build-hubs.mjs and
// build-callbacks.js call this after they rewrite their pages.
export function addFilmHeroes(m = loadMedia()) {
  let n = 0;
  for (const [id, film] of Object.entries(HUB_FILMS)) {
    const file = path.join(ROOT, 'movies', `${id}.html`);
    let html = fs.readFileSync(file, 'utf8');
    html = html.replace(/\n[ \t]*<section class="trailer-block">[\s\S]*?<\/section>\n?/, '\n');
    html = intoHeader(html, '<div class="movie-header"', filmHero(m, film, `/movies/${id}`, '#cast'));
    fs.writeFileSync(file, addScript(html)); n++;
  }
  for (const [name, [id, film]] of Object.entries(SCENE_PAGES)) {
    const file = path.join(ROOT, 'scenes', `${name}.html`);
    if (!fs.existsSync(file)) continue;
    const html = intoHeader(fs.readFileSync(file, 'utf8'), '<div class="movie-header"', filmHero(m, film, `/movies/${id}`, `/movies/${id}#cast`));
    fs.writeFileSync(file, addScript(html)); n++;
  }
  const dir = path.join(ROOT, 'callbacks');
  for (const name of fs.readdirSync(dir).filter((f) => /^callback-.*\.html$/.test(f))) {
    const file = path.join(dir, name);
    let html = fs.readFileSync(file, 'utf8');
    const films = [...new Set([...html.matchAll(/<div class="movie-title">([^<]+)<\/div>/g)].map((x) => x[1].replace(/\s*\(\d{4}\)$/, '').trim()))];
    html = intoHeader(html, '<header class="detail-header"', callbackHero(m, films), '</header>');
    fs.writeFileSync(file, addScript(html)); n++;
  }
  return n;
}

const SCRIPT = '<script src="/js/media.js" defer></script>';
const addScript = (html) => (/src="\/js\/media\.js(\?v=[0-9a-f]+)?"/.test(html) ? html : html.replace('</body>', `    ${SCRIPT}\n</body>`));

export function build() {
  const m = loadMedia();
  let home = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  home = between(home, 'home-top', homeTop(m), /<h2 class="section-title">Newest Findings/);
  home = between(home, 'home-watch', homeWatch(m), /<h2 class="section-title">Featured Movies/);
  fs.writeFileSync(path.join(ROOT, 'index.html'), addScript(home));

  for (const [id, film] of Object.entries(HUB_FILMS)) {
    const file = path.join(ROOT, 'movies', `${id}.html`);
    let html = fs.readFileSync(file, 'utf8').replace(/\n[ \t]*<section class="media-gallery">[\s\S]*?<\/section>/, '');
    const g = hubGallery(m, film);
    const at = html.indexOf('<div class="subsection">');
    if (g && at > 0) html = html.slice(0, html.lastIndexOf('\n', at)) + g + html.slice(html.lastIndexOf('\n', at));
    html = html.replace(/\n(?:[ \t]*\n)+([ \t]*<section class="media-gallery">)/, '\n\n$1');
    fs.writeFileSync(file, addScript(html));
  }

  const heroes = addFilmHeroes(m);

  // Pages written by hand keep their photos but lose the old source lines.
  let cleaned = 0;
  for (const file of htmlFilesUnder(ROOT)) {
    if (path.basename(file) === 'credits.html') continue;
    const html = fs.readFileSync(file, 'utf8');
    const out = stripCredits(html);
    if (out !== html) { fs.writeFileSync(file, out); cleaned++; }
  }

  let chars = 0;
  for (const [page, c] of m.byPage) {
    const file = path.join(ROOT, `${page.slice(1)}.html`);
    if (!fs.existsSync(file)) continue;
    let html = fs.readFileSync(file, 'utf8');
    const body = characterRail(m, c);
    if (!body) continue;
    html = between(html, 'char-trailers', body, /<\/main>/);
    fs.writeFileSync(file, addScript(html));
    chars++;
  }
  console.log(`media: ${m.faces.length} faces, ${m.trailers.length} trailers, ${m.places.length} places; home, ${Object.keys(HUB_FILMS).length} hubs, ${chars} character pages, ${heroes} film headers, ${cleaned} pages cleaned of source lines`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) build();
