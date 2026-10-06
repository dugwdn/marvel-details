# Marvel Details: roadmap

Last updated 2026-10-06. Work top to bottom. "Doug" items need his OK or
his accounts; the rest Claude does on a branch with a PR.

## Now
1. **Doug: publish PR #1.** It fixes the blank map, dark-mode text, the
   catch-all redirect and the old addresses, and removes 77 links to pages
   that don't exist (7 unwritten articles, related-article links on 34
   callback pages, Contact, More and writer links), adds a favicon, and adds a link
   check that runs on every PR. Until it's published, the live map is blank.
2. **Doug: GA4.** Create a property (or pick one) and send the
   measurement ID; Claude swaps it into the pages.
3. **Doug: domain.** Decide whether marveldetails.com moves from Wix to this
   site. If yes: add the custom domain in Cloudflare Pages, then Claude
   updates sitemap, robots, canonicals, and submits the sitemap in the
   existing Search Console property.
4. **Doug: pen names.** Decide how the pen-name "house writers" (Alex
   Continuity, Maya Dialogue and others) are presented.

5a. **Doug: member perks PR.** Review the draft PR (Seen it, Save,
   favorites, found counter and ranks, My Marvel, optional Google sign-in).
   Before merging and deploying: create the D1 database, put its id in
   `wrangler.toml`, run the migration and set `GOOGLE_CLIENT_ID` (RUNBOOK
   "Member accounts"). Ask a lawyer about rank titles using Marvel
   character names.

## Next
5. Write the 7 articles PR #1 took off the articles index (first armor,
   Black Widow's intel, the Iron Man 3 Mandarin scene, Endgame's final
   fight, the Avengers post-credits scene, Whiplash's whips, the Quantum
   Realm's color), each with sources, then list them again.

## Later
- Members: "New since your last visit" on favorite characters (needs
  added/updated dates in `characters.json`); GA4 events for Save/Seen/sign-in;
  a weekly email only if Doug wants it (would mean storing email: new ADR).
6. Phase 2 films, picked by search demand (Keyword Planner) rather than
   release order.
7. Ads are built in (hidden until filled). Doug: add marvel-details.pages.dev
   (or the final domain) in AdSense > Sites and send the three slot numbers.
