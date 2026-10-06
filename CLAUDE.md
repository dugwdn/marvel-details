# Marvel Details (Details You Missed)

Read this first. It says what the project is, where it runs, and what's next.
The other standard docs: `PRD.md` (what and why), `TRD.md` (how it's built),
`ADR.md` (decisions), `ROADMAP.md`, `RUNBOOK.md` (how to deploy and fix),
`TEST_PLAN.md`, `CHANGELOG.md`. Feature details are in `docs/features/`
(after PR #1; before that they sit in `public/`).

## What it is
A free, static fan site about hidden details in Marvel movies, branded
"Details You Missed." Phase 1 covers Iron Man 1 to 3, The Avengers and
Endgame. Owner: Doug (dugwdn). Not affiliated with Marvel or Disney.

## Current state (2026-10-06)
- **Live at https://marvel-details.pages.dev** (Cloudflare Pages project
  `marvel-details`, production branch `phase-1-build`, commit ecf0b8b,
  published by direct upload from Doug's laptop with wrangler).
- **marveldetails.com is not this site yet.** The domain still serves Doug's
  older Wix site (which carries a Google Search Console verification tag).
  Moving the domain is a live change and waits on Doug.
- Pages: home, about, 5 movie hubs, 3 articles, plus five features:
  Deleted Scenes Registry (`/scenes/`, 21 scenes), Foreshadowing and
  Callbacks (`/callbacks/`, 40), Character Arc Tracker (`/characters/`, 20),
  Universe Map (`/map/`, 25 nodes and 51 links) and Rabbit Holes
  (`/rabbit-holes/`, 8).
- Live since 2026-10-05 23:10 UTC: PR #1 fixes (Universe Map, dark mode,
  real 404, sitemap/robots, link check on every PR), PR #3 ad boxes (hidden
  until AdSense fills them) and PR #4 green drink corrections.
- **Brand banner and site menu:** one shared comic-style banner and menu
  of big buttons on every page, written into each page by `node tools/menu.mjs` (run it after adding a
  page). Styles are in `public/css/theme.css`; uses the Bangers web font.
- **Articles are comic strips:** after adding an article, run
  `python3 tools/comic-panels.py` to wrap its sections in panels.
- **Images rule:** no studio posters, stills or character art (copyright;
  ads at risk). Trailers are YouTube embeds of official uploads; actor photos
  are free-license Wikimedia Commons files with a credit line. IMDb text and
  photos can't be copied; plain facts (dates, cast) can be stated.
- **Known gaps:** only 3 of the 10 planned articles are written. GA4 is a
  placeholder (`G-XXXXXXXXXX`). The About page and bylines name "house
  writers" (Alex Continuity, Maya Dialogue, and others) that are pen names,
  not people.
- **Member perks (branch `member-perks`, draft PR, not live):** Seen it
  (watch tracker + optional spoiler blur), Save (saved list), favorite
  characters (star), a hidden-details found counter with a rank ladder
  (Civilian to The Watcher, `public/data/ranks.json`) and a My Marvel page
  (`/me/`, noindex). Local-first: kept in the browser (localStorage), no
  account needed. Optional Google sign-in syncs it through Pages Functions
  (`functions/api/*`) and a D1 database `marvel-details-members`; we store
  only Google's `sub` and first name, never email. New `/privacy/` page.
  Logic shared by browser, server and tests is `public/js/members-core.js`;
  page code is `public/js/members.js` (added to every page by
  `node tools/menu.mjs`). Tests: `npm test`. Until Doug sets up D1 and
  `GOOGLE_CLIENT_ID` (RUNBOOK "Member accounts"), sign-in shows "coming
  soon" and everything else works.

## Plan
See `ROADMAP.md`. Next without Doug: write the 7 missing articles.
Waiting on Doug: a real GA4 ID, AdSense slot numbers, the domain move, and
for member sync: review the member-perks PR, create the D1 database, put its
id in `wrangler.toml`, make a Google OAuth client ID (RUNBOOK). Note:
`wrangler.toml` now exists, so deploys fail until its D1 id is real.

## Working rules
- Project-wide rules (branch and PR, never merge or deploy without Doug's
  OK, plain-English replies, most-traffic wins for names and wording) come
  from the Business HQ project.
- No build step: what's in `public/` is what goes live. Don't add a
  framework unless a feature truly needs one.
- Every fact about a film must be checkable (scene, timestamp, interview or
  official source). If it can't be confirmed, say so on the page.
- Never invent people, quotes or statistics.
- No deploy secrets in the repo. wrangler on Doug's laptop is already
  signed in to his Cloudflare account.
