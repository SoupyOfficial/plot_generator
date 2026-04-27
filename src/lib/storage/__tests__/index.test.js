import { describe, it, expect } from 'vitest';
import { createStorage, storage } from '../index.js';

describe('Storage Factory', () => {
  it('creates memory adapter by default', () => {
    const adapter = createStorage();
    expect(adapter).toBeDefined();
    expect(adapter.createProject).toBeInstanceOf(Function);
    expect(adapter.getProject).toBeInstanceOf(Function);
  });

  it('creates memory adapter when explicitly requested', () => {
    const adapter = createStorage('memory');
    expect(adapter).toBeDefined();
    expect(adapter.createProject).toBeInstanceOf(Function);
  });

  it('creates libsql adapter when requested with env vars', () => {
    // This will throw if env vars are missing, which is expected
    try {
      const adapter = createStorage('libsql');
      expect(adapter).toBeDefined();
    } catch (error) {
      expect(error.message).toContain('VITE_TURSO_URL');
    }
  });

  it('creates server adapter when requested with env vars', () => {
    // This will throw if env var is missing, which is expected
    try {
      const adapter = createStorage('server');
      expect(adapter).toBeDefined();
    } catch (error) {
      expect(error.message).toContain('VITE_API_BASE_URL');
    }
  });

  it('throws error for unknown adapter type', () => {
    expect(() => createStorage('unknown')).toThrow(/Unknown storage adapter type/);
  });

  it('exports default storage instance', () => {
    expect(storage).toBeDefined();
    expect(storage.createProject).toBeInstanceOf(Function);
  });

  it('exports convenience methods from default storage', async () => {
    const { createProject, getProject, listProjects } = await import('../index.js');
    
    expect(createProject).toBeInstanceOf(Function);
    expect(getProject).toBeInstanceOf(Function);
    expect(listProjects).toBeInstanceOf(Function);
  });
});
