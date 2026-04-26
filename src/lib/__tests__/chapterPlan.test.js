// src/lib/__tests__/chapterPlan.test.js
import { describe, it, expect } from "vitest";
import {
  DEFAULT_CHAPTER_TARGET_WORDS,
  buildChapterScaffoldPrompt,
  parseChapterScaffold,
  buildChapterProsePrompt,
  buildBeatExpansionPrompt,
} from "../chapterPlan.js";
import { createBible, addCharacter, addSystemRule, setStyleGuide, setRollingSummary } from "../bible.js";
import { createContract } from "../contract.js";
import { createSeriesPlan, addForeshadow } from "../seriesPlan.js";

function richBible() {
  let b = createBible(
    createContract({
      selections: { subgenre: "Cultivation", themes: ["Power"] },
      themeArgument: "the question",
    }),
    createSeriesPlan({ totalBooks: 3 })
  );
  b = setStyleGuide(b, {
    pov: "first",
    tense: "past",
    voiceRules: ["snarky internal monologue"],
    doNot: ["no info dumps"],
  });
  b = addSystemRule(b, { name: "Mortality", rule: "Death is permanent" }).bible;
  const linR = addCharacter(b, {
    name: "Lin",
    role: "protagonist",
    archetype: "The Returner",
    arcSummary: "regret to redemption",
    voiceNotes: ["clipped speech"],
  });
  b = linR.bible;
  // open foreshadow planted in book 1, paid in book 3
  const fs = addForeshadow(b.series, {
    plantedIn: { book: 1, beat: 3 },
    paysOffIn: { book: 3, beat: 12 },
    description: "the locket",
  });
  b = { ...b, series: fs.plan };
  return { bible: b, linId: linR.id, foreshadowId: fs.id };
}

describe("buildChapterScaffoldPrompt", () => {
  it("includes contract, style guide, system rules, characters, promises, and target", () => {
    const { bible } = richBible();
    const { system, user } = buildChapterScaffoldPrompt({
      bible,
      beatRange: { book: 1, beatStart: 3, beatEnd: 5 },
      chapterNumber: 1,
      previousChapter: null,
      targetWords: 3500,
    });
    expect(system).toContain("chapter-planner");
    expect(system).toContain("strict JSON");
    expect(user).toContain("CONTRACT");
    expect(user).toContain("Cultivation");
    expect(user).toContain("STYLE GUIDE");
    expect(user).toContain("first");
    expect(user).toContain("past");
    expect(user).toContain("snarky");
    expect(user).toContain("SYSTEM RULES");
    expect(user).toContain("Mortality");
    expect(user).toContain("CHARACTERS");
    expect(user).toContain("Lin");
    expect(user).toContain("OPEN FORESHADOW PROMISES");
    expect(user).toContain("the locket");
    expect(user).toContain("Beat range: 3–5");
    expect(user).toContain("3500");
    expect(user).toContain("(none — this is the opener)");
  });

  it("uses default target word count when not specified", () => {
    const { bible } = richBible();
    const { user } = buildChapterScaffoldPrompt({
      bible,
      beatRange: { book: 1, beatStart: 1, beatEnd: 5 },
    });
    expect(user).toContain(String(DEFAULT_CHAPTER_TARGET_WORDS));
  });

  it("includes previous chapter context when provided", () => {
    const { bible } = richBible();
    const { user } = buildChapterScaffoldPrompt({
      bible,
      beatRange: { book: 1, beatStart: 3, beatEnd: 5 },
      previousChapter: {
        num: 1,
        title: "Awakening",
        summary: "Lin survived the duel.",
        lastParagraph: "He stared at the dawn.",
      },
    });
    expect(user).toContain("Awakening");
    expect(user).toContain("Lin survived");
    expect(user).toContain("dawn");
  });

  it("throws without bible", () => {
    expect(() => buildChapterScaffoldPrompt({})).toThrow(/bible/);
  });
});

describe("parseChapterScaffold", () => {
  const valid = {
    title: "Awakening",
    povCharacterId: "char_lin",
    setting: "mountain",
    sceneGrid: { goal: "g", conflict: "c", outcome: "o" },
    outline: ["a", "b", "c", "d", "e"],
    charactersPresent: ["char_lin"],
    foreshadowToPlant: [],
    foreshadowToPay: [],
    wordCountTarget: 3000,
  };

  it("parses raw JSON", () => {
    const { scaffold, errors } = parseChapterScaffold(JSON.stringify(valid));
    expect(errors).toEqual([]);
    expect(scaffold.title).toBe("Awakening");
  });

  it("strips ```json fences", () => {
    const { scaffold, errors } = parseChapterScaffold(
      "```json\n" + JSON.stringify(valid) + "\n```"
    );
    expect(errors).toEqual([]);
    expect(scaffold.title).toBe("Awakening");
  });

  it("collects shape errors", () => {
    const { scaffold, errors } = parseChapterScaffold('{"title":"x"}');
    expect(scaffold).toBeTruthy();
    expect(errors).toContain("missing-sceneGrid");
    expect(errors).toContain("missing-outline");
  });

  it("handles unparseable input", () => {
    const { scaffold, errors } = parseChapterScaffold("garbage");
    expect(scaffold).toBeNull();
    expect(errors).toEqual(["unparseable"]);
  });

  it("recovers JSON inside surrounding text", () => {
    const { scaffold, errors } = parseChapterScaffold(
      "Here is the scaffold: " + JSON.stringify(valid) + " thanks!"
    );
    expect(errors).toEqual([]);
    expect(scaffold.title).toBe("Awakening");
  });
});

describe("buildChapterProsePrompt", () => {
  it("includes scaffold, style guide, character voice notes, and target", () => {
    const { bible, linId, foreshadowId } = richBible();
    const scaffold = {
      title: "Awakening",
      povCharacterId: linId,
      setting: "mountain",
      sceneGrid: {
        goal: "find master",
        conflict: "snowstorm",
        outcome: "shelter found",
      },
      outline: ["arrive", "search", "fail", "shelter", "vow"],
      charactersPresent: [linId],
      foreshadowToPlant: [
        { description: "strange runes", paysOffIn: { book: 2, beat: 7 } },
      ],
      foreshadowToPay: [foreshadowId],
      wordCountTarget: 3200,
      chapterNumber: 1,
    };
    const { system, user } = buildChapterProsePrompt({
      bible,
      scaffold,
      previousLastParagraph: "He stared at the dawn.",
    });
    expect(system).toContain("LitRPG");
    expect(system).toContain("PROSE ONLY");
    expect(system).toContain("Awakening");
    expect(user).toContain("STYLE GUIDE");
    expect(user).toContain("first");
    expect(user).toContain("Mortality");
    expect(user).toContain("Lin");
    expect(user).toContain("clipped speech");
    expect(user).toContain("find master");
    expect(user).toContain("snowstorm");
    expect(user).toContain("strange runes");
    expect(user).toContain(foreshadowId);
    expect(user).toContain("3200");
    expect(user).toContain("dawn");
  });

  it("falls back to default target if scaffold doesn't specify", () => {
    const { bible, linId } = richBible();
    const { user } = buildChapterProsePrompt({
      bible,
      scaffold: {
        title: "x",
        povCharacterId: linId,
        sceneGrid: { goal: "", conflict: "", outcome: "" },
        outline: [],
        charactersPresent: [linId],
      },
    });
    expect(user).toContain(String(DEFAULT_CHAPTER_TARGET_WORDS));
  });

  it("throws without bible or scaffold", () => {
    expect(() => buildChapterProsePrompt({ scaffold: {} })).toThrow(/bible/);
    expect(() => buildChapterProsePrompt({ bible: {} })).toThrow(/scaffold/);
  });
});

describe("buildBeatExpansionPrompt", () => {
  it("targets a beat range and returns JSON-strict instructions", () => {
    const { bible } = richBible();
    const { system, user } = buildBeatExpansionPrompt({
      bible,
      beatRange: { book: 1, beatStart: 6, beatEnd: 10 },
    });
    expect(system).toContain("beat-doctor");
    expect(system).toContain("strict JSON");
    expect(user).toContain("Beat range to redo: 6–10");
    expect(user).toContain("Cultivation");
    expect(user).toContain("the locket");
  });

  it("throws without bible", () => {
    expect(() =>
      buildBeatExpansionPrompt({ beatRange: { book: 1, beatStart: 1, beatEnd: 1 } })
    ).toThrow(/bible/);
  });
});

describe("rolling-summary injection", () => {
  it("scaffold prompt omits RECENT-CONTEXT when summary is empty", () => {
    const { bible } = richBible();
    const { user } = buildChapterScaffoldPrompt({
      bible,
      beatRange: { book: 1, beatStart: 1, beatEnd: 2 },
    });
    expect(user).not.toContain("RECENT-CONTEXT");
  });

  it("scaffold prompt includes RECENT-CONTEXT when summary is set", () => {
    const { bible } = richBible();
    const b = setRollingSummary(bible, "Lin survived the storm and met the master.", 4);
    const { user } = buildChapterScaffoldPrompt({
      bible: b,
      beatRange: { book: 1, beatStart: 1, beatEnd: 2 },
    });
    expect(user).toContain("RECENT-CONTEXT");
    expect(user).toContain("last 4 chapters");
    expect(user).toContain("Lin survived the storm");
  });

  it("prose prompt omits RECENT-CONTEXT when summary is empty", () => {
    const { bible, linId } = richBible();
    const { user } = buildChapterProsePrompt({
      bible,
      scaffold: {
        title: "x",
        povCharacterId: linId,
        sceneGrid: { goal: "", conflict: "", outcome: "" },
        outline: [],
        charactersPresent: [linId],
      },
    });
    expect(user).not.toContain("RECENT-CONTEXT");
  });

  it("prose prompt includes RECENT-CONTEXT when summary is set", () => {
    const { bible, linId } = richBible();
    const b = setRollingSummary(bible, "Lin trained for two months.", 2);
    const { user } = buildChapterProsePrompt({
      bible: b,
      scaffold: {
        title: "x",
        povCharacterId: linId,
        sceneGrid: { goal: "", conflict: "", outcome: "" },
        outline: [],
        charactersPresent: [linId],
      },
    });
    expect(user).toContain("RECENT-CONTEXT");
    expect(user).toContain("last 2 chapters");
    expect(user).toContain("Lin trained for two months");
  });
});
