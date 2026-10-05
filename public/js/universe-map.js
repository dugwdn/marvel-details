/**
 * Marvel Universe Map - Main Visualization
 * Interactive Vis.js network graph visualization of MCU connections
 */

class UniverseMap {
  constructor() {
    this.network = null;
    this.data = null;
    this.allNodes = [];
    this.allEdges = [];
    this.filteredNodes = [];
    this.filteredEdges = [];
    this.highlightedNodes = new Set();
    this.selectedNode = null;
    this.containerElement = document.getElementById('network-container');
  }

  /**
   * Initialize the universe map
   */
  async init() {
    try {
      // Wait for data to be ready
      await this.loadData();
      this.setupNetwork();
      this.setupEventListeners();
      this.updateStatistics();
    } catch (error) {
      console.error('Error initializing universe map:', error);
      this.showError('Failed to load universe map data');
    }
  }

  /**
   * Load data from shared data hub
   */
  async loadData() {
    // Load the connections directly: the hub only auto-starts on pages marked
    // data-feature, so waiting for its ready event alone left the map blank.
    this.data = await window.marvelData.hub.loadConnections();
    this.processData();
  }

  /**
   * Process raw data into vis.js format
   */
  processData() {
    if (!this.data) return;

    // Process nodes
    this.allNodes = (this.data.nodes || []).map(node => ({
      id: node.id,
      label: node.label,
      title: this.createNodeTooltip(node),
      color: node.color,
      type: node.type,
      phase: node.phase,
      description: node.description,
      year: node.year,
      shape: this.getNodeShape(node.type),
      size: this.getNodeSize(node.type),
      font: {
        size: 14,
        face: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
        color: '#333',
        align: 'center'
      },
      borderWidth: 2,
      borderWidthSelected: 3,
      shadow: {
        enabled: true,
        color: 'rgba(0,0,0,0.2)',
        size: 8,
        x: 3,
        y: 3
      }
    }));

    // Process edges
    this.allEdges = (this.data.edges || []).map(edge => ({
      from: edge.from,
      to: edge.to,
      label: edge.label,
      title: `${edge.label}`,
      color: edge.strength === 'strong' ? '#666' : '#ccc',
      width: edge.strength === 'strong' ? 2 : 1,
      smooth: {
        type: 'continuous'
      },
      font: {
        size: 11,
        face: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto'
      },
      arrows: 'to'
    }));

    // Initial filter: show all
    this.filteredNodes = [...this.allNodes];
    this.filteredEdges = [...this.allEdges];
  }

  /**
   * Get node shape based on type
   */
  getNodeShape(type) {
    const shapes = {
      movie: 'box',
      character: 'circle',
      artifact: 'diamond',
      event: 'star'
    };
    return shapes[type] || 'circle';
  }

  /**
   * Get node size based on type
   */
  getNodeSize(type) {
    const sizes = {
      movie: 40,
      character: 35,
      artifact: 30,
      event: 35
    };
    return sizes[type] || 30;
  }

  /**
   * Create tooltip text for nodes
   */
  createNodeTooltip(node) {
    let tooltip = `<strong>${node.label}</strong>`;
    if (node.description) {
      tooltip += `<br/>${node.description}`;
    }
    if (node.year) {
      tooltip += `<br/>Year: ${node.year}`;
    }
    tooltip += `<br/>Phase: ${node.phase}`;
    return tooltip;
  }

  /**
   * Setup the vis.js network
   */
  setupNetwork() {
    const nodesData = new vis.DataSet(this.filteredNodes);
    const edgesData = new vis.DataSet(this.filteredEdges);

    const options = {
      physics: {
        enabled: true,
        barnesHut: {
          gravitationalConstant: -15000,
          centralGravity: 0.3,
          springLength: 200,
          springConstant: 0.05
        },
        maxVelocity: 50,
        minVelocity: 0.75,
        solver: 'barnesHut',
        timestep: 0.5,
        stabilization: {
          iterations: 200,
          fit: true,
          updateInterval: 25
        }
      },
      interaction: {
        hover: true,
        navigationButtons: false,
        keyboard: true,
        zoomView: true,
        dragView: true
      },
      layout: {
        randomSeed: 42
      }
    };

    this.network = new vis.Network(
      this.containerElement,
      { nodes: nodesData, edges: edgesData },
      options
    );

    // Add event listeners to network
    this.network.on('click', (event) => this.handleNodeClick(event));
    this.network.on('stabilizationProgress', (params) => {
      const widthFactor = params.iterations / params.total;
      // Could show progress bar here
    });
    this.network.on('stabilizationIterationsDone', () => {
      this.network.setOptions({ physics: false });
    });
  }

  /**
   * Handle node click event
   */
  handleNodeClick(event) {
    if (event.nodes.length > 0) {
      const nodeId = event.nodes[0];
      this.selectNode(nodeId);
    } else {
      this.deselectNode();
    }
  }

  /**
   * Select and display node details
   */
  selectNode(nodeId) {
    this.selectedNode = nodeId;
    const node = this.allNodes.find(n => n.id === nodeId);

    if (node) {
      // Highlight this node and connected nodes
      this.highlightConnectedNodes(nodeId);

      // Show details panel
      this.showNodeDetails(node);

      // Update network highlighting
      this.network.selectNodes([nodeId]);
    }
  }

  /**
   * Deselect current node
   */
  deselectNode() {
    this.selectedNode = null;
    this.highlightedNodes.clear();
    this.network.selectNodes([]);
    MapSidebar.showWelcome();
  }

  /**
   * Highlight connected nodes
   */
  highlightConnectedNodes(nodeId) {
    this.highlightedNodes.clear();
    this.highlightedNodes.add(nodeId);

    // Find connected edges and nodes
    const edges = this.filteredEdges.filter(
      e => e.from === nodeId || e.to === nodeId
    );

    edges.forEach(edge => {
      if (edge.from === nodeId) {
        this.highlightedNodes.add(edge.to);
      } else {
        this.highlightedNodes.add(edge.from);
      }
    });

    this.network.selectNodes(Array.from(this.highlightedNodes));
  }

  /**
   * Show node details in sidebar
   */
  showNodeDetails(node) {
    const connections = this.getNodeConnections(node.id);
    MapSidebar.showNodeDetails(node, connections);
  }

  /**
   * Get connected nodes and edges for a node
   */
  getNodeConnections(nodeId) {
    const incoming = [];
    const outgoing = [];

    this.filteredEdges.forEach(edge => {
      if (edge.from === nodeId) {
        const targetNode = this.allNodes.find(n => n.id === edge.to);
        if (targetNode) {
          outgoing.push({ node: targetNode, edge });
        }
      } else if (edge.to === nodeId) {
        const sourceNode = this.allNodes.find(n => n.id === edge.from);
        if (sourceNode) {
          incoming.push({ node: sourceNode, edge });
        }
      }
    });

    return { incoming, outgoing };
  }

  /**
   * Filter nodes and edges based on criteria
   */
  applyFilters(filters) {
    const types = filters.types || [];
    const phases = filters.phases || [];
    const searchTerm = filters.search?.toLowerCase() || '';

    // Filter nodes
    this.filteredNodes = this.allNodes.filter(node => {
      const typeMatch = types.length === 0 || types.includes(node.type);
      const phaseMatch = phases.length === 0 || phases.includes(node.phase);
      const searchMatch = !searchTerm ||
        node.label.toLowerCase().includes(searchTerm) ||
        (node.description && node.description.toLowerCase().includes(searchTerm));

      return typeMatch && phaseMatch && searchMatch;
    });

    // Filter edges to only include those connecting filtered nodes
    const filteredNodeIds = new Set(this.filteredNodes.map(n => n.id));
    this.filteredEdges = this.allEdges.filter(edge =>
      filteredNodeIds.has(edge.from) && filteredNodeIds.has(edge.to)
    );

    // Update network
    this.updateNetworkData();

    // Update statistics
    this.updateStatistics();

    // Deselect if selected node was filtered out
    if (this.selectedNode && !filteredNodeIds.has(this.selectedNode)) {
      this.deselectNode();
    }
  }

  /**
   * Update network with filtered data
   */
  updateNetworkData() {
    if (!this.network) return;

    const nodesData = new vis.DataSet(this.filteredNodes);
    const edgesData = new vis.DataSet(this.filteredEdges);

    this.network.setData({ nodes: nodesData, edges: edgesData });
  }

  /**
   * Update statistics display
   */
  updateStatistics() {
    const stats = {
      totalNodes: this.filteredNodes.length,
      totalEdges: this.filteredEdges.length,
      types: {},
      phases: {}
    };

    this.filteredNodes.forEach(node => {
      stats.types[node.type] = (stats.types[node.type] || 0) + 1;
      stats.phases[node.phase] = (stats.phases[node.phase] || 0) + 1;
    });

    MapSidebar.updateStatistics(stats);
  }

  /**
   * Search and highlight nodes
   */
  searchNodes(term) {
    if (!term.trim()) {
      this.deselectNode();
      return;
    }

    const lowerTerm = term.toLowerCase();
    const matches = this.filteredNodes.filter(node =>
      node.label.toLowerCase().includes(lowerTerm) ||
      (node.description && node.description.toLowerCase().includes(lowerTerm))
    );

    if (matches.length > 0) {
      // Select and zoom to first match
      const firstMatch = matches[0];
      this.selectNode(firstMatch.id);
      this.network.focus(firstMatch.id, {
        scale: 1.2,
        animation: true
      });
    }
  }

  /**
   * Zoom controls
   */
  zoomIn() {
    if (!this.network) return;
    const scale = this.network.getScale();
    this.network.moveTo({
      scale: scale * 1.2,
      animation: true
    });
  }

  zoomOut() {
    if (!this.network) return;
    const scale = this.network.getScale();
    this.network.moveTo({
      scale: scale / 1.2,
      animation: true
    });
  }

  resetZoom() {
    if (!this.network) return;
    this.network.fit({
      animation: true
    });
  }

  /**
   * Setup event listeners for controls
   */
  setupEventListeners() {
    // Zoom controls
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const resetZoomBtn = document.getElementById('reset-zoom');

    if (zoomInBtn) zoomInBtn.addEventListener('click', () => this.zoomIn());
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => this.zoomOut());
    if (resetZoomBtn) resetZoomBtn.addEventListener('click', () => this.resetZoom());

    // Filter listeners - delegated to MapSidebar
    document.addEventListener('filtersChanged', (e) => {
      this.applyFilters(e.detail);
    });

    document.addEventListener('nodeSelected', (e) => {
      this.selectNode(e.detail.nodeId);
    });
  }

  /**
   * Show error message
   */
  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    this.containerElement.appendChild(errorDiv);
  }
}

/**
 * MapSidebar - Handles sidebar controls and display
 */
class MapSidebar {
  static initialize() {
    this.setupFilterListeners();
    this.setupSearchListeners();
    this.setupDetailPanelListeners();
  }

  static setupFilterListeners() {
    const typeFilters = document.querySelectorAll('.type-filter');
    const phaseFilters = document.querySelectorAll('.phase-filter');

    const updateFilters = () => this.applyFilters();

    typeFilters.forEach(filter => {
      filter.addEventListener('change', updateFilters);
    });

    phaseFilters.forEach(filter => {
      filter.addEventListener('change', updateFilters);
    });
  }

  static setupSearchListeners() {
    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        if (e.target.value.trim()) {
          universalMap.searchNodes(e.target.value);
        } else {
          universalMap.deselectNode();
        }
      });
    }

    if (searchClear) {
      searchClear.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
          universalMap.deselectNode();
        }
      });
    }
  }

  static setupDetailPanelListeners() {
    const closeBtn = document.getElementById('close-details');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        universalMap.deselectNode();
      });
    }
  }

  static applyFilters() {
    const typeFilters = Array.from(document.querySelectorAll('.type-filter:checked'))
      .map(f => f.value);
    const phaseFilters = Array.from(document.querySelectorAll('.phase-filter:checked'))
      .map(f => parseInt(f.value));
    const searchTerm = document.getElementById('search-input')?.value || '';

    const filters = {
      types: typeFilters,
      phases: phaseFilters,
      search: searchTerm
    };

    document.dispatchEvent(new CustomEvent('filtersChanged', { detail: filters }));
  }

  static showNodeDetails(node, connections) {
    const detailsSection = document.getElementById('details-section');
    const welcomeSection = document.getElementById('welcome-section');
    const nodeDetailsDiv = document.getElementById('node-details');
    const connectionsList = document.getElementById('connections-list');

    // Hide welcome, show details
    if (detailsSection) detailsSection.style.display = 'block';
    if (welcomeSection) welcomeSection.style.display = 'none';

    // Build node details HTML
    let html = `
      <div class="node-header">
        <div class="node-title">${node.label}</div>
        <span class="node-type">${node.type.charAt(0).toUpperCase() + node.type.slice(1)}</span>
      </div>
    `;

    if (node.description) {
      html += `<div class="node-description">${node.description}</div>`;
    }

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

    if (nodeDetailsDiv) {
      nodeDetailsDiv.innerHTML = html;
    }

    // Build connections HTML
    let connectionsHtml = '';

    if (connections.outgoing.length > 0) {
      connectionsHtml += '<div class="connections-title">Connected To:</div>';
      connections.outgoing.forEach(({ node: connNode, edge }) => {
        connectionsHtml += `
          <div class="connection-item">
            <div class="connection-label">${edge.label}</div>
            <div class="connection-node" data-node-id="${connNode.id}">
              ${connNode.label}
            </div>
          </div>
        `;
      });
    }

    if (connections.incoming.length > 0) {
      connectionsHtml += '<div class="connections-title">Connected From:</div>';
      connections.incoming.forEach(({ node: sourceNode, edge }) => {
        connectionsHtml += `
          <div class="connection-item">
            <div class="connection-label">${edge.label}</div>
            <div class="connection-node" data-node-id="${sourceNode.id}">
              ${sourceNode.label}
            </div>
          </div>
        `;
      });
    }

    if (connectionsList) {
      connectionsList.innerHTML = connectionsHtml;

      // Add click handlers to connection nodes
      connectionsList.querySelectorAll('.connection-node').forEach(el => {
        el.addEventListener('click', () => {
          const nodeId = el.dataset.nodeId;
          universalMap.selectNode(nodeId);
        });
      });
    }
  }

  static showWelcome() {
    const detailsSection = document.getElementById('details-section');
    const welcomeSection = document.getElementById('welcome-section');

    if (detailsSection) detailsSection.style.display = 'none';
    if (welcomeSection) welcomeSection.style.display = 'block';
  }

  static updateStatistics(stats) {
    const statsContainer = document.getElementById('stats-container');
    if (!statsContainer) return;

    let html = `
      <p><strong>Nodes:</strong> ${stats.totalNodes}</p>
      <p><strong>Connections:</strong> ${stats.totalEdges}</p>
    `;

    html += '<hr style="margin: 8px 0; border: none; border-top: 1px solid var(--border-color);">';

    html += '<p style="grid-column: 1 / -1;"><strong>By Type:</strong></p>';
    Object.entries(stats.types).forEach(([type, count]) => {
      html += `<p>${type}: ${count}</p>`;
    });

    html += '<p style="grid-column: 1 / -1; margin-top: 8px;"><strong>By Phase:</strong></p>';
    Object.entries(stats.phases).forEach(([phase, count]) => {
      html += `<p>Phase ${phase}: ${count}</p>`;
    });

    statsContainer.innerHTML = html;
  }
}

// Initialize on page load
let universalMap;

document.addEventListener('DOMContentLoaded', async () => {
  universalMap = new UniverseMap();
  await universalMap.init();
  MapSidebar.initialize();
});
