// GET /api/sync: the signed-in person's member perks (saved list, seen movies,
// favorites, found details, rank, spoiler setting).
// PUT /api/sync { data }: merges this device's copy into the account's (union
// of lists, newest change wins per item, settings last-write-wins) and returns
// the result, which the device then keeps. Sign-in itself is
// functions/_lib/auth.js; this uses its session lookup.
import { merge, sanitize, compact, byteSize, MAX_BYTES } from '../../public/js/members-core.js';
import { who, readCookie, SESSION } from '../_lib/auth.js';

const json = (body, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } });

async function load(db, userId) {
  const row = await db.prepare('SELECT data, updated FROM saves WHERE user_id = ?').bind(userId).first();
  if (!row) return { data: null, updatedAt: 0 };
  try {
    return { data: sanitize(JSON.parse(row.data)), updatedAt: row.updated };
  } catch {
    return { data: null, updatedAt: 0 };
  }
}

const signedIn = (request, env) => (env.DB ? who(env.DB, readCookie(request.headers.get('cookie'), SESSION)) : null);

export async function onRequestGet({ request, env }) {
  const user = await signedIn(request, env);
  if (!user) return json({ error: 'Not signed in.' }, 401);
  return json(await load(env.DB, user.id));
}

export async function onRequestPut({ request, env }) {
  // Only our own pages may write: JSON (which a plain form on another site
  // can't send) and, when the browser says, from this site.
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'Wrong origin.' }, 403);
  if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) return json({ error: 'Send JSON.' }, 415);
  const user = await signedIn(request, env);
  if (!user) return json({ error: 'Not signed in.' }, 401);
  const text = await request.text();
  if (text.length > MAX_BYTES * 2) return json({ error: 'Too much data.' }, 413);
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: 'Bad request.' }, 400);
  }
  const now = Date.now();
  const stored = await load(env.DB, user.id);
  const incoming = body && body.data;
  const merged = compact(stored.data ? merge(stored.data, incoming) : sanitize(incoming), now);
  if (byteSize(merged) > MAX_BYTES) return json({ error: 'Your list is full (16 KB). Remove a few saved items.' }, 413);
  await env.DB.prepare(
    'INSERT INTO saves (user_id, data, updated) VALUES (?, ?, ?) ON CONFLICT (user_id) DO UPDATE SET data = excluded.data, updated = excluded.updated',
  )
    .bind(user.id, JSON.stringify(merged), now)
    .run();
  return json({ data: merged, updatedAt: now });
}
