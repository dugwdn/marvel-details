# Marvel Details: test plan

Last updated 2026-10-05.

## Automated
None in the repo yet. Roadmap item 7 adds a link check that fails when a
page links to an address with no file behind it, and runs it on every PR.

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

## After publishing
Repeat checks 2 and 5 on https://marvel-details.pages.dev.

## Last results
- 2026-10-05, PR #1 branch, local preview: checks 2 to 5 pass. Map draws
  25 nodes and 51 links. A contrast scan of scenes, callbacks, rabbit holes,
  character and movie pages in dark and light mode flags only colored badges
  on gradient backgrounds (fine) and the outline star on character cards.
  Checks 6 and 7 not run yet.
