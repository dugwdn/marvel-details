# Marvel Details: roadmap

Last updated 2026-10-05. Work top to bottom. "Doug" items need his OK or
his accounts; the rest Claude does on a branch with a PR.

## Now
1. **Doug: publish PR #1.** It fixes the blank map, dark-mode text, the
   catch-all redirect and the old addresses, and removes 77 links to pages
   that don't exist (7 unwritten articles, related-article links on 34
   callback pages, Contact, More and writer links). It also adds a link
   check that runs on every PR. Until it's published, the live map is blank.
2. **Doug: GA4.** Create a property (or pick one) and send the
   measurement ID; Claude swaps it into the pages.
3. **Doug: domain.** Decide whether marveldetails.com moves from Wix to this
   site. If yes: add the custom domain in Cloudflare Pages, then Claude
   updates sitemap, robots, canonicals, and submits the sitemap in the
   existing Search Console property.
4. **Doug: pen names.** Decide how the pen-name "house writers" (Alex
   Continuity, Maya Dialogue and others) are presented.

## Next
5. Write the 7 articles PR #1 took off the articles index (first armor,
   Black Widow's intel, the Iron Man 3 Mandarin scene, Endgame's final
   fight, the Avengers post-credits scene, Whiplash's whips, the Quantum
   Realm's color), each with sources, then list them again.
6. Add a favicon (every page currently requests `/favicon.ico` and gets a 404).
7. Remove the unused Workers files (`src/`, `wrangler.toml`) and the
   leftover summary files (`BUILD_SUMMARY.txt`, `PHASE1_SUMMARY.txt`,
   `FILE_STRUCTURE.txt`, `MANIFEST.md`, `QUICKSTART.md`,
   `DEPLOY_INSTRUCTIONS.md`); `RUNBOOK.md` replaces them.

## Later
8. Phase 2 films, picked by search demand (Keyword Planner) rather than
   release order.
9. Phase 3: ads (AdSense) once traffic justifies it; real `ads.txt`.
