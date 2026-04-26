// src/lib/__tests__/sceneGrid.test.js
import { describe, it, expect } from "vitest";
import {
  createSceneGrid,
  updateScene,
  scenesByChapter,
  chapterWordTargets,
  validateSceneGrid,
} from "../sceneGrid.js";
import { createBeatSheet } from "../beatSheet.js";
import { createArcPlan } from "../arcPlan.js";
import { createBookOutline } from "../bookOutline.js";
import { createBookPlan } from "../seriesPlan.js";

function freshSheet({ totalChapters = 12, beatsPerChapter = 1 } = {}) {
  const outline = createBookOutline({ book: createBookPlan(1) });
  const arcPlan = createArcPlan({ outline, totalChapters });
  return createBeatSheet({ arcPlan, outline, beatsPerChapter });
}

describe("createSceneGrid", () => {
  it("emits one scene per beat", () => {
    const sheet = freshSheet({ totalChapters: 8, beatsPerChapter: 2 });
    const grid = createSceneGrid({ beatSheet: sheet });
    expect(grid.scenes).toHaveLength(sheet.beats.length);
    expect(grid.bookIndex).toBe(1);
  });

  it("seeds non-empty default grids for known purposes", () => {
    const sheet = freshSheet({ totalChapters: 12 });
    const grid = createSceneGrid({ beatSheet: sheet });
    const climax = grid.scenes.find((s) => s.purpose === "climax");
    expect(climax.grid.goal).toBeTruthy();
    expect(climax.grid.conflict).toBeTruthy();
    expect(climax.grid.outcome).toBeTruthy();
  });

  it("propagates pov/foreshadow/characters from beat", () => {
    const sheet = freshSheet({ totalChapters: 6 });
    sheet.beats[0].pov = "Lin";
    sheet.beats[0].charactersPresent = ["char_lin"];
    sheet.beats[0].foreshadowToPlant = ["fs_locket"];
    const grid = createSceneGrid({ beatSheet: sheet });
    const first = grid.scenes[0];
    expect(first.pov).toBe("Lin");
    expect(first.charactersPresent).toEqual(["char_lin"]);
    expect(first.foreshadowToPlant).toEqual(["fs_locket"]);
  });

  it("uses defaultPov when beat has none", () => {
    const sheet = freshSheet({ totalChapters: 4 });
    const grid = createSceneGrid({ beatSheet: sheet, defaultPov: "Lin" });
    expect(grid.scenes.every((s) => s.pov === "Lin")).toBe(true);
  });

  it("respects wordsPerScene with a sane minimum", () => {
    const sheet = freshSheet({ totalChapters: 4 });
    const grid = createSceneGrid({ beatSheet: sheet, wordsPerScene: 20 });
    expect(grid.scenes.every((s) => s.estimatedWords >= 100)).toBe(true);
  });

  it("throws on missing beatSheet", () => {
    expect(() => createSceneGrid({})).toThrow(/beatSheet/);
  });
});

describe("updateScene", () => {
  it("merges grid fields without losing untouched keys", () => {
    const sheet = freshSheet({ totalChapters: 4 });
    let grid = createSceneGrid({ beatSheet: sheet });
    const id = grid.scenes[0].id;
    grid = updateScene(grid, id, { grid: { goal: "find the master" } });
    const s = grid.scenes[0];
    expect(s.grid.goal).toBe("find the master");
    expect(s.grid.conflict).toBeTruthy();
    expect(s.grid.outcome).toBeTruthy();
  });

  it("does not allow id or beatId to change", () => {
    const sheet = freshSheet({ totalChapters: 4 });
    let grid = createSceneGrid({ beatSheet: sheet });
    const { id, beatId } = grid.scenes[0];
    grid = updateScene(grid, id, { id: "X", beatId: "Y" });
    expect(grid.scenes[0].id).toBe(id);
    expect(grid.scenes[0].beatId).toBe(beatId);
  });
});

describe("scenesByChapter / chapterWordTargets", () => {
  it("groups by chapter and sums words per chapter", () => {
    const sheet = freshSheet({ totalChapters: 6, beatsPerChapter: 3 });
    const grid = createSceneGrid({ beatSheet: sheet, wordsPerScene: 1000 });
    const m = scenesByChapter(grid);
    expect(m.size).toBe(6);
    const targets = chapterWordTargets(grid);
    expect(targets[1]).toBe(3000);
    expect(targets[6]).toBe(3000);
  });
});

describe("validateSceneGrid", () => {
  it("returns no warnings for a fresh grid", () => {
    const sheet = freshSheet({ totalChapters: 8 });
    const grid = createSceneGrid({ beatSheet: sheet });
    expect(validateSceneGrid(grid)).toEqual([]);
  });

  it("flags empty input", () => {
    expect(validateSceneGrid(null)).toEqual(["grid-empty"]);
  });
});
