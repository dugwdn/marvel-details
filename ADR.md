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
Doug wants the site to feel like Marvel's own site because the visitors are Marvel fans, without using anything illegally. Decision: a dark theme with bold condensed uppercase type, a single red accent and image-style poster tiles, all in `public/css/theme.css`, loaded last on every page. We use free fonts (Oswald, Inter), a type-only wordmark "DETAILS YOU MISSED" and no Marvel logos, artwork, screenshots or the red box logo shape. A general style (dark, bold, red) is not protected; a confusingly similar logo or copied assets would be. The footer and About page keep "not affiliated with Marvel or Disney".
