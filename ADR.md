# Marvel Details: decision record

Newest at the bottom. Each entry: the decision, why, and what it costs.

## ADR-001: Static HTML, no framework (2026-10-05)
**Decision:** hand-written HTML, CSS and JS in `public/`, no build step.
**Why:** the site is mostly reading pages; static files are fast, free to
host and easy for Google to read. **Cost:** shared parts (header, nav,
footer) are copied into every page, so a nav change touches every file.
Revisit if that becomes a regular chore.

## ADR-002: Cloudflare Pages, free plan (2026-10-05)
**Decision:** host on Cloudflare Pages project `marvel-details`, published
by direct upload with wrangler from Doug's laptop.
**Why:** free, global, and Doug's other sites already live there.
**Cost:** no automatic deploy on merge; someone runs the publish command.
(The first plan was Cloudflare Workers; those files were removed.)

## ADR-003: Feature data in JSON, read in the browser (2026-10-05)
**Decision:** each feature loads `/data/<feature>.json` with `fetch`.
**Why:** one place to add a scene or callback, no server needed.
**Cost:** search engines see the list pages before scripts fill them, so
each item also has its own static detail page.

## ADR-004: Real 404 page instead of a catch-all (2026-10-05, PR #1)
**Decision:** remove `_redirects` (`/* /index.html 200`) and add `404.html`.
**Why:** the catch-all made every mistyped or missing address show the home
page with a 200, which hides broken links and reads as "soft 404" to Google.
**Cost:** links to unwritten articles would now show the 404 page, so PR #1
also removes them and adds a link check that fails a PR on any new one.

## ADR-005: Shared dark-mode page base (2026-10-05, PR #1)
**Decision:** `css/style.css` holds the dark page background and text
colors, linked on every feature page.
**Why:** the feature stylesheets darkened their cards but not the page, so
headings were light-on-light for anyone using dark mode.
**Cost:** one more stylesheet request per feature page.


## ADR-006: Marvel-fan look, built from our own parts (2026-10-05)
Doug wants the site to feel like Marvel's own site because the visitors are Marvel fans, without using anything illegally. Decision: a dark theme with bold condensed uppercase type, a single red accent and image-style poster tiles, all in `public/css/theme.css`, loaded last on every page. We use free DIN-like fonts (Barlow Condensed for headings, Barlow for text; marvel.com uses its own licensed DIN font, which we do not use), a type-only wordmark "DETAILS YOU MISSED" and no Marvel logos, artwork, screenshots or the red box logo shape. A general style (dark, bold, red) is not protected; a confusingly similar logo or copied assets would be. The footer and About page keep "not affiliated with Marvel or Disney".
Update (same day, after studying marvel.com): their site pairs black bars with light content areas, so ours now does too by default, with the dark version when the visitor's device is in dark mode. Our red (#e0303c) is our own, not theirs.

## ADR-007: Our own sign-in, Google first (2026-10-06)
Doug's standing rule (2026-10-01): every site where people make an account
gets Google sign-in first, plus Meta (Facebook) and X. Sign-in here is for the
planned discussions; reading never needs it.
- Built as Cloudflare Pages Functions (`functions/_lib/auth.js`) with a D1
  database `marvel-details` (users, hashed session tokens). Same design as the
  Party Games Arcade's `src/auth.ts`, so both sites behave alike.
- Google: its button plus One Tap; we check Google's signature on the ID token,
  so it needs only the public client ID. Facebook and X: redirect sign-in (X
  with PKCE); their app secrets are Pages secrets.
- We keep the provider's id and first name only, never email. 13 or older to
  make an account (COPPA question is on the lawyer list).
- Rejected: Supabase/Auth0/Clerk (another service and bill, members not on our
  account), Disqus-style logins (their ads and trackers).
- Only `/api/*` runs code (`public/_routes.json`); every page stays static.
- Microsoft and Apple can be added the same way later; Apple needs the $99/yr
  developer account (Doug's OK).

## ADR-008: Member perks are local-first; sync rides on the site sign-in (2026-10-06)
**Decision:** the perks (Seen it, Save, favorite characters, found counter
and ranks) live in the visitor's browser (localStorage) and work with no
account. Signed-in members (sign-in from ADR-007) get them synced: one JSON
blob per person in a `saves` table (`migrations/0002_member_saves.sql`) in
the same D1 database `marvel-details`, keyed by `users.id`, capped at 16 KB,
read and written by `GET/PUT /api/sync` using ADR-007's session lookup.
Merging is a union of both sides with "newest change wins" per item
(removals are kept as dated tombstones so they stick), found details never
un-find, settings are last-write-wins. Deleting the account deletes the
`saves` row. Nothing new about the person is stored beyond the list itself.
**Why:** most visitors never sign up, so the perks must not depend on it; one
sign-in for the whole site; no new service or bill.
**Cost:** sync only for signed-in members; the list size cap; rank titles use
Marvel character names (lawyer list).

## ADR-010: Trailers from official or licensed channels; photos only with a credit (2026-10-06)
**Decision:** a trailer is embedded only if YouTube's oembed names an official Marvel, Disney or Sony channel, or a licensed trailer channel (Movieclips, Rotten Tomatoes Trailers or Classic Trailers, Fandango), as author and the title matches the film; embeds use youtube-nocookie.com, lazy-loaded, with a title, and we never host video. Doug widened this from official-only the same day (no Marvel upload of the Iron Man or Iron Man 2 trailers could be verified). A photo is used only if it is CC BY, CC BY-SA, CC0 or public domain on Wikimedia Commons, with the artist and license read from Commons' metadata, a visible credit line, and a row in `public/data/media-credits.json` (which builds `/credits`). No studio posters or stills. A test enforces it. **Why:** studio stills risk copyright claims and the AdSense review. **Cost:** some pages have no picture rather than a weak one.

## ADR-009: The brand is MCU Easter Eggs (2026-10-06)
Doug chose the name MCU Easter Eggs on 2026-10-06 after buying mcueastereggs.com. This supersedes the earlier "Details You Missed" name (CLAUDE.md, ADR-006's type-only wordmark "DETAILS YOU MISSED") and the earlier note to keep Marvel/MCU out of the brand. The old name no longer appears on any page, title, meta tag, JSON-LD block, footer or tool output. Canonical URLs, og:url, sitemap, robots and JSON-LD now use https://mcueastereggs.com; marvel-details.pages.dev keeps working as the same site. The banner reads MCU EASTER EGGS in the same comic style. Menu: one row at 1000px and wider, an even grid below (5 columns, then 2), never a sideways scroll. Risk: "MCU" and Marvel references in a brand name raise a trademark question; it is added to the lawyer list (`Marvel-Details/lawyer-questions.md`). The site still says it is not affiliated with Marvel or Disney.

## ADR-011: The quiz has its own rank, kept in the member data (2026-10-06)
- **Decision:** quiz points build a separate quiz rank (Recruit to
  Inevitable, `ranks` in `public/data/quiz.json`). They do not change the
  hidden-details rank (Civilian to The Watcher), which measures how much of
  the site someone has explored.
- **Why:** the details rank is a share of a fixed set of details; points are
  open-ended. Mixing them would let a few quiz rounds jump someone to The
  Watcher without reading anything. Two ladders stay simple to explain.
- **Storage:** `quiz { points, games, best }` in the same local-first state as
  the other perks (ADR-008), so it syncs with no database change. Two devices
  merge by keeping the larger number, so points from rounds played on two
  devices while signed out are not added together (accepted: simple and can't
  double count).
- **Facts:** every question names its film, the scene, and a link about the
  film; answers must be checkable on screen. Rank titles are plain words, no
  characters.


## ADR-012: All photos and trailers come from one credits file, filled by checked scripts (2026-10-06)
- **Decision:** `public/data/media-credits.json` is the single list of media.
  `tools/fetch-media.py` adds photos from `tools/media-wanted.json` only after
  reading the license from Wikimedia (CC BY, CC BY-SA, CC0 or public domain,
  hosted on Commons, with an author); it crops and saves two WebP sizes.
  `tools/find-trailers.py` adds a trailer only when youtube.com/oembed names an
  ADR-010 channel and the title names the film. `tools/build-media.mjs` writes
  the home page sections, the cast galleries on movie hubs and the trailer
  rows on character pages from that file.
- **Trailer cards** are text and color, with no YouTube thumbnail (a frame
  shown outside YouTube's player is a film still). A click swaps in the
  youtube-nocookie player, so a page with 59 trailers loads none up front.
- **Wikimedia rate-limits shared cloud IPs** (429 with Retry-After up to 600 s),
  so the fetch also runs as a GitHub Action (`Fetch media`, or push a branch
  named `media/fetch-*`), which commits the photos back to the branch.
- **Why:** one list keeps `/credits` complete, the tests can check every page
  against it, and adding media is a data edit plus one command.
