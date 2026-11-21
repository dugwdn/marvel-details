// GET /api/auth (the [[path]] file covers the deeper paths).
import { handleAuth } from '../../_lib/auth.js';

export const onRequest = ({ request, env }) => handleAuth(request, env);
