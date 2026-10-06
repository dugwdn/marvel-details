// POST /api/auth/delete: deletes the account, its sessions and its synced
// list from the database. The copy on this device is left for the visitor.
import { json, writeAllowed, currentUser, clearCookie } from '../../../lib/members-server.js';

export async function onRequestPost({ request, env }) {
  if (!writeAllowed(request)) return json({ error: 'Bad request.' }, 403);
  const user = await currentUser(request, env);
  if (!user) return json({ error: 'Not signed in.' }, 401, { 'set-cookie': clearCookie() });
  await env.DB.batch([
    env.DB.prepare('DELETE FROM saves WHERE user_id = ?1').bind(user.userId),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?1').bind(user.userId),
    env.DB.prepare('DELETE FROM users WHERE id = ?1').bind(user.userId),
  ]);
  return json({ deleted: true, signedIn: false }, 200, { 'set-cookie': clearCookie() });
}
