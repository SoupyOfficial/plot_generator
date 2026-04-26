// src/lib/beatSheet.js
//
// Beat Sheet — an arc expanded into an ordered list of scene-level beats.
// Each beat has a structural purpose, an optional foreshadow plant/pay slot,
// and a chapter target. Scene-level granularity; one beat does NOT necessarily
// equal one chapter (a chapter can fold 2–3 beats; rarely the reverse).
//
// Pipeline arrow: BeatSheet = f(ArcPlan, BookOutline, opts).
// Pure functions; no LLM, no DOM.

const PURPOSES = [
  "setup",
  "inciting",
  "escalate",
  "reversal",
  "breather",
  "low_point",
  "climax",
  "resolve",
  "subplot",
  "act_break",
  "debate",
];

let _idCounter = 0;
function nextId() {
  _idCounter += 1;
  return `bt_${Date.now().toString(36)}_${_idCounter.toString(36)}`;
}

/**
 * @typedef {Object} SceneBeat
 * @property {string} id
 * @property {number} arcIndex
 * @property {string} arcId
 * @property {string} engine
 * @property {string} purpose
 * @property {number} chapter         target chapter number
 * @property {number} positionInArc   0..1
 * @property {string} [parentBeatId]  the BookOutline beat this expands
 * @property {string} [summary]
 * @property {string[]} [foreshadowToPlant]
 * @property {string[]} [foreshadowToPay]
 * @property {string[]} [charactersPresent]
 * @property {string} [pov]
 *
 * @typedef {Object} BeatSheet
 * @property {number}      bookIndex
 * @property {SceneBeat[]} beats
 */

/**
 * Build a beat sheet by expanding each arc's chapters with a default
 * pacing pattern: setup → escalate → reversal → escalate → climax → resolve.
 * Adds breather beats at low-tension positions for arcs of 6+ chapters.
 *
 * @param {Object} args
 * @param {Object} args.arcPlan
 * @param {Object} args.outline
 * @param {Object} [args.beatsPerChapter]   defaults to 1
 * @returns {BeatSheet}
 */
export function createBeatSheet({ arcPlan, outline, beatsPerChapter = 1 } = {}) {
  if (!arcPlan || !Array.isArray(arcPlan.arcs)) {
    throw new Error("createBeatSheet: arcPlan with .arcs required");
  }
  const outBeats = (outline?.beats || []).reduce((map, b) => {
    map[b.id] = b;
    return map;
  }, {});

  const beats = [];
  let chapter = 1;
  for (const arc of arcPlan.arcs) {
    const n = arc.chapterCount;
    const purposes = pacingPattern(arc.engine, n);
    // Map this arc's parent BookOutline beats across its chapters.
    const parents = (arc.beatIds || []).map((id) => outBeats[id]).filter(Boolean);

    for (let i = 0; i < n; i++) {
      const pos = n === 1 ? 0 : i / (n - 1);
      const purpose = purposes[i] || "escalate";
      const parent =
        parents.length > 0
          ? parents[Math.min(parents.length - 1, Math.floor(pos * parents.length))]
          : null;
      const numBeatsThisChapter = Math.max(1, Math.floor(beatsPerChapter));
      for (let k = 0; k < numBeatsThisChapter; k++) {
        beats.push({
          id: nextId(),
          arcIndex: arc.index,
          arcId: arc.id,
          engine: arc.engine,
          purpose,
          chapter,
          positionInArc: pos,
          parentBeatId: parent?.id || null,
          summary: "",
          foreshadowToPlant: parent?.foreshadowToPlant ? [...parent.foreshadowToPlant] : [],
          foreshadowToPay: parent?.foreshadowToPay ? [...parent.foreshadowToPay] : [],
          charactersPresent: [],
          pov: "",
        });
      }
      chapter++;
    }
  }
  return {
    bookIndex: arcPlan.bookIndex,
    beats,
  };
}

/**
 * Default pacing across n chapters of an arc, given its engine.
 * Always starts with setup; for n>=3 always ends with climax + resolve.
 */
function pacingPattern(engine, n) {
  if (n <= 0) return [];
  if (n === 1) return ["climax"];
  if (n === 2) return ["setup", "climax"];
  if (n === 3) return ["setup", "climax", "resolve"];
  // n >= 4: always end with climax+resolve. low_point inserted for n>=5.
  const tail = n >= 5 ? ["low_point", "climax", "resolve"] : ["climax", "resolve"];
  const head = ["setup"];
  const middleSize = n - head.length - tail.length;
  const breatherEvery = engine === "training" ? 4 : 5;
  const middle = [];
  const reversalAt = Math.floor(middleSize / 2);
  for (let i = 0; i < middleSize; i++) {
    if ((i + 1) % breatherEvery === 0) middle.push("breather");
    else if (i === reversalAt) middle.push("reversal");
    else middle.push("escalate");
  }
  return [...head, ...middle, ...tail];
}

/**
 * Update one beat by id, immutably.
 */
export function updateBeat(sheet, beatId, patch) {
  return {
    ...sheet,
    beats: (sheet.beats || []).map((b) =>
      b.id === beatId ? { ...b, ...patch, id: b.id } : b
    ),
  };
}

/**
 * Validate a beat sheet. Returns warnings.
 */
export function validateBeatSheet(sheet) {
  const w = [];
  if (!sheet || !Array.isArray(sheet.beats)) return ["sheet-empty"];
  if (sheet.beats.length === 0) w.push("no-beats");
  let prevChapter = 0;
  for (const b of sheet.beats) {
    if (!PURPOSES.includes(b.purpose)) {
      w.push(`beat ${b.id} unknown purpose "${b.purpose}"`);
    }
    if (typeof b.chapter !== "number" || b.chapter < 1) {
      w.push(`beat ${b.id} invalid chapter`);
    }
    if (b.chapter < prevChapter) {
      w.push(`beat ${b.id} chapter ${b.chapter} regresses from ${prevChapter}`);
    }
    prevChapter = Math.max(prevChapter, b.chapter || 0);
  }
  if (!sheet.beats.some((b) => b.purpose === "climax")) {
    w.push("no climax beat in sheet");
  }
  return w;
}

/**
 * Group beats by chapter — convenience for chapter-level prompt building.
 */
export function beatsByChapter(sheet) {
  const map = new Map();
  for (const b of sheet?.beats || []) {
    const list = map.get(b.chapter) || [];
    list.push(b);
    map.set(b.chapter, list);
  }
  return map;
}

export const BEAT_PURPOSES = PURPOSES;
