/**
 * In-memory storage adapter for testing.
 * Each factory call returns a fresh instance with isolated state.
 */

import { randomUUID } from 'node:crypto';

export function createMemoryAdapter() {
  // Isolated storage maps
  const projects = new Map();
  const canonPremise = new Map();
  const canonVoice = new Map();
  const canonCharacters = new Map();
  const canonWorld = new Map();
  const canonPromise = new Map();
  const seeds = new Map();
  const promises = new Map();
  const shortStories = new Map();
  const novellaOutlines = new Map();
  const novelOutlines = new Map();
  const chapters = new Map();
  const candidates = new Map();

  return {
    // Project CRUD
    async createProject(data) {
      const project = {
        id: data.id || randomUUID(),
        title: data.title,
        createdAt: data.createdAt || new Date(),
        updatedAt: data.updatedAt || new Date(),
        selections: data.selections || null,
      };
      projects.set(project.id, project);
      return project;
    },

    async getProject(id) {
      return projects.get(id) || null;
    },

    async listProjects() {
      return Array.from(projects.values()).sort((a, b) => 
        b.updatedAt.getTime() - a.updatedAt.getTime()
      );
    },

    async deleteProject(id) {
      // Cascade delete all related data
      projects.delete(id);
      canonPremise.delete(id);
      canonVoice.delete(id);
      canonWorld.delete(id);
      canonPromise.delete(id);
      
      // Delete all canon_characters for this project
      for (const [key, char] of canonCharacters.entries()) {
        if (char.projectId === id) canonCharacters.delete(key);
      }
      
      // Delete all stage artifacts
      for (const [key, item] of seeds.entries()) {
        if (item.projectId === id) seeds.delete(key);
      }
      for (const [key, item] of promises.entries()) {
        if (item.projectId === id) promises.delete(key);
      }
      for (const [key, item] of shortStories.entries()) {
        if (item.projectId === id) shortStories.delete(key);
      }
      for (const [key, item] of novellaOutlines.entries()) {
        if (item.projectId === id) novellaOutlines.delete(key);
      }
      for (const [key, item] of novelOutlines.entries()) {
        if (item.projectId === id) novelOutlines.delete(key);
      }
      for (const [key, item] of chapters.entries()) {
        if (item.projectId === id) chapters.delete(key);
      }
      for (const [key, item] of candidates.entries()) {
        if (item.projectId === id) candidates.delete(key);
      }
      
      return true;
    },

    // Canon facet operations
    async saveCanonFacet(facet, projectId, data) {
      const canon = {
        projectId,
        ...data,
        lockedAt: data.lockedAt || new Date(),
      };
      
      switch (facet) {
        case 'premise':
          canonPremise.set(projectId, canon);
          break;
        case 'voice':
          canonVoice.set(projectId, canon);
          break;
        case 'world':
          canonWorld.set(projectId, canon);
          break;
        case 'promise':
          canonPromise.set(projectId, canon);
          break;
        case 'character':
          const charId = data.id || randomUUID();
          canonCharacters.set(charId, { ...canon, id: charId });
          return { ...canon, id: charId };
        default:
          throw new Error(`Unknown canon facet: ${facet}`);
      }
      
      return canon;
    },

    async getCanon(facet, projectId, characterId = null) {
      switch (facet) {
        case 'premise':
          return canonPremise.get(projectId) || null;
        case 'voice':
          return canonVoice.get(projectId) || null;
        case 'world':
          return canonWorld.get(projectId) || null;
        case 'promise':
          return canonPromise.get(projectId) || null;
        case 'character':
          if (characterId) {
            return canonCharacters.get(characterId) || null;
          }
          // Return all characters for project
          return Array.from(canonCharacters.values())
            .filter(char => char.projectId === projectId);
        default:
          throw new Error(`Unknown canon facet: ${facet}`);
      }
    },

    // Stage artifact operations
    async saveStage(stageKey, data) {
      const stage = {
        id: data.id || randomUUID(),
        projectId: data.projectId,
        version: data.version,
        status: data.status || 'fresh',
        artifact: data.artifact,
        generatedAt: data.generatedAt || new Date(),
        lockedAt: data.lockedAt || null,
        ...(stageKey === 'short_story' && { prose: data.prose }),
      };
      
      const stageMap = getStageMap(stageKey);
      const key = `${data.projectId}:${data.version}`;
      stageMap.set(key, stage);
      return stage;
    },

    async getStage(stageKey, projectId, version) {
      const stageMap = getStageMap(stageKey);
      const key = `${projectId}:${version}`;
      return stageMap.get(key) || null;
    },

    async listStageVersions(stageKey, projectId) {
      const stageMap = getStageMap(stageKey);
      return Array.from(stageMap.values())
        .filter(stage => stage.projectId === projectId)
        .sort((a, b) => b.version - a.version);
    },

    // Chapter operations
    async saveChapter(data) {
      const chapter = {
        id: data.id || randomUUID(),
        projectId: data.projectId,
        indexNum: data.indexNum,
        version: data.version || 1,
        status: data.status || 'fresh',
        scaffold: data.scaffold || null,
        prose: data.prose || null,
        audit: data.audit || null,
        fingerprint: data.fingerprint || null,
        generatedAt: data.generatedAt || new Date(),
      };
      
      const key = `${data.projectId}:${data.indexNum}:${chapter.version}`;
      chapters.set(key, chapter);
      return chapter;
    },

    async getChapter(projectId, indexNum, version = null) {
      if (version !== null) {
        const key = `${projectId}:${indexNum}:${version}`;
        return chapters.get(key) || null;
      }
      
      // Get latest version
      const matching = Array.from(chapters.values())
        .filter(ch => ch.projectId === projectId && ch.indexNum === indexNum)
        .sort((a, b) => b.version - a.version);
      
      return matching[0] || null;
    },

    async listChapters(projectId, version = null) {
      let matching = Array.from(chapters.values())
        .filter(ch => ch.projectId === projectId);
      
      if (version !== null) {
        matching = matching.filter(ch => ch.version === version);
      }
      
      return matching.sort((a, b) => {
        if (a.indexNum !== b.indexNum) return a.indexNum - b.indexNum;
        return b.version - a.version;
      });
    },

    // Candidate operations
    async saveCandidate(data) {
      const candidate = {
        id: data.id || randomUUID(),
        projectId: data.projectId,
        stageKey: data.stageKey,
        artifact: data.artifact,
        picked: data.picked || false,
        generatedAt: data.generatedAt || new Date(),
      };
      
      candidates.set(candidate.id, candidate);
      return candidate;
    },

    async getCandidates(projectId, stageKey) {
      return Array.from(candidates.values())
        .filter(c => c.projectId === projectId && c.stageKey === stageKey)
        .sort((a, b) => a.generatedAt.getTime() - b.generatedAt.getTime());
    },

    async pickCandidate(candidateId) {
      const candidate = candidates.get(candidateId);
      if (!candidate) return null;
      
      // Unpick all other candidates for same project/stage
      for (const [key, c] of candidates.entries()) {
        if (c.projectId === candidate.projectId && c.stageKey === candidate.stageKey) {
          candidates.set(key, { ...c, picked: false });
        }
      }
      
      // Pick this one
      const updated = { ...candidate, picked: true };
      candidates.set(candidateId, updated);
      return updated;
    },
  };
  
  // Helper to get the right stage map
  function getStageMap(stageKey) {
    switch (stageKey) {
      case 'seed':
        return seeds;
      case 'promise':
        return promises;
      case 'short_story':
        return shortStories;
      case 'novella_outline':
        return novellaOutlines;
      case 'novel_outline':
        return novelOutlines;
      default:
        throw new Error(`Unknown stage key: ${stageKey}`);
    }
  }
}
