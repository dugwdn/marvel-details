// End-to-end check of the member API (functions/api/*) against the real
// migration, using Node's built-in SQLite as a stand-in for Cloudflare D1
// and a test key pair standing in for Google's.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { bytesToB64url } from '../lib/google-auth.js';
import * as me from '../functions/api/me.js';
import * as google from '../functions/api/auth/google.js';
import * as signout from '../functions/api/auth/signout.js';
import * as del from '../functions/api/auth/delete.js';
import * as sync from '../functions/api/sync.js';

// Minimal D1 look-alike: prepare().bind().first()/run()/all(), and batch().
function fakeD1() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(fs.readFileSync(new URL('../migrations/0001_members.sql', import.meta.url), 'utf8'));
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => { db.prepare(sql).run(...args); return { success: true }; },
  });
  return { raw: db, prepare: (sql) => stmt(sql), batch: async (list) => { for (const s of list) await s.run(); return []; } };
}

const CLIENT = 'test-client.apps.googleusercontent.com';
const ORIGIN = 'https://marvel-details.pages.dev';
const pair = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await crypto.subtle.exportKey('jwk', pair.publicKey)), kid: 'k1' };
globalThis.fetch = async (url) => {
  assert.equal(String(url), 'https://www.googleapis.com/oauth2/v3/certs');
  return new Response(JSON.stringify({ keys: [jwk] }), { headers: { 'cache-control': 'max-age=600' } });
};
const enc = (o) => bytesToB64url(new TextEncoder().encode(JSON.stringify(o)));
async function idToken(extra = {}) {
  const now = Math.floor(Date.now() / 1000);
  const input = `${enc({ alg: 'RS256', kid: 'k1' })}.${enc({ iss: 'https://accounts.google.com', aud: CLIENT, sub: '1122334455', given_name: 'Doug', email: 'someone@example.com', name: 'Doug Example', iat: now, exp: now + 600, ...extra })}`;
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, new TextEncoder().encode(input));
  return `${input}.${bytesToB64url(new Uint8Array(sig))}`;
}

const call = (mod, method, path, { env, body, cookie, origin = ORIGIN, type = 'application/json' } = {}) => {
  const headers = { origin };
  if (type) headers['content-type'] = type;
  if (cookie) headers.cookie = cookie;
  const request = new Request(ORIGIN + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const fn = mod[`onRequest${method[0]}${method.slice(1).toLowerCase()}`];
  return fn({ request, env });
};

test('without GOOGLE_CLIENT_ID, sign-in is reported as not available', async () => {
  const r = await call(me, 'GET', '/api/me', { env: {} });
  assert.deepEqual(await r.json(), { signInAvailable: false, clientId: null, signedIn: false });
  assert.equal((await call(google, 'POST', '/api/auth/google', { env: {}, body: {} })).status, 503);
});

test('sign in, sync, sign out, delete', async () => {
  const DB = fakeD1();
  const env = { GOOGLE_CLIENT_ID: CLIENT, DB };

  let r = await call(me, 'GET', '/api/me', { env });
  assert.deepEqual(await r.json(), { signInAvailable: true, clientId: CLIENT, signedIn: false });

  // Age box not ticked, wrong site, bad token: all refused.
  assert.equal((await call(google, 'POST', '/api/auth/google', { env, body: { credential: await idToken() } })).status, 400);
  assert.equal((await call(google, 'POST', '/api/auth/google', { env, origin: 'https://evil.example', body: { credential: await idToken(), over13: true } })).status, 403);
  assert.equal((await call(google, 'POST', '/api/auth/google', { env, body: { credential: await idToken({ aud: 'other' }), over13: true } })).status, 401);

  r = await call(google, 'POST', '/api/auth/google', { env, body: { credential: await idToken(), over13: true } });
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { signedIn: true, firstName: 'Doug' });
  const setCookie = r.headers.get('set-cookie');
  assert.match(setCookie, /HttpOnly; Secure; SameSite=Lax/);
  const cookie = setCookie.split(';')[0];

  // Only sub and first name are stored; no email anywhere in the database.
  const dump = JSON.stringify([DB.raw.prepare('SELECT * FROM users').all(), DB.raw.prepare('SELECT * FROM sessions').all()]);
  assert.ok(dump.includes('1122334455') && dump.includes('Doug'));
  assert.ok(!dump.includes('example.com') && !dump.includes('Doug Example'));
  assert.ok(!dump.includes(cookie.split('=')[1]), 'session token is stored hashed');

  r = await call(me, 'GET', '/api/me', { env, cookie });
  assert.equal((await r.json()).firstName, 'Doug');

  // Two devices: the account keeps the union.
  const t = Date.now();
  r = await call(sync, 'PUT', '/api/sync', { env, cookie, body: { data: { favs: { loki: { on: true, t } }, found: { 'callback:cb-001': t } } } });
  assert.equal(r.status, 200);
  r = await call(sync, 'PUT', '/api/sync', { env, cookie, body: { data: { favs: { thor: { on: true, t } }, seen: { endgame: { on: true, t } } } } });
  const merged = (await r.json()).data;
  assert.deepEqual(Object.keys(merged.favs).sort(), ['loki', 'thor']);
  assert.ok(merged.seen.endgame.on);
  assert.ok('callback:cb-001' in merged.found);
  r = await call(sync, 'GET', '/api/sync', { env, cookie, type: null });
  assert.deepEqual((await r.json()).data, merged);

  // Size cap.
  const big = { saved: {} };
  for (let i = 0; i < 300; i++) big.saved[`scene:item-${i}`] = { on: true, t, title: 'x'.repeat(100), url: '/scenes/' };
  assert.equal((await call(sync, 'PUT', '/api/sync', { env, cookie, body: { data: big } })).status, 413);

  // Not signed in / not JSON.
  assert.equal((await call(sync, 'GET', '/api/sync', { env, type: null })).status, 401);
  assert.equal((await call(sync, 'PUT', '/api/sync', { env, cookie, type: 'text/plain', body: {} })).status, 403);

  // Sign out ends the session.
  r = await call(signout, 'POST', '/api/auth/signout', { env, cookie });
  assert.match(r.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal((await (await call(me, 'GET', '/api/me', { env, cookie })).json()).signedIn, false);

  // Sign in again, then delete: everything about the person is gone.
  const c2 = (await call(google, 'POST', '/api/auth/google', { env, body: { credential: await idToken(), over13: true } })).headers.get('set-cookie').split(';')[0];
  r = await call(del, 'POST', '/api/auth/delete', { env, cookie: c2 });
  assert.equal(r.status, 200);
  for (const table of ['users', 'sessions', 'saves']) assert.equal(DB.raw.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n, 0, table);
});
