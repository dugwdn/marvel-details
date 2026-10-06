import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeAllowed, readCookie, sessionCookie, firstNameFrom, newToken, hashToken, COOKIE } from '../lib/members-server.js';

const req = (headers, url = 'https://marvel-details.pages.dev/api/sync') => new Request(url, { method: 'PUT', headers });

test('writes must be JSON from this site', () => {
  assert.equal(writeAllowed(req({ 'content-type': 'application/json' })), true);
  assert.equal(writeAllowed(req({ 'content-type': 'application/json', origin: 'https://marvel-details.pages.dev' })), true);
  assert.equal(writeAllowed(req({ 'content-type': 'application/json', origin: 'https://evil.example' })), false);
  assert.equal(writeAllowed(req({ 'content-type': 'application/x-www-form-urlencoded' })), false);
});

test('session cookie is HttpOnly, Secure, SameSite=Lax and readable back', () => {
  const c = sessionCookie('abc');
  for (const part of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/']) assert.ok(c.includes(part), part);
  assert.equal(readCookie(req({ cookie: `other=1; ${COOKIE}=abc; x=2` })), 'abc');
  assert.equal(readCookie(req({})), null);
});

test('tokens are random 64-hex and stored hashed', async () => {
  const a = newToken();
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.notEqual(a, newToken());
  assert.match(await hashToken(a), /^[0-9a-f]{64}$/);
  assert.notEqual(await hashToken(a), a);
});

test('only the first name is kept, trimmed', () => {
  assert.equal(firstNameFrom({ given_name: '  Doug ', email: 'x@y.z', name: 'Doug Full' }), 'Doug');
  assert.equal(firstNameFrom({ email: 'x@y.z' }), '');
  assert.equal(firstNameFrom({ given_name: '<b>' + 'x'.repeat(100) }).length, 40);
});
