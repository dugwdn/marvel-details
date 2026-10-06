// Member perks: the pure logic shared by the browser (public/js/members.js),
// the Pages Functions (functions/api/*) and the unit tests (test/*.test.js).
// No DOM, no storage, no network here, so it can be tested with node --test.
//
// One "state" object holds everything a visitor keeps:
//   seen   { movieId: { on, t } }                   watch tracker
//   saved  { "kind:key": { on, t, title, url } }    saved list
//   favs   { characterId: { on, t } }               favorite characters
//   found  { "kind:key": t }                        hidden details opened
//   settings { hideSpoilers, t }                    last write wins
//   rankSeen  number                                highest rank already announced
//   quiz  { points, games, best: { tierId: n } }    quiz totals (/quiz/)
// "on: false" entries are tombstones, so a removal on one device beats an
// older add on another. Times (t) are milliseconds since 1970.

export const VERSION = 1;
export const MAX_BYTES = 16 * 1024; // size cap for one person's synced data
export const TOMBSTONE_DAYS = 180;

// The five films the site covers. Titles and years as on the movie hubs.
export const MOVIES = [
  { id: 'iron-man-1', title: 'Iron Man', year: 2008 },
  { id: 'iron-man-2', title: 'Iron Man 2', year: 2010 },
  { id: 'avengers-1', title: 'The Avengers', year: 2012 },
  { id: 'iron-man-3', title: 'Iron Man 3', year: 2013 },
  { id: 'endgame', title: 'Avengers: Endgame', year: 2019 },
];

export const SAVE_KINDS = ['article', 'scene', 'callback', 'character', 'rabbit', 'movie'];
export const FOUND_KINDS = ['scene', 'callback', 'rabbit'];

export function emptyState() {
  return { v: VERSION, seen: {}, saved: {}, favs: {}, found: {}, settings: { hideSpoilers: false, t: 0 }, rankSeen: 0, quiz: emptyQuiz() };
}
export function emptyQuiz() {
  return { points: 0, games: 0, best: {} };
}
const QUIZ_MAX = 10_000_000;
function sanitizeQuiz(q) {
  const out = emptyQuiz();
  if (!q || typeof q !== 'object') return out;
  out.points = Math.min(num(q.points), QUIZ_MAX);
  out.games = Math.min(num(q.games), QUIZ_MAX);
  if (q.best && typeof q.best === 'object') {
    for (const [k, v] of Object.entries(q.best).slice(0, 10)) if (ID.test(k)) out.best[k] = Math.min(num(v), QUIZ_MAX);
  }
  return out;
}
// Quiz totals only grow, so two devices merge by keeping the larger number.
function mergeQuiz(a, b) {
  const best = { ...a.best };
  for (const [k, v] of Object.entries(b.best)) best[k] = Math.max(best[k] || 0, v);
  return { points: Math.max(a.points, b.points), games: Math.max(a.games, b.games), best };
}

const ID = /^[a-z0-9][a-z0-9-]{0,79}$/;
const KEY = /^([a-z]+):([a-z0-9][a-z0-9-]{0,79})$/;
const num = (x) => (Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0);
const str = (x, max) => (typeof x === 'string' ? x.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max) : '');

// Turns anything (old data, a hand-edited value, a request body) into a
// well-formed state, dropping what doesn't fit. Used on load and by the server.
export function sanitize(input) {
  const out = emptyState();
  if (!input || typeof input !== 'object') return out;
  const toggles = (src, ok) => {
    const res = {};
    if (!src || typeof src !== 'object') return res;
    for (const [k, v] of Object.entries(src)) {
      if (!ok(k) || !v || typeof v !== 'object') continue;
      res[k] = { on: v.on === true, t: num(v.t) };
    }
    return res;
  };
  out.seen = toggles(input.seen, (k) => MOVIES.some((m) => m.id === k));
  out.favs = toggles(input.favs, (k) => ID.test(k));
  const okSave = (k) => {
    const m = KEY.exec(k);
    return !!m && SAVE_KINDS.includes(m[1]);
  };
  const saved = toggles(input.saved, okSave);
  for (const k of Object.keys(saved)) {
    const src = input.saved[k];
    const url = str(src.url, 200);
    saved[k].title = str(src.title, 140);
    saved[k].url = url.startsWith('/') && !url.startsWith('//') ? url : '';
  }
  out.saved = saved;
  if (input.found && typeof input.found === 'object') {
    for (const [k, t] of Object.entries(input.found)) {
      const m = KEY.exec(k);
      if (m && FOUND_KINDS.includes(m[1])) out.found[k] = num(t);
    }
  }
  const s = input.settings;
  if (s && typeof s === 'object') out.settings = { hideSpoilers: s.hideSpoilers === true, t: num(s.t) };
  out.rankSeen = Math.min(num(input.rankSeen), 50);
  out.quiz = sanitizeQuiz(input.quiz);
  return out;
}

// Newer entry wins; on a tie, "on" wins (so nothing is lost by accident).
function pick(a, b) {
  if (!a) return b;
  if (!b) return a;
  if (a.t !== b.t) return a.t > b.t ? a : b;
  return a.on ? a : b;
}

function mergeToggles(a = {}, b = {}) {
  const out = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) out[k] = { ...pick(a[k], b[k]) };
  return out;
}

// Merge two states (this device and the account). Lists are a union: an item
// on either side is kept; where both sides know an item, the newer change
// wins (so a later removal sticks). Found details never un-find. Settings:
// last write wins.
export function merge(local, remote) {
  const a = sanitize(local);
  const b = sanitize(remote);
  const found = { ...a.found };
  for (const [k, t] of Object.entries(b.found)) found[k] = k in found ? Math.min(found[k] || t, t || found[k]) : t;
  return {
    v: VERSION,
    seen: mergeToggles(a.seen, b.seen),
    saved: mergeToggles(a.saved, b.saved),
    favs: mergeToggles(a.favs, b.favs),
    found,
    settings: b.settings.t > a.settings.t ? b.settings : a.settings,
    rankSeen: Math.max(a.rankSeen, b.rankSeen),
    quiz: mergeQuiz(a.quiz, b.quiz),
  };
}

// Drops removals older than TOMBSTONE_DAYS so the data can't grow forever.
export function compact(state, now = Date.now()) {
  const s = sanitize(state);
  const cutoff = now - TOMBSTONE_DAYS * 864e5;
  for (const group of ['seen', 'saved', 'favs']) {
    for (const [k, v] of Object.entries(s[group])) if (!v.on && v.t < cutoff) delete s[group][k];
  }
  return s;
}

export function byteSize(state) {
  return new TextEncoder().encode(JSON.stringify(state)).length;
}

// Small helpers the page uses.
export const isOn = (group, id) => !!(group && group[id] && group[id].on);
export function setToggle(state, group, id, on, extra = {}, now = Date.now()) {
  const prev = state[group][id];
  const t = prev && prev.t >= now ? prev.t + 1 : now;
  state[group][id] = { ...extra, on: !!on, t };
  return state;
}
export const onIds = (group) => Object.keys(group || {}).filter((k) => group[k].on);

// Found counter. catalog: { scene: [ids], callback: [ids], rabbit: [ids] }
// built from public/data. Only ids that exist in today's data count.
export function foundStats(found, catalog) {
  const byKind = {};
  let count = 0;
  let total = 0;
  for (const kind of FOUND_KINDS) {
    const ids = (catalog && catalog[kind]) || [];
    const n = ids.filter((id) => found && Object.prototype.hasOwnProperty.call(found, `${kind}:${id}`)).length;
    byKind[kind] = { found: n, total: ids.length };
    count += n;
    total += ids.length;
  }
  return { found: count, total, pct: total ? Math.round((count / total) * 100) : 0, byKind };
}

// Rank ladder (public/data/ranks.json). Each rank needs minPct percent of all
// hidden details; 100 means every single one.
export function needed(minPct, total) {
  if (minPct >= 100) return total;
  return Math.ceil((Math.max(0, minPct) / 100) * total);
}

export function rankFor(found, total, ranks) {
  const ladder = [...ranks].sort((x, y) => x.minPct - y.minPct);
  let index = 0;
  ladder.forEach((r, i) => {
    if (total > 0 && found >= needed(r.minPct, total)) index = i;
  });
  const current = ladder[index];
  const next = ladder[index + 1] || null;
  if (!next) return { index, current, next: null, toNext: 0, progress: 1 };
  const from = needed(current.minPct, total);
  const to = needed(next.minPct, total);
  const toNext = Math.max(0, to - found);
  const progress = to > from ? Math.min(1, Math.max(0, (found - from) / (to - from))) : 0;
  return { index, current, next, toNext, progress };
}
