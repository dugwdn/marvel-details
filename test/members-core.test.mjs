import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  emptyState, sanitize, merge, compact, byteSize, foundStats, rankFor, needed, setToggle, onIds, MAX_BYTES,
} from '../public/js/members-core.js';

const ranks = JSON.parse(fs.readFileSync(new URL('../public/data/ranks.json', import.meta.url))).ranks;
const data = (f) => JSON.parse(fs.readFileSync(new URL(`../public/data/${f}`, import.meta.url)));
const catalog = {
  scene: data('deleted-scenes.json').deletedScenes.map((s) => s.id),
  callback: data('callbacks.json').callbacks.map((c) => c.id),
  rabbit: data('rabbit-holes.json').rabbitHoles.map((r) => r.id),
};

test('merge: union of both sides for lists, seen movies, favorites and found', () => {
  const local = emptyState();
  local.saved['scene:im1-scene-001'] = { on: true, t: 10, title: 'A', url: '/scenes/' };
  local.seen['iron-man-1'] = { on: true, t: 5 };
  local.favs.loki = { on: true, t: 3 };
  local.found['callback:cb-001'] = 7;
  const remote = emptyState();
  remote.saved['article:iron-man-2-green-drink'] = { on: true, t: 20, title: 'B', url: '/articles/iron-man-2-green-drink' };
  remote.seen.endgame = { on: true, t: 6 };
  remote.favs.thor = { on: true, t: 4 };
  remote.found['scene:im1-scene-001'] = 8;
  const m = merge(local, remote);
  assert.deepEqual(onIds(m.saved).sort(), ['article:iron-man-2-green-drink', 'scene:im1-scene-001']);
  assert.deepEqual(onIds(m.seen).sort(), ['endgame', 'iron-man-1']);
  assert.deepEqual(onIds(m.favs).sort(), ['loki', 'thor']);
  assert.deepEqual(Object.keys(m.found).sort(), ['callback:cb-001', 'scene:im1-scene-001']);
});

test('merge: newer removal beats older add, newer add beats older removal', () => {
  const a = emptyState();
  const b = emptyState();
  a.favs.loki = { on: false, t: 200 };
  b.favs.loki = { on: true, t: 100 };
  a.favs.thor = { on: false, t: 100 };
  b.favs.thor = { on: true, t: 300 };
  const m = merge(a, b);
  assert.equal(m.favs.loki.on, false);
  assert.equal(m.favs.thor.on, true);
  assert.deepEqual(merge(b, a).favs, m.favs, 'order does not matter');
});

test('merge: settings are last write wins, found keeps earliest time, rankSeen max', () => {
  const a = { ...emptyState(), settings: { hideSpoilers: true, t: 50 }, rankSeen: 2, found: { 'rabbit:loki-x': 9 } };
  const b = { ...emptyState(), settings: { hideSpoilers: false, t: 60 }, rankSeen: 4, found: { 'rabbit:loki-x': 3 } };
  const m = merge(a, b);
  assert.equal(m.settings.hideSpoilers, false);
  assert.equal(merge(a, { ...b, settings: { hideSpoilers: false, t: 10 } }).settings.hideSpoilers, true);
  assert.equal(m.rankSeen, 4);
  assert.equal(m.found['rabbit:loki-x'], 3);
});

test('merge with an empty or missing account copy keeps everything local', () => {
  const a = emptyState();
  setToggle(a, 'saved', 'callback:cb-002', true, { title: 'X', url: '/callbacks/callback-cb-002.html' }, 1000);
  assert.deepEqual(merge(a, null), sanitize(a));
  assert.deepEqual(merge(null, a), sanitize(a));
});

test('sanitize drops junk: unknown movies, bad ids, outside links, unknown kinds', () => {
  const s = sanitize({
    seen: { 'iron-man-1': { on: true, t: 1 }, 'not-a-movie': { on: true, t: 1 } },
    saved: {
      'scene:ok-1': { on: true, t: 1, title: 'x'.repeat(500), url: 'https://evil.example/' },
      'bogus:thing': { on: true, t: 1 },
      'scene:<script>': { on: true, t: 1 },
    },
    favs: { 'Loki!': { on: true, t: 1 } },
    found: { 'article:x': 1, 'scene:im1-scene-001': 'nope' },
    settings: { hideSpoilers: 'yes' },
  });
  assert.deepEqual(Object.keys(s.seen), ['iron-man-1']);
  assert.deepEqual(Object.keys(s.saved), ['scene:ok-1']);
  assert.equal(s.saved['scene:ok-1'].url, '');
  assert.equal(s.saved['scene:ok-1'].title.length, 140);
  assert.deepEqual(s.favs, {});
  assert.deepEqual(s.found, { 'scene:im1-scene-001': 0 });
  assert.equal(s.settings.hideSpoilers, false);
  assert.deepEqual(sanitize('garbage'), emptyState());
});

test('compact removes old removals only', () => {
  const now = 1000 * 864e5;
  const s = emptyState();
  s.favs.old = { on: false, t: 0 };
  s.favs.recent = { on: false, t: now - 864e5 };
  s.favs.kept = { on: true, t: 0 };
  const c = compact(s, now);
  assert.deepEqual(Object.keys(c.favs).sort(), ['kept', 'recent']);
});

test('setToggle always moves the time forward', () => {
  const s = emptyState();
  setToggle(s, 'favs', 'loki', true, {}, 100);
  setToggle(s, 'favs', 'loki', false, {}, 100);
  assert.equal(s.favs.loki.on, false);
  assert.equal(s.favs.loki.t, 101);
});

test('a full list stays under the 16 KB cap', () => {
  const s = emptyState();
  for (const kind of Object.keys(catalog)) for (const id of catalog[kind]) s.found[`${kind}:${id}`] = Date.now();
  for (let i = 0; i < 60; i++) setToggle(s, 'saved', `scene:item-${i}`, true, { title: 'A typical saved title of medium length', url: `/scenes/item-${i}` });
  assert.ok(byteSize(s) < MAX_BYTES, `size ${byteSize(s)}`);
});

test('found counter counts only details that exist in the data', () => {
  // Counts come from the data files; every list must have something in it.
  for (const kind of ['scene', 'callback', 'rabbit']) assert.ok(catalog[kind].length > 0, kind);
  const found = { 'scene:im1-scene-001': 1, 'callback:cb-001': 1, 'callback:cb-002': 1, 'callback:cb-999': 1, 'rabbit:mind-stone-corruption': 1 };
  const st = foundStats(found, catalog);
  assert.equal(st.total, catalog.scene.length + catalog.callback.length + catalog.rabbit.length);
  assert.equal(st.found, 4);
  assert.equal(st.pct, Math.round((4 / st.total) * 100));
  assert.deepEqual(st.byKind.callback, { found: 2, total: catalog.callback.length });
  assert.deepEqual(foundStats({}, {}), { found: 0, total: 0, pct: 0, byKind: { scene: { found: 0, total: 0 }, callback: { found: 0, total: 0 }, rabbit: { found: 0, total: 0 } } });
});

test('rank ladder: thresholds against 69 details', () => {
  const t = 69;
  assert.deepEqual(ranks.map((r) => needed(r.minPct, t)), [0, 4, 11, 21, 35, 49, 59, 69]);
  assert.equal(rankFor(0, t, ranks).current.id, 'civilian');
  assert.equal(rankFor(0, t, ranks).toNext, 4);
  assert.equal(rankFor(3, t, ranks).current.id, 'civilian');
  assert.equal(rankFor(4, t, ranks).current.id, 'spider-man');
  assert.equal(rankFor(4, t, ranks).next.id, 'iron-man');
  assert.equal(rankFor(4, t, ranks).toNext, 7);
  assert.equal(rankFor(35, t, ranks).current.id, 'thor');
  assert.equal(rankFor(68, t, ranks).current.id, 'ancient-one');
  assert.equal(rankFor(68, t, ranks).toNext, 1);
  const top = rankFor(69, t, ranks);
  assert.equal(top.current.id, 'the-watcher');
  assert.equal(top.next, null);
  assert.equal(top.progress, 1);
});

test('rank progress bar fills between ranks; no data means Civilian', () => {
  const r = rankFor(8, 69, ranks); // Spider-Man at 4, Iron Man at 11
  assert.ok(Math.abs(r.progress - 4 / 7) < 1e-9);
  assert.equal(rankFor(0, 0, ranks).current.id, 'civilian');
  assert.equal(rankFor(5, 69, [...ranks].reverse()).current.id, 'spider-man', 'order in the file does not matter');
});

test('every rank has a title and a reason; ids are unique', () => {
  assert.equal(ranks[0].minPct, 0);
  assert.equal(new Set(ranks.map((r) => r.id)).size, ranks.length);
  for (const r of ranks) assert.ok(r.title && r.reason, r.id);
});
