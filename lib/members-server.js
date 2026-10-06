// Shared helpers for the member API (functions/api/*): JSON replies, the
// session cookie, and D1 lookups. We store only Google's account number
// ("sub") and first name; never an email address.

export const COOKIE = '__Host-dym_session';
export const SESSION_DAYS = 30;

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

export const signInAvailable = (env) => !!(env && env.GOOGLE_CLIENT_ID && env.DB);

// Blocks other sites from posting to us with the visitor's cookie: writes
// must be JSON (which a plain cross-site form can't send) and, when the
// browser says where the request came from, it must be this site.
export function writeAllowed(request) {
  const type = request.headers.get('content-type') || '';
  if (!type.toLowerCase().startsWith('application/json')) return false;
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return false;
  return true;
}

export function readCookie(request, name = COOKIE) {
  const raw = request.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

export function sessionCookie(token, maxAgeSeconds = SESSION_DAYS * 86400) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}
export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

export function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// The database keeps a hash of the session token, not the token itself.
export async function hashToken(token) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function firstNameFrom(claims) {
  const raw = typeof claims.given_name === 'string' ? claims.given_name : '';
  return raw.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 40);
}

// Returns { userId, firstName, sessionHash } for a valid session, or null.
export async function currentUser(request, env) {
  if (!env || !env.DB) return null;
  const token = readCookie(request);
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const sessionHash = await hashToken(token);
  const row = await env.DB.prepare(
    'SELECT u.id AS userId, u.first_name AS firstName FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?1 AND s.expires_at > ?2',
  )
    .bind(sessionHash, Date.now())
    .first();
  return row ? { ...row, sessionHash } : null;
}
