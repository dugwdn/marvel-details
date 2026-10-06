// Sign-in for Details You Missed (ADR-008). Ported from the Party Games Arcade's
// src/auth.ts so both sites work the same way. Our own small sign-in on Pages
// Functions + D1: free, no other service, and the members stay ours.
//   Google: Google's button (and One Tap) hands the page an ID token; we check
//           Google's signature here. Needs only the public GOOGLE_CLIENT_ID.
//   Meta (Facebook) and X: the usual redirect sign-in. Each needs its app's id
//           and secret (FACEBOOK_APP_ID + FACEBOOK_APP_SECRET, X_CLIENT_ID +
//           X_CLIENT_SECRET) as Pages secrets.
// A provider without its settings is simply not offered.
//
// Routes (all under /api/auth so only these run code; see public/_routes.json):
//   GET  /api/auth                       who's signed in, which providers are on
//   POST /api/auth/google                { credential } from Google's button or One Tap
//   GET  /api/auth/facebook?back=/path   off to Facebook, back to /api/auth/facebook/done
//   GET  /api/auth/x?back=/path          off to X (PKCE), back to /api/auth/x/done
//   POST /api/auth/signout               end this session
//   POST /api/auth/delete                delete the account and its sessions

export const SESSION = 'dym_s';
export const PENDING = 'dym_o';
const FB = 'v21.0';
const YEAR = 365 * 86400;

// ---------- small pure helpers (tested in test/auth.test.mjs) ----------

export function readCookie(header, name) {
  for (const part of (header ?? '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) {
      try { return decodeURIComponent(v.join('=')); } catch { return ''; }
    }
  }
  return '';
}

export function cookie(name, value, maxAge) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

/** Where to go after a redirect sign-in: our own path only (never another site). */
export function safeBack(v) {
  return typeof v === 'string' && /^\/(?!\/)[\w\-./?=&%#]*$/.test(v) ? v : '/';
}

/** A display name from a provider: plain, short, never empty. */
export function cleanName(v) {
  const t = typeof v === 'string' ? v.replace(/[^\p{L}\p{N} .'-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 24) : '';
  return t || 'Fan';
}

export const b64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
export const randomB64 = n => b64url(crypto.getRandomValues(new Uint8Array(n)));

/** Session tokens are stored hashed, so a copy of the database can't sign anyone in. */
export async function hashToken(token) {
  return b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)));
}

/** PKCE (X): the challenge for a verifier. */
export async function pkceChallenge(verifier) {
  return b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
}

/**
 * Check a Google ID token: Google's signature (RS256, one of its published keys),
 * the issuer, that it was made for our client ID, and that it hasn't expired.
 * Returns { sub, name } or null.
 */
export async function verifyGoogle(token, clientId, keys, now = Date.now()) {
  const [h, p, sig] = String(token).split('.');
  if (!h || !p || !sig) return null;
  let head, body;
  try {
    head = JSON.parse(new TextDecoder().decode(fromB64url(h)));
    body = JSON.parse(new TextDecoder().decode(fromB64url(p)));
  } catch {
    return null;
  }
  const jwk = keys.find(k => k.kid === head.kid);
  if (head.alg !== 'RS256' || !jwk) return null;
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, fromB64url(sig), new TextEncoder().encode(`${h}.${p}`));
  if (!ok) return null;
  if (body.iss !== 'accounts.google.com' && body.iss !== 'https://accounts.google.com') return null;
  if (body.aud !== clientId || !body.sub || !body.exp || body.exp * 1000 < now) return null;
  return { sub: String(body.sub), name: body.given_name || body.name || '' };
}

let googleKeys = null;
async function googleCerts() {
  if (googleKeys && googleKeys.until > Date.now()) return googleKeys.keys;
  const res = await fetch('https://www.googleapis.com/oauth2/v3/certs');
  const keys = (await res.json()).keys;
  googleKeys = { keys, until: Date.now() + 3600000 };
  return keys;
}

// ---------- accounts in D1 ----------

export async function who(db, token) {
  if (!token) return null;
  const row = await db
    .prepare('SELECT u.id, u.name, u.provider FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.hash = ? AND s.expires > ?')
    .bind(await hashToken(token), Date.now())
    .first();
  return row ?? null;
}

async function signIn(db, provider, sub, name) {
  const now = Date.now();
  await db
    .prepare('INSERT INTO users (id, provider, sub, name, created) VALUES (?, ?, ?, ?, ?) ON CONFLICT (provider, sub) DO NOTHING')
    .bind(randomB64(12), provider, sub, name, now)
    .run();
  const user = await db.prepare('SELECT id, name, provider FROM users WHERE provider = ? AND sub = ?').bind(provider, sub).first();
  const token = randomB64(32);
  await db.batch([
    db.prepare('INSERT INTO sessions (hash, user_id, expires) VALUES (?, ?, ?)').bind(await hashToken(token), user.id, now + YEAR * 1000),
    // Tidy up: expired sessions go whenever someone signs in.
    db.prepare('DELETE FROM sessions WHERE expires < ?').bind(now),
  ]);
  return { token, user };
}

// ---------- routes ----------

const json = (body, init = {}) => Response.json(body, { ...init, headers: { 'cache-control': 'no-store', ...(init.headers ?? {}) } });
const shown = u => (u ? { id: u.id, name: u.name, provider: u.provider } : null);

const failed = back => new Response(null, {
  status: 302,
  headers: { location: `${back}${back.includes('?') ? '&' : '?'}signin=failed`, 'set-cookie': cookie(PENDING, '', 0) },
});

async function startSession(env, provider, sub, name, back) {
  const { token, user } = await signIn(env.DB, provider, sub, cleanName(name));
  const headers = new Headers({ 'cache-control': 'no-store' });
  headers.append('set-cookie', cookie(SESSION, token, YEAR));
  headers.append('set-cookie', cookie(PENDING, '', 0));
  if (back) {
    headers.set('location', back);
    return new Response(null, { status: 302, headers });
  }
  headers.set('content-type', 'application/json');
  return new Response(JSON.stringify({ user: shown(user) }), { headers });
}

function redirectTo(target, pending) {
  const headers = new Headers({ location: target, 'cache-control': 'no-store' });
  headers.append('set-cookie', cookie(PENDING, JSON.stringify(pending), 600));
  return new Response(null, { status: 302, headers });
}

function readPending(req) {
  try {
    const v = JSON.parse(readCookie(req.headers.get('cookie'), PENDING));
    return v && typeof v.state === 'string' ? { p: String(v.p), state: v.state, verifier: String(v.verifier ?? ''), back: safeBack(v.back) } : null;
  } catch {
    return null;
  }
}

/** The whole /api/auth/* handler. */
export async function handleAuth(req, env) {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const token = readCookie(req.headers.get('cookie'), SESSION);
  const fbOn = !!(env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET);
  const xOn = !!(env.X_CLIENT_ID && env.X_CLIENT_SECRET);

  if (path === '/api/auth' && req.method === 'GET') {
    const user = await who(env.DB, token);
    return json({ user: shown(user), providers: { google: env.GOOGLE_CLIENT_ID || null, facebook: fbOn, x: xOn } });
  }

  // A change of state comes only from our own pages (a form on another site can't sign someone in or out).
  if (req.method === 'POST') {
    const origin = req.headers.get('origin');
    if (origin && origin !== url.origin) return new Response('wrong origin', { status: 403 });
  }

  if (path === '/api/auth/google' && req.method === 'POST') {
    if (!env.GOOGLE_CLIENT_ID) return new Response('off', { status: 404 });
    const body = await req.json().catch(() => null);
    const cred = typeof body?.credential === 'string' && body.credential.length < 4096 ? body.credential : '';
    const person = cred ? await verifyGoogle(cred, env.GOOGLE_CLIENT_ID, await googleCerts()).catch(() => null) : null;
    if (!person) return new Response('not signed in', { status: 401 });
    return startSession(env, 'google', person.sub, person.name);
  }

  if (path === '/api/auth/signout' && req.method === 'POST') {
    if (token) await env.DB.prepare('DELETE FROM sessions WHERE hash = ?').bind(await hashToken(token)).run();
    return new Response(null, { status: 204, headers: { 'set-cookie': cookie(SESSION, '', 0) } });
  }

  if (path === '/api/auth/delete' && req.method === 'POST') {
    const user = await who(env.DB, token);
    if (!user) return new Response('not signed in', { status: 401 });
    await env.DB.batch([
      // Member perks synced to the account (migrations/0002_member_saves.sql).
      env.DB.prepare('DELETE FROM saves WHERE user_id = ?').bind(user.id),
      env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id),
      env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id),
    ]);
    return new Response(null, { status: 204, headers: { 'set-cookie': cookie(SESSION, '', 0) } });
  }

  // Meta (Facebook): off to its sign-in, back with a code we trade for the person's id and first name.
  if (path === '/api/auth/facebook' && fbOn) {
    const state = randomB64(16);
    const q = new URLSearchParams({ client_id: env.FACEBOOK_APP_ID, redirect_uri: `${url.origin}/api/auth/facebook/done`, state, scope: 'public_profile', response_type: 'code' });
    return redirectTo(`https://www.facebook.com/${FB}/dialog/oauth?${q}`, { p: 'facebook', state, back: safeBack(url.searchParams.get('back')) });
  }
  if (path === '/api/auth/facebook/done' && fbOn) {
    const pending = readPending(req);
    const code = url.searchParams.get('code');
    if (!pending || pending.p !== 'facebook' || !code || url.searchParams.get('state') !== pending.state) return failed(pending?.back ?? '/');
    const q = new URLSearchParams({ client_id: env.FACEBOOK_APP_ID, client_secret: env.FACEBOOK_APP_SECRET, redirect_uri: `${url.origin}/api/auth/facebook/done`, code });
    const tok = await (await fetch(`https://graph.facebook.com/${FB}/oauth/access_token?${q}`)).json().catch(() => null);
    if (!tok?.access_token) return failed(pending.back);
    const me = await (await fetch(`https://graph.facebook.com/${FB}/me?fields=id,first_name,name&access_token=${encodeURIComponent(tok.access_token)}`)).json().catch(() => null);
    if (!me?.id) return failed(pending.back);
    return startSession(env, 'facebook', String(me.id), me.first_name || me.name || '', pending.back);
  }

  // X: the same, with PKCE (the verifier waits in the short-lived cookie).
  if (path === '/api/auth/x' && xOn) {
    const state = randomB64(16);
    const verifier = randomB64(32);
    const q = new URLSearchParams({ response_type: 'code', client_id: env.X_CLIENT_ID, redirect_uri: `${url.origin}/api/auth/x/done`, scope: 'users.read tweet.read', state, code_challenge: await pkceChallenge(verifier), code_challenge_method: 'S256' });
    return redirectTo(`https://x.com/i/oauth2/authorize?${String(q).replace(/\+/g, '%20')}`, { p: 'x', state, verifier, back: safeBack(url.searchParams.get('back')) });
  }
  if (path === '/api/auth/x/done' && xOn) {
    const pending = readPending(req);
    const code = url.searchParams.get('code');
    if (!pending || pending.p !== 'x' || !code || url.searchParams.get('state') !== pending.state) return failed(pending?.back ?? '/');
    const res = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', authorization: `Basic ${btoa(`${env.X_CLIENT_ID}:${env.X_CLIENT_SECRET}`)}` },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: `${url.origin}/api/auth/x/done`, code_verifier: pending.verifier }),
    });
    const tok = await res.json().catch(() => null);
    if (!tok?.access_token) return failed(pending.back);
    const me = await (await fetch('https://api.x.com/2/users/me', { headers: { authorization: `Bearer ${tok.access_token}` } })).json().catch(() => null);
    if (!me?.data?.id) return failed(pending.back);
    return startSession(env, 'x', String(me.data.id), me.data.name || '', pending.back);
  }

  // A redirect route for a provider that isn't set up goes home; anything else is unknown.
  return req.method === 'GET' && /^\/api\/auth\/(facebook|x)/.test(path)
    ? new Response(null, { status: 302, headers: { location: '/' } })
    : new Response('not found', { status: 404 });
}
