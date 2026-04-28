/**
 * Adapter interface contract tests.
 * Runs the same test suite against multiple adapters to ensure interface consistency.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createMemoryAdapter } from '../memory.js';
import { createLibSQLAdapter } from '../libsql.js';

const shouldRunDBTests = process.env.RUN_DB_TESTS === '1';

// Define which adapters to test
const adapters = [
  { name: 'MemoryAdapter', factory: () => createMemoryAdapter() },
];

// Add libsql adapter only if DB tests are enabled
if (shouldRunDBTests) {
  if (!import.meta.env.VITE_TURSO_URL || !import.meta.env.VITE_TURSO_AUTH_TOKEN) {
    console.warn('⚠️  RUN_DB_TESTS=1 but VITE_TURSO_URL/VITE_TURSO_AUTH_TOKEN not set');
  } else {
    adapters.push({
      name: 'LibSQLAdapter',
      factory: () => createLibSQLAdapter(),
    });
  }
}

describe.each(adapters)('$name - Interface Contract', ({ name, factory }) => {
  let adapter;
  let testProjects = []; // Track for cleanup

  beforeEach(() => {
    adapter = factory();
    testProjects = [];
  });

  // Helper to clean up test projects (libsql only)
  async function cleanup() {
    if (name === 'LibSQLAdapter') {
      for (const projectId of testProjects) {
        try {
          await adapter.deleteProject(projectId);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      testProjects = [];
    }
  }

  describe('Project lifecycle', () => {
    it('creates a project with selections', async () => {
      const project = await adapter.createProject({
        title: 'Contract Test',
        selections: { genre: 'sci-fi', tone: 'dark' },
      });

      expect(project.id).toBeDefined();
      expect(project.title).toBe('Contract Test');
      expect(project.selections).toEqual({ genre: 'sci-fi', tone: 'dark' });
      expect(project.createdAt).toBeInstanceOf(Date);
      expect(project.updatedAt).toBeInstanceOf(Date);

      testProjects.push(project.id);
      await cleanup();
    });

    it('retrieves a project by id', async () => {
      const created = await adapter.createProject({ title: 'Retrieve Test' });
      testProjects.push(created.id);

      const retrieved = await adapter.getProject(created.id);
      expect(retrieved).toBeTruthy();
      expect(retrieved.id).toBe(created.id);
      expect(retrieved.title).toBe('Retrieve Test');

      await cleanup();
    });

    it('lists projects in updatedAt DESC order', async () => {
      const now = Date.now();
      const p1 = await adapter.createProject({ title: 'Old', updatedAt: new Date(now - 3000) });
      const p2 = await adapter.createProject({ title: 'Middle', updatedAt: new Date(now - 1500) });
      const p3 = await adapter.createProject({ title: 'New', updatedAt: new Date(now) });
      testProjects.push(p1.id, p2.id, p3.id);

      const list = await adapter.listProjects();
      const ourTitles = list.filter(p => ['Old', 'Middle', 'New'].includes(p.title));
      
      expect(ourTitles.length).toBeGreaterThanOrEqual(3);
      
      const titleOrder = ourTitles.map(p => p.title);
      const newIdx = titleOrder.indexOf('New');
      const midIdx = titleOrder.indexOf('Middle');
      const oldIdx = titleOrder.indexOf('Old');
      
      expect(newIdx).toBeGreaterThan(-1);
      expect(midIdx).toBeGreaterThan(-1);
      expect(oldIdx).toBeGreaterThan(-1);
      expect(newIdx).toBeLessThan(midIdx);
      expect(midIdx).toBeLessThan(oldIdx);

      await cleanup();
    });

    it('deletes a project and cascades to related data', async () => {
      const project = await adapter.createProject({ title: 'Delete Test' });
      testProjects.push(project.id);

      await adapter.saveCanonFacet('premise', project.id, {
        premise: 'Will be deleted',
      });

      await adapter.saveStage('seed', {
        projectId: project.id,
        version: 1,
        artifact: { will: 'be deleted' },
      });

      await adapter.deleteProject(project.id);

      expect(await adapter.getProject(project.id)).toBeNull();
      expect(await adapter.getCanon('premise', project.id)).toBeNull();
      
      // Remove from cleanup list since already deleted
      testProjects = testProjects.filter(id => id !== project.id);
    });
  });

  describe('Canon facets', () => {
    it('saves and retrieves all singular facets', async () => {
      const project = await adapter.createProject({ title: 'Canon Test' });
      testProjects.push(project.id);

      await adapter.saveCanonFacet('premise', project.id, {
        premise: 'Test premise',
        genre: 'fantasy',
      });

      await adapter.saveCanonFacet('voice', project.id, {
        avgSentenceLen: 12.5,
        llmDescription: 'Terse',
      });

      await adapter.saveCanonFacet('world', project.id, {
        setting: 'Medieval Europe',
        magicSystem: 'Hard',
      });

      await adapter.saveCanonFacet('promise', project.id, {
        protagonist: 'Alice',
        antagonist: 'Bob',
      });

      const premise = await adapter.getCanon('premise', project.id);
      expect(premise.premise).toBe('Test premise');

      const voice = await adapter.getCanon('voice', project.id);
      expect(voice.avgSentenceLen).toBe(12.5);

      const world = await adapter.getCanon('world', project.id);
      expect(world.setting).toBe('Medieval Europe');

      const promise = await adapter.getCanon('promise', project.id);
      expect(promise.protagonist).toBe('Alice');

      await cleanup();
    });

    it('manages multiple characters for a project', async () => {
      const project = await adapter.createProject({ title: 'Characters Test' });
      testProjects.push(project.id);

      const char1 = await adapter.saveCanonFacet('character', project.id, {
        name: 'Hero',
        role: 'protagonist',
      });

      const char2 = await adapter.saveCanonFacet('character', project.id, {
        name: 'Villain',
        role: 'antagonist',
      });

      const allChars = await adapter.getCanon('character', project.id);
      expect(Array.isArray(allChars)).toBe(true);
      expect(allChars.length).toBeGreaterThanOrEqual(2);

      const names = allChars.map(c => c.name);
      expect(names).toContain('Hero');
      expect(names).toContain('Villain');

      const hero = await adapter.getCanon('character', project.id, char1.id);
      expect(hero.name).toBe('Hero');

      await cleanup();
    });
  });

  describe('Stage artifacts', () => {
    it('saves and retrieves stage artifacts with versioning', async () => {
      const project = await adapter.createProject({ title: 'Stage Test' });
      testProjects.push(project.id);

      await adapter.saveStage('seed', {
        projectId: project.id,
        version: 1,
        status: 'fresh',
        artifact: { idea: 'v1' },
      });

      await adapter.saveStage('seed', {
        projectId: project.id,
        version: 2,
        status: 'locked',
        artifact: { idea: 'v2' },
      });

      const v1 = await adapter.getStage('seed', project.id, 1);
      expect(v1.artifact).toEqual({ idea: 'v1' });

      const v2 = await adapter.getStage('seed', project.id, 2);
      expect(v2.artifact).toEqual({ idea: 'v2' });

      const versions = await adapter.listStageVersions('seed', project.id);
      expect(versions.length).toBeGreaterThanOrEqual(2);
      expect(versions[0].version).toBe(2); // Most recent first

      await cleanup();
    });

    it('handles all stage types', async () => {
      const project = await adapter.createProject({ title: 'All Stages' });
      testProjects.push(project.id);

      const stages = ['seed', 'promise', 'short_story', 'novella_outline', 'novel_outline'];

      for (const stageKey of stages) {
        await adapter.saveStage(stageKey, {
          projectId: project.id,
          version: 1,
          artifact: { stage: stageKey },
        });
      }

      for (const stageKey of stages) {
        const stage = await adapter.getStage(stageKey, project.id, 1);
        expect(stage).toBeTruthy();
        expect(stage.artifact.stage).toBe(stageKey);
      }

      await cleanup();
    });

    it('stores prose for short_story stage', async () => {
      const project = await adapter.createProject({ title: 'Prose Test' });
      testProjects.push(project.id);

      await adapter.saveStage('short_story', {
        projectId: project.id,
        version: 1,
        artifact: { title: 'Story' },
        prose: 'Once upon a time...',
      });

      const story = await adapter.getStage('short_story', project.id, 1);
      expect(story.prose).toBe('Once upon a time...');

      await cleanup();
    });

    it('locks stage and writes to canon facet', async () => {
      const project = await adapter.createProject({ title: 'Lock Test' });
      testProjects.push(project.id);

      // Lock seed stage
      const seedArtifact = {
        premise: 'A hero rises',
        genre: 'Fantasy',
        tone: 'hopeful',
      };

      const lockedSeed = await adapter.lockStage(project.id, 'seed', seedArtifact);
      
      expect(lockedSeed.status).toBe('locked');
      expect(lockedSeed.lockedAt).toBeInstanceOf(Date);
      expect(lockedSeed.artifact).toEqual(seedArtifact);
      expect(lockedSeed.version).toBe(1);

      // Verify canon premise was written
      const canonPremise = await adapter.getCanon('premise', project.id);
      expect(canonPremise).toBeTruthy();
      expect(canonPremise.premise).toBe('A hero rises');
      expect(canonPremise.genre).toBe('Fantasy');
      expect(canonPremise.tone).toBe('hopeful');

      // Lock promise stage
      const promiseArtifact = {
        protagonist: 'Reluctant farm boy',
        want: 'Save his village',
        obstacle: 'Powerful dark lord',
        stakes: 'Village will be destroyed',
        irony: 'The dark lord is his father',
        endingShape: 'bittersweet',
      };

      const lockedPromise = await adapter.lockStage(project.id, 'promise', promiseArtifact);
      
      expect(lockedPromise.status).toBe('locked');
      expect(lockedPromise.artifact).toEqual(promiseArtifact);
      expect(lockedPromise.version).toBe(1);

      // Verify canon promise was written
      const canonPromise = await adapter.getCanon('promise', project.id);
      expect(canonPromise).toBeTruthy();
      expect(canonPromise.protagonist).toBe('Reluctant farm boy');
      expect(canonPromise.want).toBe('Save his village');
      expect(canonPromise.endingShape).toBe('bittersweet');

      await cleanup();
    });
  });

  describe('Chapters', () => {
    it('saves and retrieves chapters with versioning', async () => {
      const project = await adapter.createProject({ title: 'Chapter Test' });
      testProjects.push(project.id);

      await adapter.saveChapter({
        projectId: project.id,
        indexNum: 1,
        version: 1,
        scaffold: { title: 'Intro' },
        prose: 'Draft 1',
      });

      await adapter.saveChapter({
        projectId: project.id,
        indexNum: 1,
        version: 2,
        scaffold: { title: 'Intro' },
        prose: 'Draft 2',
      });

      const v1 = await adapter.getChapter(project.id, 1, 1);
      expect(v1.prose).toBe('Draft 1');

      const latest = await adapter.getChapter(project.id, 1);
      expect(latest.version).toBe(2);
      expect(latest.prose).toBe('Draft 2');

      await cleanup();
    });

    it('lists all chapters for a project', async () => {
      const project = await adapter.createProject({ title: 'Multi-Chapter' });
      testProjects.push(project.id);

      await adapter.saveChapter({
        projectId: project.id,
        indexNum: 1,
        prose: 'Chapter 1',
      });

      await adapter.saveChapter({
        projectId: project.id,
        indexNum: 2,
        prose: 'Chapter 2',
      });

      await adapter.saveChapter({
        projectId: project.id,
        indexNum: 3,
        prose: 'Chapter 3',
      });

      const chapters = await adapter.listChapters(project.id);
      expect(chapters.length).toBeGreaterThanOrEqual(3);

      const indices = chapters.map(c => c.indexNum);
      expect(indices).toContain(1);
      expect(indices).toContain(2);
      expect(indices).toContain(3);

      await cleanup();
    });
  });

  describe('Candidates', () => {
    it('saves and retrieves candidates', async () => {
      const project = await adapter.createProject({ title: 'Candidate Test' });
      testProjects.push(project.id);

      await adapter.saveCandidate({
        projectId: project.id,
        stageKey: 'seed',
        artifact: { option: 'A' },
      });

      await adapter.saveCandidate({
        projectId: project.id,
        stageKey: 'seed',
        artifact: { option: 'B' },
      });

      const candidates = await adapter.getCandidates(project.id, 'seed');
      expect(candidates.length).toBeGreaterThanOrEqual(2);

      await cleanup();
    });

    it('picks one candidate and unpicks others', async () => {
      const project = await adapter.createProject({ title: 'Pick Test' });
      testProjects.push(project.id);

      const c1 = await adapter.saveCandidate({
        projectId: project.id,
        stageKey: 'seed',
        artifact: { id: 1 },
      });

      const c2 = await adapter.saveCandidate({
        projectId: project.id,
        stageKey: 'seed',
        artifact: { id: 2 },
      });

      await adapter.pickCandidate(c1.id);
      let candidates = await adapter.getCandidates(project.id, 'seed');
      let picked = candidates.find(c => c.id === c1.id);
      let unpicked = candidates.find(c => c.id === c2.id);
      
      expect(picked.picked).toBe(true);
      expect(unpicked.picked).toBe(false);

      await adapter.pickCandidate(c2.id);
      candidates = await adapter.getCandidates(project.id, 'seed');
      picked = candidates.find(c => c.id === c2.id);
      unpicked = candidates.find(c => c.id === c1.id);
      
      expect(picked.picked).toBe(true);
      expect(unpicked.picked).toBe(false);

      await cleanup();
    });
  });
});
