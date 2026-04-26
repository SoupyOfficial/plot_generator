// src/lib/__tests__/corpus.test.js

import { describe, it, expect } from "vitest";
import {
  DEFAULT_CORPUS_PROFILE,
  SUBGENRE_PROFILES,
  ENGINE_PROFILES,
  getCorpusDefaults,
  getCorpusField,
  listSubgenres,
  listEngines,
} from "../corpus.js";

describe("corpus / DEFAULT_CORPUS_PROFILE", () => {
  it("has the expected shape and reasonable values", () => {
    const p = DEFAULT_CORPUS_PROFILE;
    expect(p.medianChapterWords).toBeGreaterThan(0);
    expect(p.minChapterWords).toBeLessThanOrEqual(p.medianChapterWords);
    expect(p.maxChapterWords).toBeGreaterThanOrEqual(p.medianChapterWords);
    expect(p.actionRatio).toBeGreaterThanOrEqual(0);
    expect(p.actionRatio).toBeLessThanOrEqual(1);
    expect(p.beatsPerChapter).toBeGreaterThanOrEqual(1);
  });

  it("is frozen (cannot be mutated)", () => {
    expect(() => {
      DEFAULT_CORPUS_PROFILE.medianChapterWords = 0;
    }).toThrow();
  });
});

describe("getCorpusDefaults", () => {
  it("returns the baseline when selections is empty", () => {
    const p = getCorpusDefaults();
    expect(p.medianChapterWords).toBe(DEFAULT_CORPUS_PROFILE.medianChapterWords);
    expect(p.actionRatio).toBe(DEFAULT_CORPUS_PROFILE.actionRatio);
  });

  it("applies a known subgenre override", () => {
    const p = getCorpusDefaults({
      selections: { subgenre: "Cozy LitRPG / low-stakes" },
    });
    expect(p.actionRatio).toBe(0.25);
    expect(p.medianChapterWords).toBe(2500);
  });

  it("falls through to DEFAULT for unknown subgenres", () => {
    const p = getCorpusDefaults({
      selections: { subgenre: "Made-up subgenre that does not exist" },
    });
    expect(p).toEqual(DEFAULT_CORPUS_PROFILE);
  });

  it("layers engine over subgenre (engine wins)", () => {
    const p = getCorpusDefaults({
      selections: {
        subgenre: "Cozy LitRPG / low-stakes",   // actionRatio 0.25
        storyEngine: "Tournament arc",          // actionRatio 0.7
      },
    });
    expect(p.actionRatio).toBe(0.7);
    // subgenre fields not overridden by engine should survive
    expect(p.medianChapterWords).toBe(2500);
  });

  it("explicit overrides beat both", () => {
    const p = getCorpusDefaults({
      selections: { subgenre: "System apocalypse", storyEngine: "Tournament arc" },
      overrides: { actionRatio: 0.1, medianChapterWords: 1000 },
    });
    expect(p.actionRatio).toBe(0.1);
    expect(p.medianChapterWords).toBe(1000);
  });

  it("clamps out-of-range overrides instead of crashing", () => {
    const p = getCorpusDefaults({ overrides: { actionRatio: 999, beatsPerChapter: -5 } });
    expect(p.actionRatio).toBe(1);
    expect(p.beatsPerChapter).toBe(1);
  });

  it("is pure (does not mutate inputs)", () => {
    const selections = { subgenre: "System apocalypse" };
    const before = JSON.stringify(selections);
    getCorpusDefaults({ selections });
    expect(JSON.stringify(selections)).toBe(before);
  });

  it("ensures min <= median <= max after clamping", () => {
    const p = getCorpusDefaults({
      overrides: { medianChapterWords: 1000, minChapterWords: 9000, maxChapterWords: 500 },
    });
    expect(p.minChapterWords).toBeLessThanOrEqual(p.medianChapterWords);
    expect(p.maxChapterWords).toBeGreaterThanOrEqual(p.medianChapterWords);
  });
});

describe("getCorpusField", () => {
  it("returns a single field", () => {
    expect(
      getCorpusField("actionRatio", { selections: { storyEngine: "Slice-of-life drift" } }),
    ).toBe(0.2);
  });

  it("returns the default for unknown profiles", () => {
    expect(getCorpusField("voiceDriftThreshold")).toBe(
      DEFAULT_CORPUS_PROFILE.voiceDriftThreshold,
    );
  });
});

describe("list helpers", () => {
  it("listSubgenres returns the curated keys", () => {
    const keys = listSubgenres();
    expect(keys).toEqual(Object.keys(SUBGENRE_PROFILES));
    expect(keys).toContain("System apocalypse");
  });

  it("listEngines returns the curated keys", () => {
    const keys = listEngines();
    expect(keys).toEqual(Object.keys(ENGINE_PROFILES));
    expect(keys).toContain("Tournament arc");
  });
});
