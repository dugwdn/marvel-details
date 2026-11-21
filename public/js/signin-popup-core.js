// Pure rules for the sign-in pop-up (public/js/signin-popup.js), kept apart
// so test/signin-popup.test.mjs can check them without a browser.
// Doug's standing rule (2026-10-07): after 10 to 15 seconds on the site, a
// signed-out visitor sees one pop-up with big buttons for the free sign-in
// providers that are on right now. Never X or any paid provider.

export const WAIT_MS = 12_000; // time on the site, added up across pages in one visit
export const REST_MS = 3 * 24 * 60 * 60 * 1000; // closing it rests it for 3 days
export const ORDER = ['google', 'facebook']; // free providers only, Google first; X never shows

// Pages where it never shows: the sign-in page, My Marvel (it has its own
// sign-in panel), and the privacy page.
const NEVER = [/^\/account(\.html)?\/?$/, /^\/me(\/|\/index\.html)?$/, /^\/privacy(\.html)?\/?$/];

/** True for a page the pop-up must never open on. */
export function excludedPage(pathname = '/', search = '') {
  if (NEVER.some((re) => re.test(pathname))) return true;
  const q = new URLSearchParams(search);
  return q.get('from') === 'rightplace';
}

/** The providers to show, in order, from GET /api/auth's `providers`. */
export function liveProviders(providers) {
  const p = providers || {};
  return ORDER.filter((k) => !!p[k]);
}

/**
 * Every button the pop-up shows, always Google then Facebook (never X).
 * live: false means "Coming soon": same size, dimmed, not clickable. It turns
 * on by itself as soon as /api/auth reports that provider.
 */
export function buttons(providers) {
  const p = providers || {};
  return ORDER.map((id) => ({ id, live: !!p[id] }));
}

/** Adds visible time to the running total for this visit. Ignores bad or huge steps (a sleeping laptop). */
export function addTime(total, stepMs) {
  const t = Number(total) || 0;
  const s = Number(stepMs) || 0;
  if (s <= 0 || s > 5_000) return t;
  return t + s;
}

/** When the pop-up may come back after it is closed at `now`. */
export const restUntil = (now) => now + REST_MS;

/**
 * Is it time to show the pop-up?
 * signedIn: true, false, or null when not known yet (then only the timer is checked
 * so the page knows it is worth asking /api/auth).
 */
export function shouldShow({ elapsedMs = 0, now = Date.now(), restedUntil = 0, shownThisVisit = false, signedIn = null, pathname = '/', search = '', busy = false } = {}) {
  if (signedIn === true) return false;
  if (shownThisVisit) return false;
  if (excludedPage(pathname, search)) return false;
  if ((Number(restedUntil) || 0) > now) return false;
  if (elapsedMs < WAIT_MS) return false;
  if (busy) return false;
  // It shows even before any provider is on (all buttons "Coming soon").
  return true;
}
