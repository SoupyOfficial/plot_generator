/**
 * Test database fixture seeding helper
 * 
 * Provides pre-defined seed and promise candidates for testing
 * candidate generation flows without requiring live LLM API calls.
 */

/**
 * Seeds the test database with 3 seed candidates and 3 promise candidates
 * @param {Object} storage - Storage adapter instance (memory or libsql)
 * @param {string} projectId - Project ID to associate candidates with
 */
export async function seedFixtureCandidates(storage, projectId) {
  // Seed Candidates (L1 Seed stage)
  // 3 variations: dark, light, balanced tones
  
  await storage.saveCandidate({
    projectId,
    stageKey: 'seed',
    artifact: {
      premise: 'A dark fantasy tale of betrayal and redemption in a cursed kingdom',
      genre: 'Dark Fantasy',
      tone: 'dark',
    },
  });

  await storage.saveCandidate({
    projectId,
    stageKey: 'seed',
    artifact: {
      premise: 'An uplifting adventure where hope conquers despair through unlikely friendships',
      genre: 'High Fantasy',
      tone: 'light',
    },
  });

  await storage.saveCandidate({
    projectId,
    stageKey: 'seed',
    artifact: {
      premise: 'A mystery unfolding in parallel timelines, revealing the cost of changing fate',
      genre: 'Time Travel Mystery',
      tone: 'balanced',
    },
  });

  // Promise Candidates (L2 Promise stage)
  // 3 variations: tragic, bittersweet, hopeful ending shapes
  
  await storage.saveCandidate({
    projectId,
    stageKey: 'promise',
    artifact: {
      protagonist: 'Cursed Prince seeking redemption',
      want: 'Break the curse and restore the kingdom',
      obstacle: 'Ancient pact that binds the curse to his bloodline',
      stakes: 'The kingdom falls into eternal darkness',
      irony: 'The cure requires the same sacrifice that created the curse',
      endingShape: 'tragic',
    },
  });

  await storage.saveCandidate({
    projectId,
    stageKey: 'promise',
    artifact: {
      protagonist: 'Rebel knight sworn to overthrow the cursed royals',
      want: 'Free the people from tyrannical rule',
      obstacle: 'The curse protects the throne from any rebellion',
      stakes: 'Generations trapped in servitude',
      irony: 'Overthrowing the curse destroys the kingdom\'s last protection',
      endingShape: 'bittersweet',
    },
  });

  await storage.saveCandidate({
    projectId,
    stageKey: 'promise',
    artifact: {
      protagonist: 'Court mage who discovered the curse\'s origin',
      want: 'Unravel the truth before it\'s too late',
      obstacle: 'The royal family has erased all records',
      stakes: 'The curse spreads beyond the kingdom',
      irony: 'The truth reveals the mage\'s own ancestor created the curse',
      endingShape: 'hopeful',
    },
  });
}
