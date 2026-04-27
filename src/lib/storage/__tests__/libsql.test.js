import { describe, it, expect, beforeAll } from 'vitest';
import { createLibSQLAdapter } from '../libsql.js';

const shouldRunDBTests = process.env.RUN_DB_TESTS === '1';

describe.skipIf(!shouldRunDBTests)('LibSQLAdapter', () => {
  let adapter;

  beforeAll(() => {
    if (!shouldRunDBTests) return;
    
    if (!import.meta.env.VITE_TURSO_URL || !import.meta.env.VITE_TURSO_AUTH_TOKEN) {
      throw new Error('VITE_TURSO_URL and VITE_TURSO_AUTH_TOKEN must be set for DB tests');
    }
    
    adapter = createLibSQLAdapter();
  });

  describe('initialization', () => {
    it('throws error when env vars missing', () => {
      expect(() => createLibSQLAdapter({ url: null, authToken: null })).toThrow(
        /VITE_TURSO_URL and VITE_TURSO_AUTH_TOKEN/
      );
    });

    it('connects and runs migrations', async () => {
      const project = await adapter.createProject({ title: 'Migration Test' });
      expect(project.id).toBeDefined();
      
      // Clean up
      await adapter.deleteProject(project.id);
    });
  });

  describe('project CRUD', () => {
    it('creates and retrieves a project', async () => {
      const project = await adapter.createProject({
        title: 'Test Story',
        selections: { genre: 'fantasy' },
      });

      expect(project.id).toBeDefined();
      expect(project.title).toBe('Test Story');
      expect(project.selections).toEqual({ genre: 'fantasy' });

      const retrieved = await adapter.getProject(project.id);
      expect(retrieved).toBeTruthy();
      expect(retrieved.title).toBe('Test Story');
      
      // Clean up
      await adapter.deleteProject(project.id);
    });

    it('lists all projects sorted by updatedAt', async () => {
      const now = Date.now();
      const p1 = await adapter.createProject({ title: 'First', updatedAt: new Date(now - 2000) });
      const p2 = await adapter.createProject({ title: 'Second', updatedAt: new Date(now - 1000) });
      const p3 = await adapter.createProject({ title: 'Third', updatedAt: new Date(now) });

      const list = await adapter.listProjects();
      expect(list.length).toBeGreaterThanOrEqual(3);
      
      const titles = list.map(p => p.title);
      const idx3 = titles.indexOf('Third');
      const idx2 = titles.indexOf('Second');
      const idx1 = titles.indexOf('First');
      
      expect(idx3).toBeGreaterThan(-1);
      expect(idx2).toBeGreaterThan(-1);
      expect(idx1).toBeGreaterThan(-1);
      expect(idx3).toBeLessThan(idx2); // Third should come before Second
      expect(idx2).toBeLessThan(idx1); // Second should come before First
      
      // Clean up
      await adapter.deleteProject(p1.id);
      await adapter.deleteProject(p2.id);
      await adapter.deleteProject(p3.id);
    });

    it('deletes a project and all related data', async () => {
      const project = await adapter.createProject({ title: 'Test' });

      await adapter.saveCanonFacet('premise', project.id, {
        premise: 'A hero saves the day',
        genre: 'adventure',
      });

      await adapter.deleteProject(project.id);

      expect(await adapter.getProject(project.id)).toBeNull();
      expect(await adapter.getCanon('premise', project.id)).toBeNull();
    });
  });

  describe('canon facets', () => {
    it('saves and retrieves premise', async () => {
      const project = await adapter.createProject({ title: 'Test' });

      await adapter.saveCanonFacet('premise', project.id, {
        premise: 'Dragons return',
        genre: 'fantasy',
        tone: 'dark',
      });

      const retrieved = await adapter.getCanon('premise', project.id);
      expect(retrieved).toBeTruthy();
      expect(retrieved.premise).toBe('Dragons return');
      expect(retrieved.genre).toBe('fantasy');
      
      // Clean up
      await adapter.deleteProject(project.id);
    });

    it('saves and retrieves multiple characters', async () => {
      const project = await adapter.createProject({ title: 'Test' });

      const char1 = await adapter.saveCanonFacet('character', project.id, {
        name: 'Alice',
        role: 'protagonist',
      });

      const char2 = await adapter.saveCanonFacet('character', project.id, {
        name: 'Bob',
        role: 'antagonist',
      });

      const characters = await adapter.getCanon('character', project.id);
      expect(characters.length).toBeGreaterThanOrEqual(2);
      
      const names = characters.map(c => c.name);
      expect(names).toContain('Alice');
      expect(names).toContain('Bob');

      const alice = await adapter.getCanon('character', project.id, char1.id);
      expect(alice.name).toBe('Alice');
      
      // Clean up
      await adapter.deleteProject(project.id);
    });
  });

  describe('stage artifacts', () => {
    it('saves and retrieves a seed', async () => {
      const project = await adapter.createProject({ title: 'Test' });

      const seed = await adapter.saveStage('seed', {
        projectId: project.id,
        version: 1,
        status: 'locked',
        artifact: { premise: 'A quest begins' },
      });

      expect(seed.version).toBe(1);
      expect(seed.status).toBe('locked');

      const retrieved = await adapter.getStage('seed', project.id, 1);
      expect(retrieved).toBeTruthy();
      expect(retrieved.artifact).toEqual({ premise: 'A quest begins' });
      
      // Clean up
      await adapter.deleteProject(project.id);
    });

    it('lists all versions of a stage', async () => {
      const project = await adapter.createProject({ title: 'Test' });

      await adapter.saveStage('promise', {
        projectId: project.id,
        version: 1,
        artifact: { protagonist: 'Alice' },
      });

      await adapter.saveStage('promise', {
        projectId: project.id,
        version: 2,
        artifact: { protagonist: 'Bob' },
      });

      const versions = await adapter.listStageVersions('promise', project.id);
      expect(versions.length).toBeGreaterThanOrEqual(2);
      expect(versions[0].version).toBe(2); // Most recent first
      
      // Clean up
      await adapter.deleteProject(project.id);
    });
  });

  describe('chapters', () => {
    it('saves and retrieves a chapter', async () => {
      const project = await adapter.createProject({ title: 'Test' });

      const chapter = await adapter.saveChapter({
        projectId: project.id,
        indexNum: 1,
        version: 1,
        scaffold: { title: 'Chapter 1' },
        prose: 'It was the best of times...',
        audit: { wordCount: 1200 },
      });

      expect(chapter.indexNum).toBe(1);
      expect(chapter.prose).toBe('It was the best of times...');

      const retrieved = await adapter.getChapter(project.id, 1, 1);
      expect(retrieved).toBeTruthy();
      expect(retrieved.scaffold).toEqual({ title: 'Chapter 1' });
      
      // Clean up
      await adapter.deleteProject(project.id);
    });

    it('retrieves latest version when version not specified', async () => {
      const project = await adapter.createProject({ title: 'Test' });

      await adapter.saveChapter({
        projectId: project.id,
        indexNum: 1,
        version: 1,
        prose: 'Version 1',
      });

      await adapter.saveChapter({
        projectId: project.id,
        indexNum: 1,
        version: 2,
        prose: 'Version 2',
      });

      const latest = await adapter.getChapter(project.id, 1);
      expect(latest).toBeTruthy();
      expect(latest.version).toBe(2);
      expect(latest.prose).toBe('Version 2');
      
      // Clean up
      await adapter.deleteProject(project.id);
    });
  });

  describe('candidates', () => {
    it('saves and retrieves candidates', async () => {
      const project = await adapter.createProject({ title: 'Test' });

      await adapter.saveCandidate({
        projectId: project.id,
        stageKey: 'seed',
        artifact: { premise: 'Option A' },
      });

      await adapter.saveCandidate({
        projectId: project.id,
        stageKey: 'seed',
        artifact: { premise: 'Option B' },
      });

      const candidates = await adapter.getCandidates(project.id, 'seed');
      expect(candidates.length).toBeGreaterThanOrEqual(2);
      
      // Clean up
      await adapter.deleteProject(project.id);
    });

    it('picks a candidate and unpicks others', async () => {
      const project = await adapter.createProject({ title: 'Test' });

      const c1 = await adapter.saveCandidate({
        projectId: project.id,
        stageKey: 'seed',
        artifact: { premise: 'A' },
      });

      const c2 = await adapter.saveCandidate({
        projectId: project.id,
        stageKey: 'seed',
        artifact: { premise: 'B' },
      });

      await adapter.pickCandidate(c1.id);
      let candidates = await adapter.getCandidates(project.id, 'seed');
      const picked1 = candidates.find(c => c.id === c1.id);
      const unpicked1 = candidates.find(c => c.id === c2.id);
      expect(picked1.picked).toBe(true);
      expect(unpicked1.picked).toBe(false);

      await adapter.pickCandidate(c2.id);
      candidates = await adapter.getCandidates(project.id, 'seed');
      const unpicked2 = candidates.find(c => c.id === c1.id);
      const picked2 = candidates.find(c => c.id === c2.id);
      expect(unpicked2.picked).toBe(false);
      expect(picked2.picked).toBe(true);
      
      // Clean up
      await adapter.deleteProject(project.id);
    });
  });
});
