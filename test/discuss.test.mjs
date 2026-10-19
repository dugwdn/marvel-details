// Discussions and message boards (ADR-015). Run: node --test test/
// Pure helpers, then the whole /api/discuss handler against a stand-in for D1 built on Node's own SQLite.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { cleanThread, linkCount, cleanText, blockedWord, postProblem, placeReply, BOARDS, MAX_DEPTH, hideAt, sameText, botSign, mailRequest, mailSender, handleDiscuss } from '../functions/_lib/discuss.js';
import { handleAuth, hashToken, SESSION } from '../functions/_lib/auth.js';
import { discussFor, starterFor, addDiscussion } from '../tools/menu.mjs';

test('thread keys: our pages and boards only', () => {
  assert.equal(cleanThread('p:articles/iron-man-2-green-drink'), 'p:articles/iron-man-2-green-drink');
  assert.equal(cleanThread('p:upcoming'), 'p:upcoming');
  assert.equal(cleanThread('p:../secret'), '');
  assert.equal(cleanThread('p:articles/x.html'), '');
  assert.equal(cleanThread('p:articles//x'), '');
  assert.equal(cleanThread('p:https://evil.com'), '');
  assert.equal(cleanThread('b:fan-theories'), 'b:fan-theories');
  assert.equal(cleanThread('b:made-up-board'), '');
  assert.equal(cleanThread(42), '');
  const boards = JSON.parse(fs.readFileSync(new URL('../public/data/boards.json', import.meta.url))).boards.map(b => b.slug);
  assert.deepEqual(BOARDS, boards, 'BOARDS in functions/_lib/discuss.js must match public/data/boards.json');
  for (const b of boards) assert.ok(fs.existsSync(new URL(`../public/boards/${b}.html`, import.meta.url)), `run node tools/build-boards.mjs (${b})`);
});

test('post checks: links, blocked words, spam signs', () => {
  assert.equal(linkCount('see https://a.com and www.b.com and http://c'), 3);
  assert.equal(cleanText('  hi\u0000 there\r\n\n\n\n\nend  ', 100), 'hi there\n\n\nend');
  assert.ok(blockedWord('you r3tard'));
  assert.ok(!blockedWord('the spice trade'));
  assert.equal(postProblem({ body: 'ok then', title: '', needsTitle: false }), '');
  assert.match(postProblem({ body: 'fine body', title: 'no', needsTitle: true }), /title/);
  assert.match(postProblem({ body: 'http://a http://b http://c', title: '', needsTitle: false }), /2 links/);
  assert.deepEqual(placeReply({ id: 'a', depth: MAX_DEPTH, parent: 'p', name: 'Ann' }), { parent: 'p', depth: MAX_DEPTH, mention: '@Ann ' });
  assert.equal(hideAt({}), 5);
  assert.equal(hideAt({ HIDE_THRESHOLD: '1' }), 2, 'one reader can never fold a post for everyone');
  assert.equal(sameText('Great  find!!'), sameText('great find'));
  assert.equal(botSign({ website: 'http://spam' }), 'honeypot');
  assert.equal(botSign({ ms: 300 }), 'too fast');
  assert.equal(botSign({ ms: 9000, website: '' }), '');
});

test('which pages get a discussion, and its opening question', () => {
  assert.equal(discussFor('articles/iron-man-2-green-drink.html'), 'articles/iron-man-2-green-drink');
  assert.equal(discussFor('characters/thor.html'), 'characters/thor');
  assert.equal(discussFor('callbacks/callback-cb-001.html'), 'callbacks/callback-cb-001');
  assert.equal(discussFor('upcoming/index.html'), 'upcoming');
  for (const no of ['index.html', 'articles/index.html', 'characters/all/index.html', 'privacy.html', 'account.html', 'map/index.html', 'me/index.html', 'boards/index.html']) assert.equal(discussFor(no), '', no);
  assert.equal(starterFor('<h1>What Is the Green Drink?</h1>'), 'What Is the Green Drink? What do you think?');
  assert.equal(starterFor('<title>Thor Odinson | MCU Easter Eggs</title>'), 'What are your thoughts about Thor Odinson?');
  const page = '<html><head></head><body><h1>Loki</h1>\n    <footer>f</footer>\n</body></html>';
  const once = addDiscussion(page, 'characters/loki.html');
  assert.equal(addDiscussion(once, 'characters/loki.html'), once, 'running menu.mjs twice changes nothing');
  assert.match(once, /data-thread="p:characters\/loki"[\s\S]*<footer>/);
  assert.match(once, /\/css\/discuss\.css/);
  assert.match(once, /\/js\/discuss\.js/);
  // every page that should have one, has one
  const root = new URL('../public/', import.meta.url);
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(new URL(e.name + '/', d)) : [new URL(e.name, d)]));
  let n = 0;
  for (const f of walk(root).filter(u => u.pathname.endsWith('.html'))) {
    const rel = f.pathname.slice(root.pathname.length);
    const html = fs.readFileSync(f, 'utf8');
    const key = discussFor(rel);
    if (key) { n++; assert.ok(html.includes(`data-thread="p:${key}"`), `${rel}: run node tools/menu.mjs`); }
    else assert.ok(!html.includes('id="discuss"'), `${rel} should not have a discussion`);
  }
  assert.ok(n > 70, `${n} pages with a discussion`);
});

// ---------- the handler, end to end ----------
function fakeD1() {
  const db = new DatabaseSync(':memory:');
  const dir = new URL('../migrations/', import.meta.url);
  for (const f of fs.readdirSync(dir).filter(n => n.endsWith('.sql')).sort()) db.exec(fs.readFileSync(new URL(f, dir), 'utf8'));
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => { const r = db.prepare(sql).run(...args); return { meta: { changes: r.changes } }; },
  });
  return { prepare: sql => stmt(sql), batch: async list => { const out = []; for (const s of list) out.push(await s.run()); return out; }, raw: db };
}
const ORIGIN = 'https://mcueastereggs.com';
const ASSETS = { fetch: async r => new Response(null, { status: new URL(r.url).pathname.startsWith('/characters/') ? 200 : 404 }) };

async function setup(env = {}) {
  const DB = fakeD1();
  const people = {};
  for (const [name, age] of [['Ann', 0], ['Bo', 0], ['Cy', 0], ['Dee', 0], ['Eve', 0], ['Fay', 0], ['New', 1]]) {
    const id = name.toLowerCase();
    const created = age ? Date.now() : Date.now() - 7 * 86400000;
    DB.raw.prepare('INSERT INTO users (id, provider, sub, name, created) VALUES (?, ?, ?, ?, ?)').run(id, 'google', id, name, created);
    DB.raw.prepare('INSERT INTO sessions (hash, user_id, expires) VALUES (?, ?, ?)').run(await hashToken('tok-' + id), id, Date.now() + 86400000);
    people[id] = `${SESSION}=tok-${id}`;
  }
  const e = { DB, ASSETS, ...env };
  const call = async (path, { as, body, method } = {}) => {
    const init = { method: method || (body ? 'POST' : 'GET'), headers: { cookie: as ? people[as] : '', 'content-type': 'application/json', origin: ORIGIN } };
    if (body) init.body = JSON.stringify({ ms: 5000, ...body });
    const req = new Request(ORIGIN + path, init);
    const res = await handleDiscuss(req, e, new URL(req.url), { waitUntil() {} });
    return { status: res.status, ...(await res.json().catch(() => ({}))) };
  };
  return { e, call, people, DB };
}

test('read free, post signed in, reply, helpful, hide fold, block, report, delete', async () => {
  const { call } = await setup();
  const t = 'p:characters/thor';
  assert.equal((await call(`/api/discuss?t=${t}`)).posts.length, 0);
  assert.equal((await call('/api/discuss', { body: { t, body: 'hello' } })).status, 401, 'guests read but cannot post');
  assert.equal((await call('/api/discuss', { as: 'ann', body: { t: 'p:nowhere/at-all', body: 'hello' } })).status, 400, 'only real pages');
  const a = await call('/api/discuss', { as: 'ann', body: { t, body: 'Thor is worthy in Endgame.' } });
  assert.equal(a.status, 200);
  const r = await call('/api/discuss', { as: 'bo', body: { parent: a.post.id, body: 'Agreed, the hammer scene.' } });
  assert.equal(r.post.depth, 1);
  assert.equal((await call('/api/discuss', { as: 'bo', body: { parent: a.post.id, body: 'Agreed, the hammer scene!' } })).status, 400, 'duplicate post');
  assert.equal((await call('/api/discuss', { as: 'cy', body: { t, body: 'too quick', ms: 200 } })).status, 400, 'too fast');
  assert.equal((await call('/api/discuss/helpful', { as: 'bo', body: { id: a.post.id } })).helpful, 1);
  assert.equal((await call('/api/discuss/helpful', { as: 'ann', body: { id: a.post.id } })).status, 400, 'not your own');
  // five members hide Bo's reply: it folds for everyone
  for (const who of ['ann', 'cy', 'dee', 'eve']) await call('/api/discuss/hide', { as: who, body: { id: r.post.id } });
  let list = await call(`/api/discuss?t=${t}`);
  assert.equal(list.posts.find(p => p.id === r.post.id).folded, false);
  const last = await call('/api/discuss/report', { as: 'fay', body: { id: r.post.id, reason: 'spam' } });
  assert.equal(last.folded, true, 'a report counts as a hide');
  list = await call(`/api/discuss?t=${t}`);
  assert.equal(list.posts.find(p => p.id === r.post.id).folded, true);
  // block is per reader and keyed by a one-way id
  const by = list.posts.find(p => p.id === r.post.id).by;
  assert.notEqual(by, 'bo');
  assert.deepEqual((await call('/api/discuss/block', { as: 'cy', body: { by } })).blocks, [by]);
  assert.equal((await call('/api/discuss/delete', { as: 'cy', body: { id: a.post.id } })).status, 403, 'only your own');
  assert.equal((await call('/api/discuss/delete', { as: 'ann', body: { id: a.post.id } })).ok, true);
  assert.equal((await call(`/api/discuss?t=${t}`)).posts.find(p => p.id === a.post.id).body, '[deleted by its writer]', 'kept for its replies');
});

test('boards: threads need a title; new members\' links wait; moderators act', async () => {
  const { call, people } = await setup({ MOD_MEMBERS: 'dee' });
  assert.equal((await call('/api/discuss', { as: 'ann', body: { t: 'b:fan-theories', body: 'no title' } })).status, 400);
  const th = await call('/api/discuss', { as: 'ann', body: { t: 'b:fan-theories', title: 'Kang is the next Thanos', body: 'Here is why.' } });
  assert.equal(th.status, 200);
  assert.equal((await call('/api/discuss?root=' + th.post.id)).posts.length, 1);
  const held = await call('/api/discuss', { as: 'new', body: { t: 'b:general', title: 'Look at this', body: 'see https://example.com' } });
  assert.equal(held.held, true);
  assert.equal((await call('/api/discuss?t=b:general')).posts.length, 0, 'others do not see a held post');
  assert.equal((await call('/api/discuss/mod', { as: 'ann' })).mod, false);
  const q = await call('/api/discuss/mod', { as: 'dee' });
  assert.ok(q.posts.some(p => p.id === held.post.id));
  await call('/api/discuss/mod', { as: 'dee', body: { id: held.post.id, action: 'show' } });
  assert.equal((await call('/api/discuss?t=b:general')).posts.length, 1);
  await call('/api/discuss/mod', { as: 'dee', body: { id: th.post.id, action: 'block' } });
  assert.equal((await call('/api/discuss', { as: 'ann', body: { t: 'b:general', title: 'Again here', body: 'hello there' } })).status, 403);
  assert.ok(people.ann);
});

test('rank badge counts the writer\'s found details; posting from another site is refused', async () => {
  const { call, DB, e } = await setup();
  DB.raw.prepare('INSERT INTO saves (user_id, data, updated) VALUES (?, ?, ?)').run('ann', JSON.stringify({ found: { 'scene:a': 1, 'callback:b': 2, 'rabbit:c': 3 } }), 1);
  await call('/api/discuss', { as: 'ann', body: { t: 'p:characters/thor', body: 'found three' } });
  assert.equal((await call('/api/discuss?t=p:characters/thor')).posts[0].read, 3);
  const req = new Request(ORIGIN + '/api/discuss', { method: 'POST', headers: { origin: 'https://evil.example', cookie: `${SESSION}=tok-ann` }, body: '{}' });
  assert.equal((await handleDiscuss(req, e, new URL(req.url), {})).status, 403);
});

test('Delete my account removes posts, hides, blocks, reports and the reply-email address', async () => {
  const { call, DB, e, people } = await setup();
  const a = await call('/api/discuss', { as: 'ann', body: { t: 'p:characters/thor', body: 'mine with a reply' } });
  await call('/api/discuss', { as: 'bo', body: { parent: a.post.id, body: 'reply to Ann' } });
  await call('/api/discuss', { as: 'ann', body: { t: 'p:characters/thor', body: 'lonely post' } });
  await call('/api/discuss/alerts', { as: 'ann', body: { on: true, email: 'ann@example.com' } });
  await call('/api/discuss/report', { as: 'ann', body: { id: (await call('/api/discuss?t=p:characters/thor')).posts.find(p => p.name === 'Bo').id, reason: 'other' } });
  const res = await handleAuth(new Request(ORIGIN + '/api/auth/delete', { method: 'POST', headers: { cookie: people.ann, origin: ORIGIN } }), e);
  assert.equal(res.status, 204);
  const all = sql => DB.raw.prepare(sql).all();
  assert.equal(all("SELECT 1 FROM posts WHERE member_id = 'ann' OR name = 'Ann' OR body LIKE '%mine%' OR body LIKE '%lonely%'").length, 0);
  assert.equal(all("SELECT 1 FROM posts WHERE body = 'reply to Ann'").length, 1, 'other people\'s replies stay');
  assert.equal(all('SELECT 1 FROM reply_alerts').length, 0);
  assert.equal(all("SELECT 1 FROM post_reports WHERE member_id = 'ann'").length, 0);
  assert.equal(all("SELECT 1 FROM post_hides WHERE member_id = 'ann'").length, 0);
  assert.equal(all("SELECT 1 FROM users WHERE id = 'ann'").length, 0);
});

test('"Do you buy it?" on theory pages: anyone votes once per device, can change it, and sees the counts', async () => {
  const { call } = await setup();
  const p = 'theories/peter-parker-in-iron-man-2';
  const v1 = 'device-one-0123456789', v2 = 'device-two-0123456789';
  assert.deepEqual((await call(`/api/vote?p=${p}&v=${v1}`)).counts, { buy: 0, unsure: 0, no: 0 });
  assert.equal((await call('/api/vote', { body: { p, v: 'buy', voter: v1 } })).mine, 'buy');
  await call('/api/vote', { body: { p, v: 'no', voter: v2 } });
  const changed = await call('/api/vote', { body: { p, v: 'unsure', voter: v1 } });
  assert.deepEqual(changed.counts, { buy: 0, unsure: 1, no: 1 }, 'one vote per device; a new tap replaces it');
  assert.equal((await call('/api/vote', { body: { p: 'articles/x', v: 'buy', voter: v1 } })).status, 400, 'theory pages only');
  assert.equal((await call('/api/vote', { body: { p, v: 'maybe', voter: v1 } })).status, 400, 'known answers only');
  assert.equal((await call('/api/vote', { body: { p, v: 'buy', voter: 'short' } })).status, 400, 'needs a device id');
});

test('reply email request: Brevo first, Resend second, none queues', () => {
  const env = { BREVO_API_KEY: 'k', RESEND_API_KEY: 'r' };
  assert.equal(mailSender(env), 'brevo', 'Brevo wins when both keys are set');
  assert.equal(mailSender({ RESEND_API_KEY: 'r' }), 'resend');
  assert.equal(mailSender({}), '');
  assert.equal(mailRequest({}, 'a@b.co', 's', 'b'), null);
  const [url, init] = mailRequest(env, 'a@b.co', 'Hi', 'Body');
  assert.equal(url, 'https://api.brevo.com/v3/smtp/email');
  assert.equal(init.headers['api-key'], 'k');
  assert.deepEqual(JSON.parse(init.body), { sender: { name: 'MCU Easter Eggs', email: 'replies@mcueastereggs.com' }, to: [{ email: 'a@b.co' }], subject: 'Hi', textContent: 'Body' });
  assert.deepEqual(JSON.parse(mailRequest({ ...env, MAIL_FROM: 'x@y.co' }, 'a@b.co', 's', 'b')[1].body).sender, { email: 'x@y.co' });
  const [rurl, rinit] = mailRequest({ RESEND_API_KEY: 'r' }, 'a@b.co', 'Hi', 'Body');
  assert.equal(rurl, 'https://api.resend.com/emails');
  assert.equal(JSON.parse(rinit.body).from, 'MCU Easter Eggs <replies@mcueastereggs.com>');
});
