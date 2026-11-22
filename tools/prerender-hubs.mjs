// Writes a plain list into the hub pages whose cards are drawn by JavaScript (rabbit holes, callbacks,
// deleted scenes, character arcs), so the words are in the file for search engines and readers without
// JavaScript. The page script replaces the list with its cards as before. Run after changing the data files,
// then `node tools/menu.mjs` and `node scripts/thin-check.mjs --write`. (Thin page check, 2026-11-22.)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const data = f => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'));
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const START = '<!-- prerender:start -->', END = '<!-- prerender:end -->';

function fill(file, id, html) {
  const f = path.join(ROOT, file);
  let s = fs.readFileSync(f, 'utf8');
  const open = s.search(new RegExp(`<div id="${id}"[^>]*>`));
  if (open < 0) throw new Error(`${file}: no #${id}`);
  const after = s.indexOf('>', open) + 1;
  const block = `${START}\n${html}\n${END}`;
  const a = s.indexOf(START, after), b = s.indexOf(END, after);
  if (a >= 0 && b > a && a < s.indexOf('</div>', after) + 1e6) s = s.slice(0, a) + block + s.slice(b + END.length);
  else {
    // First run: replace the "Loading..." placeholder (or nothing) up to the container's closing tag.
    const close = s.indexOf('</div>', after);
    s = s.slice(0, after) + '\n' + block + '\n' + s.slice(close);
  }
  fs.writeFileSync(f, s);
}

// Rabbit holes: title, the question it answers, and the summary.
const holes = data('rabbit-holes.json').rabbitHoles;
fill('rabbit-holes/index.html', 'holes-container', holes.map(h =>
  `<article class="hole-card"><h3><a href="/rabbit-holes/${esc(h.slug)}">${esc(h.title)}</a></h3><p class="hole-tagline">${esc(h.tagline)}</p><p class="hole-summary">${esc(h.summary)}</p></article>`).join('\n'));

// Callbacks: where each one is set up and where it pays off.
const cbs = data('callbacks.json').callbacks;
fill('callbacks/index.html', 'callbacks-results', `<ul class="prerender-list">\n${cbs.map(c =>
  `<li><a href="/callbacks/callback-${esc(c.id)}.html">${esc(c.title)}</a>: set up in ${esc(c.foreshadow.movieTitle)} (${c.foreshadow.movieYear}), ${esc(c.foreshadow.scene.charAt(0).toLowerCase() + c.foreshadow.scene.slice(1))}; paid off in ${esc(c.fulfillment.movieTitle)} (${c.fulfillment.movieYear}), ${esc(c.fulfillment.scene.charAt(0).toLowerCase() + c.fulfillment.scene.slice(1))}.</li>`).join('\n')}\n</ul>`);

// Deleted scenes: grouped by film, with running time and where the scene was released.
const scenes = data('deleted-scenes.json').deletedScenes;
const films = [...new Map(scenes.map(s => [s.movieId, `${s.movieTitle} (${s.movieYear})`])).entries()];
fill('scenes/index.html', 'scenes-container', films.map(([id, name]) => {
  const list = scenes.filter(s => s.movieId === id);
  return `<h2 class="prerender-h"><a href="/scenes/${esc(id)}-scenes">${esc(name)}</a></h2>\n<p>Released on: ${esc(list[0].whereToWatch)}.</p>\n<ul class="prerender-list">${list.map(s => `<li>${esc(s.title)}${s.runtime ? ` (${esc(s.runtime)})` : ''}</li>`).join('')}</ul>`;
}).join('\n'));

// Character arcs: hero name, who plays them, and the arc in one line.
const chars = data('characters.json').characters;
fill('characters/index.html', 'characters-grid', `<ul class="prerender-list">\n${chars.map(c =>
  `<li><a href="/characters/${esc(c.slug)}">${esc(c.heroName)}</a>${c.fullName && c.fullName !== c.heroName ? ` (${esc(c.fullName)})` : ''}, played by ${esc(c.actor)}: ${esc(c.arcThesis)}.</li>`).join('\n')}\n</ul>`);


// Universe Map: what is on the map, by kind, so the list reads without the drawing.
const map = data('connections.json');
const KIND = { movie: 'Films', character: 'Characters', artifact: 'Objects and Infinity Stones', event: 'Events' };
fill('map/index.html', 'map-contents', `<p><strong>On the map:</strong> ${map.nodes.length} dots and ${map.edges.length} links.</p>\n${Object.entries(KIND).map(([t, name]) => {
  const n = map.nodes.filter(x => x.type === t);
  return n.length ? `<p><strong>${name}:</strong> ${n.map(x => esc(x.label) + (x.year ? ` (${x.year})` : '')).join(', ')}.</p>` : '';
}).join('\n')}`);

console.log('prerender-hubs: rabbit holes, callbacks, deleted scenes, character arcs and the map list written');
