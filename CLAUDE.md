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

## Current state (2026-10-05)
- **Live at https://marvel-details.pages.dev** (Cloudflare Pages project
  `marvel-details`, production branch `phase-1-build`, commit 1b05021,
  published by direct upload from Doug's laptop with wrangler).
- **marveldetails.com is not this site yet.** The domain still serves Doug's
  older Wix site (which carries a Google Search Console verification tag).
  Moving the domain is a live change and waits on Doug.
- Pages: home, about, 5 movie hubs, 3 articles, plus five features:
  Deleted Scenes Registry (`/scenes/`, 21 scenes), Foreshadowing and
  Callbacks (`/callbacks/`, 40), Character Arc Tracker (`/characters/`, 10),
  Universe Map (`/map/`, 25 nodes and 51 links) and Rabbit Holes
  (`/rabbit-holes/`, 8).
- **Open draft PR #1** fixes the blank Universe Map, unreadable dark-mode
  text, the catch-all redirect that turned every bad address into the home
  page, and the sitemap/robots pointing at a non-existent workers.dev host.
  It also removes 77 links to pages that don't exist and adds a link check
  (`tools/check-links.mjs`, run on every PR). Not published yet.
- **Known gaps:** only 3 of the 10 planned articles are written. GA4 is a
  placeholder (`G-XXXXXXXXXX`). The About page and bylines name "house
  writers" (Alex Continuity, Maya Dialogue, and others) that are pen names,
  not people. No favicon.
- `src/index.js` and `wrangler.toml` are left over from a Workers plan and
  are not used by Pages.

## Plan
See `ROADMAP.md`. Next without Doug: write the 7 missing articles, add a
favicon, remove leftover files. Waiting on Doug: publish PR #1, a real GA4 ID, the domain
move, and the pen-name question.

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
