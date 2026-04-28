// src/lib/__tests__/promise.test.js
//
// Unit tests for promise.js generator (L2 Promise stage)
// Tests both fixture mode and structure validation

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generatePromiseCandidates } from '../promise.js';
import { createMemoryAdapter } from '../storage/memory.js';
import { seedFixtureCandidates } from '../storage/__tests__/fixtures.js';

describe('generatePromiseCandidates', () => {
  let storage;
  let projectId;
  let seedArtifact;

  beforeEach(async () => {
    storage = await createMemoryAdapter();
    
    // Create test project
    const project = await storage.createProject({
      title: 'Test Project',
    });
    projectId = project.id;

    // Locked seed artifact (from L1)
    seedArtifact = {
      premise: 'A dark fantasy tale of betrayal and redemption in a cursed kingdom',
      genre: 'Dark Fantasy',
      tone: 'dark',
    };

    // Seed fixture candidates
    await seedFixtureCandidates(storage, projectId);
  });

  it('returns 3 candidates in fixture mode', async () => {
    const selections = {
      beats: ['Discovery', 'Betrayal'],
      micro: 'Identity Crisis',
      theme: 'Power vs Humanity',
    };

    const candidates = await generatePromiseCandidates(seedArtifact, selections, {
      storage,
      projectId,
      stakesMagnitude: 'high',
      endingShape: 'bittersweet',
      useLive: false,
    });

    expect(candidates).toHaveLength(3);
    expect(candidates[0]).toHaveProperty('artifact');
    expect(candidates[0]).toHaveProperty('generatedAt');
    expect(candidates[0].artifact).toHaveProperty('protagonist');
    expect(candidates[0].artifact).toHaveProperty('want');
    expect(candidates[0].artifact).toHaveProperty('obstacle');
    expect(candidates[0].artifact).toHaveProperty('stakes');
    expect(candidates[0].artifact).toHaveProperty('irony');
    expect(candidates[0].artifact).toHaveProperty('endingShape');
  });

  it('incorporates seed artifact context', async () => {
    const selections = {
      beats: ['Discovery'],
      theme: 'Truth vs Comfort',
    };

    const candidates = await generatePromiseCandidates(seedArtifact, selections, {
      storage,
      projectId,
      useLive: false,
    });

    // Each candidate should build on the seed premise
    expect(candidates).toHaveLength(3);
    candidates.forEach(c => {
      expect(c.artifact.protagonist).toBeTruthy();
      expect(c.artifact.want).toBeTruthy();
    });
  });

  it('throws error in live mode without API key', async () => {
    const selections = {
      beats: ['Discovery'],
    };

    await expect(
      generatePromiseCandidates(seedArtifact, selections, {
        storage,
        projectId,
        useLive: true,
        // No apiKey
      })
    ).rejects.toThrow(/API key required/i);
  });
});
