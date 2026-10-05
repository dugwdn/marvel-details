/**
 * Marvel Universe Map - Sidebar Controls
 * Handles filtering, search, and detail display
 */

class MapSidebarController {
  constructor() {
    this.currentFilters = {
      types: ['movie', 'character', 'artifact', 'event'],
      phases: [1, 2, 3],
      search: ''
    };
    this.init();
  }

  /**
   * Initialize sidebar controls
   */
  init() {
    this.setupFilterListeners();
    this.setupSearchListeners();
    this.setupDetailPanelListeners();
    this.setupResponsiveHandling();
  }

  /**
   * Setup filter checkboxes
   */
  setupFilterListeners() {
    const typeFilters = document.querySelectorAll('.type-filter');
    const phaseFilters = document.querySelectorAll('.phase-filter');

    const updateFilters = () => this.applyFilters();

    typeFilters.forEach(filter => {
      filter.addEventListener('change', (e) => {
        if (e.target.checked) {
          if (!this.currentFilters.types.includes(e.target.value)) {
            this.currentFilters.types.push(e.target.value);
          }
        } else {
          this.currentFilters.types = this.currentFilters.types.filter(
            t => t !== e.target.value
          );
        }
        updateFilters();
      });
    });

    phaseFilters.forEach(filter => {
      filter.addEventListener('change', (e) => {
        const phase = parseInt(e.target.value);
        if (e.target.checked) {
          if (!this.currentFilters.phases.includes(phase)) {
            this.currentFilters.phases.push(phase);
          }
        } else {
          this.currentFilters.phases = this.currentFilters.phases.filter(
            p => p !== phase
          );
        }
        updateFilters();
      });
    });
  }

  /**
   * Setup search functionality
   */
  setupSearchListeners() {
    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear');

    if (searchInput) {
      // Debounce search input
      let searchTimeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        this.currentFilters.search = e.target.value;

        searchTimeout = setTimeout(() => {
          this.applyFilters();
        }, 300);
      });

      // Allow Enter key to search immediately
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          clearTimeout(searchTimeout);
          this.applyFilters();
        }
      });
    }

    if (searchClear) {
      searchClear.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
          this.currentFilters.search = '';
          this.applyFilters();
        }
      });
    }
  }

  /**
   * Setup detail panel close button
   */
  setupDetailPanelListeners() {
    const closeBtn = document.getElementById('close-details');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.showWelcome();
      });
    }
  }

  /**
   * Setup responsive behavior
   */
  setupResponsiveHandling() {
    // Could add touch-specific handling here
    if (window.matchMedia('(max-width: 768px)').matches) {
      // Mobile adjustments
      const sidebar = document.querySelector('.map-panel-right');
      if (sidebar) {
        sidebar.style.maxHeight = '40vh';
      }
    }
  }

  /**
   * Apply current filters
   */
  applyFilters() {
    const filters = {
      types: this.currentFilters.types,
      phases: this.currentFilters.phases,
      search: this.currentFilters.search
    };

    // Dispatch custom event for main map to listen
    document.dispatchEvent(new CustomEvent('filtersChanged', {
      detail: filters
    }));
  }

  /**
   * Show node details in sidebar
   */
  showNodeDetails(node, connections) {
    const detailsSection = document.getElementById('details-section');
    const welcomeSection = document.getElementById('welcome-section');
    const nodeDetailsDiv = document.getElementById('node-details');
    const connectionsList = document.getElementById('connections-list');

    if (!nodeDetailsDiv || !connectionsList) return;

    // Toggle visibility
    if (detailsSection) detailsSection.style.display = 'block';
    if (welcomeSection) welcomeSection.style.display = 'none';

    // Build node details header
    let html = '<div class="node-header">';
    html += `<div class="node-title">${this.escapeHtml(node.label)}</div>`;
    html += `<span class="node-type">${this.capitalizeType(node.type)}</span>`;
    html += '</div>';

    // Add description if available
    if (node.description) {
      html += `<p class="node-description">${this.escapeHtml(node.description)}</p>`;
    }

    // Add metadata
    html += '<div class="node-meta">';
    if (node.phase) {
      html += `
        <div class="meta-item">
          <div class="meta-label">Phase</div>
          <div class="meta-value">${node.phase}</div>
        </div>
      `;
    }
    if (node.year) {
      html += `
        <div class="meta-item">
          <div class="meta-label">Year</div>
          <div class="meta-value">${node.year}</div>
        </div>
      `;
    }
    html += '</div>';

    nodeDetailsDiv.innerHTML = html;

    // Build connections section
    let connectionsHtml = '';

    // Outgoing connections
    if (connections.outgoing && connections.outgoing.length > 0) {
      connectionsHtml += '<h3 class="connections-title">Connected To</h3>';
      connections.outgoing.forEach(({ node: targetNode, edge }) => {
        connectionsHtml += `
          <div class="connection-item">
            <div class="connection-label">${this.escapeHtml(edge.label)}</div>
            <div class="connection-node" data-node-id="${targetNode.id}" role="button" tabindex="0">
              ${this.escapeHtml(targetNode.label)}
            </div>
          </div>
        `;
      });
    }

    // Incoming connections
    if (connections.incoming && connections.incoming.length > 0) {
      connectionsHtml += '<h3 class="connections-title">Connected From</h3>';
      connections.incoming.forEach(({ node: sourceNode, edge }) => {
        connectionsHtml += `
          <div class="connection-item">
            <div class="connection-label">${this.escapeHtml(edge.label)}</div>
            <div class="connection-node" data-node-id="${sourceNode.id}" role="button" tabindex="0">
              ${this.escapeHtml(sourceNode.label)}
            </div>
          </div>
        `;
      });
    }

    connectionsList.innerHTML = connectionsHtml;

    // Add event handlers to connection nodes
    connectionsList.querySelectorAll('.connection-node').forEach(el => {
      el.addEventListener('click', () => {
        const nodeId = el.dataset.nodeId;
        document.dispatchEvent(new CustomEvent('nodeSelected', {
          detail: { nodeId }
        }));
      });

      el.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          el.click();
        }
      });
    });
  }

  /**
   * Show welcome message
   */
  showWelcome() {
    const detailsSection = document.getElementById('details-section');
    const welcomeSection = document.getElementById('welcome-section');

    if (detailsSection) detailsSection.style.display = 'none';
    if (welcomeSection) welcomeSection.style.display = 'block';

    // Clear search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
  }

  /**
   * Update statistics display
   */
  updateStatistics(stats) {
    const statsContainer = document.getElementById('stats-container');
    if (!statsContainer) return;

    let html = `
      <p><strong>Nodes:</strong> ${stats.totalNodes}</p>
      <p><strong>Connections:</strong> ${stats.totalEdges}</p>
    `;

    // Add type breakdown
    if (Object.keys(stats.types).length > 0) {
      html += '<hr style="margin: 8px 0; grid-column: 1 / -1; border: none; border-top: 1px solid var(--border-color);">';
      html += '<p style="grid-column: 1 / -1;"><strong>By Type:</strong></p>';
      Object.entries(stats.types).forEach(([type, count]) => {
        const typeLabel = this.capitalizeType(type);
        html += `<p><strong>${typeLabel}:</strong> ${count}</p>`;
      });
    }

    // Add phase breakdown
    if (Object.keys(stats.phases).length > 0) {
      html += '<hr style="margin: 8px 0; grid-column: 1 / -1; border: none; border-top: 1px solid var(--border-color);">';
      html += '<p style="grid-column: 1 / -1;"><strong>By Phase:</strong></p>';
      Object.entries(stats.phases).forEach(([phase, count]) => {
        html += `<p><strong>Phase ${phase}:</strong> ${count}</p>`;
      });
    }

    statsContainer.innerHTML = html;
  }

  /**
   * Utility: Escape HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Utility: Capitalize type name
   */
  capitalizeType(type) {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  /**
   * Get current filters
   */
  getFilters() {
    return { ...this.currentFilters };
  }

  /**
   * Reset all filters
   */
  resetFilters() {
    // Reset to show all
    this.currentFilters = {
      types: ['movie', 'character', 'artifact', 'event'],
      phases: [1, 2, 3],
      search: ''
    };

    // Update UI
    document.querySelectorAll('.type-filter, .phase-filter').forEach(checkbox => {
      checkbox.checked = true;
    });

    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';

    this.applyFilters();
  }
}

// Initialize on page load
let mapSidebar;

document.addEventListener('DOMContentLoaded', () => {
  mapSidebar = new MapSidebarController();
});
