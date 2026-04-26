// src/lib/__tests__/bookOutline.test.js
import { describe, it, expect } from "vitest";
import {
  BOOK_TEMPLATES,
  createBookOutline,
  updateBookBeat,
  pinForeshadow,
  validateBookOutline,
  beatChapterIndex,
  projectOutlineToChapters,
} from "../bookOutline.js";
import { createBookPlan } from "../seriesPlan.js";

describe("createBookOutline", () => {
  it("builds a save-the-cat outline by default", () => {
    const o = createBookOutline({ book: createBookPlan(1) });
    expect(o.template).toBe("save-the-cat");
    expect(o.bookIndex).toBe(1);
    expect(o.beats.length).toBeGreaterThan(10);
    expect(o.beats[0].id).toBe("opening_image");
    expect(o.beats[o.beats.length - 1].id).toBe("final_image");
  });

  it("supports four-act and hero-journey templates", () => {
    for (const t of BOOK_TEMPLATES) {
      const o = createBookOutline({ book: createBookPlan(1), template: t });
      expect(o.beats.length).toBeGreaterThan(3);
    }
  });

  it("throws on unknown template", () => {
    expect(() =>
      createBookOutline({ book: createBookPlan(1), template: "nope" })
    ).toThrow(/template/);
  });

  it("throws on missing book", () => {
    expect(() => createBookOutline({})).toThrow(/book/);
  });

  it("seeds empty foreshadow arrays per beat", () => {
    const o = createBookOutline({ book: createBookPlan(1) });
    for (const b of o.beats) {
      expect(b.foreshadowToPlant).toEqual([]);
      expect(b.foreshadowToPay).toEqual([]);
    }
  });
});

describe("updateBookBeat", () => {
  it("patches one beat without touching others", () => {
    let o = createBookOutline({ book: createBookPlan(1) });
    o = updateBookBeat(o, "midpoint", { summary: "the betrayal lands" });
    const mid = o.beats.find((b) => b.id === "midpoint");
    expect(mid.summary).toBe("the betrayal lands");
    expect(o.beats.find((b) => b.id === "opening_image").summary).toBe("");
  });

  it("does not allow id or position to be overridden", () => {
    let o = createBookOutline({ book: createBookPlan(1) });
    o = updateBookBeat(o, "midpoint", { id: "evil", position: 99 });
    const mid = o.beats.find((b) => b.id === "midpoint");
    expect(mid).toBeTruthy();
    expect(mid.position).toBe(0.5);
  });
});

describe("pinForeshadow", () => {
  it("adds plant ids to the right beat, deduped", () => {
    let o = createBookOutline({ book: createBookPlan(1) });
    o = pinForeshadow(o, "setup", "fs_1", "plant");
    o = pinForeshadow(o, "setup", "fs_1", "plant");
    const setup = o.beats.find((b) => b.id === "setup");
    expect(setup.foreshadowToPlant).toEqual(["fs_1"]);
  });

  it("adds pay ids to the right beat", () => {
    let o = createBookOutline({ book: createBookPlan(1) });
    o = pinForeshadow(o, "finale", "fs_1", "pay");
    const finale = o.beats.find((b) => b.id === "finale");
    expect(finale.foreshadowToPay).toEqual(["fs_1"]);
  });

  it("rejects unknown kind", () => {
    const o = createBookOutline({ book: createBookPlan(1) });
    expect(() => pinForeshadow(o, "setup", "fs_1", "bogus")).toThrow(/kind/);
  });
});

describe("validateBookOutline", () => {
  it("returns no warnings for a fresh outline", () => {
    const o = createBookOutline({ book: createBookPlan(1) });
    expect(validateBookOutline(o)).toEqual([]);
  });

  it("flags out-of-order positions", () => {
    let o = createBookOutline({ book: createBookPlan(1) });
    o = {
      ...o,
      beats: o.beats.map((b, i) =>
        i === 5 ? { ...b, position: 0.0 } : b
      ),
    };
    const w = validateBookOutline(o);
    expect(w.some((s) => s.includes("out of order"))).toBe(true);
  });

  it("flags empty outlines", () => {
    expect(validateBookOutline(null)).toEqual(["outline-empty"]);
  });
});

describe("beatChapterIndex / projectOutlineToChapters", () => {
  it("maps positions to 1..N chapter range", () => {
    expect(beatChapterIndex(0, 20)).toBe(1);
    expect(beatChapterIndex(1, 20)).toBe(20);
    expect(beatChapterIndex(0.5, 21)).toBe(11);
  });

  it("returns null for invalid input", () => {
    expect(beatChapterIndex(0.5, 0)).toBeNull();
    expect(beatChapterIndex(NaN, 10)).toBeNull();
  });

  it("projects all beats to chapters with chapter field", () => {
    const o = createBookOutline({ book: createBookPlan(1) });
    const proj = projectOutlineToChapters(o, 24);
    expect(proj[0].chapter).toBe(1);
    expect(proj[proj.length - 1].chapter).toBe(24);
    expect(proj.every((b) => typeof b.chapter === "number")).toBe(true);
  });
});
