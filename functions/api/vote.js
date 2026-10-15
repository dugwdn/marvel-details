// GET/POST /api/vote: "Do you buy it?" on fan theory pages (ADR-018). Handled with the discussions code.
import { handleDiscuss } from '../_lib/discuss.js';

export const onRequest = async ({ request, env, waitUntil }) =>
  (await handleDiscuss(request, env, new URL(request.url), { waitUntil })) || new Response('not found', { status: 404 });
