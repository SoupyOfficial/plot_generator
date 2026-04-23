import { describe, it, expect } from "vitest";
import { detectCombos, newlyTriggered } from "../combos.js";

describe("detectCombos", () => {
  it("catches Exploiter + apocalypse", () => {
    const out = detectCombos({
      archetype: "The Exploiter — games the system as a tool",
      subgenre: "System apocalypse",
    });
    expect(out.some((c) => c.id === "exploiter-apocalypse")).toBe(true);
  });

  it("no false positives on empty", () => {
    expect(detectCombos({})).toEqual([]);
  });
});

describe("newlyTriggered", () => {
  it("returns only combos that are new", () => {
    const prev = { archetype: "The Exploiter — games the system as a tool" };
    const next = {
      archetype: "The Exploiter — games the system as a tool",
      subgenre: "System apocalypse",
    };
    const fresh = newlyTriggered(prev, next);
    expect(fresh.map((c) => c.id)).toContain("exploiter-apocalypse");
  });
});
