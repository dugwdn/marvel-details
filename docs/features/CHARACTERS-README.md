# Character Arc Tracker - Documentation

## Overview

The Character Arc Tracker is Feature 1c for Marvel Details Phase 1, designed to showcase the most engaging content for MCU fans: character development and story arcs. This feature tracks how characters grow, change, and evolve across MCU Phase 1 films.

## Data Structure

### characters.json

Located at `/public/data/characters.json`, this file contains all character data with the following structure:

```json
{
  "characters": [
    {
      "id": "unique-id",
      "slug": "url-slug",
      "fullName": "Full Legal Name",
      "heroName": "Hero/Character Name",
      "role": "hero|villain|anti-hero|supporting",
      "actor": "Actor Name",
      "arcThesis": "Summary of character arc (one sentence)",
      "arcStages": ["Stage 1", "Stage 2", "Stage 3"],
      "loveInterests": ["Name1", "Name2"],
      "firstFilm": "Iron Man",
      "firstYear": 2008,
      "firstNote": "optional, e.g. after-credits scene",
      "siteFilms": ["Iron Man (2008)", "Avengers: Endgame (2019)"],

      "milestones": [
        {
          "id": "m1",
          "movie": "Iron Man",
          "year": 2008,
          "phase": 1,
          "emotionalState": "Broken, humbled",
          "keyMoment": "Brief description of key moment",
          "arcStage": "Catalyst",
          "tagline": "Short memorable phrase",
          "description": "Detailed description of what happened and why it matters to the arc"
        }
      ]
    }
  ]
}
```

### Character Fields

- **id**: Unique identifier for the character (no spaces)
- **slug**: URL-friendly slug (used in character detail page URLs)
- **fullName**: Character's full legal name
- **heroName**: Character's hero or known name
- **role**: One of: hero, villain, anti-hero, supporting
- **actor**: Actor's full name
- **arcThesis**: One-sentence summary of what the character learns/becomes
- **arcStages**: Array of character development stages (3-5 items)
- **firstFilm / firstYear**: the character's first MCU film (checkable on the film's cast list)
- **firstNote**: optional note when the first appearance is a cameo or a different actor
- **siteFilms**: which of the site's 5 films (Iron Man 1 to 3, The Avengers, Endgame) the character appears in
- **loveInterests**: Array of character names they have romantic connections with

### No made-up stats

Until 2026-10-06 the file carried kill counts, "times saved the universe",
near-death counts and similar numbers that had no source. They were removed.
Only add a number if it can be checked against a scene, a cast list or an
official source.

### Milestones

Each character has 8-10 milestones marking key moments in their arc:

- **id**: Unique ID for this milestone (e.g., "m1", "m2")
- **movie**: Film name (exact title from Marvel)
- **year**: Release year
- **phase**: MCU Phase number
- **emotionalState**: Character's emotional state at this moment
- **keyMoment**: Brief headline of what happens
- **arcStage**: Where they are in their journey (e.g., "Catalyst", "Crisis", "Redemption")
- **tagline**: Memorable phrase (shown on timeline)
- **description**: Detailed explanation (shown when milestone is expanded)

## JavaScript Architecture

### shared-data.js

Extends `MarvelDataHub` with character-specific functions:

```javascript
// Load all characters
await MarvelDataHub.loadCharacters()

// Find character by slug
await MarvelDataHub.findCharacter('tony-stark')

// Find character by ID
await MarvelDataHub.findCharacterById('tony-stark')

// Get characters filtered by role
await MarvelDataHub.getCharactersByRole('hero')

// Get all unique roles
await MarvelDataHub.getUniqueRoles()

// Get similar characters based on arc patterns
await MarvelDataHub.getSimilarArcs('tony-stark', 3)

// Utility functions
MarvelDataHub.formatRoleName('hero')  // "Hero"
MarvelDataHub.getPhaseColorClass(1)   // "phase-gold"
```

**Similarity Algorithm**: Based on:
- Same role (30%)
- Similar arc length (25%)
- Similar appearances (20%)
- Both have/don't have love interests (15%)
- Similar emotional complexity (10%)

### character-arc.js (~400 lines)

Main grid view and modal functionality:

**Class: CharacterArcTracker**

Features:
- Grid display with click-to-modal
- Filtering by role (hero, villain, anti-hero, supporting)
- Sorting by arc length, appearances, kill count, name, complexity
- Search by character name, actor, hero name, arc thesis
- localStorage favorites (click heart icon to save)
- Modal popup with full character details
- Similar arcs recommendation sidebar
- Responsive grid (3 cols desktop → 2 → 1 mobile)

**Methods**:
- `init()` - Initialize and load data
- `loadCharacters()` - Fetch from shared-data
- `loadFavorites() / saveFavorites()` - Persist to localStorage
- `setupEventListeners()` - Bind UI interactions
- `applyFilters()` - Filter by role
- `filterBySearch()` - Search characters
- `applySorting()` - Sort by selected criteria
- `render()` - Generate character grid HTML
- `createCharacterCard()` - Card template
- `openModal() / closeModal()` - Modal management
- `toggleFavorite()` - Heart icon interaction
- `populateSimilarArcs()` - Load recommendations

### timeline.js (~150 lines)

Character detail page timeline visualization:

**Class: CharacterTimeline**

Features:
- Horizontal timeline on desktop, vertical on mobile
- Milestone points with phase color coding
- Click to expand/collapse milestone details
- Smooth transitions between desktop/mobile
- Arc stage badges with color classes
- Emotional state indicators
- Tagline display

**Methods**:
- `init()` - Initialize from HTML element
- `render()` - Generate timeline HTML
- `createMilestoneHTML()` - Single milestone card
- `toggleMilestone()` - Expand/collapse on click
- `handleResize()` - Responsive behavior
- `getPhaseColor()` - Return hex color for phase
- `getEmotionalStateClass()` - CSS class for mood
- `getStats()` - Return timeline statistics

## CSS Architecture

### characters.css (~280 lines)

Organized by component:

**Grid and Controls**:
- `.characters-section` - Main container
- `.character-controls` - Filter/sort bar
- `.control-group` - Individual control
- `#characters-grid` - CSS Grid (3 cols → 2 → 1)

**Character Cards**:
- `.character-card` - Card with hover state
- `.character-role` - Role badge (color by type)
- `.character-favorite-btn` - Heart icon
- `.character-stats` - Stats row

**Modal**:
- `.character-modal` - Fixed overlay
- `.character-modal-content` - White box
- `.modal-header` - Title + close button
- `.modal-body` - Main content area
- `.modal-stats-grid` - 3-column stats

**Timeline** (used on character detail pages):
- `.timeline-container` - Outer wrapper
- `.timeline-track` - Contains milestones
- `.timeline-line` - Gradient vertical line
- `.timeline-milestone` - Each milestone point
- `.milestone-header` - Clickable header
- `.milestone-details` - Expanded content

**Colors**:
- Phase 1-6: Gold, Silver, Bronze, Gray, Purple, Red
- Roles: Green (hero), Red (villain), Purple (anti-hero), Blue (supporting)

## HTML Pages

### /characters/index.html

Main character grid explorer with:
- Header with golden banner
- Filter dropdown (by role)
- Sort dropdown (8 options)
- Search input (by name, actor, thesis)
- Result count display
- Character grid
- Modal container
- Links to character detail pages

Load scripts:
- `/js/shared-data.js` (data hub)
- `/js/character-arc.js` (grid + modal)

### /characters/[slug].html

Individual character pages (10 total):
- `tony-stark.html`
- `steve-rogers.html`
- `thor.html`
- `loki.html`
- `black-widow.html`
- `hawkeye.html`
- `bruce-banner.html`
- `nick-fury.html`
- `pepper-potts.html`
- `happy-hogan.html`

Each page has:
- Colored header (based on role/character)
- Character name and role subtitle
- Character metadata (actor, role, appearances, arc length, kill count, times saved universe)
- Full timeline visualization
- Back link to character grid
- Footer

Load scripts:
- `/js/shared-data.js` (data hub)
- `/js/timeline.js` (timeline visualization)
- Window variable: `characterSlug` (used by timeline.js)

## Features

### Character Grid Explorer

**Filtering**:
- By Role: All, Hero, Villain, Anti-Hero, Supporting
- Multiple filters are combined (AND logic)

**Sorting**:
- Default Order (by appearance in data)
- Character Name (A-Z)
- Arc Length (longest first)
- Appearances (most films first)
- First appearance (earliest MCU film first)
- Films on this site (most of our 5 films first)

**Search**:
- Searches across: full name, hero name, arc thesis, actor name
- Real-time as user types
- Combined with active filters

**Favorites**:
- Click heart icon to favorite
- Stored in browser localStorage
- Persists across sessions
- Heart fills in when favorited

**Similar Arcs Sidebar**:
- Shows 3 most similar characters
- Displays similarity percentage with visual bar
- Click to jump to that character

### Character Timeline

**Milestone Expansion**:
- Click milestone header to expand/collapse
- Shows: movie name, description, emotional state, arc stage, tagline
- Smooth animation and scroll-into-view

**Phase Coloring**:
- Each phase has distinct color (see Phase Colors in CSS section)
- Timeline line is gradient of phase color → gray
- Milestone dots match phase color

**Responsive**:
- Desktop: Milestones to the right of timeline line
- Mobile: Milestones below timeline line
- Smooth transition on resize

**Emotional States**:
- Positive: happy, love, heroic, triumph → green indicators
- Negative: sad, grief, loss, despair → red indicators
- Conflicted: confused, torn, conflict → purple indicators
- Fear: fear, terror, desperate → dark red indicators

## Data Models

### 10 MCU Phase 1 Characters

1. **Tony Stark / Iron Man** (Hero)
   - Arc: Self-centered → Selfless Savior
   - 10 appearances, 11-year span (2008-2019 in real time, but 4 years in-universe)
   - 10 milestones tracking transformation

2. **Steve Rogers / Captain America** (Hero)
   - Arc: Fish Out of Water → Modern Leader
   - 8 appearances, 11-year span
   - 10 milestones on being displaced in time

3. **Thor Odinson** (Hero)
   - Arc: Arrogant Prince → Humble Defender
   - 3 appearances, 2-year span
   - 10 milestones in exile on Earth

4. **Loki Laufeyson** (Villain)
   - Arc: Resentful Outsider → Power-Hungry Tyrant
   - 3 appearances, 2-year span
   - 10 milestones from schemer to invader

5. **Natasha Romanoff / Black Widow** (Hero)
   - Arc: Lethal Assassin → Trusted Hero
   - 5 appearances, 8-year span
   - 8 milestones on finding redemption

6. **Clint Barton / Hawkeye** (Hero)
   - Arc: Obedient Operative → Independent Hero
   - 3 appearances, 3-year span
   - 7 milestones on gaining agency

7. **Bruce Banner / Hulk** (Hero)
   - Arc: Monster Fearing → Learning to Work Together
   - 4 appearances, 8-year span
   - 9 milestones on accepting his nature

8. **Nick Fury** (Supporting)
   - Arc: Spymaster → Assembler of Heroes
   - 5 appearances, 6-year span
   - 6 milestones building the Avengers

9. **Pepper Potts** (Supporting)
   - Arc: Assistant → CEO to Moral Anchor
   - 4 appearances, 4-year span
   - 4 milestones as Tony's grounding force

10. **Happy Hogan** (Supporting)
    - Arc: Bodyguard → Loyal Friend
    - 4 appearances, 4-year span
    - 4 milestones staying faithful

## Usage Examples

### Accessing Character Data

```javascript
// On character grid page
const tracker = new CharacterArcTracker();

// In your own code
const tony = await MarvelDataHub.findCharacter('tony-stark');
console.log(tony.arcThesis);  // "From self-centered industrialist..."

// Get all heroes
const heroes = await MarvelDataHub.getCharactersByRole('hero');
console.log(heroes.length);  // 6
```

### Extending the Feature

**Add a new character**:
1. Add entry to `/data/characters.json` with all fields
2. Create `/characters/[slug].html` page (copy an existing one), with a credited free-license actor photo in `/img/actors/`
3. Add entry to `/sitemap.xml`
4. Character grid will auto-load it

**Change similarity algorithm**:
- Edit `MarvelDataHub.calculateArcSimilarity()` in `shared-data.js`
- Adjust the point weights (currently: same role 30, shared site films 50, love interests 20)

**Add new sort option**:
1. Add option to `<select id="character-sort">` in index.html
2. Add case in `CharacterArcTracker.applySorting()` switch statement

## Performance Notes

- Characters data loads once and caches in `MarvelDataHub.cache.characters`
- Favorites stored in localStorage (persists across page loads)
- Modal content generated on-demand when character card clicked
- Timeline visualization renders once on character detail page load
- All sorting/filtering is client-side (no API calls needed)

## Accessibility

- Buttons have aria-labels
- Semantic HTML structure
- Keyboard navigation: Tab, Enter, Escape
- Escape key closes modal
- Color not sole indicator (text labels provided)
- Sufficient contrast ratios

## Future Enhancements

- Filter by multiple criteria simultaneously (role + stats)
- Save character lists/favorites to account
- Character comparison view
- Social sharing of character arcs
- Character relationship map
- "Which character are you?" quiz
- Integration with movie pages

## Testing Checklist

- Grid loads all 10 characters
- Filter by each role works
- Search finds characters by all fields
- Sorting by each criteria works correctly
- Favorites persist on page reload
- Modal opens and closes properly
- Similar arcs display correctly
- Character detail pages load timelines
- Timeline expands/collapses milestones
- Responsive layout on mobile/tablet
- All links work (back to grid, etc.)
- Sitemap includes all character URLs

## File Structure

```
/public/
  /characters/
    index.html                    (10 KB - grid view)
    tony-stark.html              (8 KB - detail page)
    steve-rogers.html            (8 KB)
    thor.html                    (8 KB)
    loki.html                    (8 KB)
    black-widow.html             (8 KB)
    hawkeye.html                 (8 KB)
    bruce-banner.html            (8 KB)
    nick-fury.html               (8 KB)
    pepper-potts.html            (8 KB)
    happy-hogan.html             (8 KB)
  /css/
    characters.css               (9 KB - 280 lines)
  /js/
    character-arc.js             (13 KB - 400 lines)
    timeline.js                  (6 KB - 150 lines)
    shared-data.js               (enhanced with character methods)
  /data/
    characters.json              (95 KB - all character data)
  sitemap.xml                     (updated with character URLs)
```

## Stats

- **Total Characters**: 10
- **Total Milestones**: 81 (8-10 per character)
- **Code**: ~550 lines (JS), ~280 lines (CSS), ~6,000 lines (JSON data)
- **Page Size**: Grid ~50 KB, Detail pages ~30 KB each
- **Load Time**: <500ms for grid, <300ms for detail pages

---

**Last Updated**: 2026-10-05  
**Feature**: 1c - Character Arc Tracker  
**Phase**: MCU Phase 1


## MCU Character List (/characters/all/)

A plain-HTML list of every main and recurring MCU character (797 on
2026-10-06), so search engines can read it. Data: `public/data/mcu-characters.json`
(titles with US release dates, then characters with actors, titles, first
appearance, and `page` when the character has a full page here). The page is
written by `python3 tools/build-directory.py`; run `node tools/menu.mjs` after.
Search, filters and sorting are in `public/js/directory.js`; styles in
`public/css/directory.css`.

Facts only (names, actors, titles, dates), taken from the cast lists compiled
on Wikipedia, checked 2026-10-06. Only released titles count. To add a new
movie or season after it comes out: add it to `titles` with its date, add it to
each character's `titles`, and rebuild. Not covered yet: one-scene roles and
the Marvel Television shows (Agents of S.H.I.E.L.D., the Netflix series).
