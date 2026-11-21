/**
 * Shared Data Hub for Marvel Details
 * Central manager for loading, caching, and accessing Marvel content data
 * Loads both deleted-scenes.json and callbacks.json on first use
 */

window.marvelData = window.marvelData || {};

const MarvelDataHub = {
  cache: {
    deletedScenes: null,
    callbacks: null,
    connections: null,
    characters: null
  },

  loaded: false,
  loading: false,
  nodeMap: new Map(),
  edgesByNode: new Map(),

  /**
   * Initialize the data hub and load all data
   */
  async init() {
    if (this.loaded || this.loading) return;
    this.loading = true;

    try {
      await Promise.all([
        this.loadDeletedScenes(),
        this.loadCallbacks(),
        this.loadConnections()
      ]);
      this.loaded = true;
      window.marvelData.ready = true;
      document.dispatchEvent(new CustomEvent('marvelDataReady'));
    } catch (error) {
      console.error('Error loading Marvel data:', error);
      this.loading = false;
    }
  },

  /**
   * Load deleted scenes data from JSON
   */
  async loadDeletedScenes() {
    if (this.cache.deletedScenes) return this.cache.deletedScenes;

    try {
      const response = await fetch('/data/deleted-scenes.json');
      const data = await response.json();
      this.cache.deletedScenes = data.deletedScenes || [];
      return this.cache.deletedScenes;
    } catch (error) {
      console.error('Error loading deleted scenes:', error);
      return [];
    }
  },

  /**
   * Load callbacks data from JSON
   */
  async loadCallbacks() {
    if (this.cache.callbacks) return this.cache.callbacks;

    try {
      const response = await fetch('/data/callbacks.json');
      const data = await response.json();
      this.cache.callbacks = data.callbacks || [];
      // Character name -> slug of an existing /characters/ page (others stay plain text).
      this.cache.callbackCharacterPages = data.characterPages || {};
      return this.cache.callbacks;
    } catch (error) {
      console.error('Error loading callbacks:', error);
      return [];
    }
  },

  /**
   * Load connections data from JSON
   */
  async loadConnections() {
    if (this.cache.connections) return this.cache.connections;

    try {
      const response = await fetch('/data/connections.json');
      const data = await response.json();
      this.cache.connections = data;
      this.indexConnections();
      return this.cache.connections;
    } catch (error) {
      console.error('Error loading connections:', error);
      return { nodes: [], edges: [] };
    }
  },

  /**
   * Index the connections data for fast lookup
   * @private
   */
  indexConnections() {
    if (!this.cache.connections) return;

    this.nodeMap.clear();
    this.edgesByNode.clear();

    // Index nodes
    (this.cache.connections.nodes || []).forEach(node => {
      this.nodeMap.set(node.id, node);
      this.edgesByNode.set(node.id, { outgoing: [], incoming: [] });
    });

    // Index edges
    (this.cache.connections.edges || []).forEach(edge => {
      if (this.edgesByNode.has(edge.from)) {
        this.edgesByNode.get(edge.from).outgoing.push(edge);
      }
      if (this.edgesByNode.has(edge.to)) {
        this.edgesByNode.get(edge.to).incoming.push(edge);
      }
    });
  },

  /**
   * Get all deleted scenes (cached)
   */
  getDeletedScenes() {
    return this.cache.deletedScenes || [];
  },

  /**
   * Get all callbacks (cached)
   */
  getCallbacks() {
    return this.cache.callbacks || [];
  },

  /**
   * Find callbacks by various criteria
   * @param {Object} criteria - Search criteria
   * @param {string} criteria.movieId - Filter by movie ID
   * @param {string} criteria.type - Filter by callback type
   * @param {string} criteria.character - Filter by related character
   * @param {string} criteria.searchTerm - Search in title/explanation
   */
  findCallbacks(criteria = {}) {
    let results = this.cache.callbacks || [];

    if (criteria.movieId) {
      results = results.filter(cb =>
        cb.foreshadow.movieId === criteria.movieId ||
        cb.fulfillment.movieId === criteria.movieId
      );
    }

    if (criteria.type) {
      results = results.filter(cb => cb.type === criteria.type);
    }

    if (criteria.character) {
      results = results.filter(cb =>
        cb.relatedCharacters.includes(criteria.character)
      );
    }

    if (criteria.searchTerm) {
      const term = criteria.searchTerm.toLowerCase();
      results = results.filter(cb =>
        cb.title.toLowerCase().includes(term) ||
        cb.explanation.toLowerCase().includes(term) ||
        cb.relatedCharacters.some(c => c.toLowerCase().includes(term))
      );
    }

    return results;
  },

  /**
   * Search callbacks with full text search
   * @param {string} query - Search query
   */
  searchCallbacks(query) {
    const q = query.toLowerCase();
    return (this.cache.callbacks || []).filter(cb =>
      cb.title.toLowerCase().includes(q) ||
      cb.explanation.toLowerCase().includes(q) ||
      cb.relatedCharacters.some(c => c.toLowerCase().includes(q)) ||
      cb.foreshadow.description.toLowerCase().includes(q) ||
      cb.fulfillment.description.toLowerCase().includes(q)
    );
  },

  /**
   * Get callbacks involving a specific movie
   * @param {string} movieId - Movie ID
   */
  getMovieCallbacks(movieId) {
    return (this.cache.callbacks || []).filter(cb =>
      cb.foreshadow.movieId === movieId ||
      cb.fulfillment.movieId === movieId
    );
  },

  /**
   * Get callbacks by type
   * @param {string} type - Callback type
   */
  getCallbacksByType(type) {
    return (this.cache.callbacks || []).filter(cb => cb.type === type);
  },

  /**
   * Get callbacks involving specific characters
   * @param {Array} characters - Array of character names
   */
  getCallbacksByCharacters(characters) {
    return (this.cache.callbacks || []).filter(cb =>
      characters.some(char => cb.relatedCharacters.includes(char))
    );
  },

  /**
   * Get related articles for a callback
   * @param {string} callbackId - Callback ID
   */
  getCallbackArticles(callbackId) {
    const callback = (this.cache.callbacks || []).find(cb => cb.id === callbackId);
    return callback ? callback.relatedArticles : [];
  },

  /**
   * Character name -> /characters/ page slug, for callback character links
   */
  getCallbackCharacterPages() {
    return this.cache.callbackCharacterPages || {};
  },

  /**
   * Get callback by ID
   * @param {string} id - Callback ID
   */
  getCallbackById(id) {
    return (this.cache.callbacks || []).find(cb => cb.id === id);
  },

  /**
   * Get all connections data
   */
  getConnections() {
    return this.cache.connections || { nodes: [], edges: [] };
  },

  /**
   * Find a node by ID
   * @param {string} id - The node ID
   * @returns {Object|null} The node object or null
   */
  findNode(id) {
    return this.nodeMap.get(id) || null;
  },

  /**
   * Get all connected nodes for a given node
   * @param {string} nodeId - The node ID
   * @returns {Object} Object with outgoing and incoming arrays
   */
  getConnectedNodes(nodeId) {
    if (!this.edgesByNode.has(nodeId)) {
      return { outgoing: [], incoming: [] };
    }

    const edges = this.edgesByNode.get(nodeId);
    return {
      outgoing: edges.outgoing.map(edge => ({
        edge,
        node: this.findNode(edge.to)
      })),
      incoming: edges.incoming.map(edge => ({
        edge,
        node: this.findNode(edge.from)
      }))
    };
  },

  /**
   * Get all nodes of a specific type
   * @param {string} type - The node type (movie, character, artifact, event)
   * @returns {Array} Array of nodes
   */
  getNodesByType(type) {
    if (!this.cache.connections) return [];
    return this.cache.connections.nodes.filter(node => node.type === type);
  },

  /**
   * Get all nodes in a specific phase
   * @param {number} phase - The phase number
   * @returns {Array} Array of nodes
   */
  getNodesByPhase(phase) {
    if (!this.cache.connections) return [];
    return this.cache.connections.nodes.filter(node => node.phase === phase);
  },

  /**
   * Search nodes by partial label match
   * @param {string} searchTerm - The search term
   * @returns {Array} Array of matching nodes
   */
  searchNodes(searchTerm) {
    if (!this.cache.connections || !searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return this.cache.connections.nodes.filter(node =>
      node.label.toLowerCase().includes(term) ||
      (node.description && node.description.toLowerCase().includes(term))
    );
  },

  /**
   * Get all edges connected to a node
   * @param {string} nodeId - The node ID
   * @returns {Array} Array of edge objects
   */
  getEdgesForNode(nodeId) {
    if (!this.edgesByNode.has(nodeId)) return [];
    const { outgoing, incoming } = this.edgesByNode.get(nodeId);
    return [...outgoing, ...incoming];
  },

  /**
   * Filter nodes by multiple criteria
   * @param {Object} filters - Filter criteria
   * @returns {Array} Filtered nodes
   */
  filterNodes(filters) {
    if (!this.cache.connections) return [];

    let filtered = [...this.cache.connections.nodes];

    if (filters.types && filters.types.length > 0) {
      filtered = filtered.filter(node => filters.types.includes(node.type));
    }

    if (filters.phases && filters.phases.length > 0) {
      filtered = filtered.filter(node => filters.phases.includes(node.phase));
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(node =>
        node.label.toLowerCase().includes(searchTerm) ||
        (node.description && node.description.toLowerCase().includes(searchTerm))
      );
    }

    return filtered;
  },

  /**
   * Get statistics about the connections
   * @returns {Object} Statistics object
   */
  getStatistics() {
    if (!this.cache.connections) {
      return { nodes: 0, edges: 0, types: {}, phases: {} };
    }

    const types = {};
    const phases = {};

    this.cache.connections.nodes.forEach(node => {
      types[node.type] = (types[node.type] || 0) + 1;
      phases[node.phase] = (phases[node.phase] || 0) + 1;
    });

    return {
      nodes: this.cache.connections.nodes.length,
      edges: this.cache.connections.edges.length,
      types,
      phases
    };
  },

  /**
   * CHARACTER ARC TRACKER FUNCTIONS
   */

  /**
   * Load characters from JSON
   */
  async loadCharacters() {
    if (this.cache.characters) return this.cache.characters;

    try {
      const response = await fetch('/data/characters.json');
      const data = await response.json();
      this.cache.characters = data.characters || [];
      return this.cache.characters;
    } catch (error) {
      console.error('Error loading characters:', error);
      return [];
    }
  },

  /**
   * Find a character by slug
   */
  async findCharacter(slug) {
    const characters = await this.loadCharacters();
    return characters.find(c => c.slug === slug) || null;
  },

  /**
   * Find a character by ID
   */
  async findCharacterById(id) {
    const characters = await this.loadCharacters();
    return characters.find(c => c.id === id) || null;
  },

  /**
   * Get characters filtered by role
   */
  async getCharactersByRole(role) {
    const characters = await this.loadCharacters();
    if (role === 'all') {
      return characters;
    }
    return characters.filter(c => c.role === role);
  },

  /**
   * Get unique roles from all characters
   */
  async getUniqueRoles() {
    const characters = await this.loadCharacters();
    const roles = new Set(characters.map(c => c.role));
    return Array.from(roles).sort();
  },

  /**
   * Get similar characters based on arc patterns
   */
  async getSimilarArcs(characterId, limit = 3) {
    const characters = await this.loadCharacters();
    const mainChar = characters.find(c => c.id === characterId);

    if (!mainChar) {
      return [];
    }

    const similarities = characters
      .filter(c => c.id !== characterId)
      .map(c => ({
        character: c,
        similarity: this.calculateArcSimilarity(mainChar, c)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return similarities;
  },

  /**
   * Calculate similarity between two characters based on arc patterns
   */
  calculateArcSimilarity(char1, char2) {
    if (!char1 || !char2 || char1.id === char2.id) {
      return 0;
    }

    let similarity = 0;
    let factors = 0;

    // Same role similarity
    if (char1.role === char2.role) {
      similarity += 30;
    }
    factors += 30;

    // Shared films on this site (overlap of the two film lists)
    const films1 = new Set(char1.siteFilms || []);
    const films2 = new Set(char2.siteFilms || []);
    const shared = [...films1].filter(f => films2.has(f)).length;
    const union = new Set([...films1, ...films2]).size;
    similarity += union ? Math.round(50 * shared / union) : 0;
    factors += 50;

    // Both have love interests or both don't
    if ((char1.loveInterests.length > 0) === (char2.loveInterests.length > 0)) {
      similarity += 20;
    }
    factors += 20;

    return Math.round((similarity / factors) * 100);
  },

  /**
   * Format role display name
   */
  formatRoleName(role) {
    const labels = {
      'hero': 'Hero',
      'villain': 'Villain',
      'anti-hero': 'Anti-Hero',
      'supporting': 'Supporting'
    };
    return labels[role] || role;
  },

  /**
   * Get phase color class
   */
  getPhaseColorClass(phase) {
    const colors = {
      1: 'phase-gold',
      2: 'phase-silver',
      3: 'phase-bronze',
      4: 'phase-gray',
      5: 'phase-purple',
      6: 'phase-red'
    };
    return colors[phase] || 'phase-default';
  }
};

// Make it globally accessible
window.marvelData.hub = MarvelDataHub;

// Auto-initialize when pages with data-feature attributes are loaded
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('[data-feature="callbacks"]') ||
      document.querySelector('[data-feature="deleted-scenes"]') ||
      document.querySelector('[data-feature="universe-map"]')) {
    MarvelDataHub.init();
  }
});

// Also allow manual initialization
if (document.currentScript && document.currentScript.dataset.autoInit !== 'false') {
  // Will auto-init if DOM ready, or on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.querySelector('[data-feature="callbacks"]') ||
          document.querySelector('[data-feature="deleted-scenes"]') ||
          document.querySelector('[data-feature="universe-map"]')) {
        MarvelDataHub.init();
      }
    });
  } else {
    if (document.querySelector('[data-feature="callbacks"]') ||
        document.querySelector('[data-feature="deleted-scenes"]') ||
        document.querySelector('[data-feature="universe-map"]')) {
      MarvelDataHub.init();
    }
  }
}
