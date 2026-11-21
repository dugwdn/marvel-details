/**
 * Rabbit Holes Registry - Marvel Details
 * Handles loading, filtering, and progressive disclosure of thematic deep dives
 */

class RabbitHolesRegistry {
  constructor() {
    this.allHoles = [];
    this.filteredHoles = [];
    this.currentFilters = {
      difficulty: 'all',
      movies: [],
      searchTerm: ''
    };
    this.expandedHoles = new Set();
    this.expandedLevels = new Map(); // Map of holeId -> Set of expanded levels
    this.init();
  }

  /**
   * Initialize the registry
   */
  async init() {
    try {
      await this.loadHoles();
      this.setupEventListeners();
      this.render();
    } catch (error) {
      console.error('Error initializing rabbit holes registry:', error);
      this.showError('Failed to load rabbit holes data');
    }
  }

  /**
   * Load rabbit holes from JSON
   */
  async loadHoles() {
    const response = await fetch('/data/rabbit-holes.json');
    if (!response.ok) {
      throw new Error(`Failed to load rabbit holes: ${response.statusText}`);
    }
    const data = await response.json();
    this.films = data.films || {};
    this.allHoles = data.rabbitHoles || [];
    this.buildMovieFilters();
    this.filteredHoles = [...this.allHoles];
  }

  /**
   * Set up event listeners for filters and search
   */
  setupEventListeners() {
    const difficultyFilter = document.getElementById('difficulty-filter');
    const searchInput = document.getElementById('hole-search');

    if (difficultyFilter) {
      difficultyFilter.addEventListener('change', (e) => {
        this.currentFilters.difficulty = e.target.value;
        this.applyFilters();
      });
    }

    const movieList = document.querySelector('.movie-filters-list');
    if (movieList) movieList.addEventListener('change', (e) => {
      if (e.target && e.target.name === 'movie-filter') {
        if (e.target.checked) {
          this.currentFilters.movies.push(e.target.value);
        } else {
          this.currentFilters.movies = this.currentFilters.movies.filter(
            m => m !== e.target.value
          );
        }
        this.applyFilters();
      }
    });

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
    this.filteredHoles = this.allHoles.filter(hole => {
      // Difficulty filter
      if (this.currentFilters.difficulty !== 'all' &&
          hole.difficulty !== this.currentFilters.difficulty) {
        return false;
      }

      // Movie filter (include hole if it has ANY of the selected movies)
      if (this.currentFilters.movies.length > 0) {
        const hasMovie = hole.movies.some(m =>
          this.currentFilters.movies.includes(m)
        );
        if (!hasMovie) {
          return false;
        }
      }

      // Search term filter
      if (this.currentFilters.searchTerm) {
        const searchFields = `${hole.title} ${hole.tagline} ${hole.summary} ${this.characterNames(hole).join(' ')} ${hole.movies.map(m => this.filmName(m)).join(' ')}`.toLowerCase();
        if (!searchFields.includes(this.currentFilters.searchTerm)) {
          return false;
        }
      }

      return true;
    });

    this.render();
  }

  /**
   * Render the filtered holes grid
   */
  render() {
    const container = document.getElementById('holes-container');
    if (!container) return;

    if (this.filteredHoles.length === 0) {
      container.innerHTML = `
        <div class="no-results">
          <p>No rabbit holes found matching your filters.</p>
          <p class="no-results-hint">Try adjusting your search or filters.</p>
        </div>
      `;
      this.updateResultCount();
      return;
    }

    container.innerHTML = this.filteredHoles.map(hole => this.createHoleCard(hole)).join('');
    this.attachCardEventListeners();
    this.updateResultCount();
  }

  /**
   * Create HTML for a rabbit hole card
   */
  createHoleCard(hole) {
    const difficultyClass = `difficulty-${hole.difficulty}`;
    const difficultyLabel = this.difficultyLabel(hole.difficulty);
    const href = `/rabbit-holes/${encodeURIComponent(hole.slug)}`;
    const theoryLevels = hole.chapters.filter(c => c.kind === 'theory').length;

    return `
      <article class="hole-card" data-hole-id="${this.escapeHtml(hole.id)}">
        <div class="hole-card-header">
          <h3><a href="${href}">${this.escapeHtml(hole.title)}</a></h3>
          <span class="difficulty-badge ${difficultyClass}">${difficultyLabel}</span>
        </div>
        <p class="hole-tagline">${this.escapeHtml(hole.tagline)}</p>
        <p class="hole-summary">${this.escapeHtml(hole.summary)}</p>
        <div class="hole-meta">
          <span class="read-time">
            <strong>Read time:</strong> ${hole.readTime} min
          </span>
          <span class="movie-count">
            <strong>Sources:</strong> ${(hole.sources || []).length}
          </span>
          ${theoryLevels ? `<span class="theory-count"><strong>Fan theory:</strong> ${theoryLevels} level${theoryLevels > 1 ? 's' : ''}, labelled</span>` : ''}
        </div>
        <div class="hole-films">
          <strong>Films and series:</strong>
          ${hole.movies.map(m => this.filmHtml(m)).join(', ')}
        </div>
        <div class="hole-characters">
          <strong>Characters:</strong>
          <div class="characters-list">
            ${hole.relatedCharacters.map(c => this.characterHtml(c)).join('')}
          </div>
        </div>
        <div class="hole-actions">
          <a href="${href}" class="btn-explore">Explore this rabbit hole</a>
        </div>
      </article>
    `;
  }

  /**
   * A film or series name; only the films with a hub page on this site link.
   */
  filmName(slug) {
    return (this.films[slug] && this.films[slug].name) || slug;
  }

  filmHtml(slug) {
    const film = this.films[slug];
    const name = this.escapeHtml(this.filmName(slug));
    return film && film.hub ? `<a href="${film.hub}">${name}</a>` : `<span>${name}</span>`;
  }

  /**
   * A character tag; it links only when the character has a page here.
   */
  characterNames(hole) {
    return hole.relatedCharacters.map(c => (typeof c === 'string' ? c : c.name));
  }

  characterHtml(c) {
    const name = this.escapeHtml(typeof c === 'string' ? c : c.name);
    return c && c.page
      ? `<a class="char-tag" href="/characters/${encodeURIComponent(c.page)}">${name}</a>`
      : `<span class="char-tag">${name}</span>`;
  }

  /**
   * Build the film filter checkboxes from the films the rabbit holes use.
   */
  buildMovieFilters() {
    const list = document.querySelector('.movie-filters-list');
    if (!list) return;
    const used = new Set(this.allHoles.flatMap(h => h.movies));
    const slugs = Object.keys(this.films).filter(s => used.has(s));
    list.innerHTML = slugs.map((slug, i) => `
      <div class="movie-filter-item">
        <input type="checkbox" name="movie-filter" value="${this.escapeHtml(slug)}" id="movie-f${i}">
        <label for="movie-f${i}">${this.escapeHtml(this.filmName(slug))}</label>
      </div>
    `).join('');
  }

  /**
   * Attach event listeners to cards for interactivity
   */
  attachCardEventListeners() {
    const cards = document.querySelectorAll('.hole-card');
    cards.forEach(card => {
      const holeId = card.getAttribute('data-hole-id');
      const expandBtn = card.querySelector('.btn-expand-levels');
      if (expandBtn) {
        expandBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.toggleHoleExpanded(holeId, card);
        });
      }
    });
  }

  /**
   * Toggle hole expansion for full content
   */
  toggleHoleExpanded(holeId, card) {
    if (this.expandedHoles.has(holeId)) {
      this.expandedHoles.delete(holeId);
      card.classList.remove('expanded');
    } else {
      this.expandedHoles.add(holeId);
      card.classList.add('expanded');
      this.renderLevels(holeId, card);
    }
  }

  /**
   * Render progressive disclosure levels within card
   */
  renderLevels(holeId, card) {
    const hole = this.allHoles.find(h => h.id === holeId);
    if (!hole) return;

    const levelsContainer = card.querySelector('.levels-container');
    if (!levelsContainer) return;

    if (!this.expandedLevels.has(holeId)) {
      this.expandedLevels.set(holeId, new Set());
    }
    const expandedSet = this.expandedLevels.get(holeId);

    levelsContainer.innerHTML = hole.chapters.map((chapter, idx) => {
      const isExpanded = expandedSet.has(chapter.level);
      return `
        <div class="level-container level-${chapter.level}" data-level="${chapter.level}">
          <button class="level-toggle" aria-expanded="${isExpanded ? 'true' : 'false'}">
            <span class="level-number">Level ${chapter.level}</span>
            <span class="level-title">${this.escapeHtml(chapter.title)}</span>
            <span class="toggle-icon">+</span>
          </button>
          <div class="level-content ${isExpanded ? 'expanded' : 'collapsed'}">
            <p>${this.escapeHtml(chapter.content)}</p>
          </div>
        </div>
      `;
    }).join('');

    // Attach toggle listeners
    const toggles = card.querySelectorAll('.level-toggle');
    toggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        const levelContainer = toggle.closest('.level-container');
        const level = parseInt(levelContainer.getAttribute('data-level'));
        this.toggleLevel(holeId, level, toggle, levelContainer);
      });
    });
  }

  /**
   * Toggle individual level expansion
   */
  toggleLevel(holeId, level, button, container) {
    const expandedSet = this.expandedLevels.get(holeId) || new Set();
    const content = container.querySelector('.level-content');

    if (expandedSet.has(level)) {
      expandedSet.delete(level);
      content.classList.remove('expanded');
      content.classList.add('collapsed');
      button.setAttribute('aria-expanded', 'false');
      button.querySelector('.toggle-icon').textContent = '+';
    } else {
      expandedSet.add(level);
      content.classList.add('expanded');
      content.classList.remove('collapsed');
      button.setAttribute('aria-expanded', 'true');
      button.querySelector('.toggle-icon').textContent = '−';
    }

    this.expandedLevels.set(holeId, expandedSet);
  }

  /**
   * Convert difficulty to display label
   */
  difficultyLabel(difficulty) {
    const labels = {
      'casual': 'Casual',
      'intermediate': 'Intermediate',
      'advanced': 'Advanced'
    };
    return labels[difficulty] || difficulty;
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
      const total = this.allHoles.length;
      const shown = this.filteredHoles.length;
      if (shown === total) {
        countElement.textContent = `Showing all ${shown} rabbit holes`;
      } else {
        countElement.textContent = `Found ${shown} of ${total} rabbit holes`;
      }
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    const container = document.getElementById('holes-container');
    if (container) {
      container.innerHTML = `<div class="error-message"><p>${this.escapeHtml(message)}</p></div>`;
    }
  }

  /**
   * Get unique movies from all holes
   */
  getUniqueMovies() {
    const movieMap = {};
    this.allHoles.forEach(hole => {
      hole.movies.forEach(movie => {
        if (!movieMap[movie]) {
          movieMap[movie] = true;
        }
      });
    });
    return Object.keys(movieMap);
  }

  /**
   * Get unique characters from all holes
   */
  getUniqueCharacters() {
    const charSet = new Set();
    this.allHoles.forEach(hole => {
      this.characterNames(hole).forEach(char => charSet.add(char));
    });
    return Array.from(charSet).sort();
  }

  /**
   * Get statistics about rabbit holes
   */
  getStats() {
    const stats = {
      totalHoles: this.allHoles.length,
      byDifficulty: {
        casual: 0,
        intermediate: 0,
        advanced: 0
      },
      totalReadTime: 0,
      movieCount: new Set()
    };

    this.allHoles.forEach(hole => {
      stats.byDifficulty[hole.difficulty]++;
      stats.totalReadTime += hole.readTime;
      hole.movies.forEach(movie => stats.movieCount.add(movie));
    });

    stats.movieCount = stats.movieCount.size;
    return stats;
  }

  /**
   * Find a single rabbit hole by ID
   */
  findHole(id) {
    return this.allHoles.find(h => h.id === id);
  }

  /**
   * Get related holes for recommendations
   */
  getRelatedHoles(holeId, limit = 3) {
    const hole = this.findHole(holeId);
    if (!hole) return [];

    // Find holes with overlapping movies, characters, or related holes
    const relatedIds = new Set(hole.relatedHoles || []);
    const scored = this.allHoles
      .filter(h => h.id !== holeId)
      .map(h => {
        let score = 0;

        // Direct relationship
        if (relatedIds.has(h.id)) score += 10;

        // Shared movies
        const sharedMovies = hole.movies.filter(m => h.movies.includes(m));
        score += sharedMovies.length * 3;

        // Shared characters
        const otherChars = this.characterNames(h);
        const sharedChars = this.characterNames(hole).filter(c => otherChars.includes(c));
        score += sharedChars.length * 2;

        return { hole: h, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.hole);

    return scored;
  }
}

/**
 * Initialize the registry when DOM is ready
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.rabbitHolesRegistry = new RabbitHolesRegistry();
  });
} else {
  window.rabbitHolesRegistry = new RabbitHolesRegistry();
}
