// Every /api/auth/* request. The logic lives in functions/_lib/auth.js.
import { handleAuth } from '../../_lib/auth.js';

export const onRequest = ({ request, env }) => handleAuth(request, env);
