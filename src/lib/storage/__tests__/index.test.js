import { describe, it, expect, beforeEach } from "vitest";
import { createStorage, storage, initStorage } from "../index.js";

describe("Storage Factory", () => {
  it("creates memory adapter by default", async () => {
    const adapter = await createStorage();
    expect(adapter).toBeDefined();
    expect(adapter.createProject).toBeInstanceOf(Function);
    expect(adapter.getProject).toBeInstanceOf(Function);
  });

  it("creates memory adapter when explicitly requested", async () => {
    const adapter = await createStorage("memory");
    expect(adapter).toBeDefined();
    expect(adapter.createProject).toBeInstanceOf(Function);
  });

  it("creates libsql adapter when requested with env vars", async () => {
    // This will throw if env vars are missing, which is expected
    try {
      const adapter = await createStorage("libsql");
      expect(adapter).toBeDefined();
    } catch (error) {
      expect(error.message).toContain("VITE_TURSO_URL");
    }
  });

  it("creates server adapter when requested with env vars", async () => {
    // This will throw if env var is missing, which is expected
    try {
      const adapter = await createStorage("server");
      expect(adapter).toBeDefined();
    } catch (error) {
      expect(error.message).toContain("VITE_API_BASE_URL");
    }
  });

  it("throws error for unknown adapter type", async () => {
    await expect(createStorage("unknown")).rejects.toThrow(/Unknown storage adapter type/);
  });

  it("exports default storage instance after initialization", async () => {
    await initStorage("memory");
    expect(storage).toBeDefined();
    expect(storage.createProject).toBeInstanceOf(Function);
  });

  it("exports convenience methods from default storage", async () => {
    await initStorage("memory");
    const { createProject, getProject, listProjects } = await import("../index.js");
    
    expect(createProject).toBeInstanceOf(Function);
    expect(getProject).toBeInstanceOf(Function);
    expect(listProjects).toBeInstanceOf(Function);
  });
});
