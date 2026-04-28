/**
 * Server adapter stub for future serverless implementation.
 * All methods throw "not implemented" errors.
 * Reserved for milestone 2: API layer.
 */

export function createServerAdapter(config = {}) {
  const apiBaseUrl = config.apiBaseUrl !== undefined 
    ? config.apiBaseUrl 
    : import.meta.env.VITE_API_BASE_URL;

  if (!apiBaseUrl) {
    throw new Error('Server adapter requires VITE_API_BASE_URL environment variable');
  }

  const notImplemented = (method) => {
    throw new Error(`Server adapter not implemented: ${method}()`);
  };

  return {
    // Project CRUD
    async createProject(data) {
      notImplemented('createProject');
    },

    async getProject(id) {
      notImplemented('getProject');
    },

    async listProjects() {
      notImplemented('listProjects');
    },

    async deleteProject(id) {
      notImplemented('deleteProject');
    },

    // Canon facet operations
    async saveCanonFacet(facet, projectId, data) {
      notImplemented('saveCanonFacet');
    },

    async getCanon(facet, projectId, characterId = null) {
      notImplemented('getCanon');
    },

    // Stage artifact operations
    async saveStage(stageKey, data) {
      notImplemented('saveStage');
    },

    async getStage(stageKey, projectId, version) {
      notImplemented('getStage');
    },

    async listStageVersions(stageKey, projectId) {
      notImplemented('listStageVersions');
    },

    async lockStage(projectId, stageKey, artifact) {
      notImplemented('lockStage');
    },

    // Chapter operations
    async saveChapter(data) {
      notImplemented('saveChapter');
    },

    async getChapter(projectId, indexNum, version = null) {
      notImplemented('getChapter');
    },

    async listChapters(projectId, version = null) {
      notImplemented('listChapters');
    },

    // Candidate operations
    async saveCandidate(data) {
      notImplemented('saveCandidate');
    },

    async getCandidates(projectId, stageKey) {
      notImplemented('getCandidates');
    },

    async pickCandidate(candidateId) {
      notImplemented('pickCandidate');
    },
  };
}
