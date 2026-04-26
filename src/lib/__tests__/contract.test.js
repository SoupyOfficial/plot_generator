// src/lib/__tests__/contract.test.js
import { describe, it, expect } from "vitest";
import {
  CONTRACT_VERSION,
  createContract,
  updateContract,
  serializeContract,
  parseContract,
  migrateContract,
  exportMarkdown,
  toShareHash,
  fromShareHash,
} from "../contract.js";

describe("contract — create/update", () => {
  it("creates a contract with required fields", () => {
    const c = createContract({
      selections: { subgenre: "Dungeon Core" },
      warnings: ["test warning"],
    });
    expect(c.version).toBe(CONTRACT_VERSION);
    expect(c.id).toMatch(/[a-z0-9-]+/);
    expect(c.createdAt).toMatch(/^\d{4}-/);
    expect(c.updatedAt).toBe(c.createdAt);
    expect(c.pack).toBe("litrpg-base");
    expect(c.selections.subgenre).toBe("Dungeon Core");
    expect(c.warnings).toEqual(["test warning"]);
  });

  it("updateContract bumps updatedAt and merges selections", async () => {
    const c = createContract({ selections: { a: "1" } });
    // small delay to guarantee different timestamp
    await new Promise((r) => setTimeout(r, 5));
    const c2 = updateContract(c, { selections: { b: "2" }, brief: "hi" });
    expect(c2.id).toBe(c.id);
    expect(c2.createdAt).toBe(c.createdAt);
    expect(c2.updatedAt >= c.updatedAt).toBe(true);
    expect(c2.selections).toEqual({ a: "1", b: "2" });
    expect(c2.brief).toBe("hi");
    // original untouched
    expect(c.brief).toBeUndefined();
  });
});

describe("contract — serialize/parse", () => {
  it("round-trips a contract", () => {
    const c = createContract({
      selections: { subgenre: "Cultivation", themes: ["A", "B"] },
      brief: "structured brief here",
      themeArgument: "the question",
    });
    const json = serializeContract(c);
    const { contract, errors } = parseContract(json);
    expect(errors).toEqual([]);
    expect(contract).toEqual(c);
  });

  it("rejects non-objects gracefully", () => {
    expect(parseContract("not json").contract).toBeNull();
    expect(parseContract("[]").errors).toContain("missing-version");
    expect(parseContract('{"version":"1.0"}').errors).toContain("missing-selections");
  });
});

describe("contract — migrate", () => {
  it("fills missing fields and keeps existing ones", () => {
    const old = { selections: { a: "1" } };
    const m = migrateContract(old);
    expect(m.version).toBe("1.0");
    expect(m.id).toBeTruthy();
    expect(m.pack).toBe("litrpg-base");
    expect(m.warnings).toEqual([]);
    expect(m.selections.a).toBe("1");
  });
});

describe("contract — exportMarkdown", () => {
  it("renders sections", () => {
    const c = createContract({
      selections: { subgenre: "LitRPG", themes: ["Power", "Control"] },
      themeArgument: "the question",
      brief: "BRIEF",
      warnings: ["warn1"],
      userNotes: "notes",
    });
    const md = exportMarkdown(c);
    expect(md).toContain("# Story Contract");
    expect(md).toContain("Theme argument");
    expect(md).toContain("the question");
    expect(md).toContain("subgenre");
    expect(md).toContain("LitRPG");
    expect(md).toContain("Power");
    expect(md).toContain("BRIEF");
    expect(md).toContain("warn1");
    expect(md).toContain("notes");
  });

  it("handles empty selections", () => {
    const c = createContract({ selections: {} });
    const md = exportMarkdown(c);
    expect(md).toContain("(none)");
  });
});

describe("contract — share hash", () => {
  it("round-trips through hash", () => {
    const c = createContract({
      selections: { x: "1", arr: ["a", "b"] },
      themeArgument: "Q?",
    });
    const hash = toShareHash(c);
    expect(hash).toMatch(/^[A-Za-z0-9_-]+$/);
    const { contract, errors } = fromShareHash(hash);
    expect(errors).toEqual([]);
    expect(contract.id).toBe(c.id);
    expect(contract.selections).toEqual(c.selections);
  });

  it("strips leading # if present", () => {
    const c = createContract({ selections: { x: "1" } });
    const hash = toShareHash(c);
    const { contract, errors } = fromShareHash("#" + hash);
    expect(errors).toEqual([]);
    expect(contract.id).toBe(c.id);
  });

  it("returns errors for empty / bad input", () => {
    expect(fromShareHash("").contract).toBeNull();
    expect(fromShareHash("!!!not-base64!!!").contract).toBeNull();
  });
});
