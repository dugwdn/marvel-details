// Member perks sync (/api/sync, ADR-008) against Node's own SQLite standing in
// for D1, with every migration applied. Sign-in is the site's (ADR-007): a
// user and session are put straight into its tables here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { hashToken, handleAuth, SESSION } from '../functions/_lib/auth.js';
import * as sync from '../functions/api/sync.js';

function fakeD1() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  const dir = new URL('../migrations/', import.meta.url);
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.sql')).sort()) db.exec(fs.readFileSync(new URL(f, dir), 'utf8'));
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    first: async () => db.prepare(sql).get(...args) ?? null,
    run: async () => db.prepare(sql).run(...args),
  });
  return { raw: db, prepare: (sql) => stmt(sql), batch: async (list) => { for (const s of list) await s.run(); return []; } };
}

const ORIGIN = 'https://marvel-details.pages.dev';
async function member(DB, id = 'u1', token = 'tok-' + id) {
  DB.raw.prepare('INSERT INTO users (id, provider, sub, name, created) VALUES (?, ?, ?, ?, ?)').run(id, 'google', 'sub-' + id, 'Doug', Date.now());
  DB.raw.prepare('INSERT INTO sessions (hash, user_id, expires) VALUES (?, ?, ?)').run(await hashToken(token), id, Date.now() + 864e5);
  return `${SESSION}=${encodeURIComponent(token)}`;
}
const call = (method, { env, body, cookie, origin = ORIGIN, type = 'application/json' }) => {
  const headers = { origin };
  if (type) headers['content-type'] = type;
  if (cookie) headers.cookie = cookie;
  const request = new Request(`${ORIGIN}/api/sync`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return (method === 'GET' ? sync.onRequestGet : sync.onRequestPut)({ request, env });
};

test('signed out: no access', async () => {
  const env = { DB: fakeD1() };
  assert.equal((await call('GET', { env, type: null })).status, 401);
  assert.equal((await call('PUT', { env, body: { data: {} } })).status, 401);
  assert.equal((await call('GET', { env: {}, type: null })).status, 401, 'no database bound');
});

test('two devices merge into one list; GET returns it', async () => {
  const DB = fakeD1();
  const env = { DB };
  const cookie = await member(DB);
  const t = Date.now();
  let r = await call('PUT', { env, cookie, body: { data: { favs: { loki: { on: true, t } }, found: { 'callback:cb-001': t } } } });
  assert.equal(r.status, 200);
  r = await call('PUT', { env, cookie, body: { data: { favs: { thor: { on: true, t } }, seen: { endgame: { on: true, t } }, saved: { 'article:x': { on: true, t, title: 'X', url: '/articles/x' } } } } });
  const merged = (await r.json()).data;
  assert.deepEqual(Object.keys(merged.favs).sort(), ['loki', 'thor']);
  assert.ok(merged.seen.endgame.on && merged.saved['article:x'].on);
  assert.ok('callback:cb-001' in merged.found);
  // A later removal on one device sticks.
  r = await call('PUT', { env, cookie, body: { data: { favs: { loki: { on: false, t: t + 5 } } } } });
  assert.equal((await r.json()).data.favs.loki.on, false);
  r = await call('GET', { env, cookie, type: null });
  assert.equal((await r.json()).data.favs.thor.on, true);
});

test('writes must be JSON from this site, and under 16 KB', async () => {
  const DB = fakeD1();
  const env = { DB };
  const cookie = await member(DB);
  assert.equal((await call('PUT', { env, cookie, origin: 'https://evil.example', body: { data: {} } })).status, 403);
  assert.equal((await call('PUT', { env, cookie, type: 'text/plain', body: { data: {} } })).status, 415);
  const big = { saved: {} };
  for (let i = 0; i < 300; i++) big.saved[`scene:item-${i}`] = { on: true, t: 1, title: 'x'.repeat(100), url: '/scenes/' };
  assert.equal((await call('PUT', { env, cookie, body: { data: big } })).status, 413);
});

test('each member only sees their own list', async () => {
  const DB = fakeD1();
  const env = { DB };
  const a = await member(DB, 'a');
  const b = await member(DB, 'b');
  await call('PUT', { env, cookie: a, body: { data: { favs: { loki: { on: true, t: 1 } } } } });
  const r = await call('GET', { env, cookie: b, type: null });
  assert.equal((await r.json()).data, null);
});

test('deleting the account deletes the saved list too', async () => {
  const DB = fakeD1();
  const env = { DB };
  const cookie = await member(DB);
  await call('PUT', { env, cookie, body: { data: { favs: { loki: { on: true, t: 1 } } } } });
  assert.equal(DB.raw.prepare('SELECT COUNT(*) n FROM saves').get().n, 1);
  const r = await handleAuth(new Request(`${ORIGIN}/api/auth/delete`, { method: 'POST', headers: { origin: ORIGIN, cookie } }), env);
  assert.equal(r.status, 204);
  for (const table of ['saves', 'sessions', 'users']) assert.equal(DB.raw.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n, 0, table);
});
