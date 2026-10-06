/**
 * Character Arc Tracker - Marvel Details
 * Handles the grid view, modal preview, filtering, sorting, and favorites
 */

class CharacterArcTracker {
  constructor() {
    this.allCharacters = [];
    this.filteredCharacters = [];
    this.currentRole = 'all';
    this.currentSort = 'default';
    this.favorites = new Set();
    this.selectedCharacter = null;
    this.modalOpen = false;
    this.init();
  }

  /**
   * Initialize the character tracker
   */
  async init() {
    try {
      await this.loadFavorites();
      await this.loadCharacters();
      this.setupEventListeners();
      this.populateFilters();
      this.render();
    } catch (error) {
      console.error('Error initializing character arc tracker:', error);
      this.showError('Failed to load character data');
    }
  }

  /**
   * Load characters from shared data
   */
  async loadCharacters() {
    this.allCharacters = await MarvelDataHub.loadCharacters();
    this.filteredCharacters = [...this.allCharacters];
  }

  /**
   * Favorites live in the member store (public/js/members.js, saved on this
   * device and synced when signed in). That script loads as a module, so it
   * may arrive after this one: read its saved copy directly until it's ready.
   */
  async loadFavorites() {
    this.favorites = new Set(this.readStoredFavorites());
    const refresh = () => {
      if (!window.dymMembers) return;
      this.favorites = new Set(window.dymMembers.favIds());
      this.render();
    };
    document.addEventListener('dym:ready', refresh);
    document.addEventListener('dym:change', refresh);
  }

  readStoredFavorites() {
    if (window.dymMembers) return window.dymMembers.favIds();
    try {
      const store = JSON.parse(localStorage.getItem('dym-members-v1') || '{}');
      const favs = Object.keys(store.favs || {}).filter((id) => store.favs[id].on);
      const old = JSON.parse(localStorage.getItem('characterFavorites') || '[]');
      return [...favs, ...old];
    } catch (error) {
      return [];
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    const roleFilter = document.getElementById('character-role-filter');
    const sortSelect = document.getElementById('character-sort');
    const searchInput = document.getElementById('character-search');
    const modalClose = document.querySelector('.character-modal-close');

    if (roleFilter) {
      roleFilter.addEventListener('change', (e) => {
        this.currentRole = e.target.value;
        this.applyFilters();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.currentSort = e.target.value;
        this.applySorting();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterBySearch(e.target.value);
      });
    }

    if (modalClose) {
      modalClose.addEventListener('click', () => this.closeModal());
    }

    // Close modal when clicking backdrop
    const modal = document.getElementById('character-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal();
        }
      });
    }

    // Handle keyboard escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modalOpen) {
        this.closeModal();
      }
    });
  }

  /**
   * Populate filter dropdowns with available options
   */
  async populateFilters() {
    const roleFilter = document.getElementById('character-role-filter');
    if (!roleFilter) return;

    const roles = await MarvelDataHub.getUniqueRoles();
    const currentValue = roleFilter.value;

    // Keep the 'all' option, add others
    const options = roleFilter.querySelectorAll('option:not(:first-child)');
    options.forEach(opt => opt.remove());

    roles.forEach(role => {
      const option = document.createElement('option');
      option.value = role;
      option.textContent = MarvelDataHub.formatRoleName(role);
      roleFilter.appendChild(option);
    });

    roleFilter.value = currentValue;
  }

  /**
   * Apply filters
   */
  applyFilters() {
    this.filteredCharacters = this.allCharacters.filter(char => {
      if (this.currentRole !== 'all' && char.role !== this.currentRole) {
        return false;
      }
      return true;
    });

    this.applySorting();
  }

  /**
   * Filter by search term
   */
  filterBySearch(searchTerm) {
    const term = searchTerm.toLowerCase();
    this.filteredCharacters = this.allCharacters.filter(char => {
      if (this.currentRole !== 'all' && char.role !== this.currentRole) {
        return false;
      }
      return (
        char.fullName.toLowerCase().includes(term) ||
        char.heroName.toLowerCase().includes(term) ||
        char.arcThesis.toLowerCase().includes(term) ||
        char.actor.toLowerCase().includes(term)
      );
    });

    this.applySorting();
  }

  /**
   * Apply sorting to filtered characters
   */
  applySorting() {
    const sorted = [...this.filteredCharacters];

    switch (this.currentSort) {
      case 'name':
        sorted.sort((a, b) => a.heroName.localeCompare(b.heroName));
        break;
      case 'first-appearance':
        sorted.sort((a, b) => a.firstYear - b.firstYear || a.heroName.localeCompare(b.heroName));
        break;
      case 'site-films':
        sorted.sort((a, b) => b.siteFilms.length - a.siteFilms.length || a.heroName.localeCompare(b.heroName));
        break;
      default:
        // Keep original order
        break;
    }

    this.filteredCharacters = sorted;
    this.render();
  }

  /**
   * Render the character grid
   */
  render() {
    const container = document.getElementById('characters-grid');
    if (!container) return;

    if (this.filteredCharacters.length === 0) {
      container.innerHTML = `
        <div class="no-results">
          <p>No characters found matching your filters.</p>
          <p class="no-results-hint">Try adjusting your search or filter options.</p>
        </div>
      `;
      this.updateResultCount();
      return;
    }

    container.innerHTML = this.filteredCharacters
      .map(char => this.createCharacterCard(char))
      .join('');

    // Add event listeners to cards
    container.querySelectorAll('.character-card').forEach(card => {
      const slug = card.dataset.slug;
      card.addEventListener('click', () => this.openModal(slug));
    });

    // Add event listeners to favorite buttons
    container.querySelectorAll('.character-favorite-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const slug = btn.dataset.slug;
        this.toggleFavorite(slug);
      });
    });

    this.updateResultCount();
  }

  /**
   * Create HTML for a character card
   */
  createCharacterCard(char) {
    const isFavorite = this.favorites.has(char.id);
    const roleClass = `role-${char.role.replace(/[^a-z-]/g, '')}`;

    return `
      <div class="character-card" data-slug="${char.slug}" data-id="${char.id}">
        <div class="character-card-header">
          <div class="character-info">
            <h3>${this.escapeHtml(char.heroName)}</h3>
            <p class="character-actor">${this.escapeHtml(char.actor)}</p>
          </div>
          <button class="character-favorite-btn ${isFavorite ? 'favorited' : ''}"
                  data-slug="${char.slug}"
                  title="${isFavorite ? 'Favorite (tap to remove)' : 'Add to favorites'}"
                  aria-pressed="${isFavorite ? 'true' : 'false'}"
                  aria-label="Favorite ${char.heroName}">
            ${isFavorite ? '★' : '☆'}
          </button>
        </div>
        <div class="character-role ${roleClass}">
          ${MarvelDataHub.formatRoleName(char.role)}
        </div>
        <p class="character-thesis">${this.escapeHtml(char.arcThesis)}</p>
        <div class="character-stats">
          <span class="stat-item">
            First seen: <strong>${this.escapeHtml(char.firstFilm)}</strong> (${char.firstYear})
          </span>
          <span class="stat-item">
            In <strong>${char.siteFilms.length}</strong> of our 5 films
          </span>
        </div>
      </div>
    `;
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(slug) {
    const character = await MarvelDataHub.findCharacter(slug);
    if (!character) return;

    if (window.dymMembers) {
      window.dymMembers.toggleFav(character.id); // fires dym:change, which re-renders
      return;
    }
    if (this.favorites.has(character.id)) {
      this.favorites.delete(character.id);
    } else {
      this.favorites.add(character.id);
    }
    this.render();
  }

  /**
   * Open character modal
   */
  async openModal(slug) {
    const character = await MarvelDataHub.findCharacter(slug);
    if (!character) return;

    this.selectedCharacter = character;
    this.modalOpen = true;

    const modal = document.getElementById('character-modal');
    if (!modal) return;

    modal.innerHTML = this.createModalContent(character);
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Set up close button in modal
    const closeBtn = modal.querySelector('.character-modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal());
    }

    // Set up similar arcs section
    await this.populateSimilarArcs(character.id);
  }

  /**
   * Close character modal
   */
  closeModal() {
    const modal = document.getElementById('character-modal');
    if (modal) {
      modal.classList.remove('open');
      modal.innerHTML = '';
    }
    this.modalOpen = false;
    this.selectedCharacter = null;
    document.body.style.overflow = '';
  }

  /**
   * Create modal content
   */
  createModalContent(char) {
    const isFavorite = this.favorites.has(char.id);

    return `
      <div class="character-modal-content">
        <div class="modal-header">
          <div>
            <h2>${this.escapeHtml(char.heroName)}</h2>
            <p class="modal-full-name">${this.escapeHtml(char.fullName)}</p>
          </div>
          <button class="character-modal-close" aria-label="Close">×</button>
        </div>

        <div class="modal-body">
          <div class="modal-main">
            <div class="modal-section">
              <h3>Arc Thesis</h3>
              <p>${this.escapeHtml(char.arcThesis)}</p>
            </div>

            <div class="modal-section">
              <h3>Character Journey</h3>
              <ol class="arc-stages">
                ${char.arcStages.map((stage, i) => `
                  <li class="arc-stage"><span class="arc-step">${i + 1}</span><span class="arc-stage-name">${this.escapeHtml(stage)}</span></li>
                `).join('')}
              </ol>
            </div>

            <div class="modal-stats-grid">
              <div class="modal-stat">
                <span class="stat-label">First MCU film</span>
                <span class="stat-value">${this.escapeHtml(char.firstFilm)} (${char.firstYear})</span>
                ${char.firstNote ? `<span class="stat-note">${this.escapeHtml(char.firstNote)}</span>` : ''}
              </div>
              <div class="modal-stat">
                <span class="stat-label">In our 5 films</span>
                <span class="stat-value">${char.siteFilms.length}</span>
                <span class="stat-note">${this.escapeHtml(char.siteFilms.join(', '))}</span>
              </div>
            </div>

            <div class="modal-section">
              <h3>Key Facts</h3>
              <ul class="modal-fact-list">
                <li><strong>Actor:</strong> ${this.escapeHtml(char.actor)}</li>
                <li><strong>Role Type:</strong> ${MarvelDataHub.formatRoleName(char.role)}</li>
                ${char.loveInterests.length > 0 ? `
                  <li><strong>Love Interests:</strong> ${this.escapeHtml(char.loveInterests.join(', '))}</li>
                ` : ''}
              </ul>
            </div>
          </div>

          <div class="modal-sidebar">
            <div class="modal-section">
              <h3>Similar Arcs</h3>
              <div id="similar-arcs-list" class="similar-arcs">
                <p class="loading">Loading similar characters...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Populate similar arcs section
   */
  async populateSimilarArcs(characterId) {
    const container = document.getElementById('similar-arcs-list');
    if (!container) return;

    try {
      const similar = await MarvelDataHub.getSimilarArcs(characterId, 3);

      if (similar.length === 0) {
        container.innerHTML = '<p class="no-similar">No similar characters found.</p>';
        return;
      }

      // Each similar character is a button that opens its own popup.
      container.innerHTML = similar.map(item => `
        <button type="button" class="similar-arc-item" data-slug="${item.character.slug}"
                aria-label="Open ${this.escapeHtml(item.character.heroName)}">
          <span class="similar-name">${this.escapeHtml(item.character.heroName)}</span>
          <span class="similar-match">
            <span class="similarity-bar">
              <span class="similarity-fill" style="width: ${item.similarity}%"></span>
            </span>
            ${item.similarity}% match
          </span>
          <span class="similar-thesis">${this.escapeHtml(item.character.arcThesis)}</span>
          <span class="similar-open" aria-hidden="true">Open file ▸</span>
        </button>
      `).join('');
      container.querySelectorAll('.similar-arc-item').forEach(btn => {
        btn.addEventListener('click', () => this.openModal(btn.dataset.slug));
      });
    } catch (error) {
      console.error('Error loading similar arcs:', error);
      container.innerHTML = '<p class="error">Could not load similar characters.</p>';
    }
  }

  /**
   * Update result count display
   */
  updateResultCount() {
    const countElement = document.getElementById('character-result-count');
    if (!countElement) return;

    const total = this.allCharacters.length;
    const shown = this.filteredCharacters.length;

    if (shown === total) {
      countElement.textContent = `Showing all ${shown} characters`;
    } else {
      countElement.textContent = `Found ${shown} of ${total} characters`;
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    const container = document.getElementById('characters-grid');
    if (container) {
      container.innerHTML = `<div class="error-message"><p>${this.escapeHtml(message)}</p></div>`;
    }
  }

  /**
   * Escape HTML special characters
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

/**
 * Initialize on DOM ready
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('characters-grid')) {
      new CharacterArcTracker();
    }
  });
} else {
  if (document.getElementById('characters-grid')) {
    new CharacterArcTracker();
  }
}
