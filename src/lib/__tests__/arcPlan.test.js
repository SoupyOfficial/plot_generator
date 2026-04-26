// src/lib/__tests__/arcPlan.test.js
import { describe, it, expect } from "vitest";
import {
  ARC_ENGINES,
  createArcPlan,
  updateArc,
  validateArcPlan,
  projectArcsToChapters,
} from "../arcPlan.js";
import { createBookOutline } from "../bookOutline.js";
import { createBookPlan } from "../seriesPlan.js";

function freshOutline() {
  return createBookOutline({
    book: createBookPlan(1),
    openingTier: "Mortal",
    endTier: "Spirit",
  });
}

describe("createArcPlan", () => {
  it("partitions a save-the-cat outline into 4 arcs by default", () => {
    const plan = createArcPlan({ outline: freshOutline(), totalChapters: 24 });
    expect(plan.arcs).toHaveLength(4);
    expect(plan.totalChapters).toBe(24);
    for (const a of plan.arcs) {
      expect(a.beatIds.length).toBeGreaterThan(0);
      expect(a.chapterCount).toBeGreaterThanOrEqual(1);
    }
  });

  it("respects targetArcCount", () => {
    const plan = createArcPlan({
      outline: freshOutline(),
      totalChapters: 30,
      targetArcCount: 3,
    });
    expect(plan.arcs).toHaveLength(3);
    expect(plan.totalChapters).toBe(30);
  });

  it("clamps arc count between 2 and 6", () => {
    const lo = createArcPlan({ outline: freshOutline(), targetArcCount: 1 });
    const hi = createArcPlan({ outline: freshOutline(), targetArcCount: 99 });
    expect(lo.arcs.length).toBeGreaterThanOrEqual(2);
    expect(hi.arcs.length).toBeLessThanOrEqual(6);
  });

  it("applies engine overrides per arc", () => {
    const plan = createArcPlan({
      outline: freshOutline(),
      totalChapters: 20,
      targetArcCount: 4,
      engines: ["training", "tournament", "political", "siege"],
    });
    expect(plan.arcs.map((a) => a.engine)).toEqual([
      "training",
      "tournament",
      "political",
      "siege",
    ]);
    expect(plan.arcs[1].escalationStops).toEqual(
      expect.arrayContaining(["semis", "final"])
    );
  });

  it("ignores unknown engine overrides and uses 'free'", () => {
    const plan = createArcPlan({
      outline: freshOutline(),
      totalChapters: 12,
      targetArcCount: 3,
      engines: ["training", "bogus", "siege"],
    });
    expect(plan.arcs[1].engine).toBe("free");
  });

  it("does not duplicate or drop beats across arcs", () => {
    const o = freshOutline();
    const plan = createArcPlan({ outline: o, totalChapters: 24 });
    const allBeatIds = plan.arcs.flatMap((a) => a.beatIds);
    expect(allBeatIds).toHaveLength(o.beats.length);
    expect(new Set(allBeatIds).size).toBe(o.beats.length);
  });

  it("throws on missing outline", () => {
    expect(() => createArcPlan({})).toThrow(/outline/);
  });
});

describe("updateArc", () => {
  it("patches one arc and recomputes totalChapters", () => {
    const plan = createArcPlan({ outline: freshOutline(), totalChapters: 20 });
    const id = plan.arcs[1].id;
    const next = updateArc(plan, id, { chapterCount: 99, premise: "x" });
    expect(next.arcs[1].chapterCount).toBe(99);
    expect(next.arcs[1].premise).toBe("x");
    expect(next.totalChapters).toBe(20 - plan.arcs[1].chapterCount + 99);
  });

  it("does not allow id or index to change", () => {
    const plan = createArcPlan({ outline: freshOutline(), totalChapters: 12 });
    const id = plan.arcs[0].id;
    const next = updateArc(plan, id, { id: "X", index: 99 });
    expect(next.arcs[0].id).toBe(id);
    expect(next.arcs[0].index).toBe(1);
  });
});

describe("validateArcPlan", () => {
  it("returns no warnings for a fresh plan", () => {
    const plan = createArcPlan({ outline: freshOutline(), totalChapters: 16 });
    expect(validateArcPlan(plan)).toEqual([]);
  });

  it("flags unknown engines", () => {
    const plan = createArcPlan({ outline: freshOutline(), totalChapters: 12 });
    plan.arcs[0].engine = "wat";
    const w = validateArcPlan(plan);
    expect(w.some((s) => s.includes("unknown engine"))).toBe(true);
  });

  it("flags empty plans", () => {
    expect(validateArcPlan(null)).toEqual(["plan-empty"]);
  });
});

describe("projectArcsToChapters", () => {
  it("emits one row per chapter, sequential numbering", () => {
    const o = freshOutline();
    const plan = createArcPlan({ outline: o, totalChapters: 18 });
    const rows = projectArcsToChapters(plan, o);
    expect(rows).toHaveLength(18);
    expect(rows[0].chapter).toBe(1);
    expect(rows[rows.length - 1].chapter).toBe(18);
  });

  it("attaches arc + engine to each chapter row", () => {
    const o = freshOutline();
    const plan = createArcPlan({
      outline: o,
      totalChapters: 12,
      targetArcCount: 3,
      engines: ["training", "tournament", "siege"],
    });
    const rows = projectArcsToChapters(plan, o);
    expect(new Set(rows.map((r) => r.engine))).toEqual(
      new Set(["training", "tournament", "siege"])
    );
  });
});

describe("ARC_ENGINES", () => {
  it("includes the canonical engines", () => {
    for (const e of ["tournament", "dungeon", "heist", "mystery", "training"]) {
      expect(ARC_ENGINES).toContain(e);
    }
  });
});
