# Changelog

Newest first. Dates are when the change went live, or "not live" for
merged-but-unpublished work.

## 2026-10-06
- Characters (not live yet): 20 characters instead of 10. New: Thanos,
  Spider-Man, War Machine, Captain Marvel, Doctor Strange, Black Panther,
  Scarlet Witch, Ant-Man, Nebula and Obadiah Stane, each with a page,
  timeline and credited Wikimedia Commons actor photo. Removed the made-up
  numbers (kill counts, "times saved the universe", near-death counts and
  others). Cards, popups and pages now show facts you can check: first MCU
  film and which of our 5 films the character is in. Fixed wrong timeline
  points (Hawkeye's first film is Thor, not Iron Man 2; Happy Hogan isn't
  in The Avengers; others in Black Widow, Hulk and Pepper Potts).
- Universe Map window (not live): /map/ opens as a full-screen window over
  the site with a big yellow "Back to the site" button, a close button and
  Esc, all returning to the page the visitor came from (or home). New space
  look: starfield and grid backdrop, glowing nodes, light outlined labels,
  cyan links, dark HUD sidebar. Fixes the long white hover bar that printed
  raw <strong>/<br/> code: hover tips are now a dark, wrapping card.
- Comic panels site-wide (not live yet): movie hubs (details two across
  with yellow caption headings), callback pages (speech-bubble scene
  notes), rabbit-hole chapters, character pages and the About page now use
  the same black-bordered comic panels as the articles.
- Articles as comic strips (not live yet): each article section is now a
  comic panel with a yellow caption box for its heading, scene notes are
  speech bubbles, panels sit two across on desktop and stack on phones.
  Panels are written by `python3 tools/comic-panels.py` (run it after
  adding an article).
- Popup buttons (not live): in the character popup the journey is now
  numbered steps (last step in amber) and each Similar Arc is a real button
  that opens that character, with its full description instead of one cut
  off at 60 characters. Bigger close button. Nothing overflows on phones.
- Popups (not live yet): the character popup on /characters/ and the
  Universe Map hover tips and node panel now look like a dark holographic
  AI-assistant screen (dark glass, cyan glow, amber accents) instead of a
  bright white box. Same look in light and dark mode. Our own design.
- Trailers and actor photos (not live yet): each of the 5 movie pages and
  the Spider-Man: Brand New Day article now play the official trailer with
  YouTube's own embedded player (Marvel Entertainment, Sony's Spider-Man
  channel, or Movieclips for Iron Man 1 and 2, which have no studio upload).
  The 10 character pages show a free-license photo of the actor from
  Wikimedia Commons, credited with photographer and license
  (`public/img/actors/`). No studio posters or stills.
- Home menu button darkened to #c62828 so its white text passes 4.5:1.
- **Live:** published commit 9f67a72 (comic look, Brand New Day banner).

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
