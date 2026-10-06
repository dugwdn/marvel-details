# Marvel Details: test plan

Last updated 2026-10-06.

## Automated
With PR #1: `node tools/check-links.mjs` fails when a page in `public/`
links to a site address with no file behind it, or the sitemap lists one.
The "Check links" GitHub workflow runs it on every pull request.

`npm test` (node --test, no installs) runs the member-perks unit tests,
also in the same workflow:
- `test/members-core.test.js`: merge (union, newer change wins, settings
  last-write-wins), sanitize, 16 KB size, found-counter math against the
  real data (69 details), rank thresholds and progress.
- `test/google-auth.test.js`: Google ID token check with a key pair made in
  the test: good token, both issuer spellings, wrong aud/iss, expired,
  future iat, bad signature, unknown key, alg "none", tampered payload, key
  caching.
- `test/members-server.test.js`: CSRF guard, cookie flags, token hashing,
  first-name only.
- `test/api.test.js`: the real Functions and migration against Node's
  built-in SQLite standing in for D1: sign-in (13+ required, wrong site and
  wrong audience refused), no email stored, sync merge, 413 cap, sign out,
  delete removes every row.

## Before every publish
1. Preview with `npx wrangler pages dev public --port 8788` (see RUNBOOK).
2. Each feature loads and its list fills in: scenes (21), callbacks (40),
   characters (10), rabbit holes (8), map (25 nodes, 51 links in the
   sidebar statistics).
3. The browser console shows no errors on those five pages.
4. Dark mode (device or browser set to dark): headings, labels and body
   text are readable on every feature page. Light mode looks unchanged.
5. A made-up address returns the 404 page.
6. Filters and search on scenes, callbacks and rabbit holes narrow the list
   and the count updates.
7. Phone width (about 375px): no sideways scrolling; the map sidebar is usable.

8. Members (any static server is enough; the API isn't needed): on a movie
   hub "Seen it?" and Save toggle; with "Hide spoilers" on, details of films
   not marked Seen are blurred and a tap reveals one; Save on a scene,
   callback, character, rabbit hole and article shows up on /me/; the star
   on /characters/ and on a character page shows on /me/; opening 4
   callbacks shows the "Promoted! Spider-Man" toast, the rank chip on the My
   Marvel menu button and the home line "You've found 4 of 69". /me/ at
   390px and 1440px, light and dark: no sideways scroll, text readable.
9. Members with the API (after RUNBOOK "Member accounts"): /me/ shows the
   13+ box, the Google button after ticking it, sign-in works, data appears
   on a second device, Sign out and Delete account work.

## After publishing
Repeat checks 2 and 5 on https://marvel-details.pages.dev.

## Last results
- 2026-10-06, member-perks branch: `npm test` 25/25 pass;
  `node tools/check-links.mjs` no broken links; check 8 passed in Chromium
  (Playwright) at 390x700 and 1440x900 in light and dark, no console errors,
  no sideways scroll. The Functions bundle with `wrangler pages functions
  build`, and `wrangler pages dev` with a local D1 answered /api/me and
  /api/sync. Check 9 not run (needs a real Google client ID; the Google
  script can't load in the test sandbox).
- 2026-10-05, PR #1 branch, local preview: checks 2 to 5 pass. Map draws
  25 nodes and 51 links. A contrast scan of scenes, callbacks, rabbit holes,
  character and movie pages in dark and light mode flags only colored badges
  on gradient backgrounds (fine) and the outline star on character cards.
  Checks 6 and 7 not run yet.
