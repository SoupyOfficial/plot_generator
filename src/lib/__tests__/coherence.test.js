// src/lib/__tests__/coherence.test.js
import { describe, it, expect } from "vitest";
import { computeCoherence, labelForScore } from "../coherence.js";

describe("labelForScore", () => {
  it("bands work at edges", () => {
    expect(labelForScore(100).label).toBe("High");
    expect(labelForScore(85).label).toBe("High");
    expect(labelForScore(84).label).toBe("Solid");
    expect(labelForScore(65).label).toBe("Solid");
    expect(labelForScore(64).label).toBe("Mixed");
    expect(labelForScore(40).label).toBe("Mixed");
    expect(labelForScore(39).label).toBe("Fractured");
    expect(labelForScore(0).label).toBe("Fractured");
  });
});

describe("computeCoherence", () => {
  const required = ["a", "b", "c", "d"];

  it("empty selection is fractured", () => {
    const out = computeCoherence({ requiredIds: required, selections: {} });
    expect(out.label).toBe("Fractured");
    expect(out.breakdown.filled).toBe(0);
    expect(out.breakdown.completeness).toBe(0);
  });

  it("full selection with no warnings is high", () => {
    const out = computeCoherence({
      requiredIds: required,
      selections: { a: "1", b: "2", c: "3", d: "4" },
      subplotCount: 3,
      warnings: [],
    });
    expect(out.label).toBe("High");
    expect(out.breakdown.compatibility).toBe(100);
  });

  it("warnings drag the score down", () => {
    const sel = { a: "1", b: "2", c: "3", d: "4" };
    const ok = computeCoherence({
      requiredIds: required,
      selections: sel,
      subplotCount: 3,
    });
    const bad = computeCoherence({
      requiredIds: required,
      selections: sel,
      subplotCount: 3,
      warnings: ["w1", "w2", "w3", "w4", "w5"],
    });
    expect(bad.score).toBeLessThan(ok.score);
    expect(bad.breakdown.compatibility).toBe(0);
  });

  it("high-value combos add a small bonus", () => {
    const sel = { a: "1", b: "2", c: "3", d: "4" };
    const base = computeCoherence({
      requiredIds: required,
      selections: sel,
      subplotCount: 3,
    });
    const withCombos = computeCoherence({
      requiredIds: required,
      selections: sel,
      subplotCount: 3,
      highValueCombos: 2,
    });
    expect(withCombos.score).toBeGreaterThanOrEqual(base.score);
    expect(withCombos.breakdown.cohesionBonus).toBe(10);
  });

  it("subplot count outside range penalizes completeness", () => {
    const sel = { a: "1", b: "2", c: "3", d: "4" };
    const good = computeCoherence({
      requiredIds: required,
      selections: sel,
      subplotCount: 3,
    });
    const bad = computeCoherence({
      requiredIds: required,
      selections: sel,
      subplotCount: 0,
    });
    expect(bad.score).toBeLessThan(good.score);
    expect(bad.breakdown.subplotOk).toBe(false);
  });

  it("score is clamped 0-100", () => {
    const out = computeCoherence({
      requiredIds: [],
      selections: {},
      subplotCount: 3,
      highValueCombos: 20, // would overflow bonus
    });
    expect(out.score).toBeLessThanOrEqual(100);
    expect(out.score).toBeGreaterThanOrEqual(0);
  });
});
