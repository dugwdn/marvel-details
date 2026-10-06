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
- **GA4:** the ID is set in one place, `GA_ID` in `tools/menu.mjs` (empty or `G-XXXXXXXXXX` = off, no tag). Tag sends no ads signals and no query strings (PR for branch `ga4-everywhere-2026-10-06`); goes live with the next deploy, then run `node tools/menu.mjs` only if the ID changes.
- **Ads:** AdSense publisher ca-pub-7178251279168670, slot 7081225657 in `js/ads.js`. Since PR `ads-placeholders-2026-10-06` every ad page shows three always-visible dashed "Ad space" boxes (top below the menu, mid, end; 280px phone / 250px desktop, styles in `theme.css`) that turn into the ad once AdSense fills; top and end are written into the HTML by `node tools/menu.mjs` with `data-ad-placeholder`. No ads on `/me/`, `/account`, `/map/` (full-screen map), privacy, credits, more. AdSense is "Getting ready" (not approved).
- **Menu and look:** shared comic banner and menu written into each page by `node tools/menu.mjs` (run after adding a page, and after any CSS or JS change: it stamps `?v=<file hash>` on CSS and JS links because the zone caches them 4 hours). Articles are comic strips (`python3 tools/comic-panels.py`).
- **Images rule:** no studio posters, stills or character art (copyright, ads at risk). Allowed: YouTube embeds of official or licensed channels (YouTube's own player), and free-license Wikimedia Commons photos with a credit line. IMDb text and photos can't be copied; plain facts (dates, cast) can be stated.
- **Known gaps:** 7 articles still unwritten (below). The About page and bylines name "house writers" (pen names, not people): Doug has not decided how to present them. marveldetails.com still serves Doug's old Wix site; moving it waits on Doug. Search Console for mcueastereggs.com not set up.
- **Images and trailers (PR #28, ADR-010):** all media is listed in
  `public/data/media-credits.json`; `node tools/build-credits.mjs` rebuilds
  `/credits`, then `node tools/menu.mjs`. Trailers on all 5 hubs and 4
  articles (official or licensed channels). 20 character portraits, 7 list
  portraits, 2 place photos (Iron Man hubs). `test/media.test.mjs` checks it.
- **More media (PR #35, ADR-012):** `node tools/build-media.mjs` writes the
  home page "Faces of the MCU" and "Watch the Trailers" (59 official
  trailers), movie-hub cast galleries and character-page trailer rows from
  media-credits.json. New photos: list them in `tools/media-wanted.json`, run
  `python3 tools/fetch-media.py` (or push a `media/fetch-*` branch so the
  GitHub Action fetches them: Wikimedia rate-limits cloud IPs). RUNBOOK
  "Add photos or trailers".
- **Header media and credits (ADR-013):** movie hubs, deleted-scene pages and
  callback pages carry the official trailer (cover = the film's cast photos)
  and a cast strip inside the header, written by `addFilmHeroes` in
  `tools/build-media.mjs` (build-hubs.mjs and build-callbacks.js call it).
  No photo or trailer shows a source line anywhere; all credits are on
  `/credits` ("Photos and Credits", in every footer). `RECAST` and `LEADS`
  in build-media.mjs keep recast actors off a film and put the stars first.
- **Home spotlight:** the "Faces of the MCU" spotlight panel (abilities,
  allies, enemies, every title linked) comes from `public/data/spotlight.json`
  plus mcu-characters.json and characters.json, written by `homeTop` in
  `tools/build-media.mjs`. A character with no spotlight.json entry just shows
  its titles. Add allies/enemies only as mcu-characters.json ids, with a source.
- **Movie hubs** are built by `node tools/build-hubs.mjs` from
  `public/data/movie-hubs.json` (every detail needs a source URL; trailer
  blocks and figures on the page are kept). Run `node tools/menu.mjs` after.
- **Quiz (`/quiz/`, ADR-011):** questions, levels, quiz ranks and film
  sources are all in `public/data/quiz.json`; logic in `public/js/quiz-core.js`
  (tested by `test/quiz.test.mjs`), page script `public/js/quiz.js`. To add a
  question, add it to the JSON with a film key and a scene note; every level
  needs at least 20. The page's level cards and rank table are written into
  the HTML, so update `public/quiz/index.html` if levels or ranks change.
  Menu: Quiz replaced About (About is in the footer legal line).
- **Typing boxes (2026-10-06, branch `keyboard-fit`):** every page loads
  `/js/keyboard.js` and lets Android shrink the page around the keyboard;
  every search box asks for a small keyboard and has a visible label. See
  "Typing boxes and the keyboard" below. On-screen check: 16 failing before,
  0 after.
- **Links:** `test/links.test.mjs` fails on empty/"#" links, missing pages or
  anchors; `node tools/crawl-site.mjs` clicks through every page in Chromium.
  Never add a card that looks clickable without a link behind it.

## Typing boxes and the keyboard (standing rule, Doug 2026-10-06)
"Ensure that any time a text input field is needed. That the input field
itself, and anything else needed to understand what is supposed to go into
that field is visible. And that we keep the keyboard as small as possible."
`node tools/menu.mjs` gives every page
`<script type="module" src="/js/keyboard.js"></script>` and adds
`interactive-widget=resizes-content` to its viewport tag. `public/js/keyboard.js`
keeps the focused box's group (its label, the heading, its button; the biggest
group that fits above the keyboard and below the sticky header, or
`data-kb-block` on a group) in view by scrolling, or by sliding a fixed
window (the Universe Map) up, undone when the box loses focus. Every typing
box has a visible label (a placeholder alone isn't enough) and asks for a
small keyboard: `inputmode`, `enterkeyhint`, `autocomplete="off"`,
`autocorrect="off"`, `spellcheck="false"`, `autocapitalize` (`off` for
searches, `words` for names). Sign-in fields, if ever added, keep their real
`autocomplete` token (email, current-password) so one tap fills them.
The header search box lives in `brandFor` in `tools/menu.mjs`; the Character
List box in `tools/build-directory.py`. `test/keyboard.test.mjs` enforces the
tags and attributes; `scripts/keyboard-check.mjs` taps every box at 390x640
with a 300px keyboard (add a line to its `CASES` for a new box; run it against
`npm run dev` or `python3 -m http.server -d public 8788`).

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
