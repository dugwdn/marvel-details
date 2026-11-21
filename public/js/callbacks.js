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
        (cb.relatedCharacters || []).some(c =>
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
    const unknown = { title: 'Unknown film', year: '' };
    const foreshadowMovie = this.movies[callback.foreshadow.movieId] || unknown;
    const fulfillmentMovie = this.movies[callback.fulfillment.movieId] || unknown;

    return `
      <article class="callback-card" id="callback-${callback.id}">
        <div class="callback-header">
          <h3><a href="/callbacks/callback-${callback.id}.html">${this.escapeHtml(callback.title)}</a></h3>
          <span class="callback-type">${this.escapeHtml(callback.type)}</span>
        </div>

        <div class="callback-timeline">
          <div class="timeline-item foreshadow">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
              <strong>${this.escapeHtml(foreshadowMovie.title)}</strong>
              ${this.sceneHtml(callback.foreshadow)}
              <p>${this.escapeHtml(callback.foreshadow.description)}</p>
            </div>
          </div>

          <div class="timeline-arrow">→</div>

          <div class="timeline-item fulfillment">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
              <strong>${this.escapeHtml(fulfillmentMovie.title)}</strong>
              ${this.sceneHtml(callback.fulfillment)}
              <p>${this.escapeHtml(callback.fulfillment.description)}</p>
            </div>
          </div>
        </div>

        <div class="callback-explanation">
          <p>${this.escapeHtml(callback.explanation)}</p>
          ${this.sourceHtml(callback.source)}
        </div>

        <div class="callback-meta">
          <div class="characters">
            <strong>Characters:</strong>
            ${(callback.relatedCharacters || []).map(c => this.characterTag(c)).join('')}
          </div>
          ${this.articlesHtml(callback.relatedArticles)}
        </div>

        <a href="/callbacks/callback-${callback.id}.html" class="read-more">Read Full Callback →</a>
      </article>
    `;
  },

  /**
   * Plain scene locator ("Final battle"). Nothing is shown when a callback has none.
   */
  sceneHtml(part) {
    return part && part.scene
      ? `<span class="timestamp">Scene: ${this.escapeHtml(part.scene)}</span>`
      : '';
  },

  /**
   * Visible "Source:" link for a callback (only real https addresses).
   */
  sourceHtml(source) {
    if (!source || !/^https:\/\//.test(source.url || '')) return '';
    return `<p class="callback-source">Source: <a href="${this.escapeHtml(source.url)}" target="_blank" rel="noopener">${this.escapeHtml(source.name || source.url)}</a></p>`;
  },

  /**
   * Character tag: a link when the character has a page (characterPages in
   * callbacks.json lists only pages that exist), plain text otherwise.
   */
  characterTag(name) {
    const pages = (window.marvelData.hub.getCallbackCharacterPages && window.marvelData.hub.getCallbackCharacterPages()) || {};
    const slug = pages[name];
    return slug
      ? `<a class="tag character-tag" href="/characters/${encodeURIComponent(slug)}">${this.escapeHtml(name)}</a>`
      : `<span class="tag character-tag">${this.escapeHtml(name)}</span>`;
  },

  /**
   * Related articles as links. callbacks.json only lists slugs that have a
   * page in /articles/ (test/links.test.mjs checks this); none = no row.
   */
  articlesHtml(articles) {
    const list = (articles || []).filter(a => /^[a-z0-9-]+$/.test(a));
    if (!list.length) return '';
    return `<div class="articles">
            <strong>Related Articles:</strong>
            ${list.map(a => `<a class="tag article-tag" href="/articles/${a}">${this.escapeHtml(a.replace(/-/g, ' '))}</a>`).join('')}
          </div>`;
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
    return String(text ?? '').replace(/[&<>"']/g, m => map[m]);
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
