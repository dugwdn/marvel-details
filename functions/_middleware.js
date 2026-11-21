// Live Edit: Doug's on-page editor (copied from dugwdn/wdn-website tools/live-edit by its build.mjs; edit it there).
// Owner only, signed in through webdesignnerd.com. Visitors get his saved edits; forms, ads and quizzes stay out of it.
import { createLiveEdit } from './_lib/live-edit/live-edit-worker.js';

const liveEdit = createLiveEdit({ siteWide: 'header.site-bar, body > footer', skip: 'form, .ad-box, canvas, [data-quiz], .quiz' });

export async function onRequest(context) {
  const { request, env } = context;
  const path = new URL(request.url).pathname;
  // Stylesheets, scripts and pictures go straight through.
  if (/\.(css|js|mjs|json|png|jpe?g|gif|webp|avif|svg|ico|woff2?|txt|xml|webmanifest|mp4)$/i.test(path)) return context.next();
  const edit = await liveEdit.handle(request, env);
  if (edit) return edit;
  return liveEdit.page(request, env, await context.next());
}
