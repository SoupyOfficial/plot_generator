/**
 * Storage interface factory.
 * Creates the appropriate adapter based on environment configuration.
 */

/**
 * Create a storage adapter instance.
 * @param {string} [type] - Adapter type: 'memory', 'libsql', or 'server'.
 *                          Defaults to VITE_STORAGE env var or 'memory'.
 * @returns {Object} Storage adapter with full interface
 */
export async function createStorage(type = null) {
  const adapterType = type || import.meta.env.VITE_STORAGE || 'memory';

  switch (adapterType) {
    case 'memory': {
      const { createMemoryAdapter } = await import('./memory.js');
      return createMemoryAdapter();
    }
    
    case 'libsql': {
      const { createLibSQLAdapter } = await import('./libsql.js');
      return createLibSQLAdapter();
    }
    
    case 'server': {
      const { createServerAdapter } = await import('./server.js');
      return createServerAdapter();
    }
    
    default:
      throw new Error(
        `Unknown storage adapter type: "${adapterType}". Valid options: memory, libsql, server`
      );
  }
}

/**
 * Default storage instance (lazy-loaded).
 * Uses VITE_STORAGE env var or defaults to 'memory'.
 */
let _storageInstance = null;

export const storage = new Proxy({}, {
  get(target, prop) {
    if (!_storageInstance) {
      throw new Error('Storage not initialized. Call createStorage() first or use storageAdapter in App.jsx.');
    }
    return _storageInstance[prop];
  }
});

/**
 * Initialize the default storage instance.
 * Call this before using the exported storage methods.
 */
export async function initStorage(type = null) {
  if (!_storageInstance) {
    _storageInstance = await createStorage(type);
  }
  return _storageInstance;
}

// Export individual methods that proxy to the default instance
export const createProject = (...args) => storage.createProject(...args);
export const getProject = (...args) => storage.getProject(...args);
export const updateProject = (...args) => storage.updateProject(...args);
export const deleteProject = (...args) => storage.deleteProject(...args);
export const listProjects = (...args) => storage.listProjects(...args);
export const getCanonFacets = (...args) => storage.getCanonFacets(...args);
export const updateCanonFacet = (...args) => storage.updateCanonFacet(...args);
export const getStageArtifacts = (...args) => storage.getStageArtifacts(...args);
export const updateStageArtifact = (...args) => storage.updateStageArtifact(...args);
export const getChapters = (...args) => storage.getChapters(...args);
export const updateChapter = (...args) => storage.updateChapter(...args);
