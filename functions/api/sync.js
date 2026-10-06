// GET /api/sync: the account's saved data.
// PUT /api/sync { data }: merges this device's data into the account's
// (union of lists, newest change wins per item, settings last-write-wins)
// and returns the result, which the device then keeps.
import { merge, sanitize, compact, byteSize, MAX_BYTES } from '../../public/js/members-core.js';
import { json, writeAllowed, currentUser } from '../../lib/members-server.js';

async function load(env, userId) {
  const row = await env.DB.prepare('SELECT data, updated_at FROM saves WHERE user_id = ?1').bind(userId).first();
  if (!row) return { data: null, updatedAt: 0 };
  try {
    return { data: sanitize(JSON.parse(row.data)), updatedAt: row.updated_at };
  } catch {
    return { data: null, updatedAt: 0 };
  }
}

export async function onRequestGet({ request, env }) {
  const user = await currentUser(request, env);
  if (!user) return json({ error: 'Not signed in.' }, 401);
  return json(await load(env, user.userId));
}

export async function onRequestPut({ request, env }) {
  if (!writeAllowed(request)) return json({ error: 'Bad request.' }, 403);
  const user = await currentUser(request, env);
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
  const stored = await load(env, user.userId);
  const merged = compact(stored.data ? merge(stored.data, body && body.data) : sanitize(body && body.data), now);
  if (byteSize(merged) > MAX_BYTES) return json({ error: 'Your list is full (16 KB). Remove a few saved items.' }, 413);
  await env.DB.prepare(
    `INSERT INTO saves (user_id, data, updated_at) VALUES (?1, ?2, ?3)
     ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
  )
    .bind(user.userId, JSON.stringify(merged), now)
    .run();
  return json({ data: merged, updatedAt: now });
}
