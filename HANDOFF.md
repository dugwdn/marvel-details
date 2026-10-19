# MCU Easter Eggs: handoff

> Last checked against the code: 2026-10-15 (branch `phase-1-build`, commit `4323e51`).
> This file explains how MCU Easter Eggs was built, why it was built that way, and how someone
> (a person or another AI tool) can take it over. It links to the project's other docs instead
> of repeating them. If this file and the code disagree, the code wins; fix this file.

## 1. What it is and who uses it
MCU Easter Eggs is a free fan site about hidden details in Marvel movies: sourced easter eggs, deleted scenes, foreshadowing, a character list, a universe map, a quiz, message boards and a "Coming Soon" page. It is for Marvel fans. It is live at https://mcueastereggs.com (the same site also answers at marvel-details.pages.dev). It is not affiliated with Marvel or Disney. Status: live, in active building. The repo is still called `marvel-details` because that was the first name ("Details You Missed" came before the rename on 2026-10-06, ADR-009).

## 2. Where it runs

| Piece | Where | Notes |
|---|---|---|
| Live site / app | https://mcueastereggs.com | Also https://marvel-details.pages.dev. |
| Hosting | Cloudflare Pages project `mcueastereggs` (name in `wrangler.toml`) | An older upload-only Pages project `marvel-details` is the by-hand fallback. |
| Domain and DNS | mcueastereggs.com. Registrar: unknown, check Cloudflare dashboard or Doug's registrar email | `marveldetails.com` still serves Doug's old Wix site; moving it waits on Doug. |
| Build and publish path | Merge to `phase-1-build` > Cloudflare Pages publishes. No build command, output folder `public` | `wrangler.toml` and `RUNBOOK.md` say the Git connection is set up. `CLAUDE.md` and `ROADMAP.md` (older text) say deploys are still a typed laptop command. Unknown which is true today, check Cloudflare dashboard > Workers & Pages > `mcueastereggs` > Deployments. |
| Database | Cloudflare D1 database `marvel-details` (binding `DB`) | Migrations in `migrations/`. |
| Other storage | Cloudflare KV namespace (binding `LIVE_EDIT`) | Doug's saved on-page edits. |
| Server code / workers | Pages Functions in `functions/` (`_middleware.js`, `api/auth`, `api/discuss`, `api/sync.js`, `_lib/`) | `public/_routes.json` keeps CSS, JS, images and data off the Functions. |
| Scheduled jobs (timers) | None | GitHub Action `fetch-media.yml` runs only when started by hand or by pushing a `media/fetch-*` branch. |
| Email / SMS | Brevo free plan for reply emails (opt-in), sender `replies@mcueastereggs.com`, being set up 2026-10-19; Resend still works as a second choice | Emails wait in `mail_queue` until `BREVO_API_KEY` (or `RESEND_API_KEY`) exists. No SMS. |
| Analytics and ads | GA4: ID in `GA_ID` in `tools/menu.mjs`, written into every page by the build tool. AdSense: slot in `public/js/ads.js`, `public/ads.txt` | AdSense status "Getting ready" as of the last notes. Three "Ad space" boxes show on ad pages. |
| Repo | `dugwdn/marvel-details`, default branch `phase-1-build` | `main` is old and not used. Many old merged branches. |

## 3. How it was built
- Stack: plain HTML, CSS and JavaScript in `public/`, with Node scripts and a few Python scripts in `tools/` that write parts of the pages. Server side is Cloudflare Pages Functions in JavaScript. There is no framework and no bundler.
- Folder map:
  - `public/`: the whole site (pages, `css/`, `js/`, `img/`, `data/` JSON, `ads.txt`, `sitemap.xml`, `404.html`).
  - `public/data/`: the facts as JSON (`movie-hubs.json`, `mcu-characters.json`, `quiz.json`, `boards.json`, `media-credits.json`, `spotlight.json` and more).
  - `functions/`: sign-in, sync, discussions and the Live Edit middleware.
  - `tools/`: page builders. `node tools/menu.mjs` writes the shared banner, menu, ad boxes and file-hash stamps into every page. Others build hubs, credits, media, boards, the character list and comic panels.
  - `migrations/`: D1 table files. `test/`: tests. `scripts/keyboard-check.mjs`: on-screen keyboard check.
  - Root docs: `PRD.md`, `TRD.md`, `ADR.md`, `ROADMAP.md`, `RUNBOOK.md`, `TEST_PLAN.md`, `CHANGELOG.md`, `docs/features/`.
- Data model: D1 holds member accounts and sessions (`0001_accounts.sql`), member saves for sync (`0002_member_saves.sql`) and, created on first use, discussion tables such as `posts`. Everything else is JSON files in `public/data/`.
- Migrations or data updates: apply with `npx wrangler d1 migrations apply marvel-details --remote` (needs Doug's Cloudflare login and his OK). Whether `0002` has been run is unconfirmed in the docs, see section 9.
- Tests: `npm test` (runs `node --test test/*.test.mjs`) plus `node tools/check-links.mjs`. They cover links, keyboard rules, contrast, sign-in, sync, discussions, media credits, ads and analytics tags.

## 4. Why it was built this way
- Static HTML with no framework: cheap, fast and easy for anyone or any bot to edit (ADR-001). See `ADR.md`.
- Cloudflare Pages on the free plan (ADR-002).
- Facts in JSON read by the pages (ADR-003) so a detail can be added without touching layout.
- Our own sign-in with Google first, never a paid provider (ADR-007), and perks that work with no account and sync only when signed in (ADR-008).
- Trailers only from official channels, photos only with a credit, all credits on one page (ADR-010, 012, 013): keeps the fan site on safe ground.
- Live Edit so Doug can fix words on the page himself (ADR-014).
- Discussions and boards copied from Credible Theories' system (ADR-015).
- Product reasons are in `PRD.md` and `ROADMAP.md`. Technical design is in `TRD.md`.

## 5. Accounts and services

| Service | Used for | Owner | Where the secret lives |
|---|---|---|---|
| GitHub | Code, pull requests, link-check Action | Doug's account (`dugwdn`) | Doug's login |
| Cloudflare | Pages hosting, DNS, D1, KV | Doug's Cloudflare account | Dashboard > Workers & Pages > `mcueastereggs` > Settings > Variables and Secrets |
| Google Cloud (project "MCU Easter Eggs") | Google sign-in | Doug's Google account | Public client ID is `GOOGLE_CLIENT_ID` in `wrangler.toml` (public by design). Allowed origins are set in Google Cloud. |
| Meta (Facebook) developer app | Facebook sign-in, not yet turned on | Doug's Meta account | Secrets `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` |
| X sign-in | Off on purpose (paid) | none | `X_CLIENT_ID`, `X_CLIENT_SECRET` stay unset |
| Cloudflare Turnstile | Spam check on board posts | Doug's Cloudflare account | `TURNSTILE_SITE_KEY` (text), `TURNSTILE_SECRET` (secret) |
| Brevo | Reply emails | Doug's Brevo account (also sends ChordLyric sign-in mail) | `BREVO_API_KEY` (secret), `MAIL_FROM` (text) |
| ntfy | Optional phone alerts | Unknown | `NTFY_TOPIC` |
| Google Analytics 4, AdSense | Stats, ads | Doug's Google account | Public IDs in `tools/menu.mjs` and `public/js/ads.js`; no secret |
| webdesignnerd.com WordPress | Signs Doug in for Live Edit | Doug (Web Design Nerd) | See ADR-014 |
| YouTube, Wikimedia Commons | Official trailer embeds, credited photos | Public | No key |

Other variable names: `MOD_MEMBERS`, `HIDE_THRESHOLD`. Names only here.

## 6. Run it on Doug's Windows laptop
1. Open VS Code > File > Open Folder > `C:\Users\doug\Documents\marvel-details`. If missing, open PowerShell and run:
```
cd C:\Users\doug\Documents
git clone https://github.com/dugwdn/marvel-details
```
2. Terminal > New Terminal, then one line at a time:
```
npm install
```
```
npm run dev
```
You should see a line with `http://localhost:8788`. Open it in a browser. Press Ctrl+C to stop.
3. Sign-in and boards need the variables from section 5. For local testing, put them in a `.dev.vars` file in the repo folder (never commit it). The hard-to-get values come from the Cloudflare dashboard or Doug. The site works without them for reading.
4. After changing any page, CSS or JS, run `node tools/menu.mjs` (it stamps file hashes so visitors do not keep old files).

## 7. Publish, roll back, check health
- Publish: open a draft pull request; the Check links workflow runs. Merge on GitHub. If the Git connection is live, Cloudflare publishes by itself. If not, the by-hand line is in `RUNBOOK.md` under "Publish" (`npm run deploy` from the repo folder on `phase-1-build`, needs `npx wrangler login` as Doug). Doug's OK first.
- Roll back: Cloudflare dashboard > Workers & Pages > project (`mcueastereggs`, or `marvel-details` for hand deploys) > Deployments > pick the last good one > three-dot menu > "Rollback to this deployment".
- Health check: open https://mcueastereggs.com and the feature pages (`/scenes/`, `/callbacks/`, `/characters/`, `/map/`, `/rabbit-holes/`, `/boards/`). A made-up address should show "That page isn't here". `/api/auth` should answer. Full list in `RUNBOOK.md`.

## 8. Recurring jobs and what breaks if they stop
None. The `fetch-media.yml` Action is manual only. If it is never run, new photos and trailers are simply not added.

## 9. Known issues and quirks
- The docs disagree about whether merging to `phase-1-build` publishes automatically (section 2). Check the dashboard before trusting either.
- `CLAUDE.md` "Current state" is dated 2026-10-06 and lists deploy lag. Part is out of date (the home page now has a newest-movie hero, ADR-017).
- The D1 `saves` migration (`0002`) was never confirmed as applied. Until it is, member sync and "Delete my account" error for signed-in members.
- `wrangler.toml` holds a public Google client ID, which is fine. Database and KV IDs are in there too; do not copy them into docs.
- Must run `node tools/menu.mjs` after any CSS, JS or page-list change.
- Wikimedia blocks cloud IPs (error 429); use the `media/fetch-*` branch route in `RUNBOOK.md`.
- `package.json` pins wrangler `^3.78.0`; dev command is `wrangler pages dev`.
- Seven planned articles are still unwritten. The "house writers" bylines are pen names; Doug has not decided how to present them.

## 10. Open work
See `ROADMAP.md` (priority order) and the "Plan" section of `CLAUDE.md`. Waiting on Doug: board setup (moderator id, Turnstile keys), Facebook keys, AdSense status, the marveldetails.com move, the pen-name decision, confirming the D1 migration.

## 11. Other docs in this repo

| Doc | Where |
|---|---|
| Project rules and current state | `CLAUDE.md` |
| README | `README.md` |
| Product requirements | `PRD.md` |
| Technical design | `TRD.md` |
| Decision records | `ADR.md` |
| Roadmap | `ROADMAP.md` |
| Runbook (publish, sign-in keys, boards, photos) | `RUNBOOK.md` |
| Test plan | `TEST_PLAN.md` |
| Changelog | `CHANGELOG.md` |
| Feature notes | `docs/features/` |
| Sign-in data notes | `docs/sign-in-data.md` |

## 12. Take over with another bot
Paste-ready prompt for any AI coding tool (Claude Code, Cursor, Copilot, etc.):

```
You are taking over MCU Easter Eggs (repo dugwdn/marvel-details, live at https://mcueastereggs.com). Before changing anything:
1. Read HANDOFF.md, then CLAUDE.md, then RUNBOOK.md and TRD.md.
2. Run `npm install`, then `npm test` and `node tools/check-links.mjs`, and confirm they pass before you edit.
Rules:
- No build step: what is in public/ is what goes live. No framework unless a feature truly needs one.
- Every fact about a film must be checkable (scene, timestamp, interview or official source). Never invent people, quotes or statistics.
- Trailers only from official or licensed channels; photos only free-license with a credit on /credits. No downloaded film stills.
- After any page, CSS or JS change run `node tools/menu.mjs`.
- Every text box needs a visible label and small-keyboard attributes; sign-in pop-up rules are in CLAUDE.md. Never add a paid sign-in (no X).
- Never merge or deploy without Doug's OK.
- Never commit passwords, keys or tokens. Secrets live in Cloudflare Pages Variables and Secrets (project mcueastereggs).
- Work on a new branch and open a pull request; never push straight to phase-1-build.
- Update HANDOFF.md in the same pull request if you change hosting, the data model, the deploy path or a key decision.
Task: <describe the task here>
```

## 13. Take over by hand
1. Repo access: Doug adds the person on GitHub (repo > Settings > Collaborators > Add people).
2. Service access: invite them to Doug's Cloudflare account (Pages, D1, KV, Turnstile). Google Cloud, Meta, AdSense and Analytics only for those tasks. Secrets are set in Cloudflare, never in the repo.
3. Run locally: section 6. Publish: section 7.
