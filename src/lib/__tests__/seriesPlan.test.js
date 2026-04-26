// src/lib/__tests__/seriesPlan.test.js
import { describe, it, expect } from "vitest";
import {
  createSeriesPlan,
  addBook,
  updateBook,
  addForeshadow,
  payOffForeshadow,
  breakForeshadow,
  validateSeriesPlan,
  activePromises,
  promisesActiveAt,
} from "../seriesPlan.js";

describe("createSeriesPlan", () => {
  it("preallocates books for a numeric total", () => {
    const p = createSeriesPlan({ totalBooks: 3 });
    expect(p.books).toHaveLength(3);
    expect(p.books[0].index).toBe(1);
    expect(p.books[2].index).toBe(3);
    expect(p.foreshadowLedger).toEqual([]);
    expect(p.totalBooks).toBe(3);
  });

  it("starts with one book for open series", () => {
    const p = createSeriesPlan({ totalBooks: "open" });
    expect(p.books).toHaveLength(1);
    expect(p.totalBooks).toBe("open");
  });
});

describe("addBook / updateBook", () => {
  it("appends to an open series", () => {
    let p = createSeriesPlan({ totalBooks: "open" });
    p = addBook(p, { workingTitle: "Book Two" });
    expect(p.books).toHaveLength(2);
    expect(p.books[1].workingTitle).toBe("Book Two");
    expect(p.books[1].index).toBe(2);
    expect(p.totalBooks).toBe("open");
  });

  it("updateBook is immutable and matches by index", () => {
    let p = createSeriesPlan({ totalBooks: 2 });
    const orig = p.books[0];
    p = updateBook(p, 1, { endTier: "A" });
    expect(p.books[0].endTier).toBe("A");
    expect(orig.endTier).toBe("");
  });
});

describe("foreshadow ledger", () => {
  it("addForeshadow generates id and updates planted book", () => {
    let p = createSeriesPlan({ totalBooks: 3 });
    const r = addForeshadow(p, {
      plantedIn: { book: 1, beat: 3 },
      paysOffIn: { book: 3, beat: 12 },
      description: "the locket",
    });
    p = r.plan;
    expect(r.id).toMatch(/^fs_/);
    expect(p.foreshadowLedger).toHaveLength(1);
    expect(p.foreshadowLedger[0].status).toBe("planted");
    expect(p.books[0].promiseToPayOff).toContain(r.id);
    // book 3 untouched until pay-off
    expect(p.books[2].promisesPaidOff).toEqual([]);
  });

  it("payOffForeshadow updates ledger + book", () => {
    let p = createSeriesPlan({ totalBooks: 3 });
    const r = addForeshadow(p, {
      plantedIn: { book: 1, beat: 3 },
      paysOffIn: { book: 3, beat: 12 },
      description: "the locket",
    });
    p = payOffForeshadow(r.plan, r.id);
    expect(p.foreshadowLedger[0].status).toBe("paid-off");
    expect(p.books[2].promisesPaidOff).toContain(r.id);
  });

  it("payOffForeshadow accepts override location", () => {
    let p = createSeriesPlan({ totalBooks: 3 });
    const r = addForeshadow(p, {
      plantedIn: { book: 1, beat: 3 },
      paysOffIn: { book: 3, beat: 12 },
      description: "x",
    });
    p = payOffForeshadow(r.plan, r.id, { book: 2, beat: 8 });
    expect(p.foreshadowLedger[0].paysOffIn).toEqual({ book: 2, beat: 8 });
    expect(p.books[1].promisesPaidOff).toContain(r.id);
  });

  it("breakForeshadow records the reason", () => {
    let p = createSeriesPlan({ totalBooks: 2 });
    const r = addForeshadow(p, {
      plantedIn: { book: 1, beat: 1 },
      paysOffIn: { book: 2, beat: 10 },
      description: "x",
    });
    p = breakForeshadow(r.plan, r.id, "scrapped subplot");
    expect(p.foreshadowLedger[0].status).toBe("broken");
    expect(p.foreshadowLedger[0].brokenReason).toBe("scrapped subplot");
  });
});

describe("activePromises / promisesActiveAt", () => {
  it("activePromises filters out paid/broken", () => {
    let p = createSeriesPlan({ totalBooks: 3 });
    const a = addForeshadow(p, { plantedIn: { book: 1, beat: 1 }, paysOffIn: { book: 2, beat: 5 }, description: "open" });
    p = a.plan;
    const b = addForeshadow(p, { plantedIn: { book: 1, beat: 2 }, paysOffIn: { book: 3, beat: 5 }, description: "paid" });
    p = payOffForeshadow(b.plan, b.id);
    expect(activePromises(p)).toHaveLength(1);
    expect(activePromises(p)[0].description).toBe("open");
  });

  it("promisesActiveAt respects book threshold", () => {
    let p = createSeriesPlan({ totalBooks: 3 });
    const a = addForeshadow(p, { plantedIn: { book: 2, beat: 1 }, paysOffIn: { book: 3, beat: 5 }, description: "later" });
    p = a.plan;
    expect(promisesActiveAt(p, 1)).toHaveLength(0);
    expect(promisesActiveAt(p, 2)).toHaveLength(1);
  });
});

describe("validateSeriesPlan", () => {
  it("flags pay-off-before-plant", () => {
    let p = createSeriesPlan({ totalBooks: 3 });
    const r = addForeshadow(p, {
      plantedIn: { book: 2, beat: 5 },
      paysOffIn: { book: 1, beat: 5 },
      description: "bad order",
    });
    const w = validateSeriesPlan(r.plan);
    expect(w.some((s) => s.includes("pays off") && s.includes("before"))).toBe(true);
  });

  it("flags pay-off beyond series total", () => {
    let p = createSeriesPlan({ totalBooks: 2 });
    const r = addForeshadow(p, {
      plantedIn: { book: 1, beat: 1 },
      paysOffIn: { book: 5, beat: 5 },
      description: "too far",
    });
    const w = validateSeriesPlan(r.plan);
    expect(w.some((s) => s.includes("beyond the series total"))).toBe(true);
  });

  it("flags out-of-order beat anchors", () => {
    let p = createSeriesPlan({ totalBooks: 1 });
    p = updateBook(p, 1, {
      beatAnchors: [
        { metaBeat: 5, bookBeat: 1 },
        { metaBeat: 2, bookBeat: 2 },
      ],
    });
    const w = validateSeriesPlan(p);
    expect(w.some((s) => s.includes("out of order"))).toBe(true);
  });

  it("flags missing end-tier on final book", () => {
    const p = createSeriesPlan({ totalBooks: 2 });
    const w = validateSeriesPlan(p);
    expect(w.some((s) => s.includes("end-tier"))).toBe(true);
  });

  it("clean plan returns no warnings", () => {
    let p = createSeriesPlan({ totalBooks: 2 });
    p = updateBook(p, 1, { endTier: "Bronze", beatAnchors: [{ metaBeat: 1, bookBeat: 1 }] });
    p = updateBook(p, 2, { endTier: "Silver", beatAnchors: [{ metaBeat: 8, bookBeat: 1 }] });
    expect(validateSeriesPlan(p)).toEqual([]);
  });
});
