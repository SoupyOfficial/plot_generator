import { describe, it, expect } from 'vitest';
import { createMemoryAdapter } from '../memory.js';

describe('MemoryAdapter', () => {
  describe('project CRUD', () => {
    it('creates and retrieves a project', async () => {
      const adapter = createMemoryAdapter();
      const project = await adapter.createProject({
        title: 'Test Story',
        selections: { genre: 'fantasy' },
      });

      expect(project.id).toBeDefined();
      expect(project.title).toBe('Test Story');
      expect(project.selections).toEqual({ genre: 'fantasy' });

      const retrieved = await adapter.getProject(project.id);
      expect(retrieved).toEqual(project);
    });

    it('lists all projects sorted by updatedAt', async () => {
      const adapter = createMemoryAdapter();
      const now = Date.now();
      await adapter.createProject({ title: 'First', updatedAt: new Date(now - 2000) });
      await adapter.createProject({ title: 'Second', updatedAt: new Date(now - 1000) });
      await adapter.createProject({ title: 'Third', updatedAt: new Date(now) });

      const list = await adapter.listProjects();
      expect(list).toHaveLength(3);
      expect(list[0].title).toBe('Third'); // Most recent first
    });

    it('deletes a project and all related data', async () => {
      const adapter = createMemoryAdapter();
      const project = await adapter.createProject({ title: 'Test' });

      // Add canon data
      await adapter.saveCanonFacet('premise', project.id, {
        premise: 'A hero saves the day',
        genre: 'adventure',
      });

      await adapter.deleteProject(project.id);

      expect(await adapter.getProject(project.id)).toBeNull();
      expect(await adapter.getCanon('premise', project.id)).toBeNull();
    });

    it('isolates state between adapter instances', async () => {
      const adapter1 = createMemoryAdapter();
      const adapter2 = createMemoryAdapter();

      await adapter1.createProject({ title: 'Story 1' });
      await adapter2.createProject({ title: 'Story 2' });

      expect(await adapter1.listProjects()).toHaveLength(1);
      expect(await adapter2.listProjects()).toHaveLength(1);
    });
  });

  describe('canon facets', () => {
    it('saves and retrieves premise', async () => {
      const adapter = createMemoryAdapter();
      const project = await adapter.createProject({ title: 'Test' });

      const saved = await adapter.saveCanonFacet('premise', project.id, {
        premise: 'Dragons return',
        genre: 'fantasy',
        tone: 'dark',
      });

      expect(saved.premise).toBe('Dragons return');

      const retrieved = await adapter.getCanon('premise', project.id);
      expect(retrieved.genre).toBe('fantasy');
    });

    it('saves and retrieves voice fingerprint', async () => {
      const adapter = createMemoryAdapter();
      const project = await adapter.createProject({ title: 'Test' });

      await adapter.saveCanonFacet('voice', project.id, {
        avgSentenceLen: 15.2,
        lexicalDiversity: 0.78,
        llmDescription: 'Terse and punchy',
      });

      const voice = await adapter.getCanon('voice', project.id);
      expect(voice.avgSentenceLen).toBe(15.2);
      expect(voice.llmDescription).toBe('Terse and punchy');
    });

    it('saves and retrieves multiple characters', async () => {
      const adapter = createMemoryAdapter();
      const project = await adapter.createProject({ title: 'Test' });

      const char1 = await adapter.saveCanonFacet('character', project.id, {
        name: 'Alice',
        role: 'protagonist',
        archetype: 'hero',
      });

      const char2 = await adapter.saveCanonFacet('character', project.id, {
        name: 'Bob',
        role: 'antagonist',
        archetype: 'villain',
      });

      const characters = await adapter.getCanon('character', project.id);
      expect(characters).toHaveLength(2);
      expect(characters.map(c => c.name)).toContain('Alice');
      expect(characters.map(c => c.name)).toContain('Bob');

      const alice = await adapter.getCanon('character', project.id, char1.id);
      expect(alice.name).toBe('Alice');
    });
  });

  describe('stage artifacts', () => {
    it('saves and retrieves a seed', async () => {
      const adapter = createMemoryAdapter();
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
      expect(retrieved.artifact).toEqual({ premise: 'A quest begins' });
    });

    it('stores short story with prose field', async () => {
      const adapter = createMemoryAdapter();
      const project = await adapter.createProject({ title: 'Test' });

      const story = await adapter.saveStage('short_story', {
        projectId: project.id,
        version: 1,
        artifact: { title: 'The Beginning' },
        prose: 'Once upon a time...',
      });

      expect(story.prose).toBe('Once upon a time...');

      const retrieved = await adapter.getStage('short_story', project.id, 1);
      expect(retrieved.prose).toBe('Once upon a time...');
    });

    it('lists all versions of a stage', async () => {
      const adapter = createMemoryAdapter();
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
      expect(versions).toHaveLength(2);
      expect(versions[0].version).toBe(2); // Most recent first
      expect(versions[1].version).toBe(1);
    });
  });

  describe('chapters', () => {
    it('saves and retrieves a chapter', async () => {
      const adapter = createMemoryAdapter();
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
      expect(retrieved.scaffold).toEqual({ title: 'Chapter 1' });
    });

    it('retrieves latest version when version not specified', async () => {
      const adapter = createMemoryAdapter();
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
      expect(latest.version).toBe(2);
      expect(latest.prose).toBe('Version 2');
    });

    it('lists all chapters for a project', async () => {
      const adapter = createMemoryAdapter();
      const project = await adapter.createProject({ title: 'Test' });

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

      const chapters = await adapter.listChapters(project.id);
      expect(chapters).toHaveLength(2);
      expect(chapters[0].indexNum).toBe(1);
      expect(chapters[1].indexNum).toBe(2);
    });
  });

  describe('candidates', () => {
    it('saves and retrieves candidates', async () => {
      const adapter = createMemoryAdapter();
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
      expect(candidates).toHaveLength(2);
    });

    it('picks a candidate and unpicks others', async () => {
      const adapter = createMemoryAdapter();
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
      expect(candidates.find(c => c.id === c1.id).picked).toBe(true);
      expect(candidates.find(c => c.id === c2.id).picked).toBe(false);

      await adapter.pickCandidate(c2.id);
      candidates = await adapter.getCandidates(project.id, 'seed');
      expect(candidates.find(c => c.id === c1.id).picked).toBe(false);
      expect(candidates.find(c => c.id === c2.id).picked).toBe(true);
    });
  });
});
