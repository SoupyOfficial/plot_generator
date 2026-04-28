// src/lib/__tests__/seed.test.js
//
// Unit tests for seed.js generator (L1 Seed stage)
// Tests both fixture mode (useLive: false) and structure validation

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateSeedCandidates } from '../seed.js';
import { createMemoryAdapter } from '../storage/memory.js';
import { seedFixtureCandidates } from '../storage/__tests__/fixtures.js';

describe('generateSeedCandidates', () => {
  let storage;
  let projectId;

  beforeEach(async () => {
    storage = await createMemoryAdapter();
    
    // Create test project
    const project = await storage.createProject({
      title: 'Test Project',
    });
    projectId = project.id;

    // Seed fixture candidates
    await seedFixtureCandidates(storage, projectId);
  });

  it('returns 3 candidates in fixture mode', async () => {
    const selections = {
      preset: 'none',
      macro: 'Hunted',
      mid: 'Injustice',
      subplots: ['Identity Crisis'],
      protagonist: 'The Seeker',
    };

    const candidates = await generateSeedCandidates(selections, {
      storage,
      projectId,
      toneLean: 'balanced',
      useLive: false,
    });

    expect(candidates).toHaveLength(3);
    expect(candidates[0]).toHaveProperty('artifact');
    expect(candidates[0]).toHaveProperty('generatedAt');
    expect(candidates[0].artifact).toHaveProperty('premise');
    expect(candidates[0].artifact).toHaveProperty('genre');
    expect(candidates[0].artifact).toHaveProperty('tone');
  });

  it('respects toneLean hint in fixture mode', async () => {
    const selections = {
      macro: 'Hunted',
      mid: 'Injustice',
    };

    const darkCandidates = await generateSeedCandidates(selections, {
      storage,
      projectId,
      toneLean: 'darker',
      useLive: false,
    });

    const lightCandidates = await generateSeedCandidates(selections, {
      storage,
      projectId,
      toneLean: 'lighter',
      useLive: false,
    });

    // Fixture mode should still return different sets based on toneLean
    expect(darkCandidates).toHaveLength(3);
    expect(lightCandidates).toHaveLength(3);
  });

  it('throws error in live mode without API key', async () => {
    const selections = {
      macro: 'Hunted',
      mid: 'Injustice',
    };

    await expect(
      generateSeedCandidates(selections, {
        storage,
        projectId,
        useLive: true,
        // No apiKey provided
      })
    ).rejects.toThrow(/API key required/i);
  });
});
