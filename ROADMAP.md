# Marvel Details: roadmap

Last updated 2026-10-06. Work top to bottom. "Doug" items need his OK or
his accounts; the rest Claude does on a branch with a PR.

## Now
1. **Doug: publish PR #1.** It fixes the blank map, dark-mode text, the
   catch-all redirect and the old addresses, and removes 77 links to pages
   that don't exist (7 unwritten articles, related-article links on 34
   callback pages, Contact, More and writer links), adds a favicon, and adds a link
   check that runs on every PR. Until it's published, the live map is blank.
2. **GA4: done in code** (`G-NESPZD6XSQ`, every page); goes live at the next deploy.
3. **Doug: domain.** Decide whether marveldetails.com moves from Wix to this
   site. If yes: add the custom domain in Cloudflare Pages, then Claude
   updates sitemap, robots, canonicals, and submits the sitemap in the
   existing Search Console property.
4. **Doug: pen names.** Decide how the pen-name "house writers" (Alex
   Continuity, Maya Dialogue and others) are presented.

5a. **Doug: member perks PR #21.** Review it after the sign-in PR #18
   (it stacks on #18 and merges after it). Then run
   `npx wrangler d1 migrations apply marvel-details --remote` and publish
   (RUNBOOK "Member perks sync"). Ask a lawyer about rank titles using
   Marvel character names.

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

## Later
- Members: "New since your last visit" on favorite characters (needs
  added/updated dates in `characters.json`); GA4 events for Save/Seen/sign-in;
  a weekly email only if Doug wants it (would mean storing email: new ADR).
6. Phase 2 films, picked by search demand (Keyword Planner) rather than
   release order.
7. Ads are built in (hidden until filled). Slot `7081225657` is in; Doug: deploy,
   and keep the site (or final domain) listed in AdSense > Sites.
