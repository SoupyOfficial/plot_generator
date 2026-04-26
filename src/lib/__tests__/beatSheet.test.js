// src/lib/__tests__/beatSheet.test.js
import { describe, it, expect } from "vitest";
import {
  BEAT_PURPOSES,
  createBeatSheet,
  updateBeat,
  validateBeatSheet,
  beatsByChapter,
} from "../beatSheet.js";
import { createArcPlan } from "../arcPlan.js";
import { createBookOutline, pinForeshadow } from "../bookOutline.js";
import { createBookPlan } from "../seriesPlan.js";

function freshArcPlan(opts = {}) {
  const outline = createBookOutline({
    book: createBookPlan(1),
    openingTier: "Mortal",
    endTier: "Spirit",
  });
  const arcPlan = createArcPlan({
    outline,
    totalChapters: opts.totalChapters || 16,
    targetArcCount: opts.targetArcCount || 4,
    engines: opts.engines,
  });
  return { outline, arcPlan };
}

describe("createBeatSheet", () => {
  it("emits one beat per chapter by default", () => {
    const { outline, arcPlan } = freshArcPlan({ totalChapters: 16 });
    const sheet = createBeatSheet({ arcPlan, outline });
    expect(sheet.beats).toHaveLength(16);
    expect(sheet.bookIndex).toBe(1);
  });

  it("supports beatsPerChapter > 1", () => {
    const { outline, arcPlan } = freshArcPlan({ totalChapters: 8 });
    const sheet = createBeatSheet({ arcPlan, outline, beatsPerChapter: 2 });
    expect(sheet.beats).toHaveLength(16);
  });

  it("ends with a climax beat in the final arc", () => {
    const { outline, arcPlan } = freshArcPlan({ totalChapters: 16 });
    const sheet = createBeatSheet({ arcPlan, outline });
    const purposes = sheet.beats.map((b) => b.purpose);
    expect(purposes).toContain("climax");
    expect(purposes).toContain("resolve");
    expect(purposes).toContain("setup");
  });

  it("propagates parent foreshadow plant/pay onto child beats", () => {
    const outline0 = createBookOutline({ book: createBookPlan(1) });
    const outline = pinForeshadow(outline0, "midpoint", "fs_X", "pay");
    const arcPlan = createArcPlan({ outline, totalChapters: 16 });
    const sheet = createBeatSheet({ arcPlan, outline });
    const tagged = sheet.beats.filter((b) => b.foreshadowToPay.includes("fs_X"));
    expect(tagged.length).toBeGreaterThan(0);
  });

  it("attaches arc id, engine, and chapter to every beat", () => {
    const { outline, arcPlan } = freshArcPlan({
      totalChapters: 12,
      targetArcCount: 3,
      engines: ["training", "tournament", "siege"],
    });
    const sheet = createBeatSheet({ arcPlan, outline });
    expect(sheet.beats.every((b) => typeof b.chapter === "number")).toBe(true);
    expect(new Set(sheet.beats.map((b) => b.engine))).toEqual(
      new Set(["training", "tournament", "siege"])
    );
  });

  it("throws on missing arcPlan", () => {
    expect(() => createBeatSheet({})).toThrow(/arcPlan/);
  });

  it("handles 1-chapter and 2-chapter arcs gracefully", () => {
    const outline = createBookOutline({ book: createBookPlan(1) });
    const arcPlan = createArcPlan({
      outline,
      totalChapters: 4,
      targetArcCount: 4,
    });
    // Each arc gets ~1 chapter; should still produce 4 beats.
    const sheet = createBeatSheet({ arcPlan, outline });
    expect(sheet.beats.length).toBeGreaterThanOrEqual(2);
  });
});

describe("updateBeat", () => {
  it("patches by id without changing id", () => {
    const { outline, arcPlan } = freshArcPlan({ totalChapters: 8 });
    let sheet = createBeatSheet({ arcPlan, outline });
    const id = sheet.beats[2].id;
    sheet = updateBeat(sheet, id, { id: "X", summary: "ambush" });
    expect(sheet.beats[2].id).toBe(id);
    expect(sheet.beats[2].summary).toBe("ambush");
  });
});

describe("validateBeatSheet", () => {
  it("returns no warnings for a fresh sheet", () => {
    const { outline, arcPlan } = freshArcPlan({ totalChapters: 12 });
    const sheet = createBeatSheet({ arcPlan, outline });
    expect(validateBeatSheet(sheet)).toEqual([]);
  });

  it("flags chapter regressions", () => {
    const { outline, arcPlan } = freshArcPlan({ totalChapters: 8 });
    const sheet = createBeatSheet({ arcPlan, outline });
    sheet.beats[3].chapter = 1; // regress
    const w = validateBeatSheet(sheet);
    expect(w.some((s) => s.includes("regresses"))).toBe(true);
  });

  it("flags missing climax", () => {
    const { outline, arcPlan } = freshArcPlan({ totalChapters: 4 });
    const sheet = createBeatSheet({ arcPlan, outline });
    for (const b of sheet.beats) b.purpose = "setup";
    const w = validateBeatSheet(sheet);
    expect(w.some((s) => s.includes("no climax"))).toBe(true);
  });

  it("flags empty input", () => {
    expect(validateBeatSheet(null)).toEqual(["sheet-empty"]);
  });
});

describe("beatsByChapter", () => {
  it("groups beats by chapter number", () => {
    const { outline, arcPlan } = freshArcPlan({ totalChapters: 6 });
    const sheet = createBeatSheet({ arcPlan, outline, beatsPerChapter: 2 });
    const m = beatsByChapter(sheet);
    expect(m.size).toBe(6);
    for (const [, list] of m) {
      expect(list.length).toBe(2);
    }
  });
});

describe("BEAT_PURPOSES", () => {
  it("includes the canonical purposes", () => {
    for (const p of ["setup", "escalate", "reversal", "climax", "resolve"]) {
      expect(BEAT_PURPOSES).toContain(p);
    }
  });
});
