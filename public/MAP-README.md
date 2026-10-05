# Marvel Universe Map - Documentation

## Overview

The Universe Map is an interactive network visualization that displays the interconnected relationships between characters, movies, artifacts, and events in the Marvel Cinematic Universe (MCU). It uses the Vis.js library to render an animated, physics-based network graph.

**Live URL:** `https://marvel-details.workers.dev/map`

## Data Structure

### connections.json

The data file is located at `/data/connections.json` and contains two main sections:

#### Nodes
Each node represents an entity in the MCU universe.

```json
{
  "id": "unique-identifier",
  "label": "Display Name",
  "type": "movie|character|artifact|event",
  "phase": 1,
  "color": "#HexColor",
  "year": 2008,
  "description": "Optional description text"
}
```

**Node Types:**
- `movie`: MCU films (shape: box, color: gold #FFD700)
- `character`: Characters (shape: circle, color: red #FF6B6B)
- `artifact`: Objects/items (shape: diamond, color: teal #20B2AA)
- `event`: Events or moments (shape: star, color: purple #9370DB)

**Phases:** 1, 2, or 3 (MCU phase classification)

#### Edges
Each edge represents a connection between two nodes.

```json
{
  "from": "source-node-id",
  "to": "target-node-id",
  "label": "relationship description",
  "strength": "strong|weak"
}
```

**Strength:** Controls visual prominence:
- `strong`: Thicker line, darker color
- `weak`: Thinner line, lighter color

### Example Data

**Sample Node:**
```json
{
  "id": "char-tony-stark",
  "label": "Tony Stark",
  "type": "character",
  "phase": 1,
  "color": "#FF6B6B",
  "description": "Genius billionaire philanthropist who becomes Iron Man."
}
```

**Sample Edge:**
```json
{
  "from": "char-tony-stark",
  "to": "movie-iron-man-1",
  "label": "appears in",
  "strength": "strong"
}
```

## Adding New Connections

### Step 1: Add Nodes

Edit `/data/connections.json` and add new nodes to the `nodes` array:

```json
{
  "id": "movie-thor-1",
  "label": "Thor",
  "type": "movie",
  "phase": 1,
  "color": "#FFD700",
  "year": 2011,
  "description": "The God of Thunder is exiled to Earth and must learn humility."
}
```

### Step 2: Add Edges

Add connections to the `edges` array. Each edge connects two existing nodes:

```json
{
  "from": "char-thor-odinson",
  "to": "movie-thor-1",
  "label": "appears in",
  "strength": "strong"
}
```

### Step 3: Verify

- Ensure all `from` and `to` IDs reference existing nodes
- Use consistent naming conventions (kebab-case for IDs)
- Keep descriptions concise but informative

## Files Structure

```
/public/
  /map/
    index.html              # Main page
  /data/
    connections.json        # Network data
  /js/
    shared-data.js         # Data loading utilities (updated)
    universe-map.js        # Main Vis.js visualization (500 lines)
    map-sidebar.js         # Sidebar controls (200 lines)
  /css/
    map.css                # Styling (300 lines)
  MAP-README.md            # This file
```

## Features

### Visualization
- **Physics-based layout:** Nodes repel each other, connected nodes attract
- **Pan & Zoom:** Click-drag to pan, scroll to zoom
- **Animations:** Smooth transitions and stabilization on load

### Interactions
- **Click nodes:** View details in the sidebar
- **Highlight connections:** Clicking a node highlights connected nodes
- **Navigate connections:** Click a connection node to jump to that node

### Filtering
- **Type Filter:** Show/hide movies, characters, artifacts, events
- **Phase Filter:** Filter by MCU phase (1, 2, 3)
- **Search:** Find nodes by name or description
- **Statistics:** Display real-time counts of visible nodes and edges

### Controls
- **Zoom In/Out:** Button controls for precise zooming
- **Reset View:** Fit all visible nodes on screen

## Technical Details

### Libraries
- **Vis.js Network** (v9+): Rendering and physics simulation
- **Vanilla JavaScript:** No framework dependencies

### Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile-responsive layout

### Performance
- Physics simulation stabilizes after ~200 iterations
- Filtered views update in real-time
- Smooth animations at 60 FPS on desktop

## Shared Data Integration

The map uses `window.marvelData.hub` from `/js/shared-data.js`:

```javascript
// Load connections
const connections = window.marvelData.hub.getConnections();

// Find a node
const node = window.marvelData.hub.findNode('char-tony-stark');

// Get connected nodes
const connected = window.marvelData.hub.getConnectedNodes('char-tony-stark');

// Filter nodes
const filtered = window.marvelData.hub.filterNodes({
  types: ['character', 'movie'],
  phases: [1, 2],
  search: 'Avengers'
});

// Search
const results = window.marvelData.hub.searchNodes('Loki');

// Get statistics
const stats = window.marvelData.hub.getStatistics();
```

## Customization

### Colors
Edit node colors in `connections.json` or update CSS color variables in `map.css`:

```css
:root {
  --primary-bg: #ffffff;
  --text-primary: #333333;
  --accent-color: #b71c1c;
}
```

### Node Sizes
Adjust in `universe-map.js`:

```javascript
getNodeSize(type) {
  const sizes = {
    movie: 40,
    character: 35,
    artifact: 30,
    event: 35
  };
  return sizes[type] || 30;
}
```

### Physics Simulation
Modify in `universe-map.js` options:

```javascript
physics: {
  barnesHut: {
    gravitationalConstant: -15000,
    centralGravity: 0.3,
    springLength: 200,
    springConstant: 0.05
  }
}
```

## Statistics

Current data (as of Oct 2026):
- **Nodes:** 25 (5 movies, 10 characters, 10 artifacts, 5 events)
- **Edges:** 50+ connections
- **Phases:** 1, 2, 3

## Future Enhancements

- [ ] Export graph as image or SVG
- [ ] Share specific node views via URL parameters
- [ ] Community-contributed connections (moderation needed)
- [ ] Timeline view alongside network
- [ ] Show path between two nodes
- [ ] Import/export graph data
- [ ] Multiple universe support (MCU, Comics, TV)

## Troubleshooting

### Nodes not showing up
1. Check JSON syntax in `connections.json`
2. Verify node IDs are unique
3. Check browser console for errors

### Edges not connecting
1. Verify `from` and `to` IDs match existing nodes
2. Check for typos in node IDs
3. Ensure edges are in the `edges` array

### Performance issues
1. Disable physics: `network.setOptions({ physics: false })`
2. Reduce node count with filters
3. Check browser console for JavaScript errors

### Mobile responsiveness
- Layout automatically adapts at breakpoints (1024px, 768px, 600px)
- Touch interactions work on mobile browsers
- Sidebar scrolls independently on small screens

## SEO Considerations

- Page has proper meta tags for search engines
- Sitemap includes `/map` URL
- robots.txt allows indexing
- Unique, descriptive content in node tooltips

## Accessibility

- Keyboard navigation support
- ARIA labels on controls
- Color contrast meets WCAG standards
- Semantic HTML structure
- Focus indicators on interactive elements

## License

Part of Marvel Details project. Vis.js is MIT licensed.

## Support

For issues or suggestions:
1. Check connections.json for data integrity
2. Verify browser compatibility
3. Check browser console for errors
4. Review physics settings if layout is poor
