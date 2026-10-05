/**
 * Deleted Scenes Registry - Marvel Details
 * Handles search, filtering, and display of deleted scenes data
 */

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
        if (!scene.format.includes(this.currentFilters.format)) {
          return false;
        }
      }

      // Search term filter
      if (this.currentFilters.searchTerm) {
        const searchFields = `${scene.title} ${scene.description} ${scene.movieTitle}`.toLowerCase();
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
      return;
    }

    container.innerHTML = this.filteredScenes.map(scene => this.createSceneCard(scene)).join('');
    this.updateResultCount();
  }

  /**
   * Create HTML for a scene card
   */
  createSceneCard(scene) {
    const formatBadges = scene.format
      .map(f => `<span class="format-badge format-${f}">${this.formatLabel(f)}</span>`)
      .join('');

    return `
      <div class="scene-card" data-movie-id="${scene.movieId}" data-scene-id="${scene.id}">
        <div class="scene-card-header">
          <h3>${this.escapeHtml(scene.title)}</h3>
          <div class="scene-formats">
            ${formatBadges}
          </div>
        </div>
        <p class="scene-movie"><strong>${this.escapeHtml(scene.movieTitle)} (${scene.movieYear})</strong></p>
        <p class="scene-description">${this.escapeHtml(scene.description)}</p>
        <div class="scene-details">
          <span class="detail-item">
            <strong>Runtime:</strong> ${this.escapeHtml(scene.runtime)}
          </span>
          <span class="detail-item">
            <strong>Type:</strong> ${this.escapeHtml(scene.significance)}
          </span>
        </div>
        <p class="scene-where"><strong>Where to Watch:</strong> ${this.escapeHtml(scene.whereToWatch)}</p>
        <p class="scene-synopsis"><em>${this.escapeHtml(scene.synopsis)}</em></p>
      </div>
    `;
  }

  /**
   * Convert format code to display label
   */
  formatLabel(format) {
    const labels = {
      'dvd': 'DVD',
      'blu-ray': 'Blu-ray',
      'disney+': 'Disney+'
    };
    return labels[format] || format;
  }

  /**
   * Escape HTML special characters
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
      scene.format.forEach(format => {
        stats.formatCounts[format] = (stats.formatCounts[format] || 0) + 1;
      });
    });

    return stats;
  }
}

/**
 * Initialize the registry when DOM is ready
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new DeletedScenesRegistry();
  });
} else {
  new DeletedScenesRegistry();
}
