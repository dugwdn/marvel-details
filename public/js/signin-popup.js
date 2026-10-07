// The sign-in pop-up (Doug's standing rule, 2026-10-07): after 12 seconds on
// the site (added up across pages in one visit, only while the tab is in
// view), a signed-out visitor sees one pop-up with a big button for each free
// sign-in that is on right now (GET /api/auth: Google first, then Facebook
// once its keys are in; X never). One click goes into the site's own sign-in
// (functions/_lib/auth.js), which makes the account or signs in. Shows once a
// visit; closing it rests it for 3 days. The rules are in signin-popup-core.js.
// Loaded on every page by tools/menu.mjs.
import { WAIT_MS, excludedPage, liveProviders, addTime, restUntil, shouldShow } from './signin-popup-core.js';

const ELAPSED = 'dym-pop-ms'; // sessionStorage: visible time this visit
const SHOWN = 'dym-pop-shown'; // sessionStorage: shown this visit
const REST = 'dym-pop-rest'; // localStorage: closed, rest until this time
const SIGNED = 'dym-signed-in'; // localStorage, set by members.js while signed in

const store = (kind) => ({
  get(k) { try { return window[kind].getItem(k); } catch { return null; } },
  set(k, v) { try { window[kind].setItem(k, v); } catch { /* private mode */ } },
});
const ls = store('localStorage');
const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ss = store('sessionStorage');

const typing = () => {
  const el = document.activeElement;
  if (!el || el === document.body) return false;
  if (el.isContentEditable) return true;
  if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
  return el.tagName === 'INPUT' && !/^(button|submit|reset|checkbox|radio|range|color|file|image)$/i.test(el.type);
};
// A quiz round in play, or another full-screen window or dialog already open.
const busy = () => {
  if (typing()) return true;
  const play = document.getElementById('quiz-play');
  if (play && !play.hidden) return true;
  return !!document.querySelector('dialog[open], [aria-modal="true"]');
};

function base() {
  return {
    elapsedMs: Number(ss.get(ELAPSED)) || 0,
    now: Date.now(),
    restedUntil: Number(ls.get(REST)) || 0,
    shownThisVisit: ss.get(SHOWN) === '1',
    signedIn: ls.get(SIGNED) === '1' ? true : null,
    pathname: location.pathname,
    search: location.search,
  };
}

let timer = null;
let last = 0;
let asking = false;

function tick() {
  const now = performance.now();
  if (document.visibilityState === 'visible') ss.set(ELAPSED, String(addTime(ss.get(ELAPSED), now - last)));
  last = now;
  const s = base();
  if (s.signedIn || s.shownThisVisit || excludedPage(s.pathname, s.search) || s.restedUntil > s.now) return stop();
  if (s.elapsedMs >= WAIT_MS && !asking && !busy()) check();
}

function stop() { clearInterval(timer); timer = null; }

async function check() {
  asking = true;
  let mod;
  let a;
  try {
    mod = await import('./account.js');
    a = await mod.account();
  } catch { asking = false; return stop(); }
  asking = false;
  if (a.user) { window.dymMembers?.noteSignIn?.(a.user); return stop(); }
  const s = { ...base(), signedIn: false, providers: a.providers || {}, busy: busy() };
  if (liveProviders(s.providers).length === 0) return stop(); // no sign-in is on: never show
  if (!shouldShow(s)) return;
  stop();
  open(mod, s.providers);
}

// ---------- the pop-up ----------
const FB_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" class="dym-pop-ico"><path fill="currentColor" d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v2.9h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z"/></svg>';

function open(mod, providers) {
  ss.set(SHOWN, '1');
  const live = liveProviders(providers);
  const back = encodeURIComponent(location.pathname + location.search);
  const before = document.activeElement;
  const root = document.createElement('div');
  root.className = 'dym-pop';
  root.innerHTML = `
    <div class="dym-pop-backdrop" data-close></div>
    <div class="dym-pop-card" role="dialog" aria-modal="true" aria-labelledby="dym-pop-title" aria-describedby="dym-pop-why">
      <button type="button" class="dym-pop-x" data-close aria-label="Close">×</button>
      <h2 id="dym-pop-title" class="dym-pop-title">Create your free account</h2>
      <p id="dym-pop-why" class="dym-pop-why">Keep your Seen it list, saved pages, favorite characters and found-details rank on every device you use.</p>
      <label class="dym-pop-age"><input type="checkbox" data-age> I’m 13 or older</label>
      <div class="dym-pop-btns">
        ${live.map((k) => (k === 'google'
          ? '<div class="dym-pop-btn dym-pop-google" data-google><div class="dym-pop-gsi" data-gsi></div><div class="dym-pop-cover" data-cover aria-hidden="true"></div></div>'
          : `<a class="dym-pop-btn dym-pop-fb" href="/api/auth/facebook?back=${back}" data-fb aria-disabled="true">${FB_ICON}<span>Continue with Facebook</span></a>`)).join('')}
      </div>
      <p class="dym-pop-note" data-note hidden>Tick “I’m 13 or older” first. Accounts are for people 13 or older.</p>
      <p class="dym-pop-small">One click makes your account or signs you in. We keep only your first name, never your email or password. <a href="/privacy">Privacy</a></p>
      <button type="button" class="dym-pop-later" data-close>Not now</button>
    </div>`;
  document.body.appendChild(root);
  if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) root.classList.add('dym-pop-anim');

  // Everything else on the page is out of reach while it's open (focus stays inside).
  const others = [...document.body.children].filter((el) => el !== root && !el.inert);
  others.forEach((el) => { el.inert = true; });

  const card = root.querySelector('.dym-pop-card');
  const age = root.querySelector('[data-age]');
  const note = root.querySelector('[data-note]');
  const fb = root.querySelector('[data-fb]');
  const cover = root.querySelector('[data-cover]');
  const paintAge = () => {
    const ok = age.checked;
    if (fb) fb.setAttribute('aria-disabled', ok ? 'false' : 'true');
    if (cover) cover.hidden = ok;
    // Until the box is ticked, Google's button can't be reached by Tab either.
    root.querySelectorAll('[data-gsi] iframe').forEach((f) => { f.tabIndex = ok ? 0 : -1; });
    if (ok) note.hidden = true;
  };
  const needAge = (e) => {
    if (age.checked) return false;
    e?.preventDefault();
    note.hidden = false;
    age.focus();
    return true;
  };
  age.addEventListener('change', paintAge);
  fb?.addEventListener('click', (e) => { if (!needAge(e)) ss.set(SHOWN, '1'); });
  cover?.addEventListener('click', needAge);

  // The phone's back button closes it: one history entry while it's open.
  let pushed = false;
  try { history.pushState({ dymPop: 1 }, ''); pushed = true; } catch { /* ignore */ }
  let closed = false;
  const close = ({ rest = true, fromBack = false } = {}) => {
    if (closed) return;
    closed = true;
    if (rest) ls.set(REST, String(restUntil(Date.now())));
    window.removeEventListener('popstate', onBack);
    document.removeEventListener('keydown', onKey, true);
    others.forEach((el) => { el.inert = false; });
    root.remove();
    if (pushed && !fromBack && history.state?.dymPop) history.back();
    if (before && typeof before.focus === 'function' && document.contains(before)) before.focus();
  };
  const onBack = () => close({ fromBack: true });
  window.addEventListener('popstate', onBack);

  const focusables = () => [...card.querySelectorAll('button, a[href], input, iframe, [tabindex]:not([tabindex="-1"])')]
    .filter((el) => !el.hidden && !el.closest('[hidden]') && el.offsetParent !== null);
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const f = focusables();
    if (!f.length) return;
    const first = f[0];
    const lastEl = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || !card.contains(document.activeElement))) { e.preventDefault(); lastEl.focus(); }
    else if (!e.shiftKey && (document.activeElement === lastEl || !card.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
  };
  document.addEventListener('keydown', onKey, true);
  root.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', () => close()));
  card.querySelector('.dym-pop-title').setAttribute('tabindex', '-1');
  card.querySelector('.dym-pop-title').focus();

  // Google's own button (it hands us an ID token; the server checks it at POST /api/auth/google).
  if (providers.google) {
    const slot = root.querySelector('[data-gsi]');
    mod.loadGsi().then(() => {
      if (closed) return;
      const SCALE = 1.2; // Google's largest button is 40px tall; 1.2 makes it a 48px target
      google.accounts.id.initialize({
        client_id: providers.google,
        use_fedcm_for_prompt: true,
        callback: async ({ credential }) => {
          const r = await fetch('/api/auth/google', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ credential }) }).catch(() => null);
          if (!r?.ok) { note.textContent = 'That sign-in didn’t go through. Try again.'; note.hidden = false; return; }
          const now = await mod.account(true);
          window.dymMembers?.noteSignIn?.(now.user);
          card.innerHTML = `<h2 class="dym-pop-title" tabindex="-1">You’re in${now.user?.name ? `, ${esc(now.user.name)}` : ''}!</h2><p class="dym-pop-why">Your list now follows you to every device. See it on <a href="/me/">My Marvel</a>.</p><button type="button" class="dym-pop-later" data-done>Close</button>`;
          card.querySelector('[data-done]').addEventListener('click', () => close({ rest: false }));
          card.querySelector('.dym-pop-title').focus();
        },
      });
      const w = Math.min(400, Math.floor((slot.parentElement.clientWidth || 300) / SCALE));
      google.accounts.id.renderButton(slot, { theme: 'filled_blue', size: 'large', text: 'continue_with', shape: 'rectangular', logo_alignment: 'center', width: w });
      slot.style.setProperty('--dym-gsi-scale', SCALE);
      // Google adds its iframe a moment later; keep it out of Tab order until the age box is ticked.
      new MutationObserver(paintAge).observe(slot, { childList: true, subtree: true });
    }).catch(() => {
      if (closed) return;
      slot.innerHTML = '<a class="dym-pop-btn dym-pop-fallback" href="/account">Sign in with Google</a>';
    });
  }
}

// Start counting. The first tick only sets the clock.
if (!excludedPage(location.pathname, location.search) && ls.get(SIGNED) !== '1') {
  last = performance.now();
  timer = setInterval(tick, 1000);
  document.addEventListener('visibilitychange', () => { last = performance.now(); });
}
