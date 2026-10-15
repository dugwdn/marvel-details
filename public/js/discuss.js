// Discussions and message boards for MCU Easter Eggs (ADR-015), ported from Credible Theories
// (dugwdn/rabbit-hole-files src/assets/discuss.js) so both sites discuss the same way.
// Server side: functions/_lib/discuss.js. Pages mark what they need and this file fills it in:
//   #discuss[data-thread]         the discussion under a page (loads when the reader scrolls near it)
//   [data-board]                  a board's thread list and its "Start a thread" form
//   [data-thread-view]            one board thread (/boards/thread?id=)
//   [data-recent], [data-count]   newest posts and per-board counts on /boards/
//   #mod                          moderator page (/boards/moderate)
//   #alerts-box                   reply emails on /account
// tools/menu.mjs writes the #discuss box and this script into every page that gets a discussion.
//
// Self-moderation: every post has big Hide and Block buttons. Members' hides are saved on the server and count toward
// folding a post for everyone (it moves into the "Hidden" section at the end); guests' hides and blocks stay on this device.
import { rankFor, foundStats } from './members-core.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const track = (name, p = {}) => { try { window.gtag?.('event', name, p); } catch {} };
const acct = () => import('/js/account.js');
const MAXIND = () => (matchMedia('(min-width: 700px)').matches ? 5 : 3);

async function api(url, body) {
  const r = await fetch(url, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' } : { credentials: 'same-origin' }).catch(() => null);
  const v = r ? await r.json().catch(() => ({})) : {};
  return { ok: !!r?.ok, status: r?.status || 0, ...v, error: r ? v.error : 'No connection. Check it and try again.' };
}

/** "articles/iron-man-2-green-drink" -> "Iron man 2 green drink" (names pages in the newest-posts list). */
function pageName(p) {
  const last = p.split('/').filter(x => x && x !== 'index').pop() || 'a page';
  const words = last.replace(/-/g, ' ');
  return words[0].toUpperCase() + words.slice(1);
}

function ago(at) {
  const s = (Date.now() - Date.parse(String(at).replace(' ', 'T') + 'Z')) / 1000;
  if (!(s >= 0)) return '';
  if (s < 60) return 'just now';
  const u = [[86400 * 365, 'year'], [86400 * 30, 'month'], [86400 * 7, 'week'], [86400, 'day'], [3600, 'hour'], [60, 'minute']].find(([n]) => s >= n);
  const n = Math.floor(s / u[0]);
  return `${n} ${u[1]}${n === 1 ? '' : 's'} ago`;
}

// Plain text in, safe HTML out: links become nofollow links that open in a new tab.
function rich(t) {
  return esc(t).replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g, '<a href="$1" rel="ugc nofollow noopener" target="_blank">$1</a>')
    .replace(/^(@[\p{L}\p{N} .'-]{1,24}?) /u, '<b class="d-at">$1</b> ').replace(/\n/g, '<br>');
}

// ---------- Hide and Block (guests: this device; members: the server too) ----------
const HIDE_KEY = 'dym-hide', BLOCK_KEY = 'dym-block';
const mine = { hides: new Set(), blocks: new Set(), hideAt: 5, me: null };
const local = k => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };
const saveLocal = (k, set) => { try { localStorage.setItem(k, JSON.stringify([...set].slice(-500))); } catch {} };
for (const id of local(HIDE_KEY)) mine.hides.add(id);
for (const b of local(BLOCK_KEY)) mine.blocks.add(b);
const foldNote = n => `Hidden by ${n} ${n === 1 ? 'reader' : 'readers'}`;

// ---------- Cloudflare Turnstile, when the site has keys (worker/discuss.js checks the token) ----------
let tsLoad = null;
function turnstile() {
  tsLoad ||= new Promise(ok => {
    const sc = document.createElement('script');
    sc.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    sc.async = true; sc.onload = () => ok(window.turnstile); sc.onerror = () => ok(null);
    document.head.append(sc);
  });
  return tsLoad;
}
async function armForm(f, key) {
  f.dataset.t0 ||= Date.now();   // when the form first showed, for the too-fast check
  if (!key || f.dataset.ts) return;
  f.dataset.ts = '1';
  const ts = await turnstile();
  const spot = f.querySelector('.d-cf');
  if (!ts || !spot) return;
  f._ts = ts.render(spot, { sitekey: key, appearance: 'interaction-only', size: 'flexible', action: 'post',
    callback: t => { f._token = t; }, 'expired-callback': () => { f._token = ''; } });
}
async function tokenFor(f) {
  if (!f.dataset.ts) return '';
  for (let i = 0; i < 40 && !f._token; i++) await new Promise(r => setTimeout(r, 250));
  return f._token || '';
}

// Rank badge beside each name: the same found-details ranks as My Marvel (public/data/ranks.json).
const getJSON = url => fetch(url).then(r => (r.ok ? r.json() : Promise.reject(new Error(url))));
let ladder = null;
function ranks() {
  ladder ||= Promise.all(['deleted-scenes', 'callbacks', 'rabbit-holes', 'ranks'].map(n => getJSON(`/data/${n}.json`)))
    .then(([sc, cb, rh, rk]) => ({ total: foundStats({}, { scene: sc.deletedScenes.map(x => x.id), callback: cb.callbacks.map(x => x.id), rabbit: rh.rabbitHoles.map(x => x.id) }).total, ranks: rk.ranks }))
    .catch(() => null);
  return ladder;
}
async function badge(n) {
  const r = await ranks();
  if (!r) return '';
  const title = rankFor(Math.min(n || 0, r.total), r.total, r.ranks).current.title;
  return `<span class="d-rank" title="${n || 0} hidden ${n === 1 ? 'detail' : 'details'} found">${esc(title)}</span>`;
}

// Sign-in in a small window, using the site's own sign-in panel (public/js/account.js: 13+ box, Google, Facebook).
function signInFirst(why, then) {
  acct().then(a => {
    const dlg = document.createElement('dialog');
    dlg.className = 'd-dialog dym-panel';
    dlg.setAttribute('aria-labelledby', 'd-dlg-h');
    dlg.innerHTML = '<h2 id="d-dlg-h">Join the discussion</h2><div class="dym-account" data-box></div><button type="button" class="dym-btn dym-btn-sm" data-close>Close</button>';
    document.body.append(dlg);
    const close = () => { dlg.close(); dlg.remove(); };
    dlg.querySelector('[data-close]').onclick = close;
    dlg.addEventListener('cancel', () => dlg.remove());
    a.fillSignIn(dlg.querySelector('[data-box]'), { why, onChange: user => { if (!user) return; window.dymMembers?.noteSignIn?.(user); close(); then(user); } });
    dlg.showModal();
  });
}

// ---------- one post and its replies ----------
async function postHtml(p, kids, opts) {
  const d = Math.min(p.depth, MAXIND());
  const reps = await Promise.all((kids.get(p.id) || []).filter(k => opts.inFold || !k.folded).map(k => postHtml(k, kids, opts)));
  const attrs = `id="c-${esc(p.id)}" data-id="${esc(p.id)}" data-by="${esc(p.by)}" data-name="${esc(p.name)}" style="--d:${d}"`;
  // hidden by this reader, or written by someone they blocked: a one-line stub keeps the replies in place
  const gone = p.mine ? '' : mine.blocks.has(p.by) ? ['You blocked this person.', 'unblock', 'Unblock'] : (p.hidByMe || mine.hides.has(p.id)) ? ['You hid this post.', 'unhide', 'Show it'] : '';
  if (gone) return `<article class="d-post d-gone" ${attrs}><p class="d-gone-line">${gone[0]} <button type="button" class="d-btn" data-act="${gone[1]}">${gone[2]}</button></p><div class="d-replies">${reps.join('')}</div></article>`;
  const acts = p.mine
    ? [['reply', 'Reply'], ['helpful', `Helpful${p.helpful ? ` · ${p.helpful}` : ''}`], ['share', 'Share'], ['delete', 'Delete']]
    : [['reply', 'Reply'], ['helpful', `Helpful${p.helpful ? ` · ${p.helpful}` : ''}`], ['share', 'Share'], ['hide', 'Hide'], ['block', 'Block'], [opts.mod ? 'delete' : 'report', opts.mod ? 'Delete' : 'Report']];
  return `<article class="d-post${p.featured ? ' d-feat' : ''}" ${attrs}>
    <div class="d-head"><b class="d-name">${esc(p.name)}</b>${await badge(p.read)}<span class="d-at-time">${esc(ago(p.at))}</span>${p.held ? '<span class="d-held">Waiting for a moderator</span>' : ''}${p.featured ? '<span class="d-pick">Picked for a write-up</span>' : ''}${p.folded || p.hides >= mine.hideAt ? `<span class="d-held">${esc(foldNote(p.hides))}</span>` : ''}</div>
    ${p.title && opts.showTitle ? `<h3 class="d-title">${esc(p.title)}</h3>` : ''}
    <div class="d-body">${rich(p.body)}</div>
    <div class="d-acts${acts.length === 4 ? ' four' : ''}">${acts.map(([a, t]) => `<button type="button" class="d-btn d-${a}" data-act="${a}"${a === 'helpful' ? ` aria-pressed="${p.voted}"` : ''}${a === 'hide' ? ' title="Hide this post for you. Enough hides move it to Hidden for everyone."' : a === 'block' ? ` title="Hide everything ${esc(p.name)} posts, for you only"` : ''}>${t}</button>`).join('')}</div>
    <div class="d-replies">${reps.join('')}</div>
  </article>`;
}
const REASONS = [['spam', 'Spam'], ['abuse', 'Abuse or hate'], ['false', 'Made-up claim about a real person'], ['other', 'Something else']];   // 'false' covers actors and filmmakers
const reportHtml = () => `<div class="d-rep-opts" role="group" aria-label="Why are you reporting it?">${REASONS.map(([v, t]) => `<button type="button" class="d-btn" data-act="report-why" data-reason="${v}">${t}</button>`).join('')}</div>`;

/** Folded posts (hidden by enough readers) go behind one "Hidden" button at the end. */
function hiddenBox(htmls, count) {
  if (!count) return '';
  const tip = `Posts here were hidden by ${mine.hideAt} or more readers, so they moved here automatically. Each one says how many readers hid it.`;
  return `<details class="d-hidden"><summary class="d-btn d-hid-btn" title="${esc(tip)}" aria-describedby="hid-tip">Hidden · ${count}<span class="d-tip" id="hid-tip" role="tooltip">${esc(tip)}</span></summary>
    <p class="small d-hid-why">${esc(tip)}</p><div class="d-list">${htmls.join('')}</div></details>`;
}

function composerHtml({ id, label, title, button, me }) {
  if (!me) return `<div class="d-signin"><p>Reading is free. A free account lets you post, reply and mark posts helpful.</p><button type="button" class="dym-btn" data-act="signin">Sign in to join in</button></div>`;
  return `<form class="d-form" data-kb-block>
    ${title ? `<label class="label" for="${id}-t">Thread title</label><input id="${id}-t" name="title" type="text" maxlength="120" required inputmode="text" enterkeyhint="next" autocomplete="off" autocorrect="off" autocapitalize="sentences" spellcheck="false" placeholder="A short question or claim">` : ''}
    <label class="label" for="${id}-b">${esc(label)}</label>
    <textarea id="${id}-b" name="body" rows="4" maxlength="3000" required inputmode="text" enterkeyhint="enter" autocomplete="off" autocapitalize="sentences" placeholder="Spoilers? Say so at the start. Name your source when you can."></textarea>
    <div class="d-hp" aria-hidden="true"><label>Leave this empty <input name="website" type="text" tabindex="-1" inputmode="text" enterkeyhint="done" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></label></div>
    <div class="d-cf"></div>
    <div class="d-form-row"><button type="submit" class="dym-btn">${esc(button)}</button><span class="small">Posting as ${esc(me.name)} · <a href="/boards/rules" target="_blank" rel="noopener">Discussion rules</a></span></div>
    <p class="small d-msg" role="status" aria-live="polite"></p>
  </form>`;
}

// ---------- a whole discussion (page thread or board thread) ----------
async function discussion(box, query, opts = {}) {
  const sort = box.dataset.sort || 'top';
  const v = await api(`/api/discuss?${query}&sort=${sort}`);
  if (!v.ok) { box.querySelector('[data-list]').innerHTML = `<p class="small">${esc(v.error || 'The discussion did not load. Refresh to try again.')}</p>`; return; }
  const me = v.me;
  learn(v);
  const kids = new Map(); const tops = []; const folded = [];
  const byId = new Map(v.posts.map(p => [p.id, p]));
  for (const p of v.posts) {
    if (p.id === opts.parent) p.folded = false;   // a board thread's own first post stays on its page, with its note
    if (p.folded && (!p.parent || !byId.get(p.parent)?.folded)) folded.push(p);   // the highest folded post carries its replies with it
    if (!p.parent) { if (!p.folded) tops.push(p); }
    else (kids.get(p.parent) || kids.set(p.parent, []).get(p.parent)).push(p);
  }
  for (const list of kids.values()) list.sort((a, b) => a.at.localeCompare(b.at));
  const list = box.querySelector('[data-list]');
  const n = v.posts.length;
  box.querySelector('[data-count-line]').textContent = n ? `${n} ${n === 1 ? 'comment' : 'comments'}` : 'No comments yet. Start it off.';
  const po = { mod: me?.mod, showTitle: opts.showTitle };
  list.innerHTML = (await Promise.all(tops.map(p => postHtml(p, kids, po)))).join('')
    + hiddenBox(await Promise.all(folded.map(p => postHtml({ ...p, depth: 0 }, kids, { ...po, inFold: true }))), folded.length);
  const comp = box.querySelector('[data-composer]');
  if (!opts.noComposer) comp.innerHTML = composerHtml({ id: box.id + '-new', label: opts.label || 'Your comment', button: opts.button || 'Post comment', me });
  if (opts.parent) comp.querySelector('.d-form')?.setAttribute('data-parent', opts.parent);   // a board thread: new replies answer its first post
  box.dataset.ts = v.turnstile || '';
  box.querySelectorAll('.d-form').forEach(f => armForm(f, v.turnstile));
  wire(box, me, opts, query);
  if (location.hash.startsWith('#c-')) document.querySelector(location.hash)?.scrollIntoView({ block: 'center' });
}

/** Take this reader's saved hides and blocks from a server answer. */
function learn(v) {
  mine.hideAt = v.hideAt || mine.hideAt;
  mine.me = v.me || null;
  for (const b of v.me?.blocks || []) mine.blocks.add(b);
}

async function shareLink(b, url) {
  track('comment_shared');
  if (navigator.share) { try { await navigator.share({ url }); return; } catch (e) { if (e?.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(url); b.textContent = 'Link copied'; } catch { window.prompt('Copy this link', url); }
}

function wire(box, me, opts, query) {
  const again = opts.again || (() => discussion(box, query, opts));
  box.onclick = async e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const post = b.closest('.d-post');
    const id = post?.dataset.id;
    const act = b.dataset.act;
    if (act === 'signin') return signInFirst('Sign in to join the discussion. It is free and takes one tap.', again);
    if (act === 'sort') { box.dataset.sort = b.dataset.sort; box.querySelectorAll('[data-act=sort]').forEach(x => x.setAttribute('aria-pressed', x === b)); return again(); }
    // Hide and Block work for everyone; members' choices are saved on the server and follow them to other devices
    if (act === 'hide' || act === 'unhide') {
      const on = act === 'hide';
      if (on) mine.hides.add(id); else mine.hides.delete(id);
      saveLocal(HIDE_KEY, mine.hides);
      if (me) await api('/api/discuss/hide', { id, on });
      track(on ? 'comment_hidden' : 'comment_unhidden');
      return again();
    }
    if (act === 'block' || act === 'unblock') {
      const by = post.dataset.by;
      if (act === 'block' && b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = `Block ${post.dataset.name}?`; b.title = 'Tap again to hide everything this person posts, for you only'; return; }
      if (act === 'block') mine.blocks.add(by); else mine.blocks.delete(by);
      saveLocal(BLOCK_KEY, mine.blocks);
      if (me) await api('/api/discuss/block', { by, on: act === 'block' });
      track(act === 'block' ? 'person_blocked' : 'person_unblocked');
      return again();
    }
    if (act === 'share') {
      const t = box.dataset.thread || '';
      const url = t.startsWith('p:') ? `${location.origin}/${t.slice(2)}#c-${id}` : `${location.origin}${location.pathname}${location.search}#c-${id}`;
      return shareLink(b, url);
    }
    if (!me) return signInFirst('Sign in to reply, vote or report. It is free and takes one tap.', again);
    if (act === 'reply') {
      if (post.querySelector(':scope > .d-form')) return post.querySelector(':scope > .d-form textarea').focus();
      post.querySelector(':scope > .d-acts').insertAdjacentHTML('afterend', composerHtml({ id: 'r-' + id, label: `Reply to ${post.dataset.name}`, button: 'Post reply', me }));
      const f = post.querySelector(':scope > .d-form');
      f.dataset.parent = id;
      armForm(f, box.dataset.ts);
      f.querySelector('textarea').focus();
      return;
    }
    if (act === 'helpful') {
      const r = await api('/api/discuss/helpful', { id });
      if (r.ok) { b.setAttribute('aria-pressed', r.voted); b.textContent = `Helpful${r.helpful ? ` · ${r.helpful}` : ''}`; }
      else b.title = r.error || '';
      return;
    }
    if (act === 'report') {
      const open = post.querySelector(':scope > .d-rep-opts');
      if (open) { open.remove(); return; }
      post.querySelector(':scope > .d-acts').insertAdjacentHTML('afterend', reportHtml());
      return;
    }
    if (act === 'report-why') {
      await api('/api/discuss/report', { id, reason: b.dataset.reason });
      mine.hides.add(id); saveLocal(HIDE_KEY, mine.hides);
      track('comment_reported', { reason: b.dataset.reason });
      return again();
    }
    if (act === 'delete') {
      if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Tap again to delete'; return; }
      const r = await api('/api/discuss/delete', { id });
      if (r.ok) again();
    }
  };
  box.onsubmit = async e => {
    const f = e.target.closest('.d-form');
    if (!f) return;
    e.preventDefault();
    const msg = f.querySelector('.d-msg');
    const btn = f.querySelector('button[type=submit]');
    btn.disabled = true;
    await armForm(f, box.dataset.ts);
    const cf = await tokenFor(f);
    const r = await api('/api/discuss', { t: box.dataset.thread, parent: f.dataset.parent || null, title: f.title?.value, body: f.body.value,
      website: f.website?.value || '', ms: Date.now() - Number(f.dataset.t0 || 0), cf });
    btn.disabled = false;
    if (f._ts !== undefined) { try { window.turnstile?.reset(f._ts); } catch {} f._token = ''; }
    if (!r.ok) { msg.textContent = r.error || 'That did not post. Try again.'; return; }
    track(f.dataset.parent ? 'reply_posted' : 'comment_posted', { thread: box.dataset.thread || query });
    if (opts.onPosted) return opts.onPosted(r.post);
    await discussion(box, query, opts);
    const el = document.getElementById('c-' + r.post.id);
    el?.scrollIntoView({ block: 'center' });
    if (r.held) el?.querySelector('.d-head')?.insertAdjacentHTML('beforeend', '<span class="small"> New members\' links wait for a quick check.</span>');
  };
}

function frame(box, { heading, starter, sortable = true }) {
  box.innerHTML = `<h2 class="d-h">${esc(heading)}</h2>
    ${starter ? `<p class="d-starter">${esc(starter)}</p>` : ''}
    <div class="d-bar"><span class="small" data-count-line>Loading the discussion…</span>
    ${sortable ? '<span class="d-sort" role="group" aria-label="Sort comments"><button type="button" class="d-btn" data-act="sort" data-sort="top" aria-pressed="true">Top</button><button type="button" class="d-btn" data-act="sort" data-sort="new" aria-pressed="false">Newest</button></span>' : ''}</div>
    <div data-composer></div><div class="d-list" data-list></div>`;
}

// page discussions load when the reader comes near them (no request for readers who never scroll that far)
const pageBox = document.getElementById('discuss');
if (pageBox?.dataset.thread) {
  frame(pageBox, { heading: pageBox.dataset.heading || 'Discussion', starter: pageBox.dataset.starter });
  const go = () => discussion(pageBox, `t=${encodeURIComponent(pageBox.dataset.thread)}`);
  if ('IntersectionObserver' in window && !location.hash.startsWith('#c-') && location.hash !== '#discuss') {
    const io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) { io.disconnect(); go(); } }, { rootMargin: '600px' });
    io.observe(pageBox);
  } else go();
}

// ---------- a board: its threads and the new-thread form ----------
const boardBox = document.querySelector('[data-board]');
if (boardBox) {
  const slug = boardBox.dataset.board;
  boardBox.dataset.thread = 'b:' + slug;
  boardBox.id ||= 'board';
  const list = async () => {
    const v = await api(`/api/discuss?t=b:${slug}&sort=${boardBox.dataset.sort || 'active'}`);
    const me = v.me;
    learn(v);
    boardBox.querySelector('[data-composer]').innerHTML = `<details class="d-new"${v.posts?.length ? '' : ' open'}><summary class="dym-btn">Start a thread</summary>${composerHtml({ id: 'nt', label: 'What do you want to talk about?', title: true, button: 'Post thread', me })}</details>`;
    const posts = (v.posts || []).filter(p => p.mine || !(mine.blocks.has(p.by) || p.hidByMe || mine.hides.has(p.id)));
    const open = posts.filter(p => !p.folded), folded = posts.filter(p => p.folded);
    const skipped = (v.posts || []).length - posts.length;
    boardBox.querySelector('[data-count-line]').textContent = v.ok ? (open.length ? `${open.length} ${open.length === 1 ? 'thread' : 'threads'}` : 'No threads yet. Start the first one.') + (skipped ? ` · ${skipped} you hid or blocked` : '') : (v.error || 'The board did not load.');
    const card = async p => `<a class="d-thread${p.featured ? ' d-feat' : ''}" href="/boards/thread?id=${encodeURIComponent(p.id)}">
      <b>${esc(p.title || p.body.slice(0, 80))}</b><span class="d-tmeta">${esc(p.name)} ${await badge(p.read)} · ${p.replies} ${p.replies === 1 ? 'reply' : 'replies'} · active ${esc(ago(p.last))}${p.featured ? ' · <span class="d-pick">Picked for a write-up</span>' : ''}${p.held ? ' · <span class="d-held">Waiting for a moderator</span>' : ''}${p.folded ? ` · <span class="d-held">${esc(foldNote(p.hides))}</span>` : ''}</span></a>`;
    boardBox.querySelector('[data-list]').innerHTML = (await Promise.all(open.map(card))).join('') + hiddenBox(await Promise.all(folded.map(card)), folded.length);
    boardBox.dataset.ts = v.turnstile || '';
    boardBox.querySelectorAll('.d-form').forEach(f => armForm(f, v.turnstile));
    wire(boardBox, me, { onPosted: p => { location.href = `/boards/thread?id=${encodeURIComponent(p.id)}`; }, again: list }, '');
    const sortBtns = boardBox.querySelectorAll('[data-act=sort]');
    sortBtns.forEach(b => b.onclick = e => { e.stopPropagation(); boardBox.dataset.sort = b.dataset.sort; sortBtns.forEach(x => x.setAttribute('aria-pressed', x === b)); list(); });
  };
  boardBox.innerHTML = `<div class="d-bar"><span class="small" data-count-line>Loading threads…</span><span class="d-sort" role="group" aria-label="Sort threads"><button type="button" class="d-btn" data-act="sort" data-sort="active" aria-pressed="true">Active</button><button type="button" class="d-btn" data-act="sort" data-sort="new" aria-pressed="false">Newest</button></span></div><div data-composer></div><div class="d-threads" data-list></div>`;
  list();
}

// ---------- one board thread ----------
const threadBox = document.querySelector('[data-thread-view]');
if (threadBox) {
  const id = new URLSearchParams(location.search).get('id') || '';
  threadBox.id = 'tv';
  frame(threadBox, { heading: 'Replies', sortable: false });
  api(`/api/discuss?root=${encodeURIComponent(id)}`).then(v => {
    const top = v.posts?.find(p => p.id === id);
    if (top) {
      threadBox.dataset.thread = top.thread;
      document.title = `${top.title || 'Thread'} | MCU Easter Eggs`;
      const h1 = document.querySelector('[data-thread-title]');
      if (h1) h1.textContent = top.title || 'Thread';
      const crumb = document.querySelector('[data-thread-board]');
      const b = top.thread.slice(2);
      if (crumb) { crumb.href = `/boards/${b}`; crumb.textContent = document.querySelector(`[data-board-name="${b}"]`)?.dataset.label || 'Back to the board'; }
    }
    return discussion(threadBox, `root=${encodeURIComponent(id)}`, { label: 'Your reply', button: 'Post reply', showTitle: false, noComposer: !top, parent: top?.id });
  });
}

// ---------- Boards page: newest posts and per-board counts ----------
const recent = document.querySelector('[data-recent]');
if (recent) {
  api('/api/discuss/recent').then(async v => {
    const posts = (v.posts || []).filter(p => !mine.blocks.has(p.by) && !mine.hides.has(p.id)).slice(0, +recent.dataset.max || 50);
    // Home keeps its board starter questions until someone has posted (data-keep).
    if (!posts.length && recent.hasAttribute('data-keep')) return;
    recent.innerHTML = posts.length ? (await Promise.all(posts.map(async p => {
      const href = p.thread.startsWith('p:') ? `/${p.thread.slice(2)}#c-${p.id}` : `/boards/thread?id=${encodeURIComponent(p.root)}#c-${p.id}`;
      const where = p.thread.startsWith('p:') ? pageName(p.thread.slice(2)) : (p.rootTitle || 'a thread');
      return `<li><a href="${href}"><b>${esc(p.name)}</b> ${await badge(p.read)} on <span>${esc(where)}</span><span class="d-snip">${esc(p.body.slice(0, 140))}</span><span class="small">${esc(ago(p.at))}</span></a></li>`;
    }))).join('') : '<li class="small">Nothing posted yet. Be the first: pick a board below or comment under any article, scene or character.</li>';
  });
  api('/api/discuss/counts').then(v => {
    for (const el of document.querySelectorAll('[data-count]')) {
      const c = v.boards?.[el.dataset.count];
      el.textContent = c ? `${c.threads} ${c.threads === 1 ? 'thread' : 'threads'} · ${c.posts} posts` : 'No posts yet';
    }
  });
}

// ---------- moderator page ----------
const modBox = document.getElementById('mod');
if (modBox) {
  const show = async () => {
    const v = await api('/api/discuss/mod');
    if (v.status === 401) { modBox.innerHTML = '<button type="button" class="dym-btn">Sign in</button>'; modBox.onclick = () => signInFirst('Sign in with the moderator account.', show); return; }
    if (!v.mod) { modBox.innerHTML = `<p>This account is not a moderator. Its member id is <code>${esc(v.you)}</code>. To make it one, add that id to the MOD_MEMBERS variable in Cloudflare (steps in RUNBOOK.md, "Message boards").</p>`; return; }
    const STATUS = { held: 'Waiting', hidden: 'Hidden', ok: 'Showing', removed: 'Removed' };
    modBox.innerHTML = `<p class="small">Signed in as a moderator. Reply emails waiting to send: ${v.unsentMail}${v.mailOn ? '' : ' (no email sender set yet)'}.</p>
      <ul class="plain mod-list">${v.posts.map(p => `<li data-id="${esc(p.id)}" data-member="${esc(p.member)}"><b>${STATUS[p.status] || p.status}</b> · ${esc(p.name)} · ${p.reports} reports · hidden by ${p.hides} ${p.folded ? '(in Hidden)' : ''} · ${esc(ago(p.at))} · <a href="${p.thread.startsWith('p:') ? '/' + esc(p.thread.slice(2)) + '#c-' + esc(p.id) : '/boards/thread?id=' + esc(p.root)}">open</a>
        ${p.title ? `<br><b>${esc(p.title)}</b>` : ''}<br>${esc(p.body.slice(0, 400))}<br>
        ${['show', 'hide', 'remove', p.featured ? 'unfeature' : 'feature', 'block'].map(a => `<button type="button" class="d-btn" data-mod="${a}">${a[0].toUpperCase() + a.slice(1)}</button>`).join(' ')}</li>`).join('') || '<li>Nothing waiting.</li>'}</ul>
      <h2>Blocked members</h2><ul class="plain">${v.blocked.map(b => `<li data-member="${esc(b.member_id)}">${esc(b.name || b.member_id)} <button type="button" class="d-btn" data-mod="unblock">Unblock</button></li>`).join('') || '<li>None.</li>'}</ul>`;
    modBox.onclick = async e => {
      const b = e.target.closest('[data-mod]');
      if (!b) return;
      const li = b.closest('li');
      await api('/api/discuss/mod', { id: li.dataset.id, member: li.dataset.member, action: b.dataset.mod });
      show();
    };
  };
  show();
}

// ---------- reply alerts on the account page ----------
const alertBox = document.getElementById('alerts-box');
if (alertBox) {
  const show = async () => {
    const v = await api('/api/discuss/alerts');
    if (!v.ok) { alertBox.innerHTML = '<p class="small">Sign in above to get an email when someone replies to you.</p>'; return; }
    alertBox.innerHTML = `<form class="acct-news" data-alerts>
      <label class="acct-check"><input type="checkbox" name="on" ${v.on ? 'checked' : ''}> Email me when someone replies to my posts</label>
      <label class="label" for="alert-email">Email address</label>
      <input id="alert-email" name="email" type="email" value="${esc(v.email)}" inputmode="email" enterkeyhint="done" autocomplete="email" autocorrect="off" autocapitalize="off" spellcheck="false">
      <button type="submit" class="dym-btn">Save reply alerts</button> <span class="small" data-msg role="status"></span></form>`;
    alertBox.querySelector('form').onsubmit = async e => {
      e.preventDefault();
      const f = e.target;
      const r = await api('/api/discuss/alerts', { on: f.on.checked, email: f.email.value });
      f.querySelector('[data-msg]').textContent = r.ok ? (r.on ? 'Saved. We will email you when someone replies.' : 'Reply alerts off and your address deleted.') : (r.error || 'That did not save.');
    };
  };
  show();
}
