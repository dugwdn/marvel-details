# Rabbit Holes - MCU Deep Dives

## Overview

Rabbit Holes are thematic deep dives into MCU character arcs, plot implications, and hidden connections. Each hole features progressive disclosure with three difficulty levels (casual, intermediate, advanced), allowing readers to engage at their preferred depth.

## Data Structure

### File: `/data/rabbit-holes.json`

```json
{
  "rabbitHoles": [
    {
      "id": "unique-identifier",
      "slug": "url-friendly-slug",
      "title": "Hole Title",
      "tagline": "Short description (max ~10 words)",
      "difficulty": "casual|intermediate|advanced",
      "readTime": 12,
      "movies": ["movie-id-1", "movie-id-2"],
      "relatedCharacters": ["character-name-1", "character-name-2"],
      "summary": "Brief description of the hole (2-3 sentences)",
      "chapters": [
        {
          "level": 1,
          "title": "Level 1: Casual Reading",
          "content": "Reader-friendly content (1-2 paragraphs)"
        },
        {
          "level": 2,
          "title": "Level 2: Deeper Analysis",
          "content": "Evidence-based analysis (2-3 paragraphs)"
        },
        {
          "level": 3,
          "title": "Level 3: Expert Theory",
          "content": "Complex theory or extended analysis (3-4 paragraphs)"
        }
      ],
      "payoff": "Why reading this matters (1 sentence)",
      "relatedHoles": ["related-hole-id-1", "related-hole-id-2"]
    }
  ]
}
```

### Field Descriptions

- **id**: Unique identifier for the hole (used in URLs, references)
- **slug**: URL-safe version of the title (lowercase, hyphens)
- **title**: Main heading (2-6 words)
- **tagline**: Hook or question to draw readers in
- **difficulty**: Cognitive difficulty level
  - `casual`: 10-12 minute read, accessible to all audiences
  - `intermediate`: 12-15 minute read, requires MCU familiarity
  - `advanced`: 14-20 minute read, complex theory and speculation
- **readTime**: Estimated reading time in minutes (integer)
- **movies**: Array of MCU movie IDs (e.g., "iron-man-1", "avengers-1")
- **relatedCharacters**: Array of character names used in the hole
- **summary**: 2-3 sentence overview of what the hole explores
- **chapters**: Array of 3 progression levels
  - Level 1: Accessible, casual tone, basic facts
  - Level 2: Deeper analysis with evidence and connections
  - Level 3: Complex theory, expert-level speculation
- **payoff**: Single sentence explaining why this hole matters
- **relatedHoles**: Array of related hole IDs for recommendations

## JavaScript API

### RabbitHolesRegistry Class

Located in `/js/rabbit-holes.js` (~270 lines)

#### Constructor
```javascript
const registry = new RabbitHolesRegistry();
```

Automatically initializes on DOM ready and stores as `window.rabbitHolesRegistry`.

#### Public Methods

**loadHoles()**
- Fetches and parses `/data/rabbit-holes.json`
- Sets `this.allHoles` and initializes `this.filteredHoles`

**applyFilters()**
- Filters holes based on current filter state
- Supports: difficulty, movies (multi-select), searchTerm
- Triggers re-render

**render()**
- Renders filtered holes grid to `#holes-container`
- Creates individual hole cards

**findHole(id)**
- Returns a single hole object by ID
- Returns `null` if not found

**getRelatedHoles(holeId, limit = 3)**
- Scores related holes based on shared movies, characters, and explicit relationships
- Returns up to `limit` related holes (default: 3)

**getStats()**
- Returns object with: totalHoles, byDifficulty, totalReadTime, movieCount

**getUniqueMovies()**
- Returns array of all unique movie IDs across holes

**getUniqueCharacters()**
- Returns sorted array of all character names across holes

#### Event Listeners

Set up automatically in `setupEventListeners()`:
- Difficulty filter dropdown (`#difficulty-filter`)
- Movie filter checkboxes (`input[name="movie-filter"]`)
- Search input (`#hole-search`)

## Styling

### File: `/css/rabbit-holes.css`

Features:
- Responsive grid (3 cols desktop → 1 mobile)
- Difficulty badges with color coding
  - Green: Casual (10-12 min)
  - Amber: Intermediate (12-15 min)
  - Red: Advanced (14-20 min)
- Progressive disclosure styling
  - Smooth expand/collapse with max-height transition
  - Nested, indented level display
  - Color-coded level numbers
- Dark mode support with `@media (prefers-color-scheme: dark)`
- Accessible focus states and transitions

### Key Classes

- `.hole-card`: Individual hole cards (300px min width)
- `.difficulty-badge`: Color-coded difficulty label
- `.level-container`: Expandable chapter container
- `.level-content`: Collapsible content area (max-height: 2000px)
- `.payoff-box`: Highlighted "why it matters" section

## HTML Pages

### Index Page: `/rabbit-holes/index.html`

- Grid view with filtering and search
- Responsive sidebar-free layout
- Difficulty dropdown filter
- Movie checkbox filters (14 movies)
- Full-text search
- Result count display
- Loads `rabbit-holes.js` automatically

### Individual Hole Pages: `/rabbit-holes/[slug].html`

8 pages total:
1. `mind-stone-corruption.html`
2. `tonys-sacrifice-foreshadowed.html`
3. `lokis-redemption-arc.html`
4. `multiverse-implications.html`
5. `vision-consciousness.html`
6. `steve-rogers-timeline.html`
7. `wanda-grief-power.html`
8. `family-bonds-asgard.html`

Features:
- Back link to index
- Header with title, tagline, metadata
- Summary callout box
- 3-level chapter display (always expanded)
- Payoff section (gradient background)
- Related holes recommendations (grid)
- Dark mode support
- ~1300 lines of HTML + inline CSS each

## Current Rabbit Holes

### 1. How the Mind Stone Corrupts Users
- **Difficulty**: Intermediate (12 min)
- **Topics**: Infinity Stones, consciousness, resonance
- **Movies**: 4 (Avengers 1, Iron Man 2, Age of Ultron, Infinity War)
- **Characters**: Loki, Barton, Tony Stark, Wanda

### 2. Tony's Sacrifice Was Foreshadowed from the Start
- **Difficulty**: Advanced (16 min)
- **Topics**: Character arc, redemption, 11-year narrative
- **Movies**: 8 (all Iron Man + Avengers films)
- **Characters**: Tony Stark, Pepper Potts, Steve Rogers

### 3. Loki's Redemption Arc: Three Deaths Before Atonement
- **Difficulty**: Intermediate (14 min)
- **Topics**: Character development, family, sacrifice
- **Movies**: 4 (Thor 1, Dark World, Ragnarok, Infinity War)
- **Characters**: Loki, Thor, Odin, Thanos

### 4. The Multiverse Implications: What Infinity Stones Mean Across Realities
- **Difficulty**: Advanced (15 min)
- **Topics**: Multiverse, time travel, cosmic theory
- **Movies**: 4 (Endgame, Loki series, Multiverse of Madness, Ant-Man Quantumania)
- **Characters**: Thanos, Ancient One, Kang

### 5. How Vision Became Conscious: The Mind Stone's Greatest Gift
- **Difficulty**: Intermediate (13 min)
- **Topics**: Consciousness, AI, sentience vs. intelligence
- **Movies**: 3 (Age of Ultron, Civil War, Infinity War)
- **Characters**: Vision, Wanda, Ultron, Tony Stark

### 6. Steve Rogers' Timeline Problem: One Ending, Infinite Interpretations
- **Difficulty**: Advanced (14 min)
- **Topics**: Time travel paradox, Endgame logic
- **Movies**: 2 (First Avenger, Endgame)
- **Characters**: Steve Rogers, Tony Stark, Peggy Carter

### 7. Wanda's Grief Manifests as Power: The Darkhold Connection
- **Difficulty**: Intermediate (12 min)
- **Topics**: Grief as power source, corruption, wisdom vs. ability
- **Movies**: 5 (Civil War, Infinity War, Endgame, WandaVision, Multiverse of Madness)
- **Characters**: Wanda, Vision, Darkhold

### 8. Family Bonds in Asgard: Why Thor Needed Loki More Than Loki Needed Thor
- **Difficulty**: Casual (11 min)
- **Topics**: Adoption, family, chosen vs. blood relationships
- **Movies**: 4 (Thor 1, Dark World, Ragnarok, Avengers 1)
- **Characters**: Thor, Loki, Odin, Frigga

## Adding New Rabbit Holes

1. **Add to JSON**:
   - Open `/data/rabbit-holes.json`
   - Add new object to `rabbitHoles` array with all required fields
   - Ensure unique `id` and `slug`

2. **Create HTML Page**:
   - Copy structure from existing page (e.g., `mind-stone-corruption.html`)
   - Update title, tagline, metadata, chapters
   - Add related holes if applicable
   - Save to `/rabbit-holes/[slug].html`

3. **Update Sitemap**:
   - Add entry to `/sitemap.xml` under "Rabbit Holes Pages"
   - Set `lastmod` to current date
   - Use priority 0.8 for individual holes

4. **Update Related Holes**:
   - Edit existing holes' `relatedHoles` arrays if needed
   - Bidirectional relationships are recommended

## Performance Notes

- JSON file: ~25 KB (8 holes with ~3 chapters each)
- JavaScript: ~270 lines, ~6.8 KB minified
- CSS: ~200 lines, ~6.4 KB minified
- Individual pages: ~50 KB each (HTML + inline CSS)
- Grid loads 8 cards → filters dynamically (no page load)
- Progressive disclosure: max-height transitions for smooth UX

## Accessibility

- All headings properly nested (h1, h2, h3)
- Form controls labeled explicitly
- Color contrast meets WCAG AA standards
- Difficulty badges include text labels (not color-only)
- Keyboard navigation supported
- `aria-expanded` attributes on expandable sections
- Dark mode respects `prefers-color-scheme`

## SEO Considerations

- Each individual hole has unique `<meta name="description">`
- Difficulty levels help with long-tail search queries
- Timestamps on every page for freshness
- Sitemaps included with all pages
- Related holes provide internal linking structure
- Movie filters align with common search terms

## Future Enhancements (Not Yet Implemented)

- Embedded holes on other pages (e.g., movie pages)
- AdSense integration
- User ratings or "helpful" votes
- Comments or discussion section
- Downloadable summaries (PDF)
- Video embeds for visual explanations
- Timeline visualizations
- Character relationship maps
