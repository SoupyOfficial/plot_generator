import { describe, it, expect } from "vitest";
import { computeRarity, RARITY_ORDER } from "../rarity.js";

const LAYERS = [
  {
    id: "m",
    groups: [
      {
        id: "g",
        components: [
          { id: "archetype", options: [{ value: "A", tags: ["mystery", "cerebral"] }] },
          { id: "theme",     options: [{ value: "T", tags: ["mystery"] }] },
          { id: "flavor",    options: [{ value: "F", tags: ["cerebral"] }] },
        ],
      },
    ],
  },
];

describe("computeRarity", () => {
  it("empty selections are Common", () => {
    const r = computeRarity({ layers: LAYERS, selections: {} });
    expect(r.tier).toBe("Common");
    expect(r.score).toBe(0);
  });

  it("tag overlaps boost rarity", () => {
    const r = computeRarity({
      layers: LAYERS,
      selections: { archetype: "A", theme: "T", flavor: "F" },
    });
    // mystery appears 2x -> 1 overlap; cerebral appears 2x -> 1 overlap.
    expect(r.overlaps).toBe(2);
    expect(RARITY_ORDER).toContain(r.tier);
  });

  it("warnings reduce rarity score", () => {
    const base = computeRarity({
      layers: LAYERS,
      selections: { archetype: "A", theme: "T", flavor: "F" },
      warningsCount: 0,
    });
    const penalized = computeRarity({
      layers: LAYERS,
      selections: { archetype: "A", theme: "T", flavor: "F" },
      warningsCount: 3,
    });
    expect(penalized.score).toBeLessThan(base.score);
  });
});
