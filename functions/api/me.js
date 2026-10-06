// GET /api/me: is sign-in switched on, and who is signed in (first name only).
import { json, signInAvailable, currentUser } from '../../lib/members-server.js';

export async function onRequestGet({ request, env }) {
  const available = signInAvailable(env);
  const base = { signInAvailable: available, clientId: available ? env.GOOGLE_CLIENT_ID : null };
  if (!available) return json({ ...base, signedIn: false });
  try {
    const user = await currentUser(request, env);
    return json(user ? { ...base, signedIn: true, firstName: user.firstName } : { ...base, signedIn: false });
  } catch {
    return json({ ...base, signedIn: false, error: 'unavailable' }, 503);
  }
}
