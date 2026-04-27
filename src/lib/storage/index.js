/**
 * Storage interface factory.
 * Creates the appropriate adapter based on environment configuration.
 */

import { createMemoryAdapter } from './memory.js';
import { createLibSQLAdapter } from './libsql.js';
import { createServerAdapter } from './server.js';

/**
 * Create a storage adapter instance.
 * @param {string} [type] - Adapter type: 'memory', 'libsql', or 'server'.
 *                          Defaults to VITE_STORAGE env var or 'memory'.
 * @returns {Object} Storage adapter with full interface
 */
export function createStorage(type = null) {
  const adapterType = type || import.meta.env.VITE_STORAGE || 'memory';

  switch (adapterType) {
    case 'memory':
      return createMemoryAdapter();
    
    case 'libsql':
      return createLibSQLAdapter();
    
    case 'server':
      return createServerAdapter();
    
    default:
      throw new Error(
        `Unknown storage adapter type: "${adapterType}". Valid options: memory, libsql, server`
      );
  }
}

/**
 * Default storage instance.
 * Uses VITE_STORAGE env var or defaults to 'memory'.
 */
export const storage = createStorage();

/**
 * Convenience exports - proxy all methods from default storage instance
 */
export const {
  createProject,
  getProject,
  listProjects,
  deleteProject,
  saveCanonFacet,
  getCanon,
  saveStage,
  getStage,
  listStageVersions,
  saveChapter,
  getChapter,
  listChapters,
  saveCandidate,
  getCandidates,
  pickCandidate,
} = storage;
