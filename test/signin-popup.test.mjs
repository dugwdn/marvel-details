// The sign-in pop-up's timing and who-sees-it rules (public/js/signin-popup-core.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { WAIT_MS, REST_MS, excludedPage, liveProviders, addTime, restUntil, shouldShow } from '../public/js/signin-popup-core.js';

const NOW = 1_800_000_000_000;
const on = { google: 'client-id.apps.googleusercontent.com', facebook: false, x: false };
const ready = { elapsedMs: WAIT_MS, now: NOW, signedIn: false, providers: on, pathname: '/' };

test('waits 12 seconds of time on the site', () => {
  assert.equal(WAIT_MS, 12_000);
  assert.equal(shouldShow({ ...ready, elapsedMs: 11_999 }), false);
  assert.equal(shouldShow(ready), true);
});

test('time adds up across pages and skips sleep jumps', () => {
  let t = 0;
  for (let i = 0; i < 6; i++) t = addTime(t, 1000); // page one
  for (let i = 0; i < 6; i++) t = addTime(t, 1000); // page two
  assert.equal(t, 12_000);
  assert.equal(addTime(t, 60_000), 12_000, 'a laptop waking from sleep adds nothing');
  assert.equal(addTime('5000', -3), 5000);
  assert.equal(addTime(null, 1000), 1000);
});

test('signed-in visitors never see it', () => {
  assert.equal(shouldShow({ ...ready, signedIn: true }), false);
  assert.equal(shouldShow({ ...ready, signedIn: true, elapsedMs: 10 * WAIT_MS }), false);
});

test('once a visit, then a 3-day rest after closing', () => {
  assert.equal(shouldShow({ ...ready, shownThisVisit: true }), false);
  assert.equal(REST_MS, 3 * 24 * 3600 * 1000);
  const until = restUntil(NOW);
  assert.equal(shouldShow({ ...ready, restedUntil: until, now: NOW + REST_MS - 1 }), false);
  assert.equal(shouldShow({ ...ready, restedUntil: until, now: NOW + REST_MS + 1 }), true);
});

test('never with no live provider, and never X', () => {
  assert.deepEqual(liveProviders({ google: null, facebook: false, x: true }), []);
  assert.equal(shouldShow({ ...ready, providers: { google: null, facebook: false, x: true } }), false);
  assert.deepEqual(liveProviders(on), ['google']);
  assert.deepEqual(liveProviders({ google: 'id', facebook: true, x: true }), ['google', 'facebook'], 'Facebook appears by itself once its keys are in');
  assert.deepEqual(liveProviders({ facebook: true }), ['facebook']);
  assert.deepEqual(liveProviders(undefined), []);
});

test('never on the sign-in, My Marvel or privacy pages, or inside RightPlace', () => {
  for (const p of ['/account', '/account.html', '/me/', '/me', '/me/index.html', '/privacy', '/privacy.html']) {
    assert.equal(excludedPage(p), true, p);
    assert.equal(shouldShow({ ...ready, pathname: p }), false, p);
  }
  for (const p of ['/', '/quiz/', '/movies/iron-man-1', '/articles/', '/characters/all/', '/more/']) assert.equal(excludedPage(p), false, p);
  assert.equal(shouldShow({ ...ready, search: '?from=rightplace' }), false);
});

test('never while busy (typing, a quiz round, another window)', () => {
  assert.equal(shouldShow({ ...ready, busy: true }), false);
});

test('every page loads the pop-up script', () => {
  const pages = ['index.html', 'about.html', 'quiz/index.html', 'movies/iron-man-1.html'];
  for (const p of pages) {
    const html = fs.readFileSync(new URL(`../public/${p}`, import.meta.url), 'utf8');
    assert.match(html, /<script type="module" src="\/js\/signin-popup\.js(\?v=[0-9a-f]+)?"><\/script>/, p);
  }
});

test('the pop-up offers no X button and says device, not phone', () => {
  const js = fs.readFileSync(new URL('../public/js/signin-popup.js', import.meta.url), 'utf8');
  assert.doesNotMatch(js, /\/api\/auth\/x/);
  const copy = [...js.matchAll(/>([^<>${}]{3,})</g)].map((m) => m[1]).join(' ');
  assert.doesNotMatch(copy, /\bphone\b/i);
});
