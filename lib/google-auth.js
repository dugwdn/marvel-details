// Checks a Google sign-in ID token (a JWT) without any library: the
// signature against Google's published keys (JWKS) using WebCrypto, then the
// claims (aud = our client ID, iss = Google, not expired). Runs in Cloudflare
// Pages Functions and in Node (unit tests).

export const GOOGLE_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];
export const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

export function b64urlToBytes(s) {
  if (typeof s !== 'string' || !/^[A-Za-z0-9_-]*$/.test(s)) throw new Error('bad base64url');
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToB64url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeJwt(token) {
  if (typeof token !== 'string' || token.length > 4096) throw new Error('not a token');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('not a JWT');
  const json = (p) => JSON.parse(new TextDecoder().decode(b64urlToBytes(p)));
  return {
    header: json(parts[0]),
    payload: json(parts[1]),
    signingInput: new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    signature: b64urlToBytes(parts[2]),
  };
}

// now is in seconds. Returns null when the claims are fine, or the reason.
export function claimProblem(payload, { clientId, now = Math.floor(Date.now() / 1000), skew = 60 } = {}) {
  if (!payload || typeof payload !== 'object') return 'no claims';
  if (!clientId) return 'no client id configured';
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(clientId)) return 'wrong audience';
  if (!GOOGLE_ISSUERS.includes(payload.iss)) return 'wrong issuer';
  if (typeof payload.exp !== 'number' || payload.exp + skew < now) return 'expired';
  if (typeof payload.iat === 'number' && payload.iat - skew > now) return 'issued in the future';
  if (typeof payload.sub !== 'string' || !/^[0-9A-Za-z_-]{1,255}$/.test(payload.sub)) return 'no subject';
  return null;
}

// keys: the "keys" array from Google's JWKS. Returns the claims or throws.
export async function verifyGoogleIdToken(token, { clientId, keys, now } = {}) {
  const { header, payload, signingInput, signature } = decodeJwt(token);
  if (header.alg !== 'RS256') throw new Error('unexpected algorithm');
  const jwk = (keys || []).find((k) => k.kid === header.kid && k.kty === 'RSA');
  if (!jwk) throw new Error('unknown key');
  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, signingInput);
  if (!ok) throw new Error('bad signature');
  const problem = claimProblem(payload, { clientId, now });
  if (problem) throw new Error(problem);
  return payload;
}

// Google's keys change every few days; keep them for as long as Google's
// Cache-Control says (at most 6 hours) in this worker's memory.
let cached = { keys: null, until: 0 };
export async function googleKeys(fetchImpl = fetch, nowMs = Date.now()) {
  if (cached.keys && nowMs < cached.until) return cached.keys;
  const res = await fetchImpl(GOOGLE_JWKS_URL);
  if (!res.ok) throw new Error(`Google keys: HTTP ${res.status}`);
  const body = await res.json();
  const age = /max-age=(\d+)/.exec(res.headers.get('cache-control') || '');
  const seconds = Math.min(age ? Number(age[1]) : 3600, 6 * 3600);
  cached = { keys: body.keys || [], until: nowMs + seconds * 1000 };
  return cached.keys;
}
