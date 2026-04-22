// src/lib/__tests__/presets.test.js
import { describe, it, expect } from "vitest";
import { applyPreset, conflictsForPreset } from "../presets.js";
import { PRESETS, findPreset } from "../../data/presets.js";
import { ALLOWED_TAGS, areTagsValid, unknownTags } from "../../data/tags.js";

describe("presets data", () => {
  it("every preset has an id, label, and selections object", () => {
    for (const p of PRESETS) {
      expect(typeof p.id).toBe("string");
      expect(typeof p.label).toBe("string");
      expect(p.selections && typeof p.selections === "object").toBe(true);
    }
  });

  it("preset ids are unique", () => {
    const ids = PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("findPreset returns the preset by id or null", () => {
    expect(findPreset("blank")).toBeTruthy();
    expect(findPreset("does-not-exist")).toBeNull();
  });
});

describe("conflictsForPreset", () => {
  const preset = {
    id: "x",
    label: "x",
    selections: { a: "A1", b: "B1" },
  };

  it("returns [] when no current selections overlap", () => {
    expect(conflictsForPreset({}, preset)).toEqual([]);
    expect(conflictsForPreset({ c: "C1" }, preset)).toEqual([]);
  });

  it("is not a conflict when current matches preset", () => {
    expect(conflictsForPreset({ a: "A1", b: "B1" }, preset)).toEqual([]);
  });

  it("reports fields where current differs from preset", () => {
    const out = conflictsForPreset({ a: "OTHER", b: "B1" }, preset);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ fieldId: "a", current: "OTHER", next: "A1" });
  });

  it("treats empty string as 'not set'", () => {
    expect(conflictsForPreset({ a: "" }, preset)).toEqual([]);
  });
});

describe("applyPreset", () => {
  const preset = {
    id: "x",
    label: "x",
    selections: { a: "A1", b: "B1" },
  };

  it("sets fields on an empty selection", () => {
    expect(applyPreset({}, preset)).toEqual({ a: "A1", b: "B1" });
  });

  it("leaves unrelated fields untouched", () => {
    const out = applyPreset({ c: "KEEP" }, preset);
    expect(out).toEqual({ a: "A1", b: "B1", c: "KEEP" });
  });

  it("replaces conflicting values by default", () => {
    const out = applyPreset({ a: "OLD", c: "KEEP" }, preset);
    expect(out.a).toBe("A1");
    expect(out.c).toBe("KEEP");
  });

  it("preserves current values when replaceConflicting=false", () => {
    const out = applyPreset({ a: "OLD" }, preset, { replaceConflicting: false });
    expect(out.a).toBe("OLD");
    expect(out.b).toBe("B1");
  });

  it("does not mutate the input", () => {
    const input = { a: "OLD" };
    applyPreset(input, preset);
    expect(input).toEqual({ a: "OLD" });
  });
});

describe("tags allow-list", () => {
  it("rejects unknown tags", () => {
    expect(areTagsValid(["not-a-real-tag"])).toBe(false);
    expect(unknownTags(["mystery", "not-real"])).toEqual(["not-real"]);
  });

  it("accepts known tags and non-arrays", () => {
    expect(areTagsValid(["mystery", "twist"])).toBe(true);
    expect(areTagsValid(undefined)).toBe(true);
    expect(ALLOWED_TAGS.has("mystery")).toBe(true);
  });
});
