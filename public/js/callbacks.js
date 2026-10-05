/**
 * Callbacks UI Handler
 * Manages search, filtering, and display of foreshadowing & callback data
 */

const CallbacksUI = {
  // Movie data for display
  movies: {
    'iron-man-1': { title: 'Iron Man', year: 2008 },
    'iron-man-2': { title: 'Iron Man 2', year: 2010 },
    'iron-man-3': { title: 'Iron Man 3', year: 2013 },
    'avengers-1': { title: 'The Avengers', year: 2012 },
    'endgame': { title: 'Avengers: Endgame', year: 2019 }
  },

  // Filter state
  filters: {
    type: null,
    moviePair: null,
    character: null
  },

  searchQuery: '',

  /**
   * Initialize callbacks UI
   */
  init() {
    this.setupEventListeners();
    this.loadAndRender();
  },

  /**
   * Setup all event listeners for search and filters
   */
  setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('callback-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.applyFilters();
      });
    }

    // Type filters
    const typeFilters = document.querySelectorAll('[data-filter-type]');
    typeFilters.forEach(filter => {
      filter.addEventListener('click', (e) => {
        e.preventDefault();
        const type = filter.dataset.filterType;
        this.filters.type = this.filters.type === type ? null : type;
        this.updateFilterUI();
        this.applyFilters();
      });
    });

    // Movie pair filters
    const movieFilters = document.querySelectorAll('[data-filter-movie]');
    movieFilters.forEach(filter => {
      filter.addEventListener('click', (e) => {
        e.preventDefault();
        const pair = filter.dataset.filterMovie;
        this.filters.moviePair = this.filters.moviePair === pair ? null : pair;
        this.updateFilterUI();
        this.applyFilters();
      });
    });

    // Character filters
    const charFilters = document.querySelectorAll('[data-filter-character]');
    charFilters.forEach(filter => {
      filter.addEventListener('click', (e) => {
        e.preventDefault();
        const char = filter.dataset.filterCharacter;
        this.filters.character = this.filters.character === char ? null : char;
        this.updateFilterUI();
        this.applyFilters();
      });
    });

    // Clear filters button
    const clearBtn = document.getElementById('clear-filters');
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.filters = { type: null, moviePair: null, character: null };
        this.searchQuery = '';
        if (searchInput) searchInput.value = '';
        this.updateFilterUI();
        this.applyFilters();
      });
    }
  },

  /**
   * Load and render callbacks data
   */
  async loadAndRender() {
    if (!window.marvelData.hub) return;

    // Wait for data to load if needed
    if (!window.marvelData.hub.loaded && !window.marvelData.hub.loading) {
      await window.marvelData.hub.init();
    } else if (window.marvelData.hub.loading) {
      await new Promise(resolve => {
        document.addEventListener('marvelDataReady', resolve);
      });
    }

    this.applyFilters();
  },

  /**
   * Update filter UI to show active filters
   */
  updateFilterUI() {
    // Update type filter buttons
    document.querySelectorAll('[data-filter-type]').forEach(btn => {
      if (btn.dataset.filterType === this.filters.type) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update movie filter buttons
    document.querySelectorAll('[data-filter-movie]').forEach(btn => {
      if (btn.dataset.filterMovie === this.filters.moviePair) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update character filter buttons
    document.querySelectorAll('[data-filter-character]').forEach(btn => {
      if (btn.dataset.filterCharacter === this.filters.character) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  },

  /**
   * Apply filters and search to results
   */
  applyFilters() {
    let results = window.marvelData.hub.getCallbacks();

    // Apply search
    if (this.searchQuery) {
      results = results.filter(cb =>
        cb.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        cb.explanation.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        cb.relatedCharacters.some(c =>
          c.toLowerCase().includes(this.searchQuery.toLowerCase())
        )
      );
    }

    // Apply type filter
    if (this.filters.type) {
      results = results.filter(cb => cb.type === this.filters.type);
    }

    // Apply movie pair filter
    if (this.filters.moviePair) {
      const [foreshadowMovie, fulfillmentMovie] = this.filters.moviePair.split('→').map(m => m.trim());
      results = results.filter(cb =>
        cb.foreshadow.movieId === foreshadowMovie &&
        cb.fulfillment.movieId === fulfillmentMovie
      );
    }

    // Apply character filter
    if (this.filters.character) {
      results = results.filter(cb =>
        cb.relatedCharacters.includes(this.filters.character)
      );
    }

    this.renderResults(results);
  },

  /**
   * Render callback results
   */
  renderResults(callbacks) {
    const container = document.getElementById('callbacks-results');
    if (!container) return;

    if (callbacks.length === 0) {
      container.innerHTML = '<div class="no-results">No callbacks found matching your search.</div>';
      return;
    }

    const html = callbacks.map(cb => this.createCallbackCard(cb)).join('');
    container.innerHTML = html;
  },

  /**
   * Create a single callback card HTML
   */
  createCallbackCard(callback) {
    const foreshadowMovie = this.movies[callback.foreshadow.movieId];
    const fulfillmentMovie = this.movies[callback.fulfillment.movieId];

    return `
      <article class="callback-card" id="callback-${callback.id}">
        <div class="callback-header">
          <h3><a href="/callbacks/callback-${callback.id}.html">${this.escapeHtml(callback.title)}</a></h3>
          <span class="callback-type">${callback.type}</span>
        </div>

        <div class="callback-timeline">
          <div class="timeline-item foreshadow">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
              <strong>${this.escapeHtml(foreshadowMovie.title)}</strong>
              <span class="timestamp">${callback.foreshadow.timestamp}</span>
              <p>${this.escapeHtml(callback.foreshadow.description)}</p>
            </div>
          </div>

          <div class="timeline-arrow">→</div>

          <div class="timeline-item fulfillment">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
              <strong>${this.escapeHtml(fulfillmentMovie.title)}</strong>
              <span class="timestamp">${callback.fulfillment.timestamp}</span>
              <p>${this.escapeHtml(callback.fulfillment.description)}</p>
            </div>
          </div>
        </div>

        <div class="callback-explanation">
          <p>${this.escapeHtml(callback.explanation)}</p>
        </div>

        <div class="callback-meta">
          <div class="characters">
            <strong>Characters:</strong>
            ${callback.relatedCharacters.map(c =>
              `<span class="tag character-tag">${this.escapeHtml(c)}</span>`
            ).join('')}
          </div>
          <div class="articles">
            <strong>Related Articles:</strong>
            ${callback.relatedArticles.map(a =>
              `<span class="tag article-tag">${this.escapeHtml(a)}</span>`
            ).join('')}
          </div>
        </div>

        <a href="/callbacks/callback-${callback.id}.html" class="read-more">Read Full Callback →</a>
      </article>
    `;
  },

  /**
   * Escape HTML special characters
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  },

  /**
   * Generate embed code for movie pages
   * Returns 3-5 callbacks involving a specific film
   */
  getMovieEmbed(movieId, limit = 4) {
    const callbacks = window.marvelData.hub.getMovieCallbacks(movieId);
    const selected = callbacks.slice(0, limit);

    return {
      count: selected.length,
      callbacks: selected,
      html: this.generateEmbedHtml(selected)
    };
  },

  /**
   * Generate HTML for embedded callbacks
   */
  generateEmbedHtml(callbacks) {
    if (!callbacks.length) return '';

    const cards = callbacks.map(cb =>
      this.createCallbackCard(cb)
    ).join('');

    return `
      <div class="callbacks-embed">
        <h3 class="callbacks-title">Foreshadowing & Callbacks</h3>
        <div class="callbacks-embed-grid">
          ${cards}
        </div>
        <a href="/callbacks/" class="view-all-callbacks">View All Callbacks →</a>
      </div>
    `;
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('[data-feature="callbacks"]')) {
    CallbacksUI.init();
  }
});
