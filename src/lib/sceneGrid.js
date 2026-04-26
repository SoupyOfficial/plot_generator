// src/lib/sceneGrid.js
//
// Scene Grid — expand a beat sheet entry into a goal/conflict/outcome grid
// plus POV, location, characters present, and foreshadow slots. This is the
// last structural artifact before the Chapter Scaffold (which composes one
// or more scenes into a chapter).
//
// Pure functions; no LLM, no DOM.
// Pipeline arrow: SceneGrid = f(BeatSheet, opts).

let _idCounter = 0;
function nextId() {
  _idCounter += 1;
  return `sc_${Date.now().toString(36)}_${_idCounter.toString(36)}`;
}

/**
 * @typedef {Object} SceneCard
 * @property {string} id
 * @property {string} beatId
 * @property {number} chapter
 * @property {number} arcIndex
 * @property {string} engine
 * @property {string} purpose
 * @property {string} pov
 * @property {string} location
 * @property {string[]} charactersPresent
 * @property {{goal:string, conflict:string, outcome:string}} grid
 * @property {string[]} foreshadowToPlant
 * @property {string[]} foreshadowToPay
 * @property {number}   estimatedWords
 * @property {string}   [notes]
 *
 * @typedef {Object} SceneGrid
 * @property {number} bookIndex
 * @property {SceneCard[]} scenes
 */

/**
 * Build a SceneGrid from a BeatSheet. Defaults:
 * - one scene per beat
 * - empty goal/conflict/outcome (to be authored)
 * - estimatedWords = 750 per scene (=> 3000 word chapter at 4 scenes)
 *
 * @param {Object} args
 * @param {Object} args.beatSheet
 * @param {string} [args.defaultPov]
 * @param {number} [args.wordsPerScene]
 * @returns {SceneGrid}
 */
export function createSceneGrid({
  beatSheet,
  defaultPov = "",
  wordsPerScene = 750,
} = {}) {
  if (!beatSheet || !Array.isArray(beatSheet.beats)) {
    throw new Error("createSceneGrid: beatSheet with .beats required");
  }
  const scenes = beatSheet.beats.map((b) => ({
    id: nextId(),
    beatId: b.id,
    chapter: b.chapter,
    arcIndex: b.arcIndex,
    engine: b.engine,
    purpose: b.purpose,
    pov: b.pov || defaultPov || "",
    location: "",
    charactersPresent: Array.isArray(b.charactersPresent)
      ? [...b.charactersPresent]
      : [],
    grid: defaultGrid(b),
    foreshadowToPlant: Array.isArray(b.foreshadowToPlant)
      ? [...b.foreshadowToPlant]
      : [],
    foreshadowToPay: Array.isArray(b.foreshadowToPay)
      ? [...b.foreshadowToPay]
      : [],
    estimatedWords: Math.max(100, Math.floor(wordsPerScene)),
    notes: "",
  }));
  return { bookIndex: beatSheet.bookIndex, scenes };
}

function defaultGrid(beat) {
  // Light, structural placeholders — meant to be overwritten by the user
  // or by an LLM expansion pass. They make the artifact useful immediately
  // (e.g. for prompt building) without inventing fictional content.
  switch (beat.purpose) {
    case "setup":
      return { goal: "establish status quo", conflict: "tension hint", outcome: "world introduced" };
    case "inciting":
      return { goal: "react to a disruption", conflict: "first refusal", outcome: "stakes named" };
    case "escalate":
      return { goal: "press the advantage", conflict: "escalating opposition", outcome: "partial win or partial loss" };
    case "reversal":
      return { goal: "consolidate", conflict: "rule shifts", outcome: "course correction forced" };
    case "breather":
      return { goal: "recover", conflict: "interpersonal friction", outcome: "relationship deepens or fractures" };
    case "low_point":
      return { goal: "salvage what's left", conflict: "compounding losses", outcome: "lowest tier of book" };
    case "climax":
      return { goal: "decisive engagement", conflict: "all opposition converges", outcome: "irrevocable outcome" };
    case "resolve":
      return { goal: "process the cost", conflict: "lingering thread", outcome: "new equilibrium with hook" };
    case "subplot":
      return { goal: "advance B-story", conflict: "B-story tension", outcome: "B-story step forward" };
    case "act_break":
      return { goal: "commit to the new direction", conflict: "point of no return", outcome: "act ends" };
    case "debate":
      return { goal: "weigh the call", conflict: "internal resistance", outcome: "decision made (or refused)" };
    default:
      return { goal: "", conflict: "", outcome: "" };
  }
}

/**
 * Update a scene by id, immutably.
 */
export function updateScene(grid, sceneId, patch) {
  return {
    ...grid,
    scenes: (grid.scenes || []).map((s) =>
      s.id === sceneId
        ? { ...s, ...patch, id: s.id, beatId: s.beatId, grid: { ...s.grid, ...(patch.grid || {}) } }
        : s
    ),
  };
}

/**
 * Group scenes by chapter. Useful for chapter scaffold composition.
 */
export function scenesByChapter(grid) {
  const map = new Map();
  for (const s of grid?.scenes || []) {
    const list = map.get(s.chapter) || [];
    list.push(s);
    map.set(s.chapter, list);
  }
  return map;
}

/**
 * Sum estimated words per chapter.
 */
export function chapterWordTargets(grid) {
  const out = {};
  for (const [ch, scenes] of scenesByChapter(grid)) {
    out[ch] = scenes.reduce((s, sc) => s + (sc.estimatedWords || 0), 0);
  }
  return out;
}

/**
 * Validate a scene grid. Returns warnings.
 */
export function validateSceneGrid(grid) {
  const w = [];
  if (!grid || !Array.isArray(grid.scenes)) return ["grid-empty"];
  if (!grid.scenes.length) w.push("no-scenes");
  for (const s of grid.scenes) {
    if (!s.beatId) w.push(`scene ${s.id} missing beatId`);
    if (!s.grid || typeof s.grid !== "object") {
      w.push(`scene ${s.id} missing grid`);
    }
    if (typeof s.estimatedWords !== "number" || s.estimatedWords < 50) {
      w.push(`scene ${s.id} word estimate too low`);
    }
  }
  return w;
}
