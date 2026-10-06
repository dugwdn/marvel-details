# Marvel Details: test plan

Last updated 2026-10-06.

## Automated
With PR #1: `node tools/check-links.mjs` fails when a page in `public/`
links to a site address with no file behind it, or the sitemap lists one.
The "Check links" GitHub workflow runs it on every pull request.
`npm test` (`node --test test/*.test.mjs`) runs the sign-in tests: Google
token checks (signature, audience, issuer, expiry), sign in, who am I, sign
out, delete, other-site posts refused, Facebook and X redirects and a bad
return. The same workflow runs them.

The member-perks tests run in the same `npm test`:
- `test/members-core.test.mjs`: merge (union, newer change wins, settings
  last-write-wins), sanitize, 16 KB size, found-counter math against the
  real data (69 details), rank thresholds and progress.
- `test/sync.test.mjs`: `/api/sync` against Node's built-in SQLite with all
  migrations: signed-out refused, other-site and non-JSON writes refused,
  two devices merge, 16 KB cap (413), and "Delete my account" removes the
  saved list with the account.

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
9. Members with the API (after RUNBOOK "Sign-in keys" and "Member perks
   sync"): /me/ shows the sign-in panel (13+ box, then the providers),
   sign-in works, the list appears on a second device, Sign out and Delete
   my account work.

## After publishing
Repeat checks 2 and 5 on https://marvel-details.pages.dev.

## Last results
- 2026-10-06, member-perks branch (stacked on sign-in): `npm test` all
  pass (sign-in and member tests); `node tools/check-links.mjs` no broken
  links; check 8 passed in Chromium (Playwright) at 390x700 and 1440x900,
  light and dark, no console errors, no sideways scroll. Check 9 not run
  (needs real sign-in keys; Google's script can't load in the sandbox).
- 2026-10-05, PR #1 branch, local preview: checks 2 to 5 pass. Map draws
  25 nodes and 51 links. A contrast scan of scenes, callbacks, rabbit holes,
  character and movie pages in dark and light mode flags only colored badges
  on gradient backgrounds (fine) and the outline star on character cards.
  Checks 6 and 7 not run yet.
