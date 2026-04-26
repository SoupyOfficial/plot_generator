// src/lib/__tests__/reverseEngineer.test.js
import { describe, it, expect } from "vitest";
import {
  buildReverseEngineerPrompt,
  parseReverseEngineerResponse,
  buildDiagnoseDriftPrompt,
  parseDiagnoseDriftResponse,
} from "../reverseEngineer.js";

const layers = [
  {
    title: "L1",
    groups: [
      {
        title: "G1",
        components: [
          {
            id: "subgenre",
            label: "Subgenre",
            options: [
              { value: "Cultivation" },
              { value: "Dungeon Core" },
              "Apocalypse",
            ],
          },
          {
            id: "themes",
            label: "Themes",
            multi: true,
            options: [{ value: "A" }, { value: "B" }],
          },
          {
            id: "userNotes",
            label: "Notes",
            freeform: true,
            options: [],
          },
        ],
      },
    ],
  },
];

describe("buildReverseEngineerPrompt", () => {
  it("includes single-select fields with allow-lists, omits multi/freeform", () => {
    const { system, user, allFieldIds } = buildReverseEngineerPrompt({
      layers,
      prose: "A young farm boy enters a dungeon...",
    });
    expect(system).toContain("LitRPG");
    expect(user).toContain("subgenre");
    expect(user).toContain("Cultivation");
    expect(user).toContain("Dungeon Core");
    expect(user).toContain("Apocalypse");
    expect(user).toContain("PROSE");
    expect(user).toContain("farm boy");
    expect(allFieldIds).toEqual(["subgenre"]);
    expect(allFieldIds).not.toContain("themes");
    expect(allFieldIds).not.toContain("userNotes");
  });

  it("surfaces known selections in the prompt", () => {
    const { user } = buildReverseEngineerPrompt({
      layers,
      prose: "p",
      knownSelections: { subgenre: "Cultivation" },
    });
    expect(user).toContain("AUTHOR-PROVIDED CHOICES");
    expect(user).toContain("Cultivation");
  });
});

describe("parseReverseEngineerResponse", () => {
  it("parses raw JSON", () => {
    const r = parseReverseEngineerResponse(
      '{"subgenre":"Cultivation"}',
      layers
    );
    expect(r.accepted).toEqual({ subgenre: "Cultivation" });
    expect(r.rejected).toEqual([]);
  });

  it("strips ```json fences", () => {
    const r = parseReverseEngineerResponse(
      '```json\n{"subgenre":"Apocalypse"}\n```',
      layers
    );
    expect(r.accepted).toEqual({ subgenre: "Apocalypse" });
  });

  it("rejects values not in allow-list", () => {
    const r = parseReverseEngineerResponse(
      '{"subgenre":"Made Up Thing"}',
      layers
    );
    expect(r.accepted).toEqual({});
    expect(r.rejected[0].reason).toBe("not-in-allow-list");
  });

  it("rejects unknown fields", () => {
    const r = parseReverseEngineerResponse(
      '{"nope":"x"}',
      layers
    );
    expect(r.rejected[0].reason).toBe("unknown-field");
  });

  it("rejects multi/freeform field types", () => {
    const r = parseReverseEngineerResponse(
      '{"themes":"A","userNotes":"hi"}',
      layers
    );
    expect(r.rejected.find((x) => x.fieldId === "themes").reason).toBe(
      "unsupported-field-type"
    );
    expect(r.rejected.find((x) => x.fieldId === "userNotes").reason).toBe(
      "unsupported-field-type"
    );
  });

  it("recovers JSON inside surrounding text", () => {
    const r = parseReverseEngineerResponse(
      'Here is the result: {"subgenre":"Cultivation"} done.',
      layers
    );
    expect(r.accepted).toEqual({ subgenre: "Cultivation" });
  });

  it("returns unparseable for total garbage", () => {
    const r = parseReverseEngineerResponse("nothing parseable here", layers);
    expect(r.accepted).toEqual({});
    expect(r.rejected[0].reason).toBe("unparseable");
  });
});

describe("diagnose drift", () => {
  it("builds a drift prompt referencing contract + prose", () => {
    const { system, user } = buildDiagnoseDriftPrompt({
      contract: {
        selections: { subgenre: "Cultivation" },
        themeArgument: "Q?",
      },
      prose: "Bob rode his motorcycle to the gas station.",
    });
    expect(system).toContain("continuity");
    expect(user).toContain("Cultivation");
    expect(user).toContain("Theme argument: Q?");
    expect(user).toContain("motorcycle");
  });

  it("parses a drift response and filters non-objects", () => {
    const r = parseDiagnoseDriftResponse(
      '```json\n{"issues":[{"fieldId":"x","draftDoes":"y","contractSays":"z","severity":"warning","quote":"q"}, "garbage"]}\n```'
    );
    expect(r.issues.length).toBe(1);
    expect(r.issues[0].fieldId).toBe("x");
  });

  it("returns empty issues for unparseable input", () => {
    expect(parseDiagnoseDriftResponse("nope").issues).toEqual([]);
  });
});
