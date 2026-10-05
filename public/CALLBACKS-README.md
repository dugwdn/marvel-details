# Foreshadowing & Callbacks Database

## Overview

The Callbacks feature tracks foreshadowing and callbacks across the Marvel Cinematic Universe. Each callback connects a hint planted in one film to its payoff in another film, revealing the MCU's layered storytelling.

## File Structure

- `/data/callbacks.json` - Master data file containing all callbacks
- `/callbacks/index.html` - Search and filter interface for all callbacks
- `/callbacks/callback-[id].html` - Individual callback detail pages (auto-generated)
- `/js/callbacks.js` - UI logic for search, filtering, and rendering
- `/js/shared-data.js` - Central data hub for loading callbacks and deleted scenes
- `/css/callbacks.css` - Styling for callbacks feature

## Adding New Callbacks

### Step 1: Edit callbacks.json

Open `/data/callbacks.json` and add a new entry to the `callbacks` array:

```json
{
  "id": "cb-NNN",
  "title": "Clear, descriptive title",
  "type": "setup|payoff|dialogue|visual-motif|thematic|plot-twist",
  "foreshadow": {
    "movieId": "iron-man-1|iron-man-2|iron-man-3|avengers-1|endgame",
    "movieTitle": "Full Movie Title",
    "movieYear": 2008,
    "timestamp": "HH:MM:SS",
    "description": "What happens in the foreshadow scene (1-2 sentences)"
  },
  "fulfillment": {
    "movieId": "iron-man-1|iron-man-2|iron-man-3|avengers-1|endgame",
    "movieTitle": "Full Movie Title",
    "movieYear": 2008,
    "timestamp": "HH:MM:SS",
    "description": "What happens in the fulfillment scene (1-2 sentences)"
  },
  "explanation": "Analysis of how the callback works and its significance (2-3 sentences)",
  "relatedCharacters": ["Character 1", "Character 2"],
  "relatedArticles": ["article-slug-1", "article-slug-2"]
}
```

### Step 2: Run the Build Script

After editing `callbacks.json`, regenerate individual pages:

```bash
node build-callbacks.js
```

This creates/updates all HTML files in `/callbacks/callback-[id].html`.

### Step 3: Update Sitemap

Add the new callback to `/sitemap.xml`:

```xml
<url>
    <loc>https://marvel-details.workers.dev/callbacks/callback-cb-NNN.html</loc>
    <lastmod>2026-10-05</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
</url>
```

## Callback Types

- **setup**: Introduces an idea, character trait, or plot element that will pay off later
- **payoff**: Delivers the resolution or completion of a setup from an earlier film
- **dialogue**: A memorable quote or verbal exchange that recurs across films
- **visual-motif**: A repeated visual element, shot composition, or design pattern
- **thematic**: Callbacks that explore similar themes without direct reference
- **plot-twist**: A revelation that recontextualizes events from an earlier film

## Data Schema

### Callback Object

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier (cb-001, cb-002, etc.) |
| title | string | Brief, descriptive title |
| type | string | One of the callback types listed above |
| foreshadow | object | Details of the hint/setup in the first film |
| fulfillment | object | Details of the payoff in the later film |
| explanation | string | Analysis explaining the connection |
| relatedCharacters | array | Character names involved |
| relatedArticles | array | Slugs of related articles (without .html) |

### Movie Object (foreshadow/fulfillment)

| Field | Type | Description |
|-------|------|-------------|
| movieId | string | Slug matching movie pages (iron-man-1, endgame, etc.) |
| movieTitle | string | Full title for display |
| movieYear | number | Year of release |
| timestamp | string | Exact time in format HH:MM:SS |
| description | string | What happens at this timestamp |

## Search & Filtering

The callbacks index supports:

- **Full-text search**: Search by title, explanation, character names, or description
- **Type filters**: Filter by callback type (setup, payoff, etc.)
- **Movie pair filters**: Show callbacks between specific movie pairs (e.g., IM1 → Avengers)
- **Character filters**: Show all callbacks involving specific characters

Filters can be combined. Use "Clear All Filters" to reset.

## Embedding on Movie Pages

To show relevant callbacks on a movie detail page, use:

```javascript
const embed = CallbacksUI.getMovieEmbed('iron-man-1', 4);
// embed.callbacks = array of callbacks involving Iron Man
// embed.html = pre-rendered HTML block
```

The embed shows 3-5 callbacks and links to the full callbacks index.

## Quality Standards

When adding callbacks:

1. **Accuracy**: Verify timestamps and descriptions against the actual films
2. **Clarity**: Write explanations that explain *why* the connection matters
3. **Completeness**: Link to related articles that explore this callback
4. **Relevance**: Only include meaningful connections that show intentional storytelling
5. **Uniqueness**: Check existing callbacks to avoid duplicates

## Example Callbacks

### Setup → Payoff
```
Iron Man (2008): Tony creates the arc reactor in a cave
Avengers: Endgame (2019): Tony uses an Infinity Stone-powered arc reactor to save the universe
Explanation: The cave arc reactor becomes the blueprint for Tony's entire journey. Endgame closes the loop with Tony recreating it at the highest stakes.
```

### Visual Motif
```
Iron Man (2008): The glowing arc reactor in Tony's chest
Iron Man 3 (2013): Multiple references to the arc reactor technology
Explanation: The arc reactor's visual design becomes a signature motif tracking Tony's technological progression.
```

### Thematic Callback
```
Iron Man (2008): Tony learns about the collateral damage his weapons caused
Avengers: Endgame (2019): Tony sacrifices himself to save the universe
Explanation: Tony's journey from causing harm to making the ultimate sacrifice shows complete character redemption.
```

## Technical Notes

- Timestamps should match the film's runtime (HH:MM:SS format)
- Movie IDs must match existing movie page slugs
- Article slugs should exist as actual article pages
- The build script validates data structure but not content accuracy
- Individual pages are generated with proper meta tags for SEO
- Dark mode support is built into the CSS

## Performance

- Callbacks data loads once and is cached in `window.marvelData.hub`
- Search and filtering happen client-side for instant results
- Lazy loading of individual callback pages (only loaded when user visits)
- JSON data is ~40-50KB uncompressed, typical browser cache handles it well

## Future Enhancements

- [ ] Callback chains (callbacks that connect 3+ films)
- [ ] User ratings on callback accuracy/significance
- [ ] Filter by time gap (shortest to longest between foreshadow and payoff)
- [ ] Related callbacks (show similar callbacks on detail pages)
- [ ] Spoiler toggle (some callbacks are spoilers for first-time watchers)
- [ ] Difficulty rating (subtle vs obvious callbacks)
