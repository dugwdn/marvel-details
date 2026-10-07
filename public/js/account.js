// Sign-in on MCU Easter Eggs (ADR-008): Google first (button plus One Tap),
// then Facebook and X. Server side: functions/_lib/auth.js. A provider shows up
// only once its settings are in place. Reading the site never needs an account.

let cached = null;
/** { user: { id, name, provider } | null, providers: { google: clientId | null, facebook, x } } */
export function account(fresh = false) {
  if (!cached || fresh) {
    cached = fetch('/api/auth', { credentials: 'same-origin' })
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null)
      .then(v => v || { user: null, providers: {} });
  }
  return cached;
}

const PROVIDER = { google: 'Google', facebook: 'Facebook', x: 'X' };
const esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Fills `box` with the sign-in panel. onChange(user) runs after signing in, out, or deleting. */
export async function fillSignIn(box, { why = 'Sign in to join the discussions and keep your spot on every device.', onChange = () => {} } = {}) {
  const redraw = async user => { await account(true); onChange(user); fillSignIn(box, { why, onChange }); };
  box.innerHTML = '<p class="muted">Loading…</p>';
  const a = await account();
  if (a.user) {
    box.innerHTML = `<p>You’re signed in as <b>${esc(a.user.name)}</b> with ${PROVIDER[a.user.provider] || 'your account'}.</p>
      <button type="button" class="acct-btn quiet" data-out>Sign out</button>
      <details><summary>Delete my account</summary>
        <p class="muted">This deletes your account for good.</p>
        <button type="button" class="acct-btn quiet" data-delete>Delete my account for good</button>
      </details>`;
    box.querySelector('[data-out]').onclick = async () => {
      await fetch('/api/auth/signout', { method: 'POST' }).catch(() => {});
      redraw(null);
    };
    box.querySelector('[data-delete]').onclick = async () => {
      const r = await fetch('/api/auth/delete', { method: 'POST' }).catch(() => null);
      if (r?.ok) redraw(null);
    };
    return;
  }
  const p = a.providers || {};
  if (!(p.google || p.facebook || p.x)) {
    box.innerHTML = '<p class="muted">Sign-in opens soon. Everything on the site can be read without an account.</p>';
    return;
  }
  const back = encodeURIComponent(location.pathname + location.search);
  const failed = new URLSearchParams(location.search).get('signin') === 'failed';
  box.innerHTML = `<p>${esc(why)}</p>
    ${failed ? '<p class="acct-note">That sign-in didn’t go through. Try again, or pick another way.</p>' : ''}
    <label class="acct-age"><input type="checkbox" data-age> I’m 13 or older</label>
    <div class="acct-btns" data-btns hidden>
      ${p.google ? '<div class="acct-google" data-google></div>' : ''}
      ${p.facebook ? `<a class="acct-btn fb" href="/api/auth/facebook?back=${back}">Continue with Facebook</a>` : ''}
      ${p.x ? `<a class="acct-btn x" href="/api/auth/x?back=${back}">Continue with X</a>` : ''}
    </div>
    <p class="muted" data-kid>You need to be 13 or older to make an account.</p>`;
  const age = box.querySelector('[data-age]');
  age.onchange = () => {
    box.querySelector('[data-btns]').hidden = !age.checked;
    box.querySelector('[data-kid]').hidden = age.checked;
    if (age.checked && p.google) googleButton(box.querySelector('[data-google]'), p.google, () => account(true).then(n => redraw(n.user)));
  };
}

let gsi = null;
export function loadGsi() {
  gsi ||= new Promise((ok, no) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = ok;
    s.onerror = no;
    document.head.append(s);
  });
  return gsi;
}

/** Google's own button, plus the One Tap prompt (Google shows it only when it can). */
async function googleButton(el, clientId, done) {
  if (!el || el.dataset.ready) return;
  el.dataset.ready = '1';
  try { await loadGsi(); } catch { el.innerHTML = '<p class="muted">Google sign-in didn’t load. Check your connection.</p>'; return; }
  google.accounts.id.initialize({
    client_id: clientId,
    use_fedcm_for_prompt: true,
    callback: async ({ credential }) => {
      const r = await fetch('/api/auth/google', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ credential }) }).catch(() => null);
      if (r?.ok) done();
    },
  });
  google.accounts.id.renderButton(el, { theme: 'filled_black', size: 'large', text: 'continue_with', shape: 'rectangular', width: Math.min(el.clientWidth || 320, 400) });
  google.accounts.id.prompt();
}
