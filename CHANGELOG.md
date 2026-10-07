# Changelog

Newest first. Dates are when the change went live, or "not live" for
merged-but-unpublished work.

## 2026-10-07 (Sign-in pop-up, not live yet)
- Doug's standing rule: after 12 seconds on the site (added up across pages
  in one visit, only while the tab is in view), a signed-out visitor sees one
  pop-up, "Create your free account", with a big button for each sign-in
  that is on right now (Google first, then Facebook once its keys are in;
  never X). One click goes into the site's own sign-in. Once a visit;
  closing it (X, backdrop, Esc, Not now, the device's back button) rests it
  for 3 days. Never on `/account`, `/me/`, privacy, inside RightPlace
  (`?from=rightplace`), during a quiz round, or while a typing box has focus.
- `public/js/signin-popup.js` (page) and `public/js/signin-popup-core.js`
  (rules, tested by `test/signin-popup.test.mjs`); every page loads it via
  `node tools/menu.mjs`.

## 2026-10-06 (Typing boxes and the on-screen keyboard, not live yet)
- Doug's standing rule: every typing box, and what tells you what to type in
  it, stays in view while the device keyboard is out, and the keyboard is as
  small as possible. Every page loads `/js/keyboard.js` and its viewport tag
  has `interactive-widget=resizes-content` (both written by
  `node tools/menu.mjs`).
- The header search, Characters, Character List, Deleted Scenes, Callbacks,
  Rabbit Holes and Universe Map search boxes ask for the search keyboard with
  a Search key and no suggestion bar or autofill. The header search shows its
  "Search the site" label when opened on a small or touch screen; Callbacks
  and the Universe Map search got a visible label.
- `test/keyboard.test.mjs` checks the tags and attributes;
  `scripts/keyboard-check.mjs` taps each box at 390x640 with a 300px
  keyboard (16 failing before, 0 after).

## 2026-10-06 (Home spotlight filled in, not live yet)
- Home page "Faces of the MCU" spotlight: the empty space beside the photo
  now shows the character's arc line, abilities and skills, closest allies,
  biggest enemies and every MCU movie and show they are in, plus a "Full
  character page" button. Every name and title is a link: the 5 movie hubs
  go to their page, other titles open the character list filtered to that
  title (`/characters/all/?in=N`), characters go to their page or their row
  on the list. Abilities, allies and enemies live in
  `public/data/spotlight.json` (12 spotlight characters, each with a source
  article); `test/media.test.mjs` checks the ids and every link. Rotation is
  8 seconds now since there is more to read.

## 2026-10-06 (Character page timeline cleanup, not live yet)
- Character pages (all 20): opening a timeline milestone showed each line
  (Movie, Key Moment, Description, Emotional State, Arc Stage, Tagline) as
  its own dark box with a thick offset border inside a light box, with big
  gaps. The site-wide comic-panel rule in theme.css was matching those
  inner rows. Now the opened milestone is one comic panel with yellow caption
  labels, two columns on desktop and one on phones, in light and dark mode.
- Removed the repeated "Character Arc Timeline" title and thesis line the
  timeline script printed under the page's own heading.

## 2026-10-06 (Movie headers with media, credits on one page, not live yet)
- Movie pages, deleted-scene pages and callback pages: the header box now has
  the official trailer (click to play; its cover is the film's cast photos)
  and, on movie and deleted-scene pages, a strip of cast faces linking to
  each character. Callback pages show the trailer of the film that sets it up
  and the film that pays it off. The separate trailer block lower on movie
  pages is gone (it moved into the header).
- Removed every "Photo: author, license, Wikimedia Commons" caption and every
  "Trailer from ... channel" line across the site (home photo wall, movie
  galleries, character pages, the character list, articles, Coming Soon).
  All credits stay complete on /credits, now titled "Photos and Credits" and
  linked from every footer (ADR-013).
- Fixed: Iron Man's cast showed Don Cheadle as Rhodey (Terrence Howard played
  him there), and The Avengers showed Josh Brolin as Thanos (Damion Poitier
  played him there). `RECAST` in tools/build-media.mjs keeps those photos off.

## 2026-10-06 (Fresh CSS on every deploy, not live yet)
- Fixed: after the photos deploy, the home page "Faces of the MCU" spotlight,
  photo wall and trailer rows showed unstyled for visitors who had the site
  open earlier. Cause: mcueastereggs.com's Cloudflare zone keeps /css and /js
  for 4 hours, so new HTML loaded with old CSS. `node tools/menu.mjs` now adds
  `?v=<file hash>` to every local CSS and JS link, so each deploy is a fresh
  address. `test/assets.test.mjs` checks it.

## 2026-10-06 (More photos and trailers, not live yet)
- Home page: "Faces of the MCU" (a rotating actor spotlight and a wall of
  credited real-life actor photos, each linking to the character) and "Watch
  the Trailers" (official trailers for all 38 MCU movies and 21 series,
  newest first; the player loads only when clicked).
- Movie hubs: "The Cast in Real Life" photo gallery. Character pages: a row
  of trailers for every title the character is in.
- Character list: more actor portraits (fetched and license-checked).
- New tools: `fetch-media.py`, `find-trailers.py`, `build-media.mjs`, and a
  `Fetch media` GitHub Action. ADR-012.

## 2026-10-06 (Marvel quiz, not live yet)
- New `/quiz/`: 82 questions in four levels, Sidekick (easy), Hero
  (medium), Avenger (hard) and Inevitable (insanely hard, 15-second timer).
  Ten shuffled questions a round, the answer, why and where to check it
  after each one, streak and perfect-round bonuses, and a quiz rank from
  Recruit to Inevitable by lifetime points. Guests play with no account;
  the end screen offers Google sign-in to keep points on every device.
- Quiz points are kept in the member data (`quiz` in `members-core.js`) and
  sync with the account; My Marvel shows the quiz rank. ADR-011.
- Menu: Quiz takes About's button (still ten buttons). About moved to the
  footer line next to Privacy and Credits on every page that had no other
  About link.

## 2026-10-06 (Coming Soon restored, not live yet)
- Coming Soon (`/upcoming/`) is back. It was added in PR #22 but its commit
  never reached `phase-1-build`, so the live site gave a 404. Restored with
  the MCU Easter Eggs name and mcueastereggs.com address, its two official
  Marvel Entertainment trailers listed in `media-credits.json` and on
  `/credits`, and a sitemap entry.
- Menu: Coming Soon takes the slot My Marvel had, so the menu stays ten
  buttons with no orphan. My Marvel is still one tap away in the header chip.
- `tools/menu.mjs` no longer adds a blank line or a second copy of the
  project links to footers when it runs again (the 404 page had two).

## 2026-10-06 (GA4 privacy settings, not live yet)
- GA4 now has one on/off spot: `GA_ID` in `tools/menu.mjs`. Empty or a
  placeholder like `G-XXXXXXXXXX` means no Google tag is written into any
  page. Every page's tag now sets ad consent to denied, turns off Google
  signals and ad personalization, and sends the page address without its
  `?query` or `#hash`. Privacy page says so in plain words.
  `test/analytics.test.mjs` checks off, on and the stripped address.

## 2026-10-06 (images and trailers, live 2026-10-06 as bd1f6f4)
- Photo and video credits: `/credits` (built by `node tools/build-credits.mjs`
  from `public/data/media-credits.json`), linked from every footer next to
  Privacy. All 20 character portraits were re-checked against Wikimedia
  Commons (artist and license) and are listed there.
- Two real-world photos (free license, credited): the Alabama Hills near
  Lone Pine, California on the Iron Man hub (where Tony's capture was
  filmed) and the Unisphere in Flushing Meadows on the Iron Man 2 hub (the
  real park behind the Stark Expo).
- Trailers: Doug widened the rule (ADR-010) to official Marvel, Disney and Sony
  channels plus licensed trailer channels (Movieclips, Rotten Tomatoes,
  Fandango). All five movie hubs keep a trailer (Iron Man and Iron Man 2 from
  Movieclips channels; no Marvel upload could be verified) and the Endgame,
  Avengers and Iron Man 2 articles now embed theirs. All checked with oembed.
- Character list: 7 small credited portraits (Sebastian Stan, Cobie Smulders,
  Anthony Mackie, Benedict Wong, Dave Bautista, John Slattery, Kat Dennings)
  from the MCU Character List builder reading `media-credits.json`.
- New test `test/media.test.mjs` (license, size, alt text, visible credit,
  official channel, nocookie, lazy and titled iframes).

## 2026-10-06 (working links and real info, not live yet)
- Movie pages: the cards under "Hidden Details & Easter Eggs" looked like
  buttons but most led nowhere (only 1 to 2 per page had a page behind them)
  and their text was teaser filler. All 5 hubs are now built by
  `node tools/build-hubs.mjs` from `public/data/movie-hubs.json`: 47 real
  details, each with a source link; correct credits scenes (Iron Man 2's is
  Coulson finding the hammer; The Avengers has two; Endgame has none, only a
  sound); runtime and release facts; and working link lists to that film's
  deleted scenes, callbacks, characters and rabbit holes. Back button goes to
  All movies. Short addresses like /movies/the-avengers redirect.
- Deleted scenes: the 21 entries were made up (titles, runtimes, a
  "director's cut" that doesn't exist). Replaced by the 40 real home-media
  deleted scenes, each with a source; runtimes only where a source gives one.
- Callbacks: all 40 timestamps were invented and removed; 34 corrected and
  sourced, 6 false ones removed (their old addresses redirect to /callbacks/).
- Rabbit holes and Universe Map: false claims fixed (e.g. the Mind Stone is
  not in Iron Man 2), theory labelled as theory, sources listed; 54 map links.
  Character cards, map panel items and rabbit hole headers that looked
  clickable are now real links or buttons, or no longer look clickable.
- Articles: Loki article had Thor: The Dark World before The Avengers (fixed);
  the Endgame portal article's unsourced "VFX supervisor" claim is marked
  not confirmed.
- New `test/links.test.mjs` (empty or "#" links, missing pages, missing
  #anchors, data links, sourced hub details) and `node tools/crawl-site.mjs`
  (opens every page in Chromium, checks every link after scripts run and flags
  "Read more →" text that isn't a link).

## 2026-10-06 (audit)
- Live check: both addresses serve commit 79366ad. Merged to `phase-1-build` but not deployed: #24 More from us, #25 GA4 (G-NESPZD6XSQ), #26 compact header with search, #27 AdSense slot 7081225657. Docs brought up to date (CLAUDE.md, ROADMAP, TRD, PRD, TEST_PLAN, RUNBOOK).

## 2026-10-06
- Ads filled (not live yet, PR feat/ad-slot): all three ad boxes use the AdSense
  responsive display unit `7081225657` (publisher ca-pub-7178251279168670).
  Still labeled "Advertisement", hidden until filled (zero height, full width so
  AdSense can size it), room reserved when filled, never on My Marvel (ads.js
  removed from `/me/`; sign-in and account never had it), still at most three
  per page. New `test/ads.test.mjs`.
- Readability and a compact header (not live yet, PR fix/readability-header). The
  header went from a ~375px banner plus menu (550px for visitors with the
  Bangers font) to a slim sticky bar (logo and name, a search box, a member
  chip "Found X of 69 · Rank: Civilian" linking to My Marvel) over one row
  of menu buttons: about 125 to 150px on a desktop, the bar alone (55 to 61px)
  stays on screen when you scroll. Under 1000px the menu is an even
  5-column grid, on phones 2 columns; the search box becomes a button that
  opens it. Search (`public/js/search.js`) runs in the browser over the
  site's own data files plus `public/data/search-pages.json` (articles and
  movies, written by `node tools/menu.mjs`); keyboard: "/" focuses it,
  Up/Down, Enter, Esc. The yellow found-counter line on the home page is gone
  (it showed white text on yellow in dark mode; the chip replaces it).
  Contrast fixes to WCAG AA: red link text (4.0:1 light, 3.9:1 dark to 5.9:1
  and 6.4:1), the footer's "More from Doug:" and the articles footer note (dark
  on dark, 1.0:1), yellow boxes in dark mode (white on yellow, 1.2:1), the
  rabbit-hole Explore button, the Universe Map side panel, and all text
  under 14px. `test/contrast.test.mjs` checks the color pairs in theme.css
  (part of `npm test`).
- Google Analytics 4 (`G-NESPZD6XSQ`) on every page (not live until deployed): `tools/menu.mjs` writes the one standard snippet into every page, replacing the placeholder; Privacy page says plainly it counts visits and pages read, with no names or emails sent; `test/analytics.test.mjs` checks one tag per page.
- More from us (merged, not deployed): a /more/ page listing our other 12 live sites, and the footer on every page now says "More from us" with a link to it (it said "More from Doug"). Test: `test/more.test.mjs`.
- Rebrand: "Details You Missed" became "MCU Easter Eggs" everywhere (banner, titles, meta, footers, JSON-LD, tools); canonical URLs and sitemap use mcueastereggs.com; menu no longer leaves an orphan button (one row 1000px+, even grid below). ADR-009.
- Member perks (live in 79366ad, PR #21):
  "Seen it" on movie hubs with an optional "Hide spoilers for movies I
  haven't seen" blur; Save on articles, deleted scenes, callbacks,
  characters, rabbit holes and movie hubs; a star for favorite characters
  (the old heart on /characters/ now uses the same list); "You've found X of
  Y hidden details" with a rank ladder from Civilian to The Watcher
  (`public/data/ranks.json`), a rank chip on the menu and a promotion
  pop-up; a My Marvel page (`/me/`, new menu button) and a Privacy link in
  page footers. Works with no account; signed-in members get it synced to
  their account (`/api/sync`, `saves` table). robots.txt blocks `/api/`.
- Sign-in (live in 79366ad, ADR-007; Google on, Facebook and X off): `/account` page with Google (button and
  One Tap), Facebook and X, each shown once its keys are set, and a /privacy
  page (Meta needs one to go live). Accounts in the
  `marvel-details` D1 database. Ready for the discussions.
- MCU Character List (live in 79366ad): new page /characters/all/ with 797 main
  and recurring characters from all 38 released MCU movies and 21 Disney+
  series seasons. Each shows who plays them, their first appearance and
  every title they are in, with search, an "appears in" filter and
  sorting. Built from public/data/mcu-characters.json by
  `python3 tools/build-directory.py` (then `node tools/menu.mjs`). Linked
  from /characters/ and the sitemap. Unreleased titles (Avengers: Doomsday,
  VisionQuest and others) are left out until they come out.
- Characters (live 2026-10-06): 20 characters instead of 10. New: Thanos,
  Spider-Man, War Machine, Captain Marvel, Doctor Strange, Black Panther,
  Scarlet Witch, Ant-Man, Nebula and Obadiah Stane, each with a page,
  timeline and credited Wikimedia Commons actor photo. Removed the made-up
  numbers (kill counts, "times saved the universe", near-death counts and
  others). Cards, popups and pages now show facts you can check: first MCU
  film and which of our 5 films the character is in. Fixed wrong timeline
  points (Hawkeye's first film is Thor, not Iron Man 2; Happy Hogan isn't
  in The Avengers; others in Black Widow, Hulk and Pepper Potts).
- Universe Map window (live 2026-10-06): /map/ opens as a full-screen window over
  the site with a big yellow "Back to the site" button, a close button and
  Esc, all returning to the page the visitor came from (or home). New space
  look: starfield and grid backdrop, glowing nodes, light outlined labels,
  cyan links, dark HUD sidebar. Fixes the long white hover bar that printed
  raw <strong>/<br/> code: hover tips are now a dark, wrapping card.
- Comic panels site-wide (live 2026-10-06): movie hubs (details two across
  with yellow caption headings), callback pages (speech-bubble scene
  notes), rabbit-hole chapters, character pages and the About page now use
  the same black-bordered comic panels as the articles.
- Articles as comic strips (live 2026-10-06): each article section is now a
  comic panel with a yellow caption box for its heading, scene notes are
  speech bubbles, panels sit two across on desktop and stack on phones.
  Panels are written by `python3 tools/comic-panels.py` (run it after
  adding an article).
- Popup buttons (live 2026-10-06): in the character popup the journey is now
  numbered steps (last step in amber) and each Similar Arc is a real button
  that opens that character, with its full description instead of one cut
  off at 60 characters. Bigger close button. Nothing overflows on phones.
- Popups (live 2026-10-06): the character popup on /characters/ and the
  Universe Map hover tips and node panel now look like a dark holographic
  AI-assistant screen (dark glass, cyan glow, amber accents) instead of a
  bright white box. Same look in light and dark mode. Our own design.
- Trailers and actor photos (live 2026-10-06): each of the 5 movie pages and
  the Spider-Man: Brand New Day article now play the official trailer with
  YouTube's own embedded player (Marvel Entertainment, Sony's Spider-Man
  channel, or Movieclips for Iron Man 1 and 2, which have no studio upload).
  The 10 character pages show a free-license photo of the actor from
  Wikimedia Commons, credited with photographer and license
  (`public/img/actors/`). No studio posters or stills.
- Home menu button darkened to #c62828 so its white text passes 4.5:1.
- Earlier publish: 9f67a72 (comic look, Brand New Day banner). Current live: 79366ad.

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
