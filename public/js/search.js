// Site search (the box in the header bar). Everything runs in the browser over
// the site's own data files; nothing is sent anywhere. The index loads the first
// time someone opens the box. Keyboard: type, Up/Down to move, Enter to go,
// Esc to close, "/" to jump to the box from anywhere.
const dom = typeof document !== 'undefined';
const box = dom && document.querySelector('.site-search');
const input = dom && document.getElementById('site-q');
const list = dom && document.getElementById('site-results');
const toggle = dom && document.querySelector('.site-search-toggle');
const bar = dom && document.querySelector('.site-bar');

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const getJSON = (u) => fetch(u).then((r) => (r.ok ? r.json() : Promise.reject(new Error(u))));
const KIND_ORDER = { Movie: 0, Article: 1, Character: 2, Callback: 3, 'Deleted scene': 4, 'Rabbit hole': 5 };

let indexP = null;
function buildIndex() {
  indexP ||= Promise.allSettled([
    getJSON('/data/search-pages.json'),
    getJSON('/data/callbacks.json'),
    getJSON('/data/characters.json'),
    getJSON('/data/mcu-characters.json'),
    getJSON('/data/deleted-scenes.json'),
    getJSON('/data/rabbit-holes.json'),
  ]).then((r) => {
    const v = (i) => (r[i].status === 'fulfilled' ? r[i].value : null);
    const items = [];
    const add = (t, u, k, extra, alias = '') => items.push({ t, u, k, hay: norm(`${t} ${alias}`), extra: norm(extra) });
    (v(0) || []).forEach((p) => add(p.t, p.u, p.k, p.d));
    ((v(1) || {}).callbacks || []).forEach((c) => add(c.title, `/callbacks/callback-${c.id}`, 'Callback',
      [c.foreshadow && c.foreshadow.movieTitle, c.fulfillment && c.fulfillment.movieTitle, c.explanation].join(' ')));
    const seen = new Set();
    ((v(2) || {}).characters || []).forEach((c) => {
      seen.add(`/characters/${c.slug}`);
      add(c.heroName || c.fullName, `/characters/${c.slug}`, 'Character', [c.actor, c.arcThesis].join(' '), c.fullName);
    });
    ((v(3) || {}).characters || []).forEach((c) => {
      const u = c.page || '/characters/all/';
      if (seen.has(u)) return;
      add(c.name, u, 'Character', [].concat(c.actors || [], c.first || '').join(' '));
    });
    ((v(4) || {}).deletedScenes || []).forEach((s) => add(s.title, `/scenes/${s.movieId}-scenes#${s.id}`, 'Deleted scene', [s.movieTitle, s.description, s.synopsis].filter(Boolean).join(' ')));
    ((v(5) || {}).rabbitHoles || []).forEach((h) => add(h.title, `/rabbit-holes/${h.slug}`, 'Rabbit hole', [h.tagline, h.summary].join(' ')));
    return items;
  });
  return indexP;
}

export function rank(items, q) {
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const out = [];
  for (const it of items) {
    let score = 0;
    let ok = true;
    for (const w of words) {
      if (it.hay.startsWith(w) || it.hay.includes(` ${w}`)) score += 4;
      else if (it.hay.includes(w)) score += 3;
      else if (it.extra.includes(w)) score += 1;
      else { ok = false; break; }
    }
    if (ok) out.push({ it, score });
  }
  out.sort((a, b) => b.score - a.score || (KIND_ORDER[a.it.k] ?? 9) - (KIND_ORDER[b.it.k] ?? 9) || a.it.t.localeCompare(b.it.t));
  return out.slice(0, 8).map((x) => x.it);
}

let shown = [];
let active = -1;
function setActive(i) {
  active = i;
  [...list.children].forEach((li, n) => li.setAttribute('aria-selected', n === i ? 'true' : 'false'));
  if (i >= 0) input.setAttribute('aria-activedescendant', `site-r${i}`); else input.removeAttribute('aria-activedescendant');
}
function close() {
  list.hidden = true;
  input.setAttribute('aria-expanded', 'false');
  setActive(-1);
}
function paint(q) {
  if (!q.trim()) { close(); return; }
  list.hidden = false;
  input.setAttribute('aria-expanded', 'true');
  if (!shown.length) {
    list.innerHTML = '<li class="site-result-none" role="presentation">No matches. Try a movie, a character or an easter egg.</li>';
    setActive(-1);
    return;
  }
  list.innerHTML = shown.map((s, i) =>
    `<li id="site-r${i}" role="option" aria-selected="false"><a href="${esc(s.u)}" tabindex="-1"><span class="site-result-kind">${esc(s.k)}</span><span class="site-result-title">${esc(s.t)}</span></a></li>`).join('');
  setActive(0);
}
async function run() {
  const q = input.value;
  const items = await buildIndex();
  if (input.value !== q) return; // a newer keystroke already ran
  shown = rank(items, q);
  paint(q);
}

if (box && input && list) {
  box.hidden = false;
  if (toggle) toggle.hidden = false;
  input.addEventListener('focus', buildIndex);
  input.addEventListener('input', run);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && shown.length) { e.preventDefault(); setActive((active + 1) % shown.length); }
    else if (e.key === 'ArrowUp' && shown.length) { e.preventDefault(); setActive((active - 1 + shown.length) % shown.length); }
    else if (e.key === 'Enter') { if (shown[active]) { e.preventDefault(); location.href = shown[active].u; } }
    else if (e.key === 'Escape') { if (!list.hidden) close(); else { input.value = ''; input.blur(); bar && bar.classList.remove('search-open'); toggle && toggle.setAttribute('aria-expanded', 'false'); } }
  });
  list.addEventListener('mousedown', (e) => e.preventDefault()); // keep focus so the click lands
  document.addEventListener('click', (e) => { if (!box.contains(e.target) && !(toggle && toggle.contains(e.target))) close(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable) {
      e.preventDefault();
      if (bar) bar.classList.add('search-open');
      input.focus();
    }
  });
  if (toggle) {
    toggle.addEventListener('click', () => {
      const open = !bar.classList.contains('search-open');
      bar.classList.toggle('search-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      if (open) input.focus(); else close();
    });
  }
}
