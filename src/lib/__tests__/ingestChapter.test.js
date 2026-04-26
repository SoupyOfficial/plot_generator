// src/lib/__tests__/ingestChapter.test.js
import { describe, it, expect } from "vitest";
import { ingestChapter } from "../ingestChapter.js";
import { createBible, addCharacter } from "../bible.js";
import { createSeriesPlan, addForeshadow } from "../seriesPlan.js";

function freshBible() {
  const series = createSeriesPlan({ totalBooks: 1 });
  const bible = createBible(null, series);
  return bible;
}

describe("ingestChapter", () => {
  it("appends a chapter record with computed wordCount", () => {
    const bible = freshBible();
    const { bible: next, chapterId } = ingestChapter({
      bible,
      scaffold: {
        chapter: 1,
        title: "Cold Start",
        summary: "Lin enters the courtyard.",
        charactersPresent: [],
        foreshadowToPlant: [],
        foreshadowToPay: [],
      },
      prose: "Lin walked into the courtyard. The bells were silent.",
    });
    expect(next.chapters).toHaveLength(1);
    expect(next.chapters[0].id).toBe(chapterId);
    expect(next.chapters[0].wordCount).toBeGreaterThan(5);
    expect(next.chapters[0].title).toBe("Cold Start");
  });

  it("throws when bible or scaffold missing", () => {
    expect(() => ingestChapter({})).toThrow(/bible/);
    expect(() => ingestChapter({ bible: freshBible() })).toThrow(/scaffold/);
  });

  it("links present characters to the beat", () => {
    let bible = freshBible();
    ({ bible } = addCharacter(bible, { name: "Lin" }));
    const charId = bible.characters[0].id;
    const { bible: next } = ingestChapter({
      bible,
      scaffold: {
        chapter: 1,
        bookIndex: 1,
        beatIndex: 1,
        charactersPresent: [charId],
      },
      prose: "Lin moves through the trees.",
    });
    const ch = next.characters.find((c) => c.id === charId);
    expect(ch.beatsPresent).toEqual([{ book: 1, beat: 1 }]);
  });

  it("pays off existing foreshadow", () => {
    let bible = freshBible();
    let series = bible.series;
    const r = addForeshadow(series, { id: "fs_locket", description: "the locket", plantedIn: { book: 1, beat: 1 } });
    series = r.plan;
    bible = { ...bible, series };
    const { bible: next } = ingestChapter({
      bible,
      scaffold: {
        chapter: 5,
        bookIndex: 1,
        beatIndex: 5,
        foreshadowToPay: ["fs_locket"],
        foreshadowToPlant: [],
        charactersPresent: [],
      },
      prose: "She held the locket up to the light.",
    });
    const fs = next.series.foreshadowLedger.find((f) => f.id === "fs_locket");
    expect(fs.status).toBe("paid-off");
  });

  it("adds new foreshadow if planted ids don't exist yet", () => {
    const bible = freshBible();
    const { bible: next } = ingestChapter({
      bible,
      scaffold: {
        chapter: 2,
        bookIndex: 1,
        beatIndex: 2,
        foreshadowToPlant: ["fs_new"],
        foreshadowToPay: [],
        charactersPresent: [],
      },
      prose: "A whisper drifted past her ear.",
    });
    expect(next.series.foreshadowLedger.some((f) => f.id === "fs_new")).toBe(true);
  });

  it("updates the rolling summary deterministically", () => {
    let bible = freshBible();
    ({ bible } = ingestChapter({
      bible,
      scaffold: { chapter: 1, title: "One", summary: "first" },
      prose: "p",
    }));
    ({ bible } = ingestChapter({
      bible,
      scaffold: { chapter: 2, title: "Two", summary: "second" },
      prose: "p",
    }));
    expect(bible.rollingSummary.summary).toMatch(/Ch 1/);
    expect(bible.rollingSummary.summary).toMatch(/Ch 2/);
    expect(bible.rollingSummary.summary).toMatch(/first/);
    expect(bible.rollingSummary.summary).toMatch(/second/);
  });

  it("respects custom summarize function", () => {
    const bible = freshBible();
    const { bible: next } = ingestChapter({
      bible,
      scaffold: { chapter: 1, title: "One", summary: "first" },
      prose: "p",
      summarize: (recs) => `count:${recs.length}`,
    });
    expect(next.rollingSummary.summary).toBe("count:1");
  });

  it("stores fingerprint and audit score on record when provided", () => {
    const bible = freshBible();
    const { bible: next } = ingestChapter({
      bible,
      scaffold: { chapter: 1 },
      prose: "p",
      fingerprint: { povHint: "first" },
      audit: { score: 0.8 },
    });
    expect(next.chapters[0].voiceFingerprint).toEqual({ povHint: "first" });
    expect(next.chapters[0].auditScore).toBe(0.8);
  });
});
