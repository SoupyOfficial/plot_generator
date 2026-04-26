// src/lib/__tests__/bible.test.js
import { describe, it, expect } from "vitest";
import {
  BIBLE_VERSION,
  createBible,
  addCharacter,
  addLocation,
  addFaction,
  addLore,
  addGlossary,
  addSystemRule,
  setStyleGuide,
  appendChapterRecord,
  linkCharacterToBeat,
  serializeBible,
  parseBible,
  exportBibleMarkdown,
  validateBible,
  setRollingSummary,
} from "../bible.js";
import { createContract } from "../contract.js";
import { createSeriesPlan } from "../seriesPlan.js";

const baseContract = () =>
  createContract({ selections: { subgenre: "Cultivation" } });

describe("createBible", () => {
  it("returns a fully shaped empty bible", () => {
    const b = createBible(baseContract(), createSeriesPlan({ totalBooks: 1 }));
    expect(b.version).toBe(BIBLE_VERSION);
    expect(b.characters).toEqual([]);
    expect(b.locations).toEqual([]);
    expect(b.factions).toEqual([]);
    expect(b.lore).toEqual([]);
    expect(b.glossary).toEqual([]);
    expect(b.systemRules).toEqual([]);
    expect(b.chapters).toEqual([]);
    expect(b.styleGuide.pov).toBe("");
    expect(b.contract).toBeTruthy();
    expect(b.series).toBeTruthy();
  });
});

describe("collection adders", () => {
  it("addCharacter assigns an id", () => {
    const b0 = createBible(baseContract());
    const { bible, id } = addCharacter(b0, { name: "Lin", role: "protagonist" });
    expect(id).toMatch(/^char_/);
    expect(bible.characters).toHaveLength(1);
    expect(bible.characters[0].name).toBe("Lin");
    expect(bible.characters[0].id).toBe(id);
    expect(b0.characters).toHaveLength(0); // immutability
  });

  it("addLocation/addFaction/addLore/addGlossary/addSystemRule each assign ids", () => {
    let b = createBible(baseContract());
    b = addLocation(b, { name: "Wuthering Cliff" }).bible;
    b = addFaction(b, { name: "Crimson Sect" }).bible;
    b = addLore(b, { topic: "Origin of qi" }).bible;
    b = addGlossary(b, { term: "qi", definition: "vital force" }).bible;
    b = addSystemRule(b, { name: "No revival", rule: "Death is permanent" }).bible;
    expect(b.locations[0].id).toMatch(/^loc_/);
    expect(b.factions[0].id).toMatch(/^fac_/);
    expect(b.lore[0].id).toMatch(/^lore_/);
    expect(b.glossary[0].id).toMatch(/^term_/);
    expect(b.systemRules[0].id).toMatch(/^rule_/);
  });
});

describe("setStyleGuide", () => {
  it("merges patches", () => {
    let b = createBible(baseContract());
    b = setStyleGuide(b, { pov: "first", tense: "past" });
    expect(b.styleGuide.pov).toBe("first");
    b = setStyleGuide(b, { voiceRules: ["snarky inner monologue"] });
    expect(b.styleGuide.tense).toBe("past"); // preserved
    expect(b.styleGuide.voiceRules).toEqual(["snarky inner monologue"]);
  });
});

describe("linkCharacterToBeat", () => {
  it("dedups identical entries", () => {
    let b = createBible(baseContract());
    const r = addCharacter(b, { name: "Lin" });
    b = r.bible;
    b = linkCharacterToBeat(b, r.id, { book: 1, beat: 3 });
    b = linkCharacterToBeat(b, r.id, { book: 1, beat: 3 });
    expect(b.characters[0].beatsPresent).toHaveLength(1);
    b = linkCharacterToBeat(b, r.id, { book: 1, beat: 4 });
    expect(b.characters[0].beatsPresent).toHaveLength(2);
  });
});

describe("appendChapterRecord", () => {
  it("adds a chapter with id", () => {
    let b = createBible(baseContract());
    const r = appendChapterRecord(b, { num: 1, title: "Awakening", summary: "X" });
    expect(r.bible.chapters).toHaveLength(1);
    expect(r.bible.chapters[0].id).toBe(r.id);
  });
});

describe("serialize/parse round-trip", () => {
  it("round-trips an enriched bible", () => {
    let b = createBible(baseContract(), createSeriesPlan({ totalBooks: 1 }));
    b = addCharacter(b, { name: "Lin" }).bible;
    b = setStyleGuide(b, { pov: "first", tense: "past" });
    const json = serializeBible(b);
    const { bible, errors } = parseBible(json);
    expect(errors).toEqual([]);
    expect(bible.characters[0].name).toBe("Lin");
    expect(bible.styleGuide.pov).toBe("first");
  });

  it("rejects non-objects", () => {
    expect(parseBible("not json").bible).toBeNull();
  });
});

describe("exportBibleMarkdown", () => {
  it("renders headings for populated sections", () => {
    let b = createBible(baseContract());
    b = setStyleGuide(b, { pov: "first", tense: "past", voiceRules: ["x"], doNot: ["y"] });
    b = addCharacter(b, { name: "Lin", role: "protagonist", arcSummary: "grows up" }).bible;
    b = addSystemRule(b, { name: "Mortality", rule: "Death is permanent" }).bible;
    b = addLocation(b, { name: "Cliff", description: "tall" }).bible;
    b = addGlossary(b, { term: "qi", definition: "force" }).bible;
    b = appendChapterRecord(b, { num: 1, title: "Awaken", summary: "x" }).bible;
    const md = exportBibleMarkdown(b);
    expect(md).toContain("# Story Bible");
    expect(md).toContain("## Style guide");
    expect(md).toContain("## Characters");
    expect(md).toContain("Lin");
    expect(md).toContain("## System rules");
    expect(md).toContain("Mortality");
    expect(md).toContain("## Locations");
    expect(md).toContain("## Glossary");
    expect(md).toContain("qi");
    expect(md).toContain("Chapter history");
    // chapter prose excluded by default
    expect(md).not.toContain("CHAPTER PROSE BODY");
  });
});

describe("validateBible", () => {
  it("flags missing contract/series and style-guide gaps", () => {
    const b = createBible(null, null);
    const w = validateBible(b);
    expect(w.some((x) => x.includes("contract"))).toBe(true);
    expect(w.some((x) => x.includes("series"))).toBe(true);
    expect(w.some((x) => x.includes("POV"))).toBe(true);
    expect(w.some((x) => x.includes("tense"))).toBe(true);
  });

  it("flags chapters referencing unknown character ids", () => {
    let b = createBible(baseContract(), createSeriesPlan({ totalBooks: 1 }));
    b = setStyleGuide(b, { pov: "first", tense: "past" });
    b = appendChapterRecord(b, {
      num: 1,
      title: "x",
      charactersPresent: ["char_ghost"],
    }).bible;
    const w = validateBible(b);
    expect(w.some((s) => s.includes("unknown character"))).toBe(true);
  });

  it("flags duplicate glossary terms", () => {
    let b = createBible(baseContract(), createSeriesPlan({ totalBooks: 1 }));
    b = setStyleGuide(b, { pov: "first", tense: "past" });
    b = addGlossary(b, { term: "qi", definition: "a" }).bible;
    b = addGlossary(b, { term: "Qi", definition: "b" }).bible;
    const w = validateBible(b);
    expect(w.some((s) => s.toLowerCase().includes("more than once"))).toBe(true);
  });

  it("returns no warnings for a clean minimal bible", () => {
    let b = createBible(baseContract(), createSeriesPlan({ totalBooks: 1 }));
    b = setStyleGuide(b, { pov: "first", tense: "past" });
    expect(validateBible(b)).toEqual([]);
  });
});

describe("rollingSummary", () => {
  it("createBible seeds an empty rolling-summary slot with defaults", () => {
    const b = createBible(baseContract(), createSeriesPlan({ totalBooks: 1 }));
    expect(b.rollingSummary).toBeTruthy();
    expect(b.rollingSummary.lastNChapters).toBe(3);
    expect(b.rollingSummary.summary).toBe("");
    expect(typeof b.rollingSummary.updatedAt).toBe("string");
  });

  it("setRollingSummary updates summary and bumps updatedAt", async () => {
    const b0 = createBible(baseContract());
    const ts0 = b0.rollingSummary.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    const b1 = setRollingSummary(b0, "Lin survived the storm.", 5);
    expect(b1).not.toBe(b0);
    expect(b1.rollingSummary.summary).toBe("Lin survived the storm.");
    expect(b1.rollingSummary.lastNChapters).toBe(5);
    expect(b1.rollingSummary.updatedAt).not.toBe(ts0);
  });

  it("setRollingSummary preserves lastNChapters when omitted", () => {
    const b0 = setRollingSummary(createBible(baseContract()), "x", 7);
    const b1 = setRollingSummary(b0, "y");
    expect(b1.rollingSummary.lastNChapters).toBe(7);
    expect(b1.rollingSummary.summary).toBe("y");
  });

  it("serialize/parse round-trip preserves rollingSummary", () => {
    let b = createBible(baseContract(), createSeriesPlan({ totalBooks: 1 }));
    b = setRollingSummary(b, "recent recap", 4);
    const { bible, errors } = parseBible(serializeBible(b));
    expect(errors).toEqual([]);
    expect(bible.rollingSummary.summary).toBe("recent recap");
    expect(bible.rollingSummary.lastNChapters).toBe(4);
  });

  it("parseBible migrates legacy bibles without rollingSummary", () => {
    const legacy = {
      version: BIBLE_VERSION,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      contract: null,
      series: null,
      characters: [],
      locations: [],
      factions: [],
      lore: [],
      glossary: [],
      styleGuide: { pov: "", tense: "", voiceRules: [], doNot: [] },
      systemRules: [],
      chapters: [],
    };
    const { bible, errors } = parseBible(JSON.stringify(legacy));
    expect(errors).toEqual([]);
    expect(bible.rollingSummary).toBeTruthy();
    expect(bible.rollingSummary.lastNChapters).toBe(3);
    expect(bible.rollingSummary.summary).toBe("");
  });
});
