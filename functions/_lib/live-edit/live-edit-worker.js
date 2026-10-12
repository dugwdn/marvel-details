// WDN Live Edit for Cloudflare sites (Workers with static assets, or Pages Functions).
// Built in dugwdn/wdn-website tools/live-edit/worker; each site keeps a copy made by
// `node tools/live-edit/build.mjs` (don't edit the copies).
//
// Sign-in: the site never sees a password. "?wdn-edit" on any page sends the owner to
// webdesignnerd.com, where the WDN Live Edit plugin checks they are signed in to WordPress as an
// Administrator and sends them back with a pass signed by the plugin's Ed25519 key (good for
// 2 minutes, once). This site checks the pass against the plugin's public key and starts a
// 30-day owner session (a random token in an HttpOnly cookie; only its SHA-256 is stored).
//
// Storage: one KV namespace bound as LIVE_EDIT: "items" (every override), "img:<id>" (uploaded
// pictures), "sess:<hash>" (owner sessions), "used:<nonce>" (spent passes), "key" (the public key).
//
// Use:
//   import { createLiveEdit } from './live-edit/live-edit-worker.js';
//   const liveEdit = createLiveEdit({ siteWide: 'header, footer' });
//   const r = await liveEdit.handle(req, env); if (r) return r;   // its own /__live-edit/* routes
//   return liveEdit.page(req, env, await env.ASSETS.fetch(req));   // adds edits (and the editor) to HTML pages
import { APPLY_JS, EDITOR_JS } from './live-edit-assets.js';

const HQ = 'https://webdesignnerd.com';
const PASS_PATH = '/?wdn-live-edit-pass=1';
const KEY_URL = HQ + '/wp-json/wdn-live-edit/v1/key';
const COOKIE = 'wdn_le';
const SESSION_DAYS = 30;
const MAX_ITEMS = 500;
const MAX_LEN = 20000;
const MAX_IMG = 10 * 1024 * 1024;
const IMG_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'image/avif': 'avif' };

// ---- Small helpers ----

const b64u = {
  enc: bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  dec: s => { const t = String(s).replace(/=+$/, '').replace(/-/g, '+').replace(/_/g, '/'); return Uint8Array.from(atob(t + '==='.slice((t.length + 3) % 4)), c => c.charCodeAt(0)); },
};
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const sha256 = async s => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));

export function readCookie(header, name) {
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return '';
}

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), { status, headers: Object.assign({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }, extra) });
const fail = (message, status = 400) => json({ message }, status);

// JSON that is safe inside <script>.
const scriptJson = v => JSON.stringify(v).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

// ---- Cleaning what the editor sends (same rules as the WordPress plugin's clean()) ----

const KEEP_TAGS = new Set(['a', 'b', 'strong', 'em', 'i', 'u', 's', 'small', 'sub', 'sup', 'br', 'span', 'mark', 'code', 'abbr', 'time']);
const escText = s => String(s).replace(/&(?![a-z0-9#]+;)/gi, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const okHref = h => /^(https?:\/\/|mailto:|tel:|sms:|\/(?!\/)|#)/i.test(h);

// Rebuilds every tag from scratch: only inline formatting tags survive, links keep only a safe
// href, target and rel, other tags keep only class; everything else (scripts, styles, handlers,
// comments) is dropped. Edited elements only ever hold inline words, so nothing real is lost.
export function cleanHtml(html) {
  let s = String(html || '').replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/<(script|style|iframe|object|embed|template|noscript|svg|math)\b[\s\S]*?<\/\1\s*>/gi, '');
  let out = '';
  let last = 0;
  const open = [];
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g;
  let m;
  while ((m = re.exec(s))) {
    out += escText(s.slice(last, m.index));
    last = re.lastIndex;
    const close = m[1] === '/';
    const tag = m[2].toLowerCase();
    if (!KEEP_TAGS.has(tag)) continue;
    if (close) {
      const at = open.lastIndexOf(tag);
      if (at === -1) continue;
      while (open.length > at) out += '</' + open.pop() + '>';
      continue;
    }
    const attrs = {};
    m[3].replace(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g, (_, k, a, b, c) => { attrs[k.toLowerCase()] = a ?? b ?? c ?? ''; });
    let keep = '';
    if (tag === 'a') {
      if (attrs.href && okHref(attrs.href.trim())) keep += ' href="' + escAttr(attrs.href.trim()) + '"';
      if (attrs.target === '_blank') keep += ' target="_blank"';
      if (attrs.rel) keep += ' rel="' + escAttr(attrs.rel.replace(/[^a-z\s]/gi, '')) + '"';
    }
    if (attrs.class) keep += ' class="' + escAttr(attrs.class.replace(/[^\w\s-]/g, '')) + '"';
    if (tag === 'br') { out += '<br>'; continue; }
    out += '<' + tag + keep + '>';
    open.push(tag);
  }
  out += escText(s.slice(last));
  while (open.length) out += '</' + open.pop() + '>';
  return out;
}

const plain = s => String(s || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

function cleanValue(type, v) {
  if (type === 'image') {
    const src = v && typeof v.src === 'string' ? v.src.trim() : '';
    if (!/^(https:\/\/|\/(?!\/))/i.test(src) || /["'<>\s]/.test(src)) throw new Error('That picture address will not work.');
    return { src, alt: v && typeof v.alt === 'string' ? plain(v.alt).slice(0, 300) : '' };
  }
  const html = typeof v === 'string' ? v : '';
  if (html.length > MAX_LEN) throw new Error('That text is too long.');
  const clean = cleanHtml(html);
  if (!plain(clean)) throw new Error("Words can't be empty.");
  return clean;
}

export function cleanItem(input) {
  if (!input || typeof input !== 'object') throw new Error('Nothing to save.');
  const scope = String(input.scope || '');
  if (scope !== '*' && !/^\/[^\s<>"]*$/.test(scope)) throw new Error('Unknown page.');
  const key = String(input.key || '');
  if (!key || key.length > 1000 || /[<{}\x00-\x1f]/.test(key)) throw new Error('Unknown element.');
  const tag = String(input.tag || '').toLowerCase();
  if (!/^[a-z][a-z0-9]{0,9}$/.test(tag)) throw new Error('Unknown element.');
  const type = input.type === 'image' ? 'image' : 'text';
  if (type === 'image' && tag !== 'img') throw new Error('Pictures only replace pictures.');
  const prev = [];
  for (const p of Array.isArray(input.prev) ? input.prev.slice(-10) : []) {
    try { if (p && 'value' in p) prev.push({ value: cleanValue(type, p.value), t: String(p.t || '').slice(0, 40) }); } catch { /* drop a bad old version */ }
  }
  return {
    id: scope + ' ' + key, scope, key, tag, type,
    orig: String(input.orig || '').slice(0, MAX_LEN), // only compared in the browser, never printed as HTML
    value: cleanValue(type, input.value),
    t: new Date().toISOString(),
    prev,
  };
}

// ---- The pass from webdesignnerd.com ----

async function publicKey(kv, fetchKey) {
  let key = await kv.get('key');
  if (!key) {
    // Trusted on first use, then pinned: the plugin's public key never changes unless reset.
    const r = await fetchKey(KEY_URL);
    if (!r.ok) throw new Error('Could not reach webdesignnerd.com for the sign-in key.');
    const j = await r.json();
    if (!j || j.alg !== 'Ed25519' || b64u.dec(j.key).length !== 32) throw new Error('The sign-in key looks wrong.');
    key = j.key;
    await kv.put('key', key);
  }
  return key;
}

/** Checks a pass ("payload.signature", base64url) for this site. Returns its payload or throws. */
export async function verifyPass(token, host, keyB64, now = Date.now()) {
  const [p, sig] = String(token || '').split('.');
  if (!p || !sig) throw new Error('No pass.');
  const key = await crypto.subtle.importKey('raw', b64u.dec(keyB64), { name: 'Ed25519' }, false, ['verify']);
  const ok = await crypto.subtle.verify({ name: 'Ed25519' }, key, b64u.dec(sig), new TextEncoder().encode(p));
  if (!ok) throw new Error('That pass is not from webdesignnerd.com.');
  const body = JSON.parse(new TextDecoder().decode(b64u.dec(p)));
  if (body.site !== host) throw new Error('That pass is for another site.');
  if (!(body.exp * 1000 > now)) throw new Error('That pass has expired. Try again.');
  if (!body.n || String(body.n).length < 16) throw new Error('No pass.');
  return body;
}

// ---- The module ----

export function createLiveEdit(options = {}) {
  const o = Object.assign({ siteWide: 'body > header, body > footer, header, footer', skip: '', binding: 'LIVE_EDIT', fetch: (u, i) => fetch(u, i) }, options);
  const kvOf = env => env[o.binding];

  async function owner(req, env) {
    const kv = kvOf(env);
    const token = readCookie(req.headers.get('cookie'), COOKIE);
    if (!kv || !token) return false;
    return (await kv.get('sess:' + (await sha256(token)))) === '1';
  }

  async function items(kv, fresh) {
    const all = await kv.get('items', fresh ? { type: 'json' } : { type: 'json', cacheTtl: 60 });
    return all && typeof all === 'object' ? all : {};
  }

  const sameOrigin = (req, url) => req.headers.get('origin') === url.origin;

  async function handle(req, env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/__live-edit/')) return null;
    const kv = kvOf(env);
    if (!kv) return fail('Live Edit storage is not connected on this site.', 503);
    const path = url.pathname.slice('/__live-edit/'.length);

    if (path === 'start') {
      const back = new URL(url.searchParams.get('back') || '/', url.origin);
      if (back.origin !== url.origin) return fail('Wrong address.');
      return Response.redirect(HQ + PASS_PATH + '&site=' + encodeURIComponent(url.host) + '&back=' + encodeURIComponent(back.href), 302);
    }

    if (path === 'auth') {
      try {
        const pass = await verifyPass(url.searchParams.get('t'), url.host, await publicKey(kv, o.fetch));
        if (await kv.get('used:' + pass.n)) throw new Error('That pass was already used. Try again.');
        await kv.put('used:' + pass.n, '1', { expirationTtl: 600 });
        const token = b64u.enc(crypto.getRandomValues(new Uint8Array(32)));
        await kv.put('sess:' + (await sha256(token)), '1', { expirationTtl: SESSION_DAYS * 86400 });
        const back = new URL(url.searchParams.get('back') || '/', url.origin);
        const to = back.origin === url.origin ? back : new URL('/', url.origin);
        to.searchParams.set('wdn-edit', '1');
        return new Response(null, { status: 302, headers: {
          location: to.href,
          'set-cookie': `${COOKIE}=${token}; Path=/; Max-Age=${SESSION_DAYS * 86400}; HttpOnly; Secure; SameSite=Lax`,
          'cache-control': 'no-store',
        } });
      } catch (e) {
        return new Response('Live Edit sign-in did not work: ' + e.message, { status: 403, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
      }
    }

    if (path === 'signout') {
      const token = readCookie(req.headers.get('cookie'), COOKIE);
      if (token) await kv.delete('sess:' + (await sha256(token)));
      return new Response(null, { status: 302, headers: { location: '/', 'set-cookie': `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` } });
    }

    if (path.startsWith('img/') && (req.method === 'GET' || req.method === 'HEAD')) {
      const { value, metadata } = await kv.getWithMetadata(path.replace('img/', 'img:'), { type: 'arrayBuffer', cacheTtl: 86400 });
      if (!value) return new Response('Not found', { status: 404 });
      return new Response(req.method === 'HEAD' ? null : value, { headers: {
        'content-type': (metadata && metadata.type) || 'application/octet-stream',
        'cache-control': 'public, max-age=31536000, immutable',
        'x-content-type-options': 'nosniff',
      } });
    }

    // Everything below changes something: the owner only, from this site's own pages.
    if (!(await owner(req, env))) return fail('Only the site owner can edit.', 403);
    if (!sameOrigin(req, url)) return fail('Wrong origin.', 403);

    if (path === 'item' && req.method === 'POST') {
      let it;
      try { it = cleanItem(await req.json()); } catch (e) { return fail(e.message); }
      const all = await items(kv, true);
      if (!all[it.id] && Object.keys(all).length >= MAX_ITEMS) return fail('Too many saved changes. Use Original on a few first.');
      all[it.id] = it;
      await kv.put('items', JSON.stringify(all));
      return json(it);
    }
    if (path === 'item' && req.method === 'DELETE') {
      const id = url.searchParams.get('id') || '';
      const all = await items(kv, true);
      if (!all[id]) return fail('That change was already removed.', 404);
      delete all[id];
      await kv.put('items', JSON.stringify(all));
      return json({ removed: id });
    }
    if (path === 'upload' && req.method === 'POST') {
      const type = (req.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      if (!IMG_TYPES[type]) return fail('Pictures must be JPG, PNG, GIF, WebP or AVIF.');
      const body = await req.arrayBuffer();
      if (!body.byteLength) return fail('That picture is empty.');
      if (body.byteLength > MAX_IMG) return fail('That picture is over 10 MB. Try a smaller one.');
      const id = b64u.enc(crypto.getRandomValues(new Uint8Array(12))) + '.' + IMG_TYPES[type];
      await kv.put('img:' + id, body, { metadata: { type } });
      return json({ url: '/__live-edit/img/' + id });
    }
    return fail('Not found', 404);
  }

  // Adds this page's overrides (and, for the owner, the editor) to an HTML response.
  async function page(req, env, res) {
    const kv = kvOf(env);
    const type = res.headers.get('content-type') || '';
    if (!kv || req.method !== 'GET' || !type.includes('text/html') || res.status !== 200) return res;
    const url = new URL(req.url);
    const isOwner = await owner(req, env);
    if (url.searchParams.has('wdn-edit') && !isOwner) {
      return Response.redirect(url.origin + '/__live-edit/start?back=' + encodeURIComponent(url.pathname + url.search), 302);
    }
    const all = await items(kv, isOwner);
    const pagePath = url.pathname || '/';
    const mine = Object.values(all).filter(it => it.scope === '*' || it.scope === pagePath);
    if (!mine.length && !isOwner) return res;

    const shown = isOwner ? mine : mine.map(({ prev, ...rest }) => rest);
    let html = '<script data-wdn-live-edit>' + APPLY_JS + '\nWDNLiveEdit.apply(document,' + scriptJson(shown) + ',' + scriptJson({ page: pagePath, siteWide: o.siteWide }) + ');</script>';
    if (isOwner) {
      const cfg = { items: mine, page: pagePath, siteWide: o.siteWide, skip: o.skip, open: url.searchParams.has('wdn-edit') };
      html += '<script data-wdn-live-edit>' + EDITOR_JS + '\nWDNLiveEdit.startEditor((function(c){c.adapter=WDNLiveEdit.restAdapter({base:"/__live-edit",uploadUrl:"/__live-edit/upload"});return c;})(' + scriptJson(cfg) + '));</script>';
    }
    const out = inject(res, html);
    const headers = new Headers(out.headers);
    headers.delete('content-length');
    headers.delete('etag');
    if (isOwner) headers.set('cache-control', 'private, no-store');
    return new Response(out.body, { status: out.status, statusText: out.statusText, headers });
  }

  return { handle, page, owner };
}

// End of <body>, with HTMLRewriter on Cloudflare (tests pass their own).
function inject(res, html) {
  if (typeof HTMLRewriter === 'undefined') throw new Error('HTMLRewriter is not available');
  return new HTMLRewriter().on('body', { element(el) { el.append(html, { html: true }); } }).transform(res);
}
