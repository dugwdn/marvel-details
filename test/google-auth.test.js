import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyGoogleIdToken, claimProblem, bytesToB64url, decodeJwt, googleKeys } from '../lib/google-auth.js';

const CLIENT = 'test-client.apps.googleusercontent.com';
const NOW = 1_800_000_000;

// A throwaway RSA key pair made just for these tests, standing in for Google's.
const pair = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true,
  ['sign', 'verify'],
);
const jwk = { ...(await crypto.subtle.exportKey('jwk', pair.publicKey)), kid: 'test-kid', use: 'sig' };
const other = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true,
  ['sign', 'verify'],
);

const enc = (o) => bytesToB64url(new TextEncoder().encode(JSON.stringify(o)));
async function sign(payload, { kid = 'test-kid', alg = 'RS256', key = pair.privateKey } = {}) {
  const input = `${enc({ alg, kid, typ: 'JWT' })}.${enc(payload)}`;
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(input));
  return `${input}.${bytesToB64url(new Uint8Array(sig))}`;
}
const good = { iss: 'https://accounts.google.com', aud: CLIENT, sub: '1234567890', given_name: 'Doug', iat: NOW - 10, exp: NOW + 3600 };
const opts = { clientId: CLIENT, keys: [jwk], now: NOW };

test('a correctly signed token with good claims is accepted', async () => {
  const claims = await verifyGoogleIdToken(await sign(good), opts);
  assert.equal(claims.sub, '1234567890');
  assert.equal(claims.given_name, 'Doug');
});

test('both Google issuer spellings are accepted', async () => {
  await verifyGoogleIdToken(await sign({ ...good, iss: 'accounts.google.com' }), opts);
});

test('claims: wrong audience, issuer, expired, future, no subject', () => {
  assert.equal(claimProblem(good, opts), null);
  assert.equal(claimProblem({ ...good, aud: 'someone-else' }, opts), 'wrong audience');
  assert.equal(claimProblem({ ...good, iss: 'https://evil.example' }, opts), 'wrong issuer');
  assert.equal(claimProblem({ ...good, exp: NOW - 120 }, opts), 'expired');
  assert.equal(claimProblem({ ...good, exp: NOW - 30 }, opts), null, 'one minute of clock skew is allowed');
  assert.equal(claimProblem({ ...good, iat: NOW + 600 }, opts), 'issued in the future');
  assert.equal(claimProblem({ ...good, sub: undefined }, opts), 'no subject');
  assert.equal(claimProblem(good, { ...opts, clientId: '' }), 'no client id configured');
});

test('rejects bad signature, unknown key, wrong algorithm and junk', async () => {
  await assert.rejects(verifyGoogleIdToken(await sign(good, { key: other.privateKey }), opts), /bad signature/);
  await assert.rejects(verifyGoogleIdToken(await sign(good, { kid: 'nope' }), opts), /unknown key/);
  await assert.rejects(verifyGoogleIdToken(await sign(good, { alg: 'none' }), opts), /unexpected algorithm/);
  await assert.rejects(verifyGoogleIdToken('not.a.jwt!', opts));
  await assert.rejects(verifyGoogleIdToken(undefined, opts));
  const token = await sign(good);
  const [h, , s] = token.split('.');
  const tampered = `${h}.${enc({ ...good, sub: '999' })}.${s}`;
  await assert.rejects(verifyGoogleIdToken(tampered, opts), /bad signature/);
});

test('signature is checked before claims are trusted', async () => {
  await assert.rejects(verifyGoogleIdToken(await sign({ ...good, aud: 'x' }), opts), /wrong audience/);
  await assert.rejects(verifyGoogleIdToken(await sign({ ...good, exp: NOW - 999 }), opts), /expired/);
});

test('decodeJwt reads header and payload', async () => {
  const d = decodeJwt(await sign(good));
  assert.equal(d.header.kid, 'test-kid');
  assert.equal(d.payload.aud, CLIENT);
});

test('Google keys are cached for max-age', async () => {
  let calls = 0;
  const fake = async () => {
    calls++;
    return new Response(JSON.stringify({ keys: [jwk] }), { headers: { 'cache-control': 'public, max-age=100' } });
  };
  const k1 = await googleKeys(fake, 1_000);
  const k2 = await googleKeys(fake, 50_000);
  assert.equal(calls, 1);
  assert.deepEqual(k1, k2);
  await googleKeys(fake, 200_000);
  assert.equal(calls, 2);
});
