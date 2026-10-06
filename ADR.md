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
