import { describe, it, expect } from 'vitest';
import { createServerAdapter } from '../server.js';

describe('ServerAdapter', () => {
  it('throws error when VITE_API_BASE_URL is missing', () => {
    expect(() => createServerAdapter({ apiBaseUrl: null })).toThrow(
      /VITE_API_BASE_URL/
    );
  });

  it('throws not implemented for all methods', async () => {
    const adapter = createServerAdapter({ apiBaseUrl: 'http://example.com' });

    await expect(adapter.createProject({})).rejects.toThrow(/not implemented: createProject/);
    await expect(adapter.getProject('123')).rejects.toThrow(/not implemented: getProject/);
    await expect(adapter.listProjects()).rejects.toThrow(/not implemented: listProjects/);
    await expect(adapter.deleteProject('123')).rejects.toThrow(/not implemented: deleteProject/);
    
    await expect(adapter.saveCanonFacet('premise', '123', {})).rejects.toThrow(/not implemented: saveCanonFacet/);
    await expect(adapter.getCanon('premise', '123')).rejects.toThrow(/not implemented: getCanon/);
    
    await expect(adapter.saveStage('seed', {})).rejects.toThrow(/not implemented: saveStage/);
    await expect(adapter.getStage('seed', '123', 1)).rejects.toThrow(/not implemented: getStage/);
    await expect(adapter.listStageVersions('seed', '123')).rejects.toThrow(/not implemented: listStageVersions/);
    
    await expect(adapter.saveChapter({})).rejects.toThrow(/not implemented: saveChapter/);
    await expect(adapter.getChapter('123', 1)).rejects.toThrow(/not implemented: getChapter/);
    await expect(adapter.listChapters('123')).rejects.toThrow(/not implemented: listChapters/);
    
    await expect(adapter.saveCandidate({})).rejects.toThrow(/not implemented: saveCandidate/);
    await expect(adapter.getCandidates('123', 'seed')).rejects.toThrow(/not implemented: getCandidates/);
    await expect(adapter.pickCandidate('123')).rejects.toThrow(/not implemented: pickCandidate/);
  });
});
