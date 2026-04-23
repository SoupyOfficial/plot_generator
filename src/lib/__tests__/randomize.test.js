import { describe, it, expect } from "vitest";
import { rollDice, dealOptions, selectionTags } from "../randomize.js";

const LAYERS = [
  {
    id: "macro",
    groups: [
      {
        id: "g1",
        components: [
          {
            id: "archetype",
            options: [
              { value: "The Exploiter", tags: ["pragmatic"] },
              { value: "The Defier", tags: ["autonomous", "anti-system"] },
            ],
          },
          {
            id: "theme",
            options: [
              { value: "Power vs Humanity", tags: ["pragmatic"] },
              { value: "Control vs Freedom", tags: ["autonomous"] },
            ],
          },
          {
            id: "flavor",
            options: ["Stoic", "Wry", "Idealist"],
          },
        ],
      },
    ],
  },
];

function seededRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

describe("rollDice", () => {
  it("fills all empty single-select fields", () => {
    const { selections, changed } = rollDice({
      layers: LAYERS,
      selections: {},
      rng: seededRng(42),
    });
    expect(selections.archetype).toBeTruthy();
    expect(selections.theme).toBeTruthy();
    expect(selections.flavor).toBeTruthy();
    expect(changed).toEqual(expect.arrayContaining(["archetype", "theme", "flavor"]));
  });

  it("respects preserveIds", () => {
    const { selections } = rollDice({
      layers: LAYERS,
      selections: { archetype: "The Exploiter" },
      preserveIds: ["archetype"],
      rng: seededRng(7),
    });
    expect(selections.archetype).toBe("The Exploiter");
  });

  it("does not overwrite existing by default", () => {
    const { selections } = rollDice({
      layers: LAYERS,
      selections: { archetype: "The Defier" },
      rng: seededRng(7),
    });
    expect(selections.archetype).toBe("The Defier");
  });
});

describe("dealOptions", () => {
  it("returns up to N distinct options", () => {
    const out = dealOptions(LAYERS, {}, "flavor", 3, seededRng(1));
    expect(out.length).toBe(3);
    const values = out.map((o) => o.value);
    expect(new Set(values).size).toBe(3);
  });

  it("returns empty if the field is unknown", () => {
    expect(dealOptions(LAYERS, {}, "nope", 3)).toEqual([]);
  });
});

describe("selectionTags", () => {
  it("collects tags across selected options", () => {
    const tags = selectionTags(LAYERS, {
      archetype: "The Defier",
      theme: "Control vs Freedom",
    });
    expect(tags.has("autonomous")).toBe(true);
    expect(tags.has("anti-system")).toBe(true);
  });
});
