# MCU Easter Eggs (repo: marvel-details)

Read this first. It says what the project is, where it runs, and what's next.
The other standard docs: `PRD.md` (what and why), `TRD.md` (how it's built),
`ADR.md` (decisions), `ROADMAP.md`, `RUNBOOK.md` (how to deploy and fix),
`TEST_PLAN.md`, `CHANGELOG.md`. Feature details are in `docs/features/`
.

## What it is
A free, static fan site about hidden details in Marvel movies, branded
"MCU Easter Eggs" (renamed from "Details You Missed" on 2026-10-06, ADR-009). Phase 1 covers Iron Man 1 to 3, The Avengers and
Endgame. Owner: Doug (dugwdn). Not affiliated with Marvel or Disney.

## Current state (2026-10-06, audited overnight)
- **What is live:** https://mcueastereggs.com and https://marvel-details.pages.dev serve the same deploy: commit **79366ad** (PR #23 rebrand, which already carried sign-in #18 and member perks #21). Checked from the sandbox on 2026-10-06: the brand banner reads MCU Easter Eggs, `/me/` returns 200, `/api/auth` answers with Google on and Facebook and X off, GA4 is still the placeholder `G-XXXXXXXXXX`, `/more/` is a 404 and the home page has no search box.
- **Merged to `phase-1-build` but NOT deployed** (needs Doug's typed laptop line, RUNBOOK "Publish"): #24 More from us (`/more/`, footer link), #25 GA4 `G-NESPZD6XSQ` on every page, #26 compact header with search and member chip plus the readability pass, #27 AdSense slot `7081225657` in `js/ads.js` (ads stay off `/me/` and `/account`). Tip of `phase-1-build` is 3c44f57 plus whatever docs and link fixes merge after it.
- **Open:** draft PR #28 (`feat/images-and-trailers`: credits page, place photos, official-trailer rule), still being worked on. Stale branches (all merged or superseded, safe for Doug to prune later): design/marvel-style, design/marvel-style-2, docs/live-ecf0b8b, docs/standard-docs, feat/* and fix/* already merged, heroic-menu-buttons, map-popup, popup-buttons, member-perks, `main` (old, not used).
- **Brand:** MCU Easter Eggs (ADR-009), canonical https://mcueastereggs.com. Not affiliated with Marvel or Disney. Trademark question is on the lawyer list.
- **Pages:** home, about, privacy, account, My Marvel (`/me/`, noindex), 5 movie hubs, 4 articles (Loki's scepter, Endgame final portal, Iron Man 2 green drink, Spider-Man Brand New Day) plus the index, and the features: Deleted Scenes Registry (40 real scenes, sourced), Foreshadowing and Callbacks (34, sourced; `node build-callbacks.js`), Character Arc Tracker (20), MCU Character List (`/characters/all/`, 797, rebuilt by `python3 tools/build-directory.py`), Universe Map (25 nodes, 54 links, full-screen window), Rabbit Holes (8), Coming Soon (`/upcoming/`, upcoming movies and shows, each item labeled confirmed, reported or rumor with a source). Trailers on the 5 movie pages and the Brand New Day article are YouTube embeds of official uploads; the 10 original character pages show credited Wikimedia Commons actor photos.
- **Sign-in (ADR-007):** Google works (client ID in `wrangler.toml`). Facebook and X are off until Doug adds their keys (RUNBOOK "Sign-in keys").
- **Member perks (ADR-008):** Seen it, Save, favorite characters, found counter and ranks, My Marvel. Work with no account; sync needs the D1 `saves` table. I could not confirm from the sandbox whether Doug ran `npx wrangler d1 migrations apply marvel-details --remote` for `0002_member_saves.sql`; until it is run, `/api/sync` and Delete my account error for signed-in members.
- **Ads:** AdSense publisher ca-pub-7178251279168670, slot 7081225657 is in the repo (not deployed yet); boxes stay hidden until AdSense fills them. Site review status is Doug's to confirm.
- **Menu and look:** shared comic banner and menu written into each page by `node tools/menu.mjs` (run after adding a page). Articles are comic strips (`python3 tools/comic-panels.py`).
- **Images rule:** no studio posters, stills or character art (copyright, ads at risk). Allowed: YouTube embeds of official or licensed channels (YouTube's own player), and free-license Wikimedia Commons photos with a credit line. IMDb text and photos can't be copied; plain facts (dates, cast) can be stated.
- **Known gaps:** 7 articles still unwritten (below). The About page and bylines name "house writers" (pen names, not people): Doug has not decided how to present them. marveldetails.com still serves Doug's old Wix site; moving it waits on Doug. Search Console for mcueastereggs.com not set up.
- **Images and trailers (PR #28, ADR-010):** all media is listed in
  `public/data/media-credits.json`; `node tools/build-credits.mjs` rebuilds
  `/credits`, then `node tools/menu.mjs`. Trailers on all 5 hubs and 4
  articles (official or licensed channels). 20 character portraits, 7 list
  portraits, 2 place photos (Iron Man hubs). `test/media.test.mjs` checks it.
- **Movie hubs** are built by `node tools/build-hubs.mjs` from
  `public/data/movie-hubs.json` (every detail needs a source URL; trailer
  blocks and figures on the page are kept). Run `node tools/menu.mjs` after.
- **Links:** `test/links.test.mjs` fails on empty/"#" links, missing pages or
  anchors; `node tools/crawl-site.mjs` clicks through every page in Chromium.
  Never add a card that looks clickable without a link behind it.

## Plan
See `ROADMAP.md` (priority order, brainstorms included). Next without Doug: write the 7 missing articles, finish PR #28 media, keep link checks green.
Waiting on Doug: the typed deploy line, Facebook and X sign-in keys, Search Console and sitemap for mcueastereggs.com, AdSense status, the marveldetails.com move, the pen-name decision, confirming the D1 migration.

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
