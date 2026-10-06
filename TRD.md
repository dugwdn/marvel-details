# Marvel Details: technical design

Last updated 2026-10-06.

## Shape
A static site. Every page is a hand-written HTML file in `public/`, served
as-is by Cloudflare Pages. No build step. Since the member perks (2026-10-06)
there is a small member API in Pages Functions (`functions/`, see "Members").

```
public/
  index.html, about.html        home and about
  movies/                       5 movie hubs + index
  articles/                     articles + index
  scenes/  callbacks/  characters/  map/  rabbit-holes/   the five features
  data/*.json                   feature data (scenes, callbacks, characters,
                                rabbit holes, map connections)
  js/                           one script per feature + shared-data.js
  css/                          one stylesheet per feature (+ style.css, PR #1)
  sitemap.xml, robots.txt, ads.txt
```

## Data
Each feature reads its own JSON file from `/data/` in the browser.
`js/shared-data.js` is a small hub (`window.marvelData.hub`) that loads and
caches scenes, callbacks and connections, and indexes the map links.
Counts on 2026-10-05: 21 deleted scenes, 40 callbacks, 10 characters,
8 rabbit holes, 25 map nodes and 51 links.

The detail pages (`callbacks/callback-cb-001.html` and so on) are separate
static HTML files, not generated from the JSON. If you change the JSON,
change the matching page.

## Libraries
- vis-network from cdn.jsdelivr.net for the Universe Map. Nothing else.

## Hosting
- Cloudflare Pages project `marvel-details`, direct upload (no Git link).
  Production branch `phase-1-build`. Address https://marvel-details.pages.dev.
- Pages "pretty URLs": `/movies/endgame.html` redirects to `/movies/endgame`.
- With PR #1: `404.html` handles unknown addresses (without it, Pages
  serves the home page for every unknown address).
- Sign-in (ADR-007): Pages Functions in `functions/` answer `/api/auth/*`
  only (`public/_routes.json`); D1 database `marvel-details` (binding `DB`,
  schema in `migrations/`). `wrangler.toml` holds the Pages settings, the D1
  binding and the public `GOOGLE_CLIENT_ID`; Facebook and X ids and secrets
  are Pages secrets. An earlier Workers setup (`src/index.js`) was removed in
  favor of Pages. `npm run dev` and
  `npm run deploy` wrap the wrangler Pages commands.

## Styling
Each feature has its own stylesheet with a `prefers-color-scheme: dark`
block. PR #1 adds `css/style.css`, a shared dark page base those blocks
depend on. The home, movie and article pages are light only.

## Analytics and ads
- GA4 (`G-NESPZD6XSQ`): one snippet in every page's head, written by `tools/menu.mjs` (replaces any earlier one, so never doubled); no user id or events are sent.
- Ads: `js/ads.js` (loaded on every page but 404) loads AdSense for
  ca-pub-7178251279168670 and places three boxes: below the top, mid-page
  (pages long enough to have one) and before the footer. Boxes stay hidden
  until AdSense fills them. Slot numbers go in `SLOTS` at the top of
  `js/ads.js`; until then only Auto ads (if turned on in AdSense) can show.
  `ads.txt` lists the publisher ID. Every page has the
  `google-adsense-account` meta tag.

## Members (PR #21, ADR-008; stacks on the sign-in, ADR-007)
**Files**
```
public/js/members-core.js   pure logic: state shape, sanitize, merge, found
                            counter, rank math. Used by the browser, the
                            sync Function and the tests (ES module, no DOM).
public/js/members.js        page code (ES module, on every page via
                            tools/menu.mjs): buttons, spoiler blur, found
                            tracking, rank chip and toast, /me/, sync
public/data/ranks.json      rank ladder: titles, minPct thresholds, reasons
public/me/index.html        My Marvel (noindex, not in the sitemap)
functions/api/sync.js       GET/PUT /api/sync (uses who() from
                            functions/_lib/auth.js for the session)
migrations/0002_member_saves.sql  table saves (user_id = users.id)
test/members-core.test.mjs, test/sync.test.mjs
```
**Local state** (localStorage key `dym-members-v1`): `seen`, `saved`,
`favs` as `{id: {on, t}}` (t = ms; on:false is a dated removal), `saved`
items also carry title and url, `found` as `{"kind:id": t}` (kinds scene,
callback, rabbit), `settings.hideSpoilers` with its own t, `rankSeen` (the
highest rank already announced). The old `characterFavorites` key is folded
in once. `dym-signed-in` marks a browser with a session (set on /me/ and
/account from `GET /api/auth`), so other pages only call the API for
signed-in members (sync at most once a minute per tab, plus 1.5 s after a
change).
**Found counter:** totals come from `deleted-scenes.json` (21),
`callbacks.json` (40) and `rabbit-holes.json` (8) = 69. Only ids present in
today's data count. A rank needs ceil(minPct% x total) details; 100% needs all.
**Spoiler blur:** elements get `data-dym-movies`; blurred when the switch is
on and any listed film isn't marked Seen. Movie hubs: every detail panel and
the post-credits text (the page's film). Deleted scenes: the card body
(`data-movie-id`, or the film in the page address). Callbacks: the setup
part (foreshadow film), payoff part (fulfillment film) and the explanation
(both), via `callbacks.json`.
**Sync API:** `PUT /api/sync {data}` needs the sign-in cookie, JSON, and (when
the browser sends one) a same-site Origin. It merges the device's data into
the stored copy (same `merge` as the browser), drops removals older than 180
days, refuses over 16 KB (413) and returns the result. `POST
/api/auth/delete` also deletes the `saves` row. My Marvel shows the shared
sign-in panel (`fillSignIn` from `public/js/account.js`).
