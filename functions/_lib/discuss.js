// Message boards and page discussions for MCU Easter Eggs (ADR-015), ported from Credible Theories
// (dugwdn/rabbit-hole-files worker/discuss.js, ADR 0010 and 0012) so both sites discuss the same way.
// Doug, 2026-10-05: "Make sure we've got discussion features all over the Marvel site. Just like the credible
// theory site". Reading needs no account; posting needs the free sign-in from ./auth.js. Everything lives in the
// site's D1 database (binding DB); the tables are made on first use.
//
// Threads: "p:<page path>" is the discussion under a page (path without .html, e.g. p:articles/iron-man-2-green-drink);
// "b:<board>" is a message board (top-level posts there carry a title and open on /boards/thread?id=). Replies nest
// up to MAX_DEPTH levels; a reply to the deepest level sits beside its parent with "@name" in front.
//
// Routes:
//   GET  /api/discuss?t=THREAD&sort=top|new     posts in a page thread (all levels) or a board's threads (top level only)
//   GET  /api/discuss?root=ID                    one board thread and every reply in it
//   GET  /api/discuss/recent                     newest posts across the site (Boards page)
//   GET  /api/discuss/counts                     threads and posts per board
//   POST /api/discuss                            { t, parent, title, body } new post or reply
//   POST /api/discuss/helpful   { id }           Helpful on or off
//   POST /api/discuss/hide      { id, on }       Hide a post for me; enough readers' hides fold it for everyone
//   POST /api/discuss/block     { by, on }       Block a person: hide everything they post, for me only
//   POST /api/discuss/report    { id, reason }   tells the moderator, and also hides the post for the reporter
//   POST /api/discuss/delete    { id }           your own post (a moderator: any post)
//   GET  /api/discuss/mod                        moderator queue (user ids listed in MOD_MEMBERS)
//   POST /api/discuss/mod       { id, action }   hide, show, remove, feature, unfeature, block, unblock
//   GET  /api/discuss/alerts / POST { on, email } reply alerts by email
//
// Self-moderation (Doug's standing rule, 7 Oct 2026): every reader gets a big Hide button on each post and a Block
// button for each person. When HIDE_THRESHOLD members (default 5) have hidden or reported a post, it folds for everyone
// into the "Hidden" section at the end of its discussion. Guests can hide and block too, but only on their own device,
// so they do not count toward the fold. A moderator's Show clears the hides.
//
// Spam protection on every post: sign-in, Cloudflare Turnstile when TURNSTILE_SECRET is set, a honeypot field, a too-fast
// check, rate limits, a link limit, a duplicate-post check, the blocked-word list and a review hold for new members' links.

import { readCookie, hashToken, SESSION } from './auth.js';

export const MAX_DEPTH = 5;
export const VOTES = ['buy', 'unsure', 'no'];   // "Do you buy it?" on theory pages: Buy it, Not sure, No way
export const BOARDS = ['easter-eggs', 'fan-theories', 'deleted-scenes', 'characters', 'iron-man', 'avengers', 'spider-man',
  'coming-soon', 'rankings', 'quiz-and-trivia', 'general', 'site-ideas'];   // keep in step with public/data/boards.json (test/discuss.test.mjs checks)
const LIMITS = { perTen: 5, perDay: 40, links: 2, body: 3000, title: 120, fastMs: 1500 };
/** Readers whose Hide or Report folds a post for everyone: HIDE_THRESHOLD, 2 to 50, default 5. */
export const hideAt = env => Math.min(50, Math.max(2, Math.round(Number(env?.HIDE_THRESHOLD)) || 5));
/** Same words, ignoring case, spacing and punctuation: used for the duplicate-post check. */
export const sameText = s => String(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
/** Spam signs a person never trips: the hidden "website" field filled in, or a post sent faster than anyone types. */
export function botSign(body) {
  if (typeof body.website === 'string' && body.website.trim()) return 'honeypot';
  if (typeof body.ms === 'number' && body.ms >= 0 && body.ms < LIMITS.fastMs) return 'too fast';
  return '';
}

// ---------- pure helpers (tests/test_discuss.mjs) ----------

/** A thread key we accept: a page on this site (its path without .html) or one of our boards. */
export function cleanThread(t) {
  if (typeof t !== 'string' || t.length > 200) return '';
  if (/^p:[a-z0-9][a-z0-9\-/]*$/.test(t) && !t.includes('//') && !t.endsWith('/')) return t;
  if (/^b:[a-z0-9-]+$/.test(t) && BOARDS.includes(t.slice(2))) return t;
  return '';
}

export const linkCount = s => (String(s).match(/https?:\/\/|www\./gi) || []).length;

/** Plain text, trimmed, control characters out, at most three blank lines in a row. */
export function cleanText(v, max) {
  if (typeof v !== 'string') return '';
  return v.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B-\u001F\u007F​-‏‪-‮⁦-⁩]/g, '')
    .replace(/\n{4,}/g, '\n\n\n').trim().slice(0, max);
}

// Slurs and threats that never belong here. Matched on letters only, so spacing and symbols do not sneak them past.
const BLOCKED = ['nigger', 'nigga', 'faggot', 'kike', 'spic', 'chink', 'wetback', 'tranny', 'retard', 'killyourself', 'kys', 'iwillkillyou', 'gasthejews'];
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's', '!': 'i' };
export function blockedWord(s) {
  const words = String(s).toLowerCase().replace(/[013457@$!]/g, c => LEET[c]).split(/\s+/);
  const flat = words.join('').replace(/[^a-z]/g, '');
  const each = words.map(w => w.replace(/[^a-z]/g, ''));
  return BLOCKED.some(b => (b.length <= 5 ? each.includes(b) || each.includes(b + 's') : flat.includes(b)));
}

/** Why a post is refused, or '' when it may go up. */
export function postProblem({ body, title, needsTitle }) {
  if (body.length < 2) return 'Write a little more before posting.';
  if (needsTitle && title.length < 4) return 'Give your thread a title of a few words.';
  if (linkCount(body) + linkCount(title) > LIMITS.links) return `Posts can carry at most ${LIMITS.links} links.`;
  if (blockedWord(body) || blockedWord(title)) return 'That post has words we do not allow here. See the discussion rules.';
  if (/(.)\1{14,}/.test(body)) return 'That post looks like spam.';
  return '';
}

/** Where a reply sits: its parent and depth, kept within MAX_DEPTH. */
export function placeReply(parent) {
  if (!parent) return { parent: null, depth: 0, mention: '' };
  if (parent.depth >= MAX_DEPTH) return { parent: parent.parent, depth: MAX_DEPTH, mention: `@${parent.name} ` };
  return { parent: parent.id, depth: parent.depth + 1, mention: '' };
}

const randomId = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(9)))).replace(/\+/g, '-').replace(/\//g, '_');
const sha = async s => btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))))).slice(0, 22);

// ---------- storage ----------

export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, thread TEXT NOT NULL, root TEXT NOT NULL, parent TEXT, depth INTEGER NOT NULL DEFAULT 0,
    member_id TEXT NOT NULL, name TEXT NOT NULL, title TEXT, body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'ok', helpful INTEGER NOT NULL DEFAULT 0,
    replies INTEGER NOT NULL DEFAULT 0, reports INTEGER NOT NULL DEFAULT 0, featured INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')), last_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE INDEX IF NOT EXISTS posts_thread ON posts (thread, depth, last_at)`,
  `CREATE INDEX IF NOT EXISTS posts_root ON posts (root)`,
  `CREATE INDEX IF NOT EXISTS posts_member ON posts (member_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS posts_new ON posts (created_at)`,
  `CREATE TABLE IF NOT EXISTS post_votes (post_id TEXT NOT NULL, member_id TEXT NOT NULL, PRIMARY KEY (post_id, member_id))`,
  `CREATE TABLE IF NOT EXISTS post_reports (post_id TEXT NOT NULL, member_id TEXT NOT NULL, reason TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (post_id, member_id))`,
  `CREATE TABLE IF NOT EXISTS discuss_blocks (member_id TEXT PRIMARY KEY, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS reply_alerts (member_id TEXT PRIMARY KEY, email TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS mail_queue (id INTEGER PRIMARY KEY AUTOINCREMENT, to_email TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')), sent_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS post_hides (post_id TEXT NOT NULL, member_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (post_id, member_id))`,
  `CREATE TABLE IF NOT EXISTS theory_votes (page TEXT NOT NULL, voter TEXT NOT NULL, vote TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (page, voter))`,
  `CREATE TABLE IF NOT EXISTS reader_blocks (member_id TEXT NOT NULL, blocked TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (member_id, blocked))`,
  // Rank badges read the found counter from member perks; same table as migrations/0002_member_saves.sql, made here too so
  // the boards work even before that migration has run.
  `CREATE TABLE IF NOT EXISTS saves (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, data TEXT NOT NULL, updated INTEGER NOT NULL)`,
];
const ready = new WeakSet();   // databases whose tables are made (one per binding)
async function store(env) {
  const d = env.DB;
  if (!ready.has(d)) { await d.batch(SCHEMA.map(s => d.prepare(s))); ready.add(d); }
  return d;
}

// "Delete my account" (./auth.js) runs these before it removes the member, so nothing kept for the person stays
// behind (privacy page: "delete your account and everything kept for it"). ?1 is the member id. A post that others
// replied to keeps its place, emptied and unlinked, so the replies still make sense; every other post is emptied and
// removed. Their Helpful marks come off the counts, and queued or sent emails to their addresses are dropped.
export const FORGET = [
  'UPDATE posts SET helpful = MAX(helpful - 1, 0) WHERE id IN (SELECT post_id FROM post_votes WHERE member_id = ?1)',
  'DELETE FROM post_votes WHERE member_id = ?1 OR post_id IN (SELECT id FROM posts WHERE member_id = ?1)',
  'DELETE FROM post_reports WHERE member_id = ?1 OR post_id IN (SELECT id FROM posts WHERE member_id = ?1)',
  'DELETE FROM post_hides WHERE member_id = ?1 OR post_id IN (SELECT id FROM posts WHERE member_id = ?1)',
  'DELETE FROM reader_blocks WHERE member_id = ?1',
  `UPDATE posts SET status = CASE WHEN EXISTS (SELECT 1 FROM posts c WHERE c.parent = posts.id AND c.status = 'ok') THEN status ELSE 'removed' END,
    body = '[deleted by its writer]', title = CASE WHEN title IS NULL THEN NULL ELSE '[deleted]' END, name = 'Deleted', helpful = 0, reports = 0, member_id = ''
    WHERE member_id = ?1`,
  'DELETE FROM mail_queue WHERE to_email IN (SELECT email FROM reply_alerts WHERE member_id = ?1)',
  'DELETE FROM reply_alerts WHERE member_id = ?1',
  'DELETE FROM discuss_blocks WHERE member_id = ?1',
];
export async function forgetStatements(env, id) {
  const d = await store(env);
  return FORGET.map(s => d.prepare(s).bind(id));
}

const json = (body, init = {}) => Response.json(body, { ...init, headers: { 'cache-control': 'no-store', ...(init.headers || {}) } });
const oops = (msg, status = 400) => json({ error: msg }, { status });
const mods = env => String(env.MOD_MEMBERS || '').split(',').map(s => s.trim()).filter(Boolean);
const isMod = (env, m) => !!m && mods(env).includes(m.id);
// how many hidden details the writer has found (member perks), for the rank badge beside their name
const READ_N = "(SELECT COUNT(*) FROM saves s, json_each(s.data, '$.found') WHERE s.user_id = p.member_id)";
const HIDES = '(SELECT COUNT(*) FROM post_hides h WHERE h.post_id = p.id)';
// "by" is a one-way key for the writer, so Block works without showing anyone's account id
const byKey = new Map();
async function keyFor(id) { if (!byKey.has(id)) byKey.set(id, (await sha('by:' + id)).slice(0, 16)); return byKey.get(id); }
async function withKeys(rows) { for (const r of rows) r.by = await keyFor(r.member_id); return rows; }
const shown = (r, me, env) => ({ id: r.id, by: r.by, hides: r.hides || 0, folded: (r.hides || 0) >= hideAt(env), hidByMe: !!r.hid, root: r.root, parent: r.parent, depth: r.depth, name: r.name, title: r.title, body: r.body, helpful: r.helpful,
  replies: r.replies, at: r.created_at, last: r.last_at, read: r.read_n || 0, featured: !!r.featured, mine: !!me && r.member_id === me.id,
  held: r.status === 'held', voted: !!r.voted, thread: r.thread });

async function alertOps(env, d, text) {
  if (!env.NTFY_TOPIC) return;
  await fetch(`https://ntfy.sh/${env.NTFY_TOPIC}`, { method: 'POST', body: text.slice(0, 300), headers: { title: 'MCU Easter Eggs boards' } }).catch(() => {});
}

/** Which sender is set up: 'brevo' (BREVO_API_KEY, free plan, 300 a day), else 'resend' (RESEND_API_KEY), else ''. */
export function mailSender(env) {
  return env.BREVO_API_KEY ? 'brevo' : env.RESEND_API_KEY ? 'resend' : '';
}

/** The send request for one email as [url, init], or null when no sender is set up (pure, tested). */
export function mailRequest(env, to, subject, body) {
  const from = (env.MAIL_FROM || 'MCU Easter Eggs <replies@mcueastereggs.com>').trim();
  const kind = mailSender(env);
  if (kind === 'brevo') {
    const m = from.match(/^(.*?)\s*<([^>]+)>$/);
    return ['https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: m ? { name: m[1], email: m[2] } : { email: from }, to: [{ email: to }], subject, textContent: body }),
    }];
  }
  if (kind === 'resend') return ['https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, text: body }),
  }];
  return null;
}

/** Send one email through Brevo or Resend (mailSender); with neither set up it waits in mail_queue until a sender exists. */
export async function sendMail(env, d, to, subject, body) {
  const r = await d.prepare('INSERT INTO mail_queue (to_email, subject, body) VALUES (?, ?, ?) RETURNING id').bind(to, subject, body).first();
  const req = mailRequest(env, to, subject, body);
  if (!req) return false;
  const res = await fetch(...req).catch(() => null);
  if (res?.ok) await d.prepare("UPDATE mail_queue SET sent_at = datetime('now') WHERE id = ?").bind(r.id).run();
  return !!res?.ok;
}

/** Cloudflare Turnstile check, only when TURNSTILE_SECRET is set (free; keys in RUNBOOK.md). */
export async function humanCheck(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return true;
  if (typeof token !== 'string' || !token || token.length > 2048) return false;
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET); form.append('response', token);
  if (ip) form.append('remoteip', ip);
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form }).then(x => x.json()).catch(() => null);
  return !!r?.success;
}

/** The signed-in person (id, name, created) from the session cookie, or null. */
async function who(d, token) {
  if (!token) return null;
  return (await d.prepare('SELECT u.id, u.name, u.created FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.hash = ? AND s.expires > ?')
    .bind(await hashToken(token), Date.now()).first()) || null;
}

// ---------- routes ----------

export async function handleDiscuss(req, env, url, ctx) {
  const path = url.pathname;
  const mine = path === '/api/discuss' || path.startsWith('/api/discuss/') || path === '/api/vote';
  if (!mine) return null;
  if (!env.DB) return new Response('boards are off', { status: 503 });
  if (req.method === 'POST') {
    const origin = req.headers.get('origin');
    if (origin && origin !== url.origin) return new Response('wrong origin', { status: 403 });
    if (Number(req.headers.get('content-length') || 0) > 20000) return new Response('too big', { status: 413 });
  }
  const d = await store(env);
  const me = await who(d, readCookie(req.headers.get('cookie'), SESSION));
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};

  // ----- "Do you buy it?" on fan theory pages (ADR-018; anyone, one vote per device per theory, like Credible
  // Theories' "Credible or not?"). The browser keeps a random id; only a scrambled form of it is stored. -----
  if (path === '/api/vote') {
    const page = String(body.p ?? url.searchParams.get('p') ?? '');
    if (!/^theories\/[a-z0-9-]{1,80}$/.test(page)) return oops('bad page');
    const voterRaw = String(body.voter ?? url.searchParams.get('v') ?? '');
    const voter = /^[\w-]{16,64}$/.test(voterRaw) ? await sha(voterRaw) : '';
    if (req.method === 'POST') {
      if (!voter || !VOTES.includes(body.v)) return oops('bad vote');
      await d.prepare('INSERT INTO theory_votes (page, voter, vote) VALUES (?, ?, ?) ON CONFLICT (page, voter) DO UPDATE SET vote = excluded.vote').bind(page, voter, body.v).run();
    } else if (req.method !== 'GET') return new Response('not found', { status: 404 });
    const rows = (await d.prepare('SELECT vote, COUNT(*) AS n FROM theory_votes WHERE page = ? GROUP BY vote').bind(page).all()).results;
    const mineV = voter ? (await d.prepare('SELECT vote FROM theory_votes WHERE page = ? AND voter = ?').bind(page, voter).first())?.vote || null : null;
    return json({ counts: Object.fromEntries(VOTES.map(v => [v, rows.find(r => r.vote === v)?.n || 0])), mine: mineV });
  }

  // ----- reading -----
  if (path === '/api/discuss' && req.method === 'GET') {
    const root = url.searchParams.get('root');
    const sort = url.searchParams.get('sort') === 'new' ? 'p.created_at DESC' : 'p.helpful DESC, p.created_at DESC';
    const vis = "(p.status = 'ok' OR (p.status = 'held' AND p.member_id = ?2))";
    const sel = `SELECT p.*, ${READ_N} AS read_n, ${HIDES} AS hides, (SELECT 1 FROM post_votes v WHERE v.post_id = p.id AND v.member_id = ?2) AS voted,
      (SELECT 1 FROM post_hides h WHERE h.post_id = p.id AND h.member_id = ?2) AS hid FROM posts p`;
    let rows;
    if (root) {
      if (!/^[\w-]{6,20}$/.test(root)) return oops('bad thread');
      rows = (await d.prepare(`${sel} WHERE p.root = ?1 AND ${vis} ORDER BY p.created_at LIMIT 500`).bind(root, me?.id || '').all()).results;
      if (!rows.some(r => r.id === root)) return oops('This thread was removed or does not exist.', 404);
    } else {
      const t = cleanThread(url.searchParams.get('t'));
      if (!t) return oops('bad thread');
      rows = t.startsWith('b:')
        ? (await d.prepare(`${sel} WHERE p.thread = ?1 AND p.depth = 0 AND ${vis} ORDER BY ${url.searchParams.get('sort') === 'new' ? 'p.created_at DESC' : 'p.last_at DESC'} LIMIT 200`).bind(t, me?.id || '').all()).results
        : (await d.prepare(`${sel} WHERE p.thread = ?1 AND ${vis} ORDER BY ${sort} LIMIT 500`).bind(t, me?.id || '').all()).results;
    }
    const blocks = me ? (await d.prepare('SELECT blocked FROM reader_blocks WHERE member_id = ?').bind(me.id).all()).results.map(b => b.blocked) : [];
    await withKeys(rows);
    return json({ me: me ? { id: me.id, name: me.name, mod: isMod(env, me), by: await keyFor(me.id), blocks } : null, hideAt: hideAt(env),
      turnstile: env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET ? env.TURNSTILE_SITE_KEY : '', posts: rows.map(r => shown(r, me, env)) });
  }
  if (path === '/api/discuss/recent' && req.method === 'GET') {
    const rows = (await d.prepare(`SELECT p.*, ${READ_N} AS read_n, (SELECT title FROM posts r WHERE r.id = p.root) AS root_title FROM posts p
      WHERE p.status = 'ok' AND ${HIDES} < ? ORDER BY p.created_at DESC LIMIT 20`).bind(hideAt(env)).all()).results;
    await withKeys(rows);
    return json({ posts: rows.map(r => ({ ...shown(r, me, env), rootTitle: r.root_title })) });
  }
  if (path === '/api/discuss/counts' && req.method === 'GET') {
    const rows = (await d.prepare(`SELECT thread, SUM(depth = 0) AS threads, COUNT(*) AS posts, MAX(created_at) AS last FROM posts p WHERE status = 'ok' AND thread LIKE 'b:%' AND ${HIDES} < ? GROUP BY thread`).bind(hideAt(env)).all()).results;
    return json({ boards: Object.fromEntries(rows.map(r => [r.thread.slice(2), { threads: r.threads, posts: r.posts, last: r.last }])) });
  }

  if (req.method !== 'POST' && !(path === '/api/discuss/alerts' || path === '/api/discuss/mod')) return new Response('not found', { status: 404 });
  if (!me) return oops('Sign in to join the discussion.', 401);

  // ----- posting -----
  if (path === '/api/discuss') {
    if (await d.prepare('SELECT 1 FROM discuss_blocks WHERE member_id = ?').bind(me.id).first()) return oops('Your account cannot post here. Write to us on the contact page if you think that is a mistake.', 403);
    const recent = await d.prepare("SELECT SUM(created_at > datetime('now', '-10 minutes')) AS ten, COUNT(*) AS day FROM posts WHERE member_id = ? AND created_at > datetime('now', '-1 day')").bind(me.id).first();
    if ((recent?.ten || 0) >= LIMITS.perTen || (recent?.day || 0) >= LIMITS.perDay) return oops('You are posting fast. Take a short break and try again in a few minutes.', 429);
    let parent = null, t;
    if (body.parent) {
      parent = await d.prepare("SELECT * FROM posts WHERE id = ? AND status IN ('ok', 'held')").bind(String(body.parent)).first();
      if (!parent) return oops('That post is gone, so you cannot reply to it.', 404);
      t = parent.thread;
    } else {
      t = cleanThread(body.t);
      if (!t) return oops('bad thread');
      if (t.startsWith('p:')) {   // only real pages on this site get a discussion
        const page = await env.ASSETS.fetch(new Request(`${url.origin}/${t.slice(2)}`, { method: 'HEAD', redirect: 'manual' })).catch(() => null);
        if (!page || page.status >= 400) return oops('bad thread');   // Pages answers /upcoming with a redirect to /upcoming/
      }
    }
    const bot = botSign(body);
    if (bot) { ctx?.waitUntil(alertOps(env, d, `Spam post stopped (${bot}).`)); return oops('That post looks like spam. If you are a person, wait a moment and tap Post again.'); }
    if (!(await humanCheck(env, body.cf, req.headers.get('cf-connecting-ip')))) return oops('The quick spam check did not finish. Tap Post again.', 403);
    const place = placeReply(parent);
    const needsTitle = !parent && t.startsWith('b:');
    const title = needsTitle ? cleanText(body.title, LIMITS.title).replace(/\n/g, ' ') : null;
    const text = cleanText(body.body, LIMITS.body);
    const problem = postProblem({ body: text, title: title || '', needsTitle });
    if (problem) return oops(problem);
    const lately = (await d.prepare("SELECT body FROM posts WHERE member_id = ? AND created_at > datetime('now', '-1 day') AND status != 'removed' ORDER BY created_at DESC LIMIT 40").bind(me.id).all()).results;
    if (lately.some(r => sameText(r.body) === sameText(place.mention + text))) return oops('You already posted that. Add something new, or edit your words a little.');
    const fresh = Number(me.created) > Date.now() - 86400000;
    const status = fresh && linkCount(text) ? 'held' : 'ok';   // a brand-new member's first links wait for a moderator
    const id = randomId();
    const root = parent ? parent.root : id;
    const stmts = [d.prepare('INSERT INTO posts (id, thread, root, parent, depth, member_id, name, title, body, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, t, root, place.parent, place.depth, me.id, me.name, title, place.mention + text, status)];
    if (parent && status === 'ok') {
      stmts.push(d.prepare("UPDATE posts SET replies = replies + 1, last_at = datetime('now') WHERE id = ?").bind(root));
      if (place.parent && place.parent !== root) stmts.push(d.prepare('UPDATE posts SET replies = replies + 1 WHERE id = ?').bind(place.parent));
    }
    await d.batch(stmts);
    if (status === 'held') ctx?.waitUntil(alertOps(env, d, `New member post waiting for review: ${text.slice(0, 200)}`));
    // email the person being answered, when they asked for reply alerts
    if (parent && status === 'ok' && parent.member_id !== me.id) {
      const a = await d.prepare('SELECT email FROM reply_alerts WHERE member_id = ?').bind(parent.member_id).first();
      if (a?.email) {
        const where = t.startsWith('p:') ? `${url.origin}/${t.slice(2)}#c-${id}` : `${url.origin}/boards/thread?id=${root}#c-${id}`;
        const msg = `${me.name} replied to your post on MCU Easter Eggs:\n\n"${text.slice(0, 600)}"\n\nRead and answer: ${where}\n\nTurn these emails off on your account page: ${url.origin}/account#alerts`;
        ctx?.waitUntil(sendMail(env, d, a.email, `${me.name} replied to you on MCU Easter Eggs`, msg));
      }
    }
    const row = await d.prepare(`SELECT p.*, ${READ_N} AS read_n FROM posts p WHERE p.id = ?`).bind(id).first();
    await withKeys([row]);
    return json({ post: shown(row, me, env), held: status === 'held' });
  }

  if (path === '/api/discuss/hide') {
    const id = String(body.id || '');
    const p = await d.prepare("SELECT id, member_id, body FROM posts WHERE id = ? AND status = 'ok'").bind(id).first();
    if (!p) return json({ ok: true, hides: 0, folded: false });
    if (p.member_id === me.id) return oops('That is your own post. Use Delete instead.');
    if (body.on === false) await d.prepare('DELETE FROM post_hides WHERE post_id = ? AND member_id = ?').bind(id, me.id).run();
    else {
      const r = await d.prepare('INSERT OR IGNORE INTO post_hides (post_id, member_id) VALUES (?, ?)').bind(id, me.id).run();
      if (r.meta?.changes) {
        const n = (await d.prepare('SELECT COUNT(*) AS n FROM post_hides WHERE post_id = ?').bind(id).first()).n;
        if (n === hideAt(env)) ctx?.waitUntil(alertOps(env, d, `A post moved to Hidden after ${n} readers hid it: ${p.body.slice(0, 200)}`));
      }
    }
    const n = (await d.prepare('SELECT COUNT(*) AS n FROM post_hides WHERE post_id = ?').bind(id).first()).n;
    return json({ ok: true, hides: n, folded: n >= hideAt(env), hidByMe: body.on !== false });
  }

  if (path === '/api/discuss/block') {
    const by = String(body.by || '');
    if (!/^[\w-]{16}$/.test(by)) return oops('bad person');
    if (by === await keyFor(me.id)) return oops('You cannot block yourself.');
    if (body.on === false) await d.prepare('DELETE FROM reader_blocks WHERE member_id = ? AND blocked = ?').bind(me.id, by).run();
    else await d.prepare('INSERT OR IGNORE INTO reader_blocks (member_id, blocked) VALUES (?, ?)').bind(me.id, by).run();
    const blocks = (await d.prepare('SELECT blocked FROM reader_blocks WHERE member_id = ?').bind(me.id).all()).results.map(b => b.blocked);
    return json({ ok: true, blocks });
  }

  if (path === '/api/discuss/helpful') {
    const id = String(body.id || '');
    const p = await d.prepare("SELECT id, member_id FROM posts WHERE id = ? AND status = 'ok'").bind(id).first();
    if (!p) return oops('That post is gone.', 404);
    if (p.member_id === me.id) return oops('You cannot mark your own post helpful.');
    const had = await d.prepare('SELECT 1 FROM post_votes WHERE post_id = ? AND member_id = ?').bind(id, me.id).first();
    await d.batch(had
      ? [d.prepare('DELETE FROM post_votes WHERE post_id = ? AND member_id = ?').bind(id, me.id), d.prepare('UPDATE posts SET helpful = helpful - 1 WHERE id = ?').bind(id)]
      : [d.prepare('INSERT INTO post_votes (post_id, member_id) VALUES (?, ?)').bind(id, me.id), d.prepare('UPDATE posts SET helpful = helpful + 1 WHERE id = ?').bind(id)]);
    const n = await d.prepare('SELECT helpful FROM posts WHERE id = ?').bind(id).first();
    return json({ helpful: n.helpful, voted: !had });
  }

  if (path === '/api/discuss/report') {
    const id = String(body.id || '');
    const reason = ['spam', 'abuse', 'false', 'other'].includes(body.reason) ? body.reason : 'other';
    const p = await d.prepare("SELECT id, body, member_id FROM posts WHERE id = ? AND status = 'ok'").bind(id).first();
    if (!p || p.member_id === me.id) return json({ ok: true });
    const r = await d.prepare('INSERT OR IGNORE INTO post_reports (post_id, member_id, reason) VALUES (?, ?, ?)').bind(id, me.id, reason).run();
    if (r.meta?.changes) {   // a report also hides the post for the reporter, and counts toward folding it for everyone
      await d.batch([d.prepare('UPDATE posts SET reports = reports + 1 WHERE id = ?').bind(id),
        d.prepare('INSERT OR IGNORE INTO post_hides (post_id, member_id) VALUES (?, ?)').bind(id, me.id)]);
      ctx?.waitUntil(alertOps(env, d, `Post reported (${reason}): ${p.body.slice(0, 200)}`));
    }
    const n = (await d.prepare('SELECT COUNT(*) AS n FROM post_hides WHERE post_id = ?').bind(id).first()).n;
    return json({ ok: true, hides: n, folded: n >= hideAt(env), hidByMe: true });
  }

  if (path === '/api/discuss/delete') {
    const p = await d.prepare('SELECT * FROM posts WHERE id = ?').bind(String(body.id || '')).first();
    if (!p || (p.member_id !== me.id && !isMod(env, me))) return oops('You can delete only your own posts.', 403);
    // a post with replies keeps its place so the replies still make sense
    const kids = await d.prepare("SELECT 1 FROM posts WHERE parent = ? AND status = 'ok'").bind(p.id).first();
    if (kids) await d.prepare("UPDATE posts SET body = '[deleted by its writer]', title = CASE WHEN title IS NULL THEN NULL ELSE '[deleted]' END, name = 'Deleted' WHERE id = ?").bind(p.id).run();
    else await d.prepare("UPDATE posts SET status = 'removed' WHERE id = ?").bind(p.id).run();
    return json({ ok: true });
  }

  if (path === '/api/discuss/alerts') {
    if (req.method === 'GET') {
      const a = await d.prepare('SELECT email FROM reply_alerts WHERE member_id = ?').bind(me.id).first();
      return json({ on: !!a, email: a?.email || '' });
    }
    if (body.on !== true) {
      await d.prepare('DELETE FROM reply_alerts WHERE member_id = ?').bind(me.id).run();
      return json({ on: false, email: '' });
    }
    const email = typeof body.email === 'string' ? body.email.trim().slice(0, 200) : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return oops('That email address does not look right.');
    await d.prepare('INSERT INTO reply_alerts (member_id, email) VALUES (?, ?) ON CONFLICT (member_id) DO UPDATE SET email = excluded.email').bind(me.id, email).run();
    return json({ on: true, email });
  }

  if (path === '/api/discuss/mod') {
    if (!isMod(env, me)) return json({ mod: false, you: me.id });
    if (req.method === 'GET') {
      const rows = (await d.prepare(`SELECT p.*, 0 AS read_n, ${HIDES} AS hides FROM posts p WHERE p.status IN ('held', 'hidden') OR p.reports > 0 OR ${HIDES} > 0
        OR p.thread = 'b:fan-theories' AND p.depth = 0 ORDER BY p.status = 'ok', ${HIDES} DESC, p.created_at DESC LIMIT 200`).all()).results;
      await withKeys(rows);
      const blocked = (await d.prepare('SELECT b.member_id, u.name FROM discuss_blocks b LEFT JOIN users u ON u.id = b.member_id').all()).results;
      const queued = await d.prepare('SELECT COUNT(*) AS n FROM mail_queue WHERE sent_at IS NULL').first();
      return json({ mod: true, you: me.id, hideAt: hideAt(env), posts: rows.map(r => ({ ...shown(r, me, env), status: r.status, reports: r.reports, member: r.member_id })), blocked, unsentMail: queued.n, mailOn: !!mailSender(env) });
    }
    const id = String(body.id || '');
    const act = {
      hide: ["UPDATE posts SET status = 'hidden' WHERE id = ?"], show: ["UPDATE posts SET status = 'ok', reports = 0 WHERE id = ?", 'DELETE FROM post_hides WHERE post_id = ?'],
      remove: ["UPDATE posts SET status = 'removed' WHERE id = ?"], feature: ['UPDATE posts SET featured = 1 WHERE id = ?'], unfeature: ['UPDATE posts SET featured = 0 WHERE id = ?'],
      block: ['INSERT OR IGNORE INTO discuss_blocks (member_id) VALUES (?)', "UPDATE posts SET status = 'hidden' WHERE member_id = ? AND status IN ('ok', 'held')"],
      unblock: ['DELETE FROM discuss_blocks WHERE member_id = ?'],
    }[body.action];
    if (!act) return oops('unknown action');
    let target = id;
    if (body.action === 'block' || body.action === 'unblock') {
      target = body.member ? String(body.member) : (await d.prepare('SELECT member_id FROM posts WHERE id = ?').bind(id).first())?.member_id;
      if (!target) return oops('no such member');
    }
    await d.batch(act.map(s => d.prepare(s).bind(target)));
    return json({ ok: true });
  }

  return new Response('not found', { status: 404 });
}
