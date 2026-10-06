// Member perks, local-first: Seen it (watch tracker + optional spoiler blur),
// Save (saved list), favorite characters (star), the hidden-details found
// counter with its rank ladder, and the My Marvel page (/me/).
// Everything is kept in this browser (localStorage) and works with no
// account. Signing in with Google (optional) syncs it through /api/sync.
// Loaded on every page by tools/menu.mjs as <script type="module">.
import * as core from './members-core.js';

const KEY = 'dym-members-v1';
const SIGNED = 'dym-signed-in'; // "1" while this browser has a session
const RANK_CACHE = 'dym-rank'; // last rank title, so the menu chip needs no fetch
const LAST_SYNC = 'dym-last-sync';

const ls = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode: still works for this page */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};
const ss = {
  get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch { /* ignore */ } },
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const movieTitle = (id) => (core.MOVIES.find((m) => m.id === id) || {}).title || id;
const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- state ----------
function readState() {
  let s;
  try { s = core.sanitize(JSON.parse(ls.get(KEY) || 'null')); } catch { s = core.emptyState(); }
  // The character grid used to keep its own favorites list; fold it in once.
  const old = ls.get('characterFavorites');
  if (old) {
    try { for (const id of JSON.parse(old)) if (typeof id === 'string' && !s.favs[id]) core.setToggle(s, 'favs', id, true); } catch { /* ignore */ }
    ls.set(KEY, JSON.stringify(s));
    ls.del('characterFavorites');
  }
  return s;
}
let state = readState();

function emit() { document.dispatchEvent(new CustomEvent('dym:change')); }
function commit({ sync = true } = {}) {
  ls.set(KEY, JSON.stringify(state));
  emit();
  if (sync) scheduleSync();
}
window.addEventListener('storage', (e) => {
  if (e.key === KEY) { state = readState(); emit(); }
});

// ---------- catalog (totals for the found counter) ----------
const getJSON = (url) => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(url))));
let catalogP = null;
function catalog() {
  catalogP ||= Promise.all([
    getJSON('/data/deleted-scenes.json'),
    getJSON('/data/callbacks.json'),
    getJSON('/data/rabbit-holes.json'),
    getJSON('/data/ranks.json'),
  ]).then(([sc, cb, rh, rk]) => ({
    ids: { scene: sc.deletedScenes.map((x) => x.id), callback: cb.callbacks.map((x) => x.id), rabbit: rh.rabbitHoles.map((x) => x.id) },
    scenes: sc.deletedScenes,
    callbacks: cb.callbacks,
    holes: rh.rabbitHoles,
    ranks: rk.ranks,
  }));
  return catalogP;
}

async function progress() {
  const c = await catalog();
  const stats = core.foundStats(state.found, c.ids);
  const rank = core.rankFor(stats.found, stats.total, c.ranks);
  return { c, stats, rank };
}

// ---------- actions ----------
const api = {
  get state() { return state; },
  isSaved: (key) => core.isOn(state.saved, key),
  isSeen: (id) => core.isOn(state.seen, id),
  isFav: (id) => core.isOn(state.favs, id),
  favIds: () => core.onIds(state.favs),
  toggleSave(key, meta = {}) {
    core.setToggle(state, 'saved', key, !api.isSaved(key), { title: (meta.title || '').slice(0, 140), url: meta.url || '' });
    commit();
  },
  toggleSeen(id) { core.setToggle(state, 'seen', id, !api.isSeen(id)); commit(); },
  toggleFav(id) { core.setToggle(state, 'favs', id, !api.isFav(id)); commit(); },
  setHideSpoilers(on) { state.settings = { hideSpoilers: !!on, t: Math.max(Date.now(), state.settings.t + 1) }; commit(); },
  markFound(key) {
    if (Object.prototype.hasOwnProperty.call(state.found, key)) return;
    state.found[key] = Date.now();
    commit();
    checkRank();
  },
  clearDevice() { state = core.emptyState(); ls.del(RANK_CACHE); commit({ sync: false }); },
};
window.dymMembers = api;

// ---------- rank chip, promotion toast ----------
async function checkRank() {
  try {
    const { rank } = await progress();
    ls.set(RANK_CACHE, rank.current.title);
    updateChip();
    if (rank.index > state.rankSeen) {
      state.rankSeen = rank.index;
      commit();
      toast(`Promoted! You're now <strong>${esc(rank.current.title)}</strong>.`, rank.current.reason);
    }
  } catch { /* data didn't load; try again next time */ }
}

function updateChip() {
  const link = document.querySelector('nav.site-nav a[href="/me/"]');
  const title = ls.get(RANK_CACHE);
  if (!link || !title || !Object.keys(state.found).length) return;
  let chip = link.querySelector('.dym-rank-chip');
  if (!chip) {
    chip = document.createElement('span');
    chip.className = 'dym-rank-chip';
    link.appendChild(chip);
  }
  chip.textContent = title;
  link.setAttribute('aria-label', `My Marvel, rank ${title}`);
}

function toast(html, sub) {
  document.querySelector('.dym-toast')?.remove();
  const t = document.createElement('div');
  t.className = 'dym-toast' + (reducedMotion() ? '' : ' dym-toast-pop');
  t.setAttribute('role', 'status');
  t.innerHTML = `<p class="dym-toast-title">${html}</p>${sub ? `<p class="dym-toast-sub">${esc(sub)}</p>` : ''}<a href="/me/">See My Marvel</a><button type="button" class="dym-toast-close" aria-label="Close">×</button>`;
  t.querySelector('.dym-toast-close').addEventListener('click', () => t.remove());
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 9000);
}

// ---------- buttons ----------
const ICONS = {
  save: '<svg class="dym-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 1.5h8a.5.5 0 0 1 .5.5v12.3L8 11.4l-4.5 2.9V2a.5.5 0 0 1 .5-.5z" fill="var(--dym-ico-fill, none)" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  seen: '<svg class="dym-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 8.5 6.2 12l7.3-8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

function button(kind, { small = false } = {}) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `dym-btn dym-${kind}${small ? ' dym-btn-sm' : ''}`;
  return b;
}

function saveButton(key, meta, opts) {
  const b = button('save', opts);
  const paint = () => {
    const on = api.isSaved(key);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.innerHTML = `${ICONS.save}${on ? 'Saved' : 'Save'}`;
    b.title = on ? 'Saved to My Marvel. Tap to remove.' : 'Save to My Marvel';
  };
  b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); api.toggleSave(key, meta()); });
  document.addEventListener('dym:change', paint);
  paint();
  return b;
}

function seenButton(id) {
  const b = button('seen');
  const paint = () => {
    const on = api.isSeen(id);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.innerHTML = `${on ? ICONS.seen : ''}${on ? 'Seen it' : 'Seen it?'}`;
    b.title = on ? `You've marked ${movieTitle(id)} as seen. Tap to undo.` : `Mark ${movieTitle(id)} as seen`;
  };
  b.addEventListener('click', (e) => { e.preventDefault(); api.toggleSeen(id); });
  document.addEventListener('dym:change', paint);
  paint();
  return b;
}

function favButton(id, name) {
  const b = button('fav');
  const paint = () => {
    const on = api.isFav(id);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.textContent = `${on ? '★' : '☆'} Favorite`;
    b.title = on ? `${name} is a favorite. Tap to remove.` : `Make ${name} a favorite`;
  };
  b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); api.toggleFav(id); });
  document.addEventListener('dym:change', paint);
  paint();
  return b;
}

function spoilerSwitch() {
  const label = document.createElement('label');
  label.className = 'dym-switch';
  label.innerHTML = '<input type="checkbox"> <span>Hide spoilers for movies I haven\'t seen</span>';
  const box = label.querySelector('input');
  const paint = () => { box.checked = state.settings.hideSpoilers; };
  box.addEventListener('change', () => api.setHideSpoilers(box.checked));
  document.addEventListener('dym:change', paint);
  paint();
  return label;
}

function actionRow(...items) {
  const row = document.createElement('div');
  row.className = 'dym-actions';
  row.append(...items);
  return row;
}

// ---------- spoiler blur ----------
// Elements tied to films carry data-dym-movies="id id". When the switch is on
// and any of those films isn't marked Seen, the element is blurred until tapped.
const revealed = new WeakSet();
function tieToMovies(el, ids) {
  const list = [...new Set(ids.filter((id) => core.MOVIES.some((m) => m.id === id)))];
  if (!el || !list.length) return;
  el.dataset.dymMovies = list.join(' ');
}

function applySpoilers() {
  for (const el of document.querySelectorAll('[data-dym-movies]')) {
    const unseen = el.dataset.dymMovies.split(' ').filter((id) => !api.isSeen(id));
    const hide = state.settings.hideSpoilers && unseen.length > 0 && !revealed.has(el);
    const btn = el.querySelector(':scope > .dym-reveal');
    if (hide && !btn) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'dym-reveal';
      b.innerHTML = `<span>Spoiler: ${esc(unseen.map(movieTitle).join(', '))}. Tap to reveal</span>`;
      b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); revealed.add(el); applySpoilers(); });
      el.prepend(b);
      el.classList.add('dym-spoiler');
      for (const child of el.children) if (child !== b) child.setAttribute('aria-hidden', 'true');
    } else if (!hide && btn) {
      btn.remove();
      el.classList.remove('dym-spoiler');
      for (const child of el.children) child.removeAttribute('aria-hidden');
    }
  }
}
document.addEventListener('dym:change', applySpoilers);

// ---------- "found" tracking ----------
let seenObserver = null;
function watchVisible(el, key) {
  if (!('IntersectionObserver' in window)) return api.markFound(key);
  seenObserver ||= new IntersectionObserver((entries) => {
    for (const en of entries) {
      const target = en.target;
      clearTimeout(target._dymTimer);
      if (en.isIntersecting) {
        target._dymTimer = setTimeout(() => { api.markFound(target.dataset.dymFound); seenObserver.unobserve(target); }, 1500);
      }
    }
  }, { threshold: 0.6 });
  el.dataset.dymFound = key;
  seenObserver.observe(el);
}

// ---------- page decorations ----------
const path = location.pathname.replace(/\.html$/, '').replace(/\/index$/, '/');
const titleOf = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : document.title.split('|')[0].trim());

function onCards(selector, fn, flag = 'dymDone') {
  const run = () => document.querySelectorAll(selector).forEach((el) => {
    if (el.dataset[flag]) return;
    el.dataset[flag] = '1';
    fn(el);
  });
  run();
  new MutationObserver(() => { run(); applySpoilers(); }).observe(document.body, { childList: true, subtree: true });
}

function decorate() {
  let m;
  // Movie hubs: Seen it, Save, the spoiler switch; details on the page belong to this film.
  if ((m = /^\/movies\/([a-z0-9-]+)$/.exec(path)) && core.MOVIES.some((x) => x.id === m[1])) {
    const id = m[1];
    const head = document.querySelector('.movie-header');
    const h = head && head.querySelector('h2, h1');
    if (head && h) {
      h.after(actionRow(seenButton(id), saveButton(`movie:${id}`, () => ({ title: titleOf(h), url: `/movies/${id}` }))), spoilerSwitch());
    }
    document.querySelectorAll('.container div.detail-item').forEach((el) => tieToMovies(el, [id]));
    document.querySelectorAll('.container .subsection').forEach((el) => {
      if (!el.querySelector('.detail-item')) el.querySelectorAll(':scope > p').forEach((p) => tieToMovies(p, [id]));
    });
  }

  // Deleted scenes: Save on each card; a scene counts as found once its card
  // has been on screen for a moment.
  if (path.startsWith('/scenes/')) {
    const pageMovie = (/^\/scenes\/([a-z0-9-]+)-scenes$/.exec(path) || [])[1];
    onCards('.scene-card[data-scene-id]', (card) => {
      const id = card.dataset.sceneId;
      const movie = card.dataset.movieId || pageMovie;
      const h = card.querySelector('h3');
      card.id ||= id;
      (card.querySelector('.scene-card-header') || card).appendChild(
        saveButton(`scene:${id}`, () => ({ title: titleOf(h), url: `/scenes/${movie ? `${movie}-scenes` : ''}#${id}` }), { small: true }),
      );
      // Everything under the title goes in one box so it blurs as one.
      const body = document.createElement('div');
      body.className = 'dym-scene-body';
      body.append(...[...card.children].filter((el) => !el.classList.contains('scene-card-header')));
      card.appendChild(body);
      tieToMovies(body, [movie]);
      watchVisible(card, `scene:${id}`);
      if (location.hash === `#${id}`) setTimeout(() => card.scrollIntoView({ block: 'center' }), 50);
    });
  }

  // Callbacks: Save on cards and detail pages; opening a detail page finds it.
  if (path.startsWith('/callbacks/')) {
    const detail = /^\/callbacks\/callback-(cb-\d+)$/.exec(path);
    catalog().then((c) => {
      const byId = Object.fromEntries(c.callbacks.map((x) => [x.id, x]));
      const tie = (root, cb) => {
        if (!cb) return;
        tieToMovies(root.querySelector('.foreshadow'), [cb.foreshadow.movieId]);
        tieToMovies(root.querySelector('.fulfillment'), [cb.fulfillment.movieId]);
        tieToMovies(root.querySelector('.callback-explanation, .explanation-box'), [cb.foreshadow.movieId, cb.fulfillment.movieId]);
      };
      if (detail) tie(document, byId[detail[1]]);
      onCards('.callback-card[id^="callback-"]', (card) => tie(card, byId[card.id.replace(/^callback-/, '')]), 'dymTied');
      applySpoilers();
    }).catch(() => {});
    if (detail) {
      const id = detail[1];
      const h = document.querySelector('.detail-header h1');
      if (h) h.after(actionRow(saveButton(`callback:${id}`, () => ({ title: titleOf(h), url: `/callbacks/callback-${id}` }))));
      api.markFound(`callback:${id}`);
    } else {
      onCards('.callback-card[id^="callback-"]', (card) => {
        const id = card.id.replace(/^callback-/, '');
        const h = card.querySelector('h3');
        (card.querySelector('.callback-header') || card).appendChild(
          saveButton(`callback:${id}`, () => ({ title: titleOf(h), url: `/callbacks/callback-${id}` }), { small: true }),
        );
      });
    }
  }

  // Characters: star (favorite) and Save on each character page.
  if ((m = /^\/characters\/([a-z0-9-]+)$/.exec(path)) && m[1] !== 'all') {
    const id = m[1];
    const h = document.querySelector('.character-header h2, .character-header h1');
    if (h) h.after(actionRow(favButton(id, titleOf(h)), saveButton(`character:${id}`, () => ({ title: titleOf(h), url: `/characters/${id}` }))));
  }

  // Rabbit holes: Save; opening one's page finds it.
  if ((m = /^\/rabbit-holes\/([a-z0-9-]+)$/.exec(path))) {
    const id = m[1];
    const h = document.querySelector('.hole-detail-header h1');
    if (h) h.after(actionRow(saveButton(`rabbit:${id}`, () => ({ title: titleOf(h), url: `/rabbit-holes/${id}` }))));
    api.markFound(`rabbit:${id}`);
  } else if (path === '/rabbit-holes/') {
    onCards('.hole-card[data-hole-id]', (card) => {
      const id = card.dataset.holeId;
      const h = card.querySelector('h3');
      (card.querySelector('.hole-card-header') || card).appendChild(
        saveButton(`rabbit:${id}`, () => ({ title: titleOf(h), url: `/rabbit-holes/${id}` }), { small: true }),
      );
    });
  }

  // Articles: Save under the headline.
  if ((m = /^\/articles\/([a-z0-9-]+)$/.exec(path))) {
    const h = document.querySelector('article h1');
    if (h) {
      const meta = h.parentElement.querySelector('.article-meta');
      (meta || h).after(actionRow(saveButton(`article:${m[1]}`, () => ({ title: titleOf(h), url: `/articles/${m[1]}` }))));
    }
  }

  // Home: one small line with the found counter and rank.
  if (path === '/') {
    const anchor = document.querySelector('.container');
    if (anchor) {
      const p = document.createElement('p');
      p.className = 'dym-found-line';
      anchor.prepend(p);
      const paint = () => progress().then(({ stats, rank }) => {
        p.innerHTML = `<a href="/me/">You've found <strong>${stats.found} of ${stats.total}</strong> hidden details · Rank: <strong>${esc(rank.current.title)}</strong></a>`;
      }).catch(() => p.remove());
      document.addEventListener('dym:change', paint);
      paint();
    }
  }

  if (path === '/me/') renderMe();
  if (path === '/account') {
    // The sign-in page redraws its panel after signing in or out; follow it.
    const check = () => import('./account.js').then((m) => m.account()).then((a) => noteAccount(a.user)).catch(() => {});
    const panel = document.getElementById('account');
    if (panel) new MutationObserver(check).observe(panel, { childList: true });
    check();
  }
  applySpoilers();
  updateChip();
}

// ---------- My Marvel (/me/) ----------
function renderMe() {
  const $ = (id) => document.getElementById(id);
  let characters = [];
  getJSON('/data/characters.json').then((d) => { characters = d.characters; paintFavs(); }).catch(() => {});

  // Rank and found counter
  const paintRank = () => progress().then(({ c, stats, rank }) => {
    const box = $('dym-rank');
    if (!box) return;
    const pct = Math.round(rank.progress * 100);
    const next = rank.next
      ? `<div class="dym-bar" role="progressbar" aria-label="Progress to ${esc(rank.next.title)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div>
         <p class="dym-next"><strong>${rank.toNext}</strong> more detail${rank.toNext === 1 ? '' : 's'} to reach <strong>${esc(rank.next.title)}</strong></p>`
      : '<p class="dym-next">Top rank. You found every hidden detail.</p>';
    box.innerHTML = `
      <p class="dym-kicker">Your rank · ${rank.index + 1} of ${c.ranks.length}</p>
      <p class="dym-rank-title">${esc(rank.current.title)}</p>
      <p class="dym-rank-reason">${esc(rank.current.reason)}</p>
      ${next}
      <p class="dym-count">You've found <strong>${stats.found} of ${stats.total}</strong> hidden details</p>
      <ul class="dym-breakdown">
        <li><a href="/scenes/">Deleted scenes</a> ${stats.byKind.scene.found}/${stats.byKind.scene.total}</li>
        <li><a href="/callbacks/">Callbacks</a> ${stats.byKind.callback.found}/${stats.byKind.callback.total}</li>
        <li><a href="/rabbit-holes/">Rabbit holes</a> ${stats.byKind.rabbit.found}/${stats.byKind.rabbit.total}</li>
      </ul>`;
    const ladder = $('dym-ladder');
    if (ladder) {
      ladder.innerHTML = [...c.ranks].sort((a, b) => a.minPct - b.minPct).map((r, i) => `
        <li class="${i === rank.index ? 'dym-here' : i < rank.index ? 'dym-done' : ''}">
          <strong>${esc(r.title)}</strong> <span class="dym-need">${core.needed(r.minPct, stats.total)} details${r.minPct ? ` (${r.minPct}%)` : ''}</span>
          <span class="dym-why">${esc(r.reason)}</span></li>`).join('');
    }
    ls.set(RANK_CACHE, rank.current.title);
    updateChip();
  }).catch(() => {});

  // Movies seen
  const movies = $('dym-movies');
  if (movies) {
    const list = document.createElement('ul');
    list.className = 'dym-movie-list';
    for (const mv of core.MOVIES) {
      const li = document.createElement('li');
      li.innerHTML = `<a href="/movies/${mv.id}">${esc(mv.title)}</a> <span class="dym-year">(${mv.year})</span>`;
      li.appendChild(seenButton(mv.id));
      list.appendChild(li);
    }
    movies.append(list, spoilerSwitch());
  }

  // Saved list
  const KIND = { article: 'Article', scene: 'Deleted scene', callback: 'Callback', character: 'Character', rabbit: 'Rabbit hole', movie: 'Movie' };
  const paintSaved = () => {
    const box = $('dym-saved');
    if (!box) return;
    const keys = core.onIds(state.saved).sort((a, b) => state.saved[b].t - state.saved[a].t);
    if (!keys.length) {
      box.innerHTML = '<p class="dym-empty">Nothing saved yet. Tap <strong>Save</strong> on an article, deleted scene, callback, character or rabbit hole and it shows up here.</p>';
      return;
    }
    box.innerHTML = `<ul class="dym-list">${keys.map((k) => {
      const it = state.saved[k];
      const kind = KIND[k.split(':')[0]] || '';
      const label = esc(it.title || k.split(':')[1]);
      return `<li><span class="dym-kind">${kind}</span> ${it.url ? `<a href="${esc(it.url)}">${label}</a>` : label}
        <button type="button" class="dym-btn dym-btn-sm dym-remove" data-key="${esc(k)}" aria-label="Remove ${label} from saved">Remove</button></li>`;
    }).join('')}</ul>`;
    box.querySelectorAll('.dym-remove').forEach((b) => b.addEventListener('click', () => api.toggleSave(b.dataset.key)));
  };

  // Favorite characters
  const paintFavs = () => {
    const box = $('dym-favs');
    if (!box) return;
    const ids = api.favIds();
    if (!ids.length) {
      box.innerHTML = '<p class="dym-empty">No favorites yet. Tap the <strong>☆</strong> on a <a href="/characters/">character</a> to add one.</p>';
      return;
    }
    const byId = Object.fromEntries(characters.map((ch) => [ch.id, ch]));
    box.innerHTML = `<ul class="dym-list">${ids.map((id) => {
      const ch = byId[id];
      const hero = esc(ch ? ch.heroName : id);
      const full = ch && ch.heroName !== ch.fullName ? ` <span class="dym-year">${esc(ch.fullName)}</span>` : '';
      return `<li><span class="dym-star" aria-hidden="true">★</span> <a href="/characters/${esc(id)}">${hero}</a>${full}
        <button type="button" class="dym-btn dym-btn-sm dym-remove" data-id="${esc(id)}" aria-label="Remove ${hero} from favorites">Remove</button></li>`;
    }).join('')}</ul>`;
    box.querySelectorAll('.dym-remove').forEach((b) => b.addEventListener('click', () => api.toggleFav(b.dataset.id)));
  };

  const clear = $('dym-clear');
  if (clear) {
    clear.addEventListener('click', () => { $('dym-clear-confirm').hidden = false; });
    $('dym-clear-yes')?.addEventListener('click', () => { api.clearDevice(); $('dym-clear-confirm').hidden = true; });
    $('dym-clear-no')?.addEventListener('click', () => { $('dym-clear-confirm').hidden = true; });
  }

  const paintAll = () => { paintRank(); paintSaved(); paintFavs(); };
  document.addEventListener('dym:change', paintAll);
  paintAll();
  initAccount();
}

// ---------- account (optional Google sign-in) ----------
const put = (body) => fetch('/api/sync', {
  method: 'PUT',
  credentials: 'same-origin',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

// The sign-in itself is the site's shared one (public/js/account.js and
// /account, Google first plus Facebook and X). My Marvel shows the same panel;
// once someone is signed in, their list syncs to the account.
function noteAccount(user) {
  if (user) {
    const first = ls.get(SIGNED) !== '1';
    ls.set(SIGNED, '1');
    if (first) syncNow(true);
  } else {
    ls.del(SIGNED);
  }
}

async function initAccount() {
  const box = document.getElementById('dym-account');
  const status = document.getElementById('dym-sync-status');
  if (!box) return;
  let mod = null;
  try { mod = await import('./account.js'); } catch { /* not deployed */ }
  if (!mod) {
    box.innerHTML = '<p class="dym-soon">Sign-in is coming soon; your list is saved on this device.</p>';
    return;
  }
  const a = await mod.account();
  const p = a.providers || {};
  if (!a.user && !(p.google || p.facebook || p.x)) {
    ls.del(SIGNED);
    box.innerHTML = '<p class="dym-soon">Sign-in is coming soon; your list is saved on this device.</p>';
    return;
  }
  const paintStatus = async (user) => {
    if (!status) return;
    if (!user) { status.textContent = ''; return; }
    status.textContent = 'Syncing…';
    status.textContent = (await syncNow(true)) ? 'Your list is synced to your account.' : 'Could not sync right now; your list is safe on this device.';
  };
  noteAccount(a.user);
  paintStatus(a.user);
  await mod.fillSignIn(box, {
    why: 'Sign in to keep your list on your phone and computer.',
    onChange: (user) => { noteAccount(user); paintStatus(user); },
  });
}

// ---------- sync ----------
let syncTimer = null;
function scheduleSync() {
  if (ls.get(SIGNED) !== '1') return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => syncNow(true), 1500);
}

async function syncNow(force = false) {
  if (ls.get(SIGNED) !== '1') return false;
  const last = Number(ss.get(LAST_SYNC) || 0);
  if (!force && Date.now() - last < 60_000) return true;
  clearTimeout(syncTimer);
  try {
    const r = await put({ data: core.compact(state) });
    if (r.status === 401) { ls.del(SIGNED); return false; }
    if (!r.ok) return false;
    const body = await r.json();
    state = core.merge(state, body.data);
    ls.set(KEY, JSON.stringify(state));
    ss.set(LAST_SYNC, String(Date.now()));
    emit();
    checkRank();
    return true;
  } catch {
    return false;
  }
}

// Push anything still waiting when the visitor leaves the page.
window.addEventListener('pagehide', () => {
  if (!syncTimer || ls.get(SIGNED) !== '1') return;
  clearTimeout(syncTimer);
  syncTimer = null;
  try {
    fetch('/api/sync', { method: 'PUT', keepalive: true, credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data: core.compact(state) }) });
  } catch { /* ignore */ }
});

// ---------- start ----------
function start() {
  decorate();
  if (path !== '/me/') syncNow(false);
  if (Object.keys(state.found).length) checkRank();
  document.dispatchEvent(new CustomEvent('dym:ready'));
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
