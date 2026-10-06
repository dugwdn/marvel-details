# Marvel Details: technical design

Last updated 2026-10-05.

## Shape
A static site. Every page is a hand-written HTML file in `public/`, served
as-is by Cloudflare Pages. No build step, no server code.

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
- GA4 tag on the home page and one article, ID still `G-XXXXXXXXXX`.
- Ads: `js/ads.js` (loaded on every page but 404) loads AdSense for
  ca-pub-7178251279168670 and places three boxes: below the top, mid-page
  (pages long enough to have one) and before the footer. Boxes stay hidden
  until AdSense fills them. Slot numbers go in `SLOTS` at the top of
  `js/ads.js`; until then only Auto ads (if turned on in AdSense) can show.
  `ads.txt` lists the publisher ID. Every page has the
  `google-adsense-account` meta tag.
