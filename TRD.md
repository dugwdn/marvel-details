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
- The repo has no Workers code; an earlier Workers setup (`src/index.js`,
  `wrangler.toml`) was removed in favor of Pages. `npm run dev` and
  `npm run deploy` wrap the wrangler Pages commands.

## Styling
Each feature has its own stylesheet with a `prefers-color-scheme: dark`
block. PR #1 adds `css/style.css`, a shared dark page base those blocks
depend on. The home, movie and article pages are light only.

## Analytics and ads
- GA4 tag on the home page and one article, ID still `G-XXXXXXXXXX`.
- Ads: `js/ads.js` (loaded on every page but 404) loads AdSense for
  ca-pub-7178251279168670 and places three boxes: below the top, mid-page
  (pages long enough to have one) and before the footer. Boxes stay hidden
  until AdSense fills them. Slot numbers go in `SLOTS` at the top of
  `js/ads.js`; until then only Auto ads (if turned on in AdSense) can show.
  `ads.txt` lists the publisher ID. Every page has the
  `google-adsense-account` meta tag.

## Members (member-perks PR)
**Files**
```
public/js/members-core.js   pure logic: state shape, sanitize, merge, found
                            counter, rank math. Used by the browser, the
                            Functions and the tests (ES module, no DOM).
public/js/members.js        page code (ES module, on every page via
                            tools/menu.mjs): buttons, spoiler blur, found
                            tracking, rank chip and toast, /me/, sign-in, sync
public/data/ranks.json      rank ladder: titles, minPct thresholds, reasons
public/me/index.html        My Marvel (noindex, not in the sitemap)
public/privacy/index.html   what is stored
functions/api/me.js         GET  /api/me
functions/api/auth/google.js POST /api/auth/google  {credential, over13}
functions/api/auth/signout.js POST /api/auth/signout
functions/api/auth/delete.js  POST /api/auth/delete
functions/api/sync.js       GET/PUT /api/sync
lib/google-auth.js          Google ID token check (JWKS + WebCrypto, claims)
lib/members-server.js       JSON replies, cookie, session lookup
migrations/0001_members.sql D1 tables users, sessions, saves
wrangler.toml               pages_build_output_dir = "public", D1 binding DB
test/*.test.js              node --test (npm test)
```
**Local state** (localStorage key `dym-members-v1`): `seen`, `saved`,
`favs` as `{id: {on, t}}` (t = ms; on:false is a dated removal), `saved`
items also carry title and url, `found` as `{"kind:id": t}` (kinds scene,
callback, rabbit), `settings.hideSpoilers` with its own t, `rankSeen` (the
highest rank already announced). The old `characterFavorites` key is folded
in once. `dym-signed-in` marks a browser with a session, so pages only call
the API for signed-in members (sync at most once a minute per tab, plus 1.5 s
after a change).
**Found counter:** totals come from `deleted-scenes.json` (21),
`callbacks.json` (40) and `rabbit-holes.json` (8) = 69. Only ids present in
today's data count. A rank needs ceil(minPct% x total) details; 100% needs all.
**Spoiler blur:** elements get `data-dym-movies`; blurred when the switch is
on and any listed film isn't marked Seen. Movie hubs: every detail panel and
the post-credits text (the page's film). Deleted scenes: the card body
(`data-movie-id`, or the film in the page address). Callbacks: the setup
part (foreshadow film), payoff part (fulfillment film) and the explanation
(both), via `callbacks.json`.
**API:** Functions only run for `/api/*` (`public/_routes.json`). Writes must
be `application/json` and same-origin (CSRF guard). Sign-in needs
`over13: true`. The ID token is verified with Google's keys from
`https://www.googleapis.com/oauth2/v3/certs` (cached per Cache-Control, at
most 6 h): alg RS256, signature, aud = `GOOGLE_CLIENT_ID`, iss
accounts.google.com, exp/iat with 60 s skew. Stored: `sub`, `given_name`
(40 chars). Session: 32 random bytes in cookie `__Host-dym_session`
(HttpOnly, Secure, SameSite=Lax, 30 days); D1 keeps its SHA-256. PUT
/api/sync merges the device's data into the stored copy (same `merge` as the
browser), drops removals older than 180 days, refuses over 16 KB (413) and
returns the result. Without `GOOGLE_CLIENT_ID` or the `DB` binding,
/api/me says `signInAvailable: false` and the page shows "Sign-in is coming
soon; your list is saved on this device."
**Third-party script:** `https://accounts.google.com/gsi/client`, loaded on
/me/ only after the 13+ box is ticked.
