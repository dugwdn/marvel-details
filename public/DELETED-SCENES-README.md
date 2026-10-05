# Deleted Scenes Registry

This document explains how to manage and add new deleted scenes to the MCU Deleted Scenes Registry feature.

## Overview

The Deleted Scenes Registry is a searchable database of deleted scenes, extended cuts, and bonus content from MCU movies. It features:

- **Central Data File**: `/data/deleted-scenes.json` - all scene data
- **Main Index**: `/scenes/index.html` - searchable, filterable main page
- **Movie Pages**: Individual pages for each movie showing only that movie's deleted scenes
- **JavaScript**: `/js/deleted-scenes.js` - handles search, filtering, and rendering
- **Styling**: `/css/deleted-scenes.css` - responsive design with dark mode support

## File Structure

```
/public/
├── data/
│   └── deleted-scenes.json         # All deleted scenes data
├── scenes/
│   ├── index.html                  # Main scenes index page
│   ├── iron-man-1-scenes.html      # Iron Man (2008) scenes
│   ├── iron-man-2-scenes.html      # Iron Man 2 (2010) scenes
│   ├── iron-man-3-scenes.html      # Iron Man 3 (2013) scenes
│   ├── avengers-1-scenes.html      # The Avengers (2012) scenes
│   └── endgame-scenes.html         # Avengers: Endgame (2019) scenes
├── js/
│   └── deleted-scenes.js           # Scene filtering and display logic
├── css/
│   └── deleted-scenes.css          # Styling for scenes pages
└── sitemap.xml                     # Updated with all scenes URLs
```

## Adding New Scenes

### Step 1: Edit the JSON Data

Open `/data/deleted-scenes.json` and add a new scene object to the `deletedScenes` array. Each scene requires:

```json
{
  "id": "unique-scene-id",
  "movieId": "iron-man-1|iron-man-2|iron-man-3|avengers-1|endgame",
  "movieTitle": "Display Movie Title",
  "movieYear": 2008,
  "title": "Scene Title",
  "description": "Short description of the scene",
  "format": ["dvd", "blu-ray", "disney+"],
  "runtime": "X:XX",
  "whereToWatch": "Location/Collection name",
  "significance": "Character development|Plot development|Action sequences",
  "synopsis": "Longer explanation of what happens in the scene"
}
```

### Field Guide

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (format: `{movieid}-scene-{number}`) |
| `movieId` | string | Yes | Must match one of: `iron-man-1`, `iron-man-2`, `iron-man-3`, `avengers-1`, or `endgame` |
| `movieTitle` | string | Yes | Display name of the movie |
| `movieYear` | number | Yes | Release year of the movie |
| `title` | string | Yes | Scene title (appear on cards) |
| `description` | string | Yes | Brief description of what happens |
| `format` | array | Yes | Where the scene is available: `dvd`, `blu-ray`, `disney+` |
| `runtime` | string | Yes | Length of scene (format: `M:SS` or `MM:SS`) |
| `whereToWatch` | string | Yes | Specific location: e.g., "Iron Man 2010 Blu-ray special features" |
| `significance` | string | Yes | Type: `Character development`, `Plot development`, or `Action sequences` |
| `synopsis` | string | Yes | Longer explanation (1-2 sentences) |

### Step 2: Verify Your JSON

Make sure:
- The JSON is valid (use a JSON validator if unsure)
- All required fields are present
- The `movieId` matches one of the five supported movies
- Format array contains only valid values
- The ID is unique (not duplicated)

### Step 3: Test the Changes

1. **Check the main index page** (`/scenes/`)
   - Verify the new scene appears
   - Test search functionality finds it
   - Test filters work correctly

2. **Check the movie page** (e.g., `/scenes/iron-man-1-scenes.html`)
   - Verify it appears on the correct movie's page
   - Confirm format badges display correctly

### Step 4: Update Sitemap (if adding a new movie)

If you're adding scenes for a movie not yet supported:

1. Add a new movie entry to the `<select>` dropdown in `/scenes/index.html`
2. Create a new movie page file: `/scenes/{movie-slug}-scenes.html`
3. Add entries to `sitemap.xml`:
   ```xml
   <url>
       <loc>https://marvel-details.workers.dev/scenes/{movie-slug}-scenes</loc>
       <lastmod>2026-10-05</lastmod>
       <changefreq>monthly</changefreq>
       <priority>0.8</priority>
   </url>
   ```

## Supported Movies and IDs

Currently supported movies for deleted scenes:

| Movie | ID | Year |
|-------|----|----|
| Iron Man | `iron-man-1` | 2008 |
| Iron Man 2 | `iron-man-2` | 2010 |
| Iron Man 3 | `iron-man-3` | 2013 |
| The Avengers | `avengers-1` | 2012 |
| Avengers: Endgame | `endgame` | 2019 |

## Features

### Search Functionality
- Searches across: scene title, description, and movie title
- Case-insensitive
- Partial matching supported

### Filters
- **Movie Filter**: Shows only scenes from selected movie
- **Format Filter**: Shows only scenes available in selected format
- Filters combine (AND logic)

### Display Elements
- Scene cards with title and format badges
- Movie title and year
- Runtime and significance type
- Where to watch information
- Scene synopsis

### Responsive Design
- Desktop: Multi-column grid layout
- Tablet: 2-column layout
- Mobile: Single column with optimized spacing
- Dark mode support

## Example Scene Entry

```json
{
  "id": "im1-scene-004",
  "movieId": "iron-man-1",
  "movieTitle": "Iron Man",
  "movieYear": 2008,
  "title": "Extended Stark Industries Meeting",
  "description": "A longer board meeting scene showing more of Obadiah Stane's influence on the company.",
  "format": ["blu-ray"],
  "runtime": "3:20",
  "whereToWatch": "Iron Man 2008 Blu-ray director's cut",
  "significance": "Plot development",
  "synopsis": "Reveals more about Obadiah's plan to take over Stark Industries and establish military contracts."
}
```

## Data Validation

The JavaScript automatically:
- Escapes HTML in all text fields (prevents XSS)
- Validates format values when rendering badges
- Handles missing scenes gracefully
- Shows proper error messages if data fails to load

## Performance Notes

- Scene data is loaded once on page initialization
- Filtering is done client-side (fast for datasets of 100+ scenes)
- Each movie page loads only that movie's scenes via JavaScript
- No server-side processing required

## Future Enhancements

Possible additions for Phase 2:
- Sort options (by runtime, by movie, by date added)
- Filter by significance type
- "Recently added" highlights
- User favorites/bookmarking
- Share buttons for individual scenes
- Video preview thumbnails (if available)
- Ratings/reviews from fans

## Troubleshooting

### Scene doesn't appear on the main index
- Check that the JSON is valid
- Verify the `movieId` is correct and matches a supported movie
- Ensure the scene object is inside the `deletedScenes` array

### Scene appears but format badges don't show
- Check that `format` array contains only valid values: `dvd`, `blu-ray`, `disney+`
- Clear browser cache and reload

### Search isn't finding the scene
- Search is case-insensitive but requires exact substring match
- Try searching by different fields (title, movie name, key words from description)

### Movie page shows "No deleted scenes found"
- Verify the scene's `movieId` matches the page's movie ID
- Check for typos in the `movieId` field

## Support

For issues or questions about the Deleted Scenes Registry, check the main Marvel Details documentation or review the inline comments in the JavaScript and CSS files.
