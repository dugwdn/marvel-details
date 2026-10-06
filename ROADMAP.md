# MCU Easter Eggs: roadmap

Last updated 2026-10-06 (overnight audit). Work top to bottom. "Doug" items
need his OK, accounts or his laptop; the rest Claude does on a branch with a PR.

## Now (Doug)
1. **Deploy.** Live is 79366ad. Merged and waiting: More from us (#24), GA4 (#25),
   compact header with search (#26), AdSense slot (#27), plus whatever docs and
   link fixes merge after. Run the publish line in RUNBOOK. Until then GA4
   collects nothing and ads can't fill.
2. **Confirm the D1 migration** `npx wrangler d1 migrations apply marvel-details --remote`
   (the `saves` table for member sync). Not verifiable from the sandbox.
3. **Facebook and X sign-in keys** (RUNBOOK "Sign-in keys"); Google already works.
4. **Search Console** for mcueastereggs.com: add the property, submit the sitemap
   (Bing Webmaster Tools too, import from Search Console).
5. **AdSense:** confirm mcueastereggs.com is added and reviewed.
6. **Domain:** decide whether marveldetails.com (old Wix site) moves here or redirects.
7. **Pen names:** decide how the "house writers" are presented (keep and label as pen names, or credit Doug).
8. **Lawyer list:** MCU in the brand name; rank titles that use Marvel character names.

## Now (Claude, no Doug needed)
1. Finish draft PR #28: images, trailers, credits page, official-trailer rule.
2. Dead-link fixes (another thread); keep `node tools/check-links.mjs` green.
3. Write the 7 missing articles, each with sources, then list them: first armor,
   Black Widow's intel, the Iron Man 3 Mandarin scene, Endgame's final fight, the
   Avengers post-credits scene, Whiplash's whips, the Quantum Realm's color.
   (4 articles exist today.) Run `node tools/menu.mjs` and `python3 tools/comic-panels.py` after.

## Next
- Swap the Iron Man and Iron Man 2 trailers for Marvel's own uploads if they appear.
- Finish portraits for the top 60 characters in the list (53 left) and location photos for the Avengers, Iron Man 3 and Endgame hubs: Wikimedia's API rate-limited us for hours, so these wait for a run with `/tmp`-style batching (8 actors a request, 20 s apart).
- A Coming Soon page with official trailers for confirmed titles (there is no
  /upcoming/ page yet).
- More free-license pictures for articles, callbacks and scenes only where a
  real place or object fits (Grand Central for The Avengers wasn't confirmed
  in our sources, so it was skipped).
5. Write the 7 articles PR #1 took off the articles index (first armor,
   Black Widow's intel, the Iron Man 3 Mandarin scene, Endgame's final
   fight, the Avengers post-credits scene, Whiplash's whips, the Quantum
   Realm's color), each with sources, then list them again.
- **Coming Soon weekly scan routine:** a weekly check of official sources for
  upcoming MCU releases, feeding a Coming Soon page (`feat/upcoming-page` branch
  holds an early start). Only official dates; unconfirmed items say so.
- **Encyclopedia stages:** grow the MCU Character List (797) into a fuller
  encyclopedia in stages: (1) per-character pages for the list, (2) titles and
  events pages, (3) link each entry to our callbacks, scenes and map nodes.
  Every fact checkable; no copied IMDb text.
- **Membership perks, second wave:** "New since your last visit" on favorite
  characters (needs added/updated dates in `characters.json`), GA4 events for
  Save, Seen and sign-in, a rank share card. A weekly email only if Doug wants
  it (stores email: needs a new ADR and a privacy update).
- More GA4 goals: second-page rate, saves per visitor, sign-in rate.

## Later
- Phase 2 films, picked by search demand (Keyword Planner), not release order.
- Real profile links for `sameAs` once official profiles exist.
- Display ads tuned after AdSense approval; ad slots per page type if needed.
- Prune merged branches (list in CLAUDE.md).

## Media rules (standing)
YouTube embeds from official or licensed channels are allowed (YouTube's own
player, no downloads). No studio posters, stills or character art. Actor photos
only from Wikimedia Commons under a free license, with a credit line.

## Done
- PR #1 fixes (map, dark mode, real 404, sitemap, link check), live 2026-10-05.
- Sign-in (ADR-007) and member perks (ADR-008): live in 79366ad; Google on.
- Rebrand to MCU Easter Eggs (ADR-009), live in 79366ad.
- Characters 10 to 20, popups, full-screen map, comic panels: live.
