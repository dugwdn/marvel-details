// Sign-in tests (ADR-008). Run: node --test test/
// The handler runs against a stand-in for D1 built on Node's own SQLite.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { readCookie, safeBack, cleanName, verifyGoogle, b64url, handleAuth, SESSION, PENDING } from '../functions/_lib/auth.js';

function fakeD1() {
  const db = new DatabaseSync(':memory:');
  // Every migration in order (0002 adds the member saves the delete route clears).
  const dir = new URL('../migrations/', import.meta.url);
  for (const f of fs.readdirSync(dir).filter(n => n.endsWith('.sql')).sort()) db.exec(fs.readFileSync(new URL(f, dir), 'utf8'));
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    first: async () => db.prepare(sql).get(...args) ?? null,
    run: async () => db.prepare(sql).run(...args),
  });
  return { prepare: sql => stmt(sql), batch: async list => Promise.all(list.map(s => s.run())), raw: db };
}

const ORIGIN = 'https://mcueastereggs.com';
const req = (path, init = {}) => new Request(ORIGIN + path, init);
const setCookies = res => res.headers.getSetCookie().join('\n');

test('helpers', () => {
  assert.equal(readCookie('a=1; dym_s=abc%20d', 'dym_s'), 'abc d');
  assert.equal(readCookie('dym_s=%E0%A4%A', 'dym_s'), '');
  assert.equal(safeBack('/movies/iron-man?x=1'), '/movies/iron-man?x=1');
  assert.equal(safeBack('//evil.com'), '/');
  assert.equal(safeBack('https://evil.com'), '/');
  assert.equal(cleanName('  <b>Tony</b> '), 'bTonyb');
  assert.equal(cleanName(''), 'Fan');
});

async function googleSetup() {
  const { publicKey, privateKey } = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const jwk = { ...(await crypto.subtle.exportKey('jwk', publicKey)), kid: 'k1' };
  const sign = async body => {
    const enc = o => b64url(new TextEncoder().encode(JSON.stringify(o)));
    const h = enc({ alg: 'RS256', kid: 'k1' });
    const p = enc(body);
    const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(`${h}.${p}`));
    return `${h}.${p}.${b64url(sig)}`;
  };
  return { jwk, sign };
}

test('verifyGoogle checks signature, audience, issuer and expiry', async () => {
  const { jwk, sign } = await googleSetup();
  const good = { iss: 'https://accounts.google.com', aud: 'cid', sub: '42', given_name: 'Pepper', exp: Date.now() / 1000 + 600 };
  assert.deepEqual(await verifyGoogle(await sign(good), 'cid', [jwk]), { sub: '42', name: 'Pepper' });
  assert.equal(await verifyGoogle(await sign({ ...good, aud: 'other' }), 'cid', [jwk]), null);
  assert.equal(await verifyGoogle(await sign({ ...good, iss: 'evil' }), 'cid', [jwk]), null);
  assert.equal(await verifyGoogle(await sign({ ...good, exp: 1 }), 'cid', [jwk]), null);
  const t = await sign(good);
  assert.equal(await verifyGoogle(t.slice(0, -4) + 'AAAA', 'cid', [jwk]), null);
  assert.equal(await verifyGoogle('not.a.token', 'cid', [jwk]), null);
});

test('no providers set: nobody signed in, nothing offered', async () => {
  const env = { DB: fakeD1() };
  const res = await handleAuth(req('/api/auth'), env);
  assert.deepEqual(await res.json(), { user: null, providers: { google: null, facebook: false, x: false } });
  assert.equal((await handleAuth(req('/api/auth/facebook'), env)).status, 302);
  assert.equal((await handleAuth(req('/api/auth/google', { method: 'POST', body: '{}' }), env)).status, 404);
});

test('Google sign-in, who am I, sign out, delete', async () => {
  const { jwk, sign } = await googleSetup();
  const realFetch = globalThis.fetch;
  globalThis.fetch = async url => (String(url).includes('oauth2/v3/certs') ? Response.json({ keys: [jwk] }) : realFetch(url));
  try {
    const env = { DB: fakeD1(), GOOGLE_CLIENT_ID: 'cid' };
    const credential = await sign({ iss: 'accounts.google.com', aud: 'cid', sub: 'g-7', given_name: 'Natasha', exp: Date.now() / 1000 + 600 });
    // Another site can't post a sign-in.
    const cross = await handleAuth(req('/api/auth/google', { method: 'POST', headers: { origin: 'https://evil.com' }, body: JSON.stringify({ credential }) }), env);
    assert.equal(cross.status, 403);
    const bad = await handleAuth(req('/api/auth/google', { method: 'POST', body: JSON.stringify({ credential: 'x.y.z' }) }), env);
    assert.equal(bad.status, 401);

    const res = await handleAuth(req('/api/auth/google', { method: 'POST', headers: { origin: ORIGIN }, body: JSON.stringify({ credential }) }), env);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).user.name, 'Natasha');
    const token = readCookie(setCookies(res).split('\n').find(c => c.startsWith(SESSION)).split(';')[0], SESSION);
    assert.ok(token.length > 20);
    // The database keeps a hash, not the token.
    assert.equal(env.DB.raw.prepare('SELECT count(*) n FROM sessions WHERE hash = ?').get(token).n, 0);

    const me = await (await handleAuth(req('/api/auth', { headers: { cookie: `${SESSION}=${token}` } }), env)).json();
    assert.equal(me.user.name, 'Natasha');
    assert.equal(me.user.provider, 'google');

    // Signing in again keeps the same account.
    await handleAuth(req('/api/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }), env);
    assert.equal(env.DB.raw.prepare('SELECT count(*) n FROM users').get().n, 1);

    await handleAuth(req('/api/auth/signout', { method: 'POST', headers: { cookie: `${SESSION}=${token}` } }), env);
    assert.equal((await (await handleAuth(req('/api/auth', { headers: { cookie: `${SESSION}=${token}` } }), env)).json()).user, null);

    const again = await handleAuth(req('/api/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }), env);
    const t2 = readCookie(setCookies(again).split('\n').find(c => c.startsWith(SESSION)).split(';')[0], SESSION);
    assert.equal((await handleAuth(req('/api/auth/delete', { method: 'POST', headers: { cookie: `${SESSION}=${t2}` } }), env)).status, 204);
    assert.equal(env.DB.raw.prepare('SELECT count(*) n FROM users').get().n, 0);
    assert.equal(env.DB.raw.prepare('SELECT count(*) n FROM sessions').get().n, 0);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('Facebook and X redirects carry state, and a wrong state fails safely', async () => {
  const env = { DB: fakeD1(), FACEBOOK_APP_ID: 'fb', FACEBOOK_APP_SECRET: 's', X_CLIENT_ID: 'xid', X_CLIENT_SECRET: 's' };
  const fb = await handleAuth(req('/api/auth/facebook?back=/map/'), env);
  assert.equal(fb.status, 302);
  const loc = new URL(fb.headers.get('location'));
  assert.equal(loc.hostname, 'www.facebook.com');
  assert.equal(loc.searchParams.get('redirect_uri'), `${ORIGIN}/api/auth/facebook/done`);
  const pending = setCookies(fb).split(';')[0];
  assert.ok(pending.startsWith(PENDING));
  const wrong = await handleAuth(req('/api/auth/facebook/done?code=c&state=nope', { headers: { cookie: pending } }), env);
  assert.equal(wrong.headers.get('location'), '/map/?signin=failed');

  const x = await handleAuth(req('/api/auth/x?back=//evil.com'), env);
  const xl = new URL(x.headers.get('location'));
  assert.equal(xl.hostname, 'x.com');
  assert.equal(xl.searchParams.get('code_challenge_method'), 'S256');
  assert.match(decodeURIComponent(setCookies(x)), /"back":"\/"/);
});
