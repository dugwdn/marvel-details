// GET/POST /api/discuss (the [[path]] file covers /api/discuss/*). Message boards and page discussions, ADR-015.
import { handleDiscuss } from '../../_lib/discuss.js';

export const onRequest = async ({ request, env, waitUntil }) =>
  (await handleDiscuss(request, env, new URL(request.url), { waitUntil })) || new Response('not found', { status: 404 });
