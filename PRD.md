# Marvel Details: product requirements

Last updated 2026-10-06.

## Problem
Marvel fans search for things they half-noticed: a deleted scene, a line
that comes back two films later, why a character changed. Answers are
spread across wikis, Reddit threads and videos, often without sources.

## Who it's for
First user: a Marvel fan on a phone who just finished (or rewatched) a
film and searches a specific question. They want one clear answer with
the scene and the source, then a reason to keep reading.

## What success looks like
- Pages appear in Google for specific "why did..." and "deleted scene"
  searches (Search Console impressions and clicks, once the domain is set up).
- Visitors open a second page (GA4 pages per session).
- Later: enough traffic for display ads (Phase 3) to cover costs.

## What's in Phase 1
- Five movie hubs: Iron Man, Iron Man 2, Iron Man 3, The Avengers, Endgame.
- Articles, one specific detail each, with sources.
- Five features that link into each other:
  1. Deleted Scenes Registry: what was cut and where to watch it.
  2. Foreshadowing and Callbacks: setups and their payoffs across films.
  3. Character Arc Tracker: how 10 characters change film to film.
  4. Universe Map: an interactive graph of films, characters, items, events.
  5. Rabbit Holes: themed deep dives in three levels of depth.
- Basic SEO: titles, descriptions, sitemap, robots, structured data.

## Members (added 2026-10-06, Doug approved "build now")
A reason to come back and, optionally, to sign up. Everything works with no
account; an account only carries it to other devices.
1. **Watch tracker:** "Seen it" on each movie hub and on My Marvel. Switch
   "Hide spoilers for movies I haven't seen" (off by default) blurs details
   from unseen films on movie hubs, deleted scenes and callbacks until
   tapped. Rabbit holes aren't blurred (each spans many films, some outside
   our five).
2. **Saved list:** Save on articles, deleted scenes, callbacks, characters,
   rabbit holes (and movie hubs); listed on My Marvel.
3. **Favorite characters:** a star on character cards and pages; listed on
   My Marvel. The "New since your last visit" badge is not built: the data
   has no added/updated dates. Weekly email is out of scope.
4. **Found counter and rank:** "You've found X of Y hidden details" (deleted
   scenes, callbacks, rabbit holes; Y = 69 today) on My Marvel and the home
   page. A deleted scene counts after its card is on screen ~1.5 s; a
   callback or rabbit hole when its page is opened. Ranks (Doug's idea):
   Civilian 0%, Spider-Man 5%, Iron Man 15%, Captain America 30%, Thor 50%,
   Doctor Strange 70%, The Ancient One 85%, The Watcher 100%, each with a
   checkable one-line reason; progress bar, "X more details to reach ...",
   a rank chip on the My Marvel menu button and a promotion toast.
- **My Marvel** (`/me/`): phone-first, Back arrow, explanations open in
  place, noindex and not in the sitemap.
- **Accounts:** the site's sign-in (ADR-007: Google first, plus Facebook
  and X, 13 or older, id and first name only, never email). Signed-in
  members' lists sync across devices; deleting the account deletes the list.
- Success: share of visitors who save, mark or star something (needs GA4
  events later); share who sign in.

## Not building (for now)
- Comments, email (weekly digest).
- Storing email addresses or anything beyond the member list above.
- Video or copied film stills (copyright).
- A framework or build pipeline.
- Phases 2 to 4 of the MCU until Phase 1 pages are complete and indexed.

## Changes to this PRD
- 2026-10-06: "Accounts ... anything that stores visitor data" moved out of
  "Not building" into the new Members section (local-first perks; sync for
  members signed in with the site's sign-in, ADR-007/ADR-008).

## Open questions for Doug
- Rank titles use Marvel character names (trademark question; see the PR).
- Move marveldetails.com from Wix to this site? (Keeps the domain's age
  and existing Search Console property.)
- GA4: create a property, or reuse one?
- The four "house writers" are pen names. Keep them, label them clearly as
  pen names, or credit Doug?
