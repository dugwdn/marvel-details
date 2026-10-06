# Changelog

Newest first. Dates are when the change went live, or "not live" for
merged-but-unpublished work.

## 2026-10-05
- Brand banner (not live): a big "Details You Missed" comic banner
  (sunburst, the site's own magnifying-glass mark, yellow lettering) on
  every page, plus comic lettering on headings and comic-panel cards, back
  buttons, section titles and footer.
- Menu (not live): every page now has the same menu of big comic-style
  buttons (Home, Articles, Movies, Deleted Scenes, Callbacks, Characters,
  Universe Map, Rabbit Holes, About), with the current section in yellow.
  Pages that had no menu (callbacks, map, rabbit holes, 404) now have one.
  Written by `tools/menu.mjs`; styles in `public/css/theme.css`.
  Replaces the red hero menu from PR #9.
- Newest-movie banner (not live yet): a big home page banner for
  Spider-Man: Brand New Day linking to a new easter eggs article
  (`/articles/spider-man-brand-new-day-easter-eggs`). Each reported egg is
  labeled "Reported" until we check it. Banner art is our own abstract
  red gradient and city silhouette: no characters, logos or posters.
- New look (not live yet): in the style Marvel fans expect. Light content
  area with black bars (dark mode follows the device), bold condensed
  uppercase headings (Barlow Condensed), red accent, black top bar
  with our own type-only wordmark, red-to-black poster tiles for movies.
  Original: no Marvel logos, art or assets. `public/css/theme.css`.
- **Live:** published commit ecf0b8b (PRs #1, #2, #3, #4) to
  https://marvel-details.pages.dev from Doug's laptop. Checked: home, map
  (draws), scenes, green drink article, 404 on a made-up address, ads.txt.
- Green drink article: the Age of Ultron return and the "different shade"
  idea are now marked unconfirmed; placeholder source links replaced with
  real ones.
- Ads: three AdSense boxes on every page, hidden until filled; real
  `ads.txt`; AdSense account meta tag. Placeholder "Advertisement Slot"
  boxes removed.
- **Live:** published commit 1b05021 to https://marvel-details.pages.dev.
  All five features are now online: Deleted Scenes Registry, Foreshadowing
  and Callbacks, Character Arc Tracker, Universe Map, Rabbit Holes. (The
  previous production upload was commit 3aad3a3, from before the features.)
- **Not live (PR #1, draft):** Universe Map draws again; readable dark mode
  on feature pages; real 404 page; sitemap and robots point at
  marvel-details.pages.dev; feature READMEs moved to `docs/features/`;
  77 links to pages that don't exist removed; link check on every PR.
- Added the standard docs: CLAUDE.md, PRD, TRD, ADR, ROADMAP, RUNBOOK,
  TEST_PLAN, CHANGELOG.

## 2026-10-05 (earlier)
- Phase 1 build: home, about, 5 movie hubs, 3 articles, then the five
  features in four commits.
