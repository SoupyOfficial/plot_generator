// src/lib/__tests__/prompt.test.js
import { describe, it, expect } from "vitest";
import {
  buildStructuredBrief,
  buildGenerationPrompt,
  SYSTEM_PROMPT,
} from "../prompt.js";

// Minimal layers mirroring the real App.jsx shape for the fields referenced
// by buildStructuredBrief. We only declare the components we assert on.
const LAYERS = [
  {
    id: "macro",
    groups: [
      {
        id: "sys",
        components: [
          {
            id: "systemPurpose",
            options: [
              {
                value: "Sorting",
                description: "Category-fit engine rewarding placement.",
              },
            ],
          },
          {
            id: "archetype",
            options: [
              {
                value: "The Returner",
                description: "Time-loop / second-chance leverage.",
              },
            ],
          },
          {
            id: "resolutionMode",
            options: ["Exposure"],
          },
          { id: "primaryTheme", options: ["Knowledge vs Consequence"] },
          { id: "secondaryTheme", options: ["None", "Truth vs Comfort"] },
          {
            id: "subplots",
            multi: true,
            options: ["Mystery / Investigation", "Romance / Attachment"],
          },
        ],
      },
    ],
  },
];

const SYSTEM_DESIGN = {
  highValueCombos: [
    {
      archetype: "The Returner",
      resolution: "Exposure",
      note: "Foreknowledge + public truth = compounding dramatic irony.",
    },
    {
      archetype: "The Defier",
      resolution: "Rebellion",
      note: "(should NOT be detected)",
    },
  ],
};

describe("buildStructuredBrief", () => {
  it("returns empty string for empty selections", () => {
    const out = buildStructuredBrief({
      layers: LAYERS,
      selections: {},
      systemDesign: SYSTEM_DESIGN,
    });
    expect(out).toBe("");
  });

  it("surfaces option descriptions", () => {
    const out = buildStructuredBrief({
      layers: LAYERS,
      selections: { systemPurpose: "Sorting" },
    });
    expect(out).toContain("Sorting");
    expect(out).toContain("Category-fit engine");
  });

  it("skips sections without populated fields", () => {
    const out = buildStructuredBrief({
      layers: LAYERS,
      selections: { systemPurpose: "Sorting" },
    });
    // Should NOT have "Protagonist" section since no protagonist fields set
    expect(out).not.toContain("## Protagonist");
  });

  it("includes theme argument sentence for recognized theme", () => {
    const out = buildStructuredBrief({
      layers: LAYERS,
      selections: { primaryTheme: "Knowledge vs Consequence" },
    });
    expect(out).toContain("Central Tension");
    expect(out).toContain("Is knowing the truth worth the agency it destroys?");
  });

  it("skips secondary theme when 'None'", () => {
    const out = buildStructuredBrief({
      layers: LAYERS,
      selections: {
        primaryTheme: "Knowledge vs Consequence",
        secondaryTheme: "None",
      },
    });
    expect(out).not.toMatch(/Secondary theme/);
  });

  it("renders multi-select subplots as nested bullets", () => {
    const out = buildStructuredBrief({
      layers: LAYERS,
      selections: {
        subplots: ["Mystery / Investigation", "Romance / Attachment"],
      },
    });
    expect(out).toContain("Mystery / Investigation");
    expect(out).toContain("Romance / Attachment");
    expect(out).toMatch(/##\s+Subplots/);
  });

  it("detects high-value combos matching archetype + resolution", () => {
    const out = buildStructuredBrief({
      layers: LAYERS,
      selections: { archetype: "The Returner", resolutionMode: "Exposure" },
      systemDesign: SYSTEM_DESIGN,
    });
    expect(out).toContain("High-Value Combos Detected");
    expect(out).toContain("compounding dramatic irony");
    expect(out).not.toContain("should NOT be detected");
  });

  it("restates activeWarnings as Active Constraints section", () => {
    const out = buildStructuredBrief({
      layers: LAYERS,
      selections: { systemPurpose: "Sorting" },
      activeWarnings: ["Warning A.", "Warning B."],
    });
    expect(out).toContain("Active Constraints");
    expect(out).toContain("Warning A.");
    expect(out).toContain("Warning B.");
  });

  it("appends userNotes verbatim in its own section", () => {
    const notes = "Main character is named Marin.";
    const out = buildStructuredBrief({
      layers: LAYERS,
      selections: { systemPurpose: "Sorting" },
      userNotes: notes,
    });
    expect(out).toContain("User Notes");
    expect(out).toContain(notes);
  });

  it("omits userNotes section when empty/whitespace", () => {
    const out = buildStructuredBrief({
      layers: LAYERS,
      selections: { systemPurpose: "Sorting" },
      userNotes: "   \n  ",
    });
    expect(out).not.toContain("User Notes");
  });
});

describe("buildGenerationPrompt", () => {
  it("returns system + user envelope", () => {
    const { system, user } = buildGenerationPrompt({
      layers: LAYERS,
      selections: { systemPurpose: "Sorting" },
      systemDesign: SYSTEM_DESIGN,
    });
    expect(system).toBe(SYSTEM_PROMPT);
    expect(user.startsWith("# STORY BRIEF")).toBe(true);
    expect(user).toContain("Sorting");
  });

  it("threads userNotes and activeWarnings into the user body", () => {
    const { user } = buildGenerationPrompt({
      layers: LAYERS,
      selections: { systemPurpose: "Sorting" },
      activeWarnings: ["Anti-drift warning"],
      userNotes: "MC is Marin.",
    });
    expect(user).toContain("Anti-drift warning");
    expect(user).toContain("MC is Marin.");
  });
});
