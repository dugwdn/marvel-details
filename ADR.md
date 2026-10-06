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

## ADR-007: Member perks are local-first; sync with D1 and Google-only sign-in, no email (2026-10-06)
**Decision:** the perks (Seen it, Save, favorites, found counter and ranks)
live in the visitor's browser (localStorage) and work with no account. An
optional Google sign-in (Google Identity Services button) syncs them through
Cloudflare Pages Functions (`functions/api/*`) into one D1 database
(`marvel-details-members`: users, sessions, saves). The server checks the
Google ID token itself (RS256 signature against Google's JWKS with WebCrypto;
aud = `GOOGLE_CLIENT_ID`, iss, exp) and keeps only Google's `sub` and the
first name, never the email. Sessions are a random token in an HttpOnly,
Secure, SameSite=Lax cookie, stored hashed. Each person's data is one JSON
blob, capped at 16 KB. Merging is a union of both sides with "newest change
wins" per item (removals are kept as dated tombstones so they stick), and
last-write-wins for settings. `_routes.json` sends only `/api/*` to Functions.
**Why:** most visitors never sign up, so the perks must not depend on it;
no email means nothing worth stealing and no mailing-list obligations; D1 and
Functions are on the same free Cloudflare plan as the site; one provider
keeps the code and the privacy page small; no auth library means no build step.
**Cost:** first server code in the repo and a `wrangler.toml` that deploys
now depend on (a real D1 id is needed before the next deploy); Google-only
excludes people without Google accounts; no email means no "forgot account"
help and no weekly digest without a later change; the 13+ check is a
self-declared checkbox.
