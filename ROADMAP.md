# Marvel Details: roadmap

Last updated 2026-10-05. Work top to bottom. "Doug" items need his OK or
his accounts; the rest Claude does on a branch with a PR.

## Now
1. **Doug: publish PR #1** (map, dark mode, 404 page, addresses). Until
   then the live map is blank and dark-mode text is hard to read.
2. **Fix broken internal links** (about 50): the articles index lists 7
   unwritten articles, each callback links a "read more" article that
   doesn't exist, 11 character pages link `/contact`, two articles link
   writer pages and `/more`. Point each at a page that exists or remove it.
3. **Doug: GA4.** Create a property (or pick one) and send the
   measurement ID; Claude swaps it into the pages.
4. **Doug: domain.** Decide whether marveldetails.com moves from Wix to this
   site. If yes: add the custom domain in Cloudflare Pages, then Claude
   updates sitemap, robots, canonicals, and submits the sitemap in the
   existing Search Console property.
5. **Doug: pen names.** Decide how the four "house writers" are presented.

## Next
6. Write the 7 articles the index already promises, each with sources.
7. Add a link check to the test plan (script in `TEST_PLAN.md`) and run it
   in a GitHub Action on every PR.
8. Remove the unused Workers files (`src/`, `wrangler.toml`) and the
   leftover summary files (`BUILD_SUMMARY.txt`, `PHASE1_SUMMARY.txt`,
   `FILE_STRUCTURE.txt`, `MANIFEST.md`, `QUICKSTART.md`,
   `DEPLOY_INSTRUCTIONS.md`) once `RUNBOOK.md` covers them.

## Later
9. Phase 2 films, picked by search demand (Keyword Planner) rather than
   release order.
10. Phase 3: ads (AdSense) once traffic justifies it; real `ads.txt`.
