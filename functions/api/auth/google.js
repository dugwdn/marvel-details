// POST /api/auth/google { credential, over13: true }
// Checks the Google ID token, keeps only sub + first name, starts a session.
import { verifyGoogleIdToken, googleKeys } from '../../../lib/google-auth.js';
import { json, signInAvailable, writeAllowed, newToken, hashToken, sessionCookie, firstNameFrom, SESSION_DAYS } from '../../../lib/members-server.js';

export async function onRequestPost({ request, env }) {
  if (!signInAvailable(env)) return json({ error: 'Sign-in is not switched on yet.' }, 503);
  if (!writeAllowed(request)) return json({ error: 'Bad request.' }, 403);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Bad request.' }, 400);
  }
  if (!body || body.over13 !== true) return json({ error: 'You need to be 13 or older to make an account.' }, 400);

  let claims;
  try {
    claims = await verifyGoogleIdToken(body.credential, { clientId: env.GOOGLE_CLIENT_ID, keys: await googleKeys() });
  } catch {
    return json({ error: 'Google sign-in could not be checked. Please try again.' }, 401);
  }

  const now = Date.now();
  const firstName = firstNameFrom(claims);
  const user = await env.DB.prepare(
    `INSERT INTO users (google_sub, first_name, created_at, last_seen) VALUES (?1, ?2, ?3, ?3)
     ON CONFLICT(google_sub) DO UPDATE SET first_name = excluded.first_name, last_seen = excluded.last_seen
     RETURNING id`,
  )
    .bind(claims.sub, firstName, now)
    .first();

  const token = newToken();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires_at <= ?1').bind(now),
    env.DB.prepare('INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)').bind(
      await hashToken(token),
      user.id,
      now,
      now + SESSION_DAYS * 864e5,
    ),
  ]);
  return json({ signedIn: true, firstName }, 200, { 'set-cookie': sessionCookie(token) });
}
