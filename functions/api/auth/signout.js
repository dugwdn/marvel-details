// POST /api/auth/signout: ends this session. The list stays on this device.
import { json, writeAllowed, readCookie, hashToken, clearCookie } from '../../../lib/members-server.js';

export async function onRequestPost({ request, env }) {
  if (!writeAllowed(request)) return json({ error: 'Bad request.' }, 403);
  const token = readCookie(request);
  if (token && env.DB) await env.DB.prepare('DELETE FROM sessions WHERE id = ?1').bind(await hashToken(token)).run();
  return json({ signedIn: false }, 200, { 'set-cookie': clearCookie() });
}
