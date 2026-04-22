// src/lib/__tests__/validation.test.js
import { describe, it, expect } from "vitest";
import { crossCuttingRules, validateSelections } from "../validation.js";

// Minimal layers used by validateSelections to build the field index.
// We declare the forbids pairs we want to exercise.
const LAYERS = [
  {
    id: "macro",
    groups: [
      {
        id: "a",
        components: [
          {
            id: "systemPurpose",
            options: [
              {
                value: "Entertainment",
                forbids: { archetype: "The Defier" },
              },
              "Sorting",
            ],
          },
          {
            id: "archetype",
            options: [
              {
                value: "The Defier",
                forbids: { systemPurpose: "Entertainment" },
              },
              "The Returner",
              "The Exploiter",
            ],
          },
          {
            id: "resolutionMode",
            options: [
              {
                value: "Exposure",
                forbids: { truthRevealPacing: "Single late reveal" },
              },
              "Refusal",
            ],
          },
          {
            id: "truthRevealPacing",
            options: [
              {
                value: "Single late reveal",
                forbids: { resolutionMode: "Exposure" },
              },
              "Drip reveals",
              "Red herrings",
            ],
          },
          {
            id: "knowledgeAdvantage",
            options: ["None", "Future knowledge", "Meta knowledge"],
          },
          {
            id: "systemAlignment",
            options: ["Neutral (indifferent)", "Malicious"],
          },
          {
            id: "costOfPower",
            options: ["None (free power)", "Identity cost", "Physical"],
          },
          { id: "primaryTheme", options: ["Knowledge vs Consequence"] },
          {
            id: "arcType",
            options: ["Continuous narrative", "Closed arcs"],
          },
          {
            id: "seriesCeiling",
            options: [
              "Open-ended",
              "Open-ended with thematic endpoint",
              "No planned ending",
              "Hard-capped",
            ],
          },
          {
            id: "antagonistType",
            options: ["Personal rival", "System itself"],
          },
          {
            id: "subplots",
            multi: true,
            options: [
              "Mystery / Investigation",
              "Romance / Attachment",
              "Rival arc",
              "Family",
              "Training montage",
            ],
          },
          {
            id: "antiDrift",
            multi: true,
            options: ["Thematic lock", "Time-skip lock", "Tier ceiling"],
          },
        ],
      },
    ],
  },
];

describe("crossCuttingRules", () => {
  it("flags Returner without foreknowledge", () => {
    const w = crossCuttingRules({
      archetype: "The Returner",
      knowledgeAdvantage: "None",
    });
    expect(w.some((x) => /Returner.*foreknowledge/i.test(x))).toBe(true);
  });

  it("does not flag Returner with Future knowledge + rival subplot", () => {
    const w = crossCuttingRules({
      archetype: "The Returner",
      knowledgeAdvantage: "Future knowledge",
      subplots: ["Rival arc"],
    });
    expect(w.some((x) => /foreknowledge/i.test(x))).toBe(false);
  });

  it("flags Returner foreknowledge without compounding problems", () => {
    const w = crossCuttingRules({
      archetype: "The Returner",
      knowledgeAdvantage: "Future knowledge",
      subplots: ["Training montage"],
    });
    expect(w.some((x) => /compounding/i.test(x))).toBe(true);
  });

  it("flags Neutral system + no cost of power", () => {
    const w = crossCuttingRules({
      systemAlignment: "Neutral (indifferent)",
      costOfPower: "None (free power)",
      subplots: ["Family"],
    });
    expect(w.some((x) => /Neutral.*inert/i.test(x))).toBe(true);
  });

  it("flags Knowledge-vs-Consequence theme without mystery engine", () => {
    const w = crossCuttingRules({
      primaryTheme: "Knowledge vs Consequence",
      subplots: ["Romance / Attachment"],
      resolutionMode: "Refusal",
    });
    expect(w.some((x) => /mystery/i.test(x))).toBe(true);
  });

  it("does NOT flag Knowledge-vs-Consequence when Exposure resolution chosen", () => {
    const w = crossCuttingRules({
      primaryTheme: "Knowledge vs Consequence",
      resolutionMode: "Exposure",
    });
    expect(w.some((x) => /Knowledge vs Consequence/.test(x))).toBe(false);
  });

  it("flags open-ended series without 2+ anti-drift locks", () => {
    const w = crossCuttingRules({
      arcType: "Continuous narrative",
      antiDrift: ["Thematic lock"],
    });
    expect(w.some((x) => /anti-drift/i.test(x))).toBe(true);
  });

  it("flags 'No planned ending' without thematic endpoint", () => {
    const w = crossCuttingRules({
      seriesCeiling: "No planned ending",
      primaryTheme: "Knowledge vs Consequence",
      antiDrift: ["Thematic lock", "Tier ceiling"],
    });
    expect(w.some((x) => /No planned ending|drift risk/i.test(x))).toBe(true);
  });

  it("flags costless power without human-cost subplot", () => {
    const w = crossCuttingRules({
      costOfPower: "None (free power)",
      subplots: ["Training montage"],
    });
    expect(w.some((x) => /human cost/i.test(x))).toBe(true);
  });

  it("does NOT flag costless power when Romance subplot present", () => {
    const w = crossCuttingRules({
      costOfPower: "None (free power)",
      subplots: ["Romance / Attachment"],
    });
    expect(w.some((x) => /human cost/i.test(x))).toBe(false);
  });

  it("flags Exposure + Single late reveal combination", () => {
    const w = crossCuttingRules({
      resolutionMode: "Exposure",
      truthRevealPacing: "Single late reveal",
    });
    expect(w.some((x) => /twist, not resolution/i.test(x))).toBe(true);
  });

  it("flags subplot count out of 2–4 range", () => {
    expect(crossCuttingRules({ subplots: ["Family"] })).toContainEqual(
      expect.stringMatching(/Subplot count is 1/)
    );
    expect(
      crossCuttingRules({
        subplots: ["Family", "Rival arc", "Mystery / Investigation", "Romance / Attachment", "Training montage"],
      })
    ).toContainEqual(expect.stringMatching(/Subplot count is 5/));
  });

  it("does NOT flag subplot count when empty (initial state)", () => {
    const w = crossCuttingRules({});
    expect(w.some((x) => /Subplot count/i.test(x))).toBe(false);
  });
});

describe("validateSelections (forbids + cross-cutting merged)", () => {
  it("emits a forbid warning for Entertainment + Defier", () => {
    const w = validateSelections(
      { systemPurpose: "Entertainment", archetype: "The Defier" },
      LAYERS
    );
    expect(w.some((x) => /incompatible/i.test(x))).toBe(true);
  });

  it("emits a forbid warning for Exposure + Single late reveal", () => {
    const w = validateSelections(
      { resolutionMode: "Exposure", truthRevealPacing: "Single late reveal" },
      LAYERS
    );
    // One from forbids ("incompatible"), one from cross-cutting ("twist, not resolution")
    expect(w.length).toBeGreaterThanOrEqual(1);
    expect(w.some((x) => /incompatible|twist/i.test(x))).toBe(true);
  });

  it("stays empty when selections are fully compatible", () => {
    const w = validateSelections(
      {
        systemPurpose: "Sorting",
        archetype: "The Exploiter",
        resolutionMode: "Refusal",
      },
      LAYERS
    );
    expect(w).toEqual([]);
  });

  it("is defensive against missing layers", () => {
    expect(validateSelections({}, [])).toEqual([]);
    expect(validateSelections({}, undefined)).toEqual([]);
  });
});
