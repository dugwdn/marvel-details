/**
 * Character Arc Timeline Visualization - Marvel Details
 * Handles the timeline display and milestone interactions
 */

class CharacterTimeline {
  constructor(containerId, character) {
    this.container = document.getElementById(containerId);
    this.character = character;
    this.milestones = character.milestones || [];
    this.expandedMilestone = null;
    this.init();
  }

  /**
   * Initialize timeline
   */
  init() {
    if (!this.container) return;
    this.render();
    this.setupEventListeners();
  }

  /**
   * Render the timeline
   */
  render() {
    const isDesktop = window.innerWidth >= 768;
    this.container.innerHTML = this.createTimelineHTML(isDesktop);
  }

  /**
   * Create timeline HTML
   */
  createTimelineHTML(isDesktop) {
    return `
      <div class="timeline-container ${isDesktop ? 'timeline-desktop' : 'timeline-mobile'}">
        <div class="timeline-header">
          <h3>${this.escapeHtml(this.character.heroName)} - Character Arc Timeline</h3>
          <p class="timeline-subtitle">${this.escapeHtml(this.character.arcThesis)}</p>
        </div>

        <div class="timeline-track">
          <div class="timeline-line"></div>
          <div class="timeline-milestones">
            ${this.milestones.map((milestone, index) => this.createMilestoneHTML(milestone, index)).join('')}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Create milestone HTML
   */
  createMilestoneHTML(milestone, index) {
    const phaseClass = `phase-${milestone.phase}`;
    const phaseColor = this.getPhaseColor(milestone.phase);
    const isExpanded = this.expandedMilestone === milestone.id;

    return `
      <div class="timeline-milestone" data-milestone-id="${milestone.id}" data-index="${index}">
        <div class="milestone-dot" style="background-color: ${phaseColor};"></div>
        <div class="milestone-content">
          <button class="milestone-header" data-milestone-id="${milestone.id}">
            <div class="milestone-year">${milestone.year}</div>
            <div class="milestone-info">
              <strong>${this.escapeHtml(milestone.keyMoment)}</strong>
              <span class="arc-stage">${this.escapeHtml(milestone.arcStage)}</span>
            </div>
            <span class="expand-icon">${isExpanded ? '−' : '+'}</span>
          </button>
          ${isExpanded ? this.createMilestoneDetailsHTML(milestone) : ''}
        </div>
      </div>
    `;
  }

  /**
   * Create expanded milestone details
   */
  createMilestoneDetailsHTML(milestone) {
    const emotionalStateClass = this.getEmotionalStateClass(milestone.emotionalState);

    return `
      <div class="milestone-details">
        <div class="detail-section">
          <h4>Movie</h4>
          <p>${this.escapeHtml(milestone.movie)} (${milestone.year})</p>
        </div>

        <div class="detail-section">
          <h4>Key Moment</h4>
          <p>${this.escapeHtml(milestone.keyMoment)}</p>
        </div>

        <div class="detail-section">
          <h4>Description</h4>
          <p>${this.escapeHtml(milestone.description)}</p>
        </div>

        <div class="detail-section">
          <h4>Emotional State</h4>
          <p class="emotional-state ${emotionalStateClass}">
            ${this.escapeHtml(milestone.emotionalState)}
          </p>
        </div>

        <div class="detail-section">
          <h4>Arc Stage</h4>
          <p class="arc-stage-badge">${this.escapeHtml(milestone.arcStage)}</p>
        </div>

        <div class="detail-section">
          <h4>Tagline</h4>
          <p class="tagline">"${this.escapeHtml(milestone.tagline)}"</p>
        </div>
      </div>
    `;
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    const headers = this.container.querySelectorAll('.milestone-header');
    headers.forEach(header => {
      header.addEventListener('click', (e) => {
        e.preventDefault();
        const milestoneId = header.dataset.milestoneId;
        this.toggleMilestone(milestoneId);
      });
    });

    // Handle responsive resize
    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }

  /**
   * Toggle milestone expansion
   */
  toggleMilestone(milestoneId) {
    if (this.expandedMilestone === milestoneId) {
      this.expandedMilestone = null;
    } else {
      this.expandedMilestone = milestoneId;
    }
    this.render();
    this.setupEventListeners();

    // Scroll the expanded milestone into view
    const milestone = this.container.querySelector(`[data-milestone-id="${milestoneId}"]`);
    if (milestone) {
      setTimeout(() => {
        milestone.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }

  /**
   * Handle responsive resize
   */
  handleResize() {
    const wasDesktop = this.container.classList.contains('timeline-desktop');
    const isNowDesktop = window.innerWidth >= 768;

    if (wasDesktop !== isNowDesktop) {
      this.render();
      this.setupEventListeners();
    }
  }

  /**
   * Get phase color
   */
  getPhaseColor(phase) {
    const colors = {
      1: '#FFD700',  // Gold
      2: '#C0C0C0',  // Silver
      3: '#CD7F32',  // Bronze
      4: '#808080',  // Gray
      5: '#9370DB',  // Medium Purple
      6: '#DC143C'   // Crimson
    };
    return colors[phase] || '#999';
  }

  /**
   * Get emotional state CSS class
   */
  getEmotionalStateClass(emotionalState) {
    const state = emotionalState.toLowerCase();
    if (state.includes('happy') || state.includes('love') || state.includes('heroic') || state.includes('triumph')) {
      return 'emotional-positive';
    } else if (state.includes('sad') || state.includes('grief') || state.includes('loss') || state.includes('despair')) {
      return 'emotional-negative';
    } else if (state.includes('confused') || state.includes('torn') || state.includes('conflict')) {
      return 'emotional-conflicted';
    } else if (state.includes('fear') || state.includes('terror') || state.includes('desperate')) {
      return 'emotional-fear';
    }
    return 'emotional-neutral';
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
   * Get timeline statistics
   */
  getStats() {
    return {
      totalMilestones: this.milestones.length,
      yearSpan: Math.max(...this.milestones.map(m => m.year)) - Math.min(...this.milestones.map(m => m.year)),
      phases: new Set(this.milestones.map(m => m.phase)).size,
      stages: [...new Set(this.milestones.map(m => m.arcStage))]
    };
  }
}

/**
 * Initialize character timeline pages
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeCharacterTimelinePages();
  });
} else {
  initializeCharacterTimelinePages();
}

/**
 * Initialize all timeline pages
 */
async function initializeCharacterTimelinePages() {
  const charSlug = window.characterSlug;

  if (!charSlug || !document.getElementById('character-timeline')) {
    return;
  }

  try {
    const character = await MarvelDataHub.findCharacter(charSlug);
    if (character) {
      new CharacterTimeline('character-timeline', character);
    }
  } catch (error) {
    console.error('Error initializing character timeline:', error);
  }
}
