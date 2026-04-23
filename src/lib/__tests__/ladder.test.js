import { describe, it, expect } from "vitest";
import { parseCustomRungs, resolveRungs, normalizePins, describePins } from "../ladder.js";

describe("parseCustomRungs", () => {
  it("splits on arrows and commas", () => {
    expect(parseCustomRungs("A → B → C")).toEqual(["A", "B", "C"]);
    expect(parseCustomRungs("A, B, C")).toEqual(["A", "B", "C"]);
    expect(parseCustomRungs("A -> B , C ; D")).toEqual(["A", "B", "C", "D"]);
  });
});

describe("resolveRungs", () => {
  it("returns preset rungs", () => {
    const r = resolveRungs({ progressionRungs: "Cultivation — 9 named realms" });
    expect(r.length).toBe(9);
    expect(r[0]).toBe("Body Tempering");
  });

  it("falls back to custom rungs", () => {
    const r = resolveRungs({ progressionCustomRungs: "Novice → Adept → Master" });
    expect(r).toEqual(["Novice", "Adept", "Master"]);
  });
});

describe("normalizePins", () => {
  it("defaults sensibly", () => {
    const p = normalizePins(null, 9);
    expect(p.book1Index).toBeGreaterThanOrEqual(0);
    expect(p.book3Index).toBeLessThan(9);
    expect(p.book1Index).toBeLessThanOrEqual(p.book3Index);
  });

  it("clamps out-of-range values", () => {
    const p = normalizePins({ book1Index: -5, book3Index: 99 }, 5);
    expect(p.book1Index).toBe(0);
    expect(p.book3Index).toBe(4);
  });

  it("enforces b1 <= b3", () => {
    const p = normalizePins({ book1Index: 3, book3Index: 1 }, 5);
    expect(p.book1Index).toBeLessThanOrEqual(p.book3Index);
  });
});

describe("describePins", () => {
  it("produces a readable line", () => {
    const rungs = ["A", "B", "C", "D"];
    const p = { book1Index: 1, book3Index: 3 };
    expect(describePins(rungs, p)).toContain("Book 1");
    expect(describePins(rungs, p)).toContain("Book 3");
  });
});
