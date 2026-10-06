/**
 * Deleted Scenes Registry - Marvel Details
 * Handles search, filtering, and display of deleted scenes data
 */

/**
 * Shared scene card renderer, used by /scenes/ and every /scenes/<film>-scenes page.
 * Every field is escaped. Missing fields (runtime, significance, source...) are
 * simply left out, so nothing ever prints "undefined".
 */
const SceneCards = {
  escape(text) {
    return String(text == null ? '' : text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },

  formatLabel(format) {
    const labels = { 'dvd': 'DVD', 'blu-ray': 'Blu-ray', 'digital': 'Digital', 'disney+': 'Disney+' };
    return labels[format] || format;
  },

  /** Only http(s) links are rendered; anything else is dropped. */
  safeUrl(url) {
    return /^https?:\/\//i.test(String(url || '')) ? url : '';
  },

  card(scene, { showMovie = false } = {}) {
    const e = SceneCards.escape;
    const formats = (scene.format || [])
      .map(f => `<span class="format-badge format-${e(String(f).replace(/[^a-z0-9-]/gi, ''))}">${e(SceneCards.formatLabel(f))}</span>`)
      .join('');
    const details = [
      scene.runtime ? `<span class="detail-item"><strong>Runtime:</strong> ${e(scene.runtime)}</span>` : '',
      scene.significance ? `<span class="detail-item"><strong>Type:</strong> ${e(scene.significance)}</span>` : ''
    ].join('');
    const src = scene.source || {};
    const srcUrl = SceneCards.safeUrl(src.url);
    const source = srcUrl
      ? `<p class="scene-source"><strong>Source:</strong> <a href="${e(srcUrl)}" target="_blank" rel="noopener">${e(src.name || srcUrl)}</a></p>`
      : '';
    return `
      <div class="scene-card" id="${e(scene.id)}" data-movie-id="${e(scene.movieId)}" data-scene-id="${e(scene.id)}">
        <div class="scene-card-header">
          <h3>${e(scene.title)}</h3>
          ${formats ? `<div class="scene-formats">${formats}</div>` : ''}
        </div>
        ${showMovie ? `<p class="scene-movie"><strong>${e(scene.movieTitle)}${scene.movieYear ? ` (${e(scene.movieYear)})` : ''}</strong></p>` : ''}
        ${scene.description ? `<p class="scene-description">${e(scene.description)}</p>` : ''}
        ${details ? `<div class="scene-details">${details}</div>` : ''}
        ${scene.whereToWatch ? `<p class="scene-where"><strong>Where to Watch:</strong> ${e(scene.whereToWatch)}</p>` : ''}
        ${scene.synopsis ? `<p class="scene-synopsis"><em>${e(scene.synopsis)}</em></p>` : ''}
        ${source}
      </div>
    `;
  },

  /** Render one film's scenes into a page (used by the per-film pages). */
  async renderMovie(movieId, listId = 'movie-scenes-list', countId = 'movie-count') {
    const container = document.getElementById(listId);
    const countEl = document.getElementById(countId);
    if (!container) return;
    try {
      const response = await fetch('/data/deleted-scenes.json');
      if (!response.ok) throw new Error(`Failed to load deleted scenes: ${response.status}`);
      const data = await response.json();
      const scenes = (data.deletedScenes || []).filter(s => s.movieId === movieId);
      if (scenes.length === 0) {
        container.innerHTML = '<p class="no-results">No deleted scenes found for this movie.</p>';
        if (countEl) countEl.textContent = 'No deleted scenes available';
        return;
      }
      if (countEl) countEl.textContent = `Showing ${scenes.length} deleted scene${scenes.length !== 1 ? 's' : ''}`;
      container.innerHTML = scenes.map(scene => SceneCards.card(scene)).join('');
    } catch (error) {
      console.error('Error loading deleted scenes:', error);
      container.innerHTML = '<p class="error-message">Error loading scenes. Please try again.</p>';
      if (countEl) countEl.textContent = '';
    }
  }
};
window.SceneCards = SceneCards;

class DeletedScenesRegistry {
  constructor() {
    this.allScenes = [];
    this.filteredScenes = [];
    this.currentFilters = {
      movie: 'all',
      format: 'all',
      searchTerm: ''
    };
    this.init();
  }

  /**
   * Initialize the registry
   */
  async init() {
    try {
      await this.loadScenes();
      this.setupEventListeners();
      this.render();
    } catch (error) {
      console.error('Error initializing deleted scenes registry:', error);
      this.showError('Failed to load deleted scenes data');
    }
  }

  /**
   * Load scenes from JSON
   */
  async loadScenes() {
    const response = await fetch('/data/deleted-scenes.json');
    if (!response.ok) {
      throw new Error(`Failed to load deleted scenes: ${response.statusText}`);
    }
    const data = await response.json();
    this.allScenes = data.deletedScenes || [];
    this.filteredScenes = [...this.allScenes];
  }

  /**
   * Set up event listeners for filters and search
   */
  setupEventListeners() {
    const movieFilter = document.getElementById('movie-filter');
    const formatFilter = document.getElementById('format-filter');
    const searchInput = document.getElementById('scene-search');

    if (movieFilter) {
      movieFilter.addEventListener('change', (e) => {
        this.currentFilters.movie = e.target.value;
        this.applyFilters();
      });
    }

    if (formatFilter) {
      formatFilter.addEventListener('change', (e) => {
        this.currentFilters.format = e.target.value;
        this.applyFilters();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.currentFilters.searchTerm = e.target.value.toLowerCase();
        this.applyFilters();
      });
    }
  }

  /**
   * Apply all active filters
   */
  applyFilters() {
    this.filteredScenes = this.allScenes.filter(scene => {
      // Movie filter
      if (this.currentFilters.movie !== 'all' && scene.movieId !== this.currentFilters.movie) {
        return false;
      }

      // Format filter
      if (this.currentFilters.format !== 'all') {
        if (!(scene.format || []).includes(this.currentFilters.format)) {
          return false;
        }
      }

      // Search term filter
      if (this.currentFilters.searchTerm) {
        const searchFields = [scene.title, scene.description, scene.synopsis, scene.movieTitle].filter(Boolean).join(' ').toLowerCase();
        if (!searchFields.includes(this.currentFilters.searchTerm)) {
          return false;
        }
      }

      return true;
    });

    this.render();
  }

  /**
   * Render the filtered scenes
   */
  render() {
    const container = document.getElementById('scenes-container');
    if (!container) return;

    if (this.filteredScenes.length === 0) {
      container.innerHTML = `
        <div class="no-results">
          <p>No deleted scenes found matching your filters.</p>
          <p class="no-results-hint">Try adjusting your search or filters.</p>
        </div>
      `;
      this.updateResultCount();
      return;
    }

    container.innerHTML = this.filteredScenes.map(scene => this.createSceneCard(scene)).join('');
    this.updateResultCount();
  }

  /**
   * Create HTML for a scene card (shared with the per-film pages)
   */
  createSceneCard(scene) {
    return SceneCards.card(scene, { showMovie: true });
  }

  /**
   * Update result count display
   */
  updateResultCount() {
    const countElement = document.getElementById('result-count');
    if (countElement) {
      const total = this.allScenes.length;
      const shown = this.filteredScenes.length;
      if (shown === total) {
        countElement.textContent = `Showing all ${shown} deleted scenes`;
      } else {
        countElement.textContent = `Found ${shown} of ${total} deleted scenes`;
      }
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    const container = document.getElementById('scenes-container');
    if (container) {
      container.innerHTML = `<div class="error-message"><p>${this.escapeHtml(message)}</p></div>`;
    }
  }

  /**
   * Get unique movies from scenes
   */
  getUniqueMovies() {
    const movies = {};
    this.allScenes.forEach(scene => {
      if (!movies[scene.movieId]) {
        movies[scene.movieId] = scene.movieTitle;
      }
    });
    return movies;
  }

  /**
   * Filter scenes by movie (for individual movie pages)
   */
  filterByMovie(movieId) {
    this.currentFilters.movie = movieId;
    this.applyFilters();
  }

  /**
   * Get all scenes for a specific movie
   */
  getScenesForMovie(movieId) {
    return this.allScenes.filter(scene => scene.movieId === movieId);
  }

  /**
   * Get statistics about the scenes
   */
  getStats() {
    const stats = {
      totalScenes: this.allScenes.length,
      movieCount: new Set(this.allScenes.map(s => s.movieId)).size,
      formatCounts: {}
    };

    this.allScenes.forEach(scene => {
      (scene.format || []).forEach(format => {
        stats.formatCounts[format] = (stats.formatCounts[format] || 0) + 1;
      });
    });

    return stats;
  }
}

/**
 * Initialize the registry when DOM is ready
 */
function startRegistry() {
  // Only the registry page (/scenes/) has the filterable list.
  if (document.getElementById('scenes-container')) new DeletedScenesRegistry();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startRegistry);
} else {
  startRegistry();
}
