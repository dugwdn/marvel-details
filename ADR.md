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

## ADR-013: Photo and trailer credits live on one page, not under each photo (2026-10-06)
Doug: "way too much info about the source. no sourcing info needed." Captions
under photos and channel lines under trailers are gone. Every credit (author,
license, Commons file, YouTube channel) stays complete on /credits, which every
footer links to as "Photos and Credits"; `test/media.test.mjs` fails if a page
shows a source line or a page with media lacks that link. Whether a credits
page is enough attribution for CC BY/BY-SA is on the lawyer list; until then
the page lists every photo in full. Media in headers: pages about a film carry
its trailer and cast photos inside the header box (`addFilmHeroes` in
tools/build-media.mjs, also called by build-hubs.mjs and build-callbacks.js).

## ADR-014: Live Edit, Doug's on-page editor (2026-10-12)
Doug, after trying it on webdesignnerd.com: "i want it, visible and usable to
me only of course, on all of my sites". `functions/_middleware.js` runs the
shared module (`functions/_lib/live-edit/`, copied from dugwdn/wdn-website
`tools/live-edit/` by its `build.mjs`; edit it there). `?wdn-edit` on any page
signs Doug in through his WordPress login on webdesignnerd.com, which returns a
signed one-time pass; this site keeps no passwords or secrets. Edits are
overrides in KV namespace `marvel-details-live-edit` (binding `LIVE_EDIT`); the
built pages never change, and pages with no edits pass through untouched.
Supersedes the "only `/api/*` runs code" line of ADR-007: `public/_routes.json`
now sends every page to Functions, with `/css/*`, `/js/*`, `/img/*` and
`/data/*` excluded. Header and footer edits apply on every page; forms, ads and
the quiz are never editable. To make a wording change permanent, edit the
source and then use Changes > Original on that edit.

## ADR-015: Discussions on every detail page, plus message boards (2026-10-15)
Doug, 2026-10-05: "Make sure we've got discussion features all over the Marvel
site. Just like the credible theory site". Credible Theories has run the same
system since 2026-10-07 (its ADR 0010 and 0012), so this is a port of that
code, not a new design: `functions/_lib/discuss.js` (from rabbit-hole-files
`worker/discuss.js`) behind `/api/discuss/*`, `public/js/discuss.js` and
`public/css/discuss.css` in the browser. Reading needs no account; posting
needs the site's sign-in (ADR-007). Every article, movie hub, deleted scene,
callback, character, rabbit hole, Coming Soon and the quiz gets a box
(`addDiscussion` in `tools/menu.mjs`); `/boards/` has 12 topic boards
(`public/data/boards.json`, pages from `tools/build-boards.mjs`). Boards
replaced Home as the first menu item (the banner already links home).
Moderation is by the readers first: Hide and Block on every post, a post
folds after `HIDE_THRESHOLD` hides or reports (default 5), and moderators
listed in `MOD_MEMBERS` work the queue at `/boards/moderate`. Spam guards are
CT's: Turnstile when keyed, a honeypot, a too-fast check, rate limits, a link
limit, duplicate and blocked-word checks, and a new member's first links held
for review. Reply emails are opt-in (the member types an address on
/account); they send through Resend when `RESEND_API_KEY` is set and wait in
`mail_queue` until then. The tables are created on first use (same as CT),
so no migration step. Delete my account removes the member's posts, marks,
alerts and queued mail. The rank badge beside a name is the member's
found-details rank (ADR-008). Drops CT's file votes and day streaks: this
site has neither.

## ADR-016: Posters on movie pages, trailer thumbnails as covers (2026-10-15)
Doug, 2026-10-15: "I want photos of the superheroes in action. I want it big,
I want it exciting. I want movie posters used." He picked "Embeds + posters"
and layout A from three mockups, and added: no buttons for more pictures,
"they're coming for lore and easter eggs and conversation."
- **Posters:** each movie hub shows that film's theatrical poster beside the
  trailer in a dark band at the top of the header. One poster, only on that
  film's own page, next to our commentary, 480 px wide, credited to Marvel
  Studios on /credits, removed on any takedown request. Listed under
  `posters` in `public/data/media-credits.json`; `test/media.test.mjs`
  enforces one per page and only its own film. Fair use is on the lawyer
  list (2026-10-15) and does not block. Supersedes the "no studio posters"
  line of ADR-010.
- **Trailer covers:** every trailer play button in a page header now shows
  that trailer's own YouTube thumbnail, loaded from i.ytimg.com (YouTube's
  image server, the same frame YouTube shows before play), in place of the
  cast-photo mosaic. Never downloaded, never used for any other video.
  Supersedes the "no YouTube thumbnail" line of ADR-012 for header buttons.
- **Kept:** no downloaded film stills or character art; no "+N more" photo
  links in headers.
- **Saved for later:** official posters for all 59 titles, and free-license
  photos (cosplay, Avengers Campus, D23, exhibits) each with a saved copy of
  its license page, in /mnt/project-files/Marvel-Details/image-library/.

## ADR-017: The home page opens with the newest movie, a theory, the boards and easter eggs (2026-10-15)
Doug, 2026-10-15: "I don't want actors. Regular photos at the top of the home
screen ... should be our most thrilling content. Use your theories. Busy message
boards cool easter eggs that people theorize about." He picked layout A from
three mockups.
- The plain red "newest movie" banner is replaced by `homeHero` (tools/build-media.mjs):
  the newest movie's real poster (the same art Wikipedia uses), its official trailer
  with the trailer's own frame as cover, and the link to its easter-egg article. Change
  `NEWEST` when a new film comes out. This extends ADR-016: the newest movie's poster
  may also lead the home page (`pages: ["/"]` in its `posters` entry).
- `homeLead` follows it: "Theory of the week" (one rabbit hole, the same for everyone
  each week, picked in public/js/media.js), "On the boards" (the newest posts through
  discuss.js; until anyone posts it shows three board starter questions, labeled as
  ours, never invented posts), and three easter eggs (a callback and two rabbit holes).
- The "Faces of the MCU" actor wall stays, below these.

## ADR-018: Scene trivia with an Ask box, and fan theory pages (2026-10-15)
Doug, 2026-10-15: "search reddit, and other places where theories would be had by
standard users and illustrate those theories here. especially the popular ones."
Then: "Someone should be able to ask silly trivia ... What was the time on the clock
behind iron man as he spoke, that sort of thing should be included ... Find that
level of content and import it." Layout A ("Ask first") built while he picks from
three mockups.
- **Trivia:** `/trivia/` opens with "Ask about any scene" (`public/js/trivia.js`,
  rules in `trivia-core.js`): answered in the browser from `public/data/trivia.json`,
  no server, no AI, no cost. Words match only at the start of a word; when no fact
  matches every word, the closest are shown and labeled as close. One page per film
  or show at `/trivia/<slug>`, facts grouped by kind, with a discussion box.
- **Where trivia comes from:** the fan-run Marvel Cinematic Universe Wiki's
  "<title>/Trivia" pages, whose text is CC BY-SA 3.0 (Fandom's license), imported by
  `python3 tools/import-wiki-trivia.py`. Text only; the wiki's pictures are film stills
  and stay off the site. CC BY-SA asks for credit, a link, the license and a note of
  changes: each trivia page links its wiki page and `/credits#trivia` carries the rest
  (Doug's rule: no license lines on pages). Our trivia text is shared under the same
  license. Facts are labeled "not yet checked by us"; readers can flag errors below.
- **Fan theories:** `/theories/` and `/theories/<id>` from `public/data/theories.json`
  (`python3 tools/import-theories.py` copies the checked research from
  /mnt/project-files/Marvel-Details/fan-theories/, then `node tools/build-theories.mjs`).
  Each theory is told in our own words (Reddit posts are their authors'), stamped
  Still open, Partly true, Confirmed or Debunked, and "illustrated" with our own
  evidence board: numbered clue cards naming the film and scene. No stills needed.
  A Confirmed, Partly or Debunked stamp needs a source that settles it; every clue
  needs a source; `test/trivia.test.mjs` enforces both.
- **Menu:** Trivia and Theories join it; twelve buttons in two rows of six on every
  wide screen (two columns on phones), so there is no orphan.
- **Home:** Theory of the week now rotates through the most talked-about fan theories.
