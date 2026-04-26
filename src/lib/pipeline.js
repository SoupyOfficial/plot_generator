// src/lib/pipeline.js
//
// Pipeline orchestrator — a small state machine that walks a project
// through every artifact stage. Each step is a pure transition that takes
// the current `PipelineState` plus a few inputs and returns the next
// `PipelineState` (with optional LLM prompt to surface to the UI).
//
// Phases (in order):
//   selections → contract → series → book → outline → arcs → beats
//   → scenes → bible → scaffold → prose → audit → ingest → (loop next chapter)
//
// Pure functions; no LLM, no DOM. The UI/cockpit is responsible for
// actually invoking the LLM, capturing prose, and feeding it back via
// `advance()`. Every transition is undo-able by replaying state.

import { createContract } from "./contract.js";
import { createSeriesPlan } from "./seriesPlan.js";
import { createBookOutline } from "./bookOutline.js";
import { createArcPlan } from "./arcPlan.js";
import { createBeatSheet } from "./beatSheet.js";
import { createSceneGrid } from "./sceneGrid.js";
import { createBible } from "./bible.js";
import { auditChapter } from "./auditChapter.js";
import { getCorpusDefaults } from "./corpus.js";
import { ingestChapter } from "./ingestChapter.js";
import { fingerprintProse } from "./voiceFingerprint.js";
import { buildChapterScaffoldPrompt, buildChapterProsePrompt } from "./chapterPlan.js";

export const PHASES = [
  "selections",
  "contract",
  "series",
  "outline",
  "arcs",
  "beats",
  "scenes",
  "bible",
  "scaffold",
  "prose",
  "audit",
  "ingest",
  "done",
];

/**
 * @typedef {Object} PipelineState
 * @property {string} phase
 * @property {Object} [selections]
 * @property {Object} [contract]
 * @property {Object} [series]
 * @property {Object} [outline]
 * @property {Object} [arcPlan]
 * @property {Object} [beatSheet]
 * @property {Object} [sceneGrid]
 * @property {Object} [bible]
 * @property {Object} [currentScaffold]
 * @property {string} [currentProse]
 * @property {Object} [currentAudit]
 * @property {Object} [lastFingerprint]
 * @property {number} [chapterIndex]
 * @property {Object} [pendingPrompt]   { kind: "scaffold"|"prose", system, user }
 */

/** Build an initial state with selections (and optional userNotes). */
export function createPipelineState({ selections, userNotes } = {}) {
  return {
    phase: "selections",
    selections: selections || null,
    userNotes: userNotes || "",
    chapterIndex: 1,
  };
}

/**
 * Advance the pipeline by one step.
 *
 * @param {PipelineState} state
 * @param {Object} [input]   inputs the current phase needs (see per-phase docs)
 * @returns {PipelineState}
 */
export function advance(state, input = {}) {
  switch (state.phase) {
    case "selections":
      return toContract(state);
    case "contract":
      return toSeries(state, input);
    case "series":
      return toOutline(state, input);
    case "outline":
      return toArcs(state, input);
    case "arcs":
      return toBeats(state, input);
    case "beats":
      return toScenes(state, input);
    case "scenes":
      return toBible(state, input);
    case "bible":
      return toScaffoldPrompt(state, input);
    case "scaffold":
      return toProsePrompt(state, input);
    case "prose":
      return toAudit(state, input);
    case "audit":
      return toIngest(state, input);
    case "ingest":
      return toNextChapterOrDone(state, input);
    case "done":
      return state;
    default:
      throw new Error(`pipeline: unknown phase "${state.phase}"`);
  }
}

// ── transitions ─────────────────────────────────────────────────────────

function toContract(state) {
  if (!state.selections) throw new Error("pipeline: selections missing");
  const contract = createContract({
    selections: state.selections,
    userNotes: state.userNotes,
  });
  return { ...state, phase: "contract", contract };
}

function toSeries(state, { totalBooks = 1, currentBookIndex = 1 } = {}) {
  const series = createSeriesPlan({ totalBooks });
  return { ...state, phase: "series", series, currentBookIndex };
}

function toOutline(state, { template, openingTier, endTier } = {}) {
  const idx = state.currentBookIndex || 1;
  const book = state.series?.books?.[idx - 1];
  if (!book) throw new Error("pipeline: book missing in series");
  const outline = createBookOutline({ book, template, openingTier, endTier });
  return { ...state, phase: "outline", outline };
}

function toArcs(state, { totalChapters = 24, targetArcCount = 4, engines } = {}) {
  const arcPlan = createArcPlan({
    outline: state.outline,
    totalChapters,
    targetArcCount,
    engines,
  });
  return { ...state, phase: "arcs", arcPlan };
}

function toBeats(state, { beatsPerChapter = 1 } = {}) {
  const beatSheet = createBeatSheet({
    arcPlan: state.arcPlan,
    outline: state.outline,
    beatsPerChapter,
  });
  return { ...state, phase: "beats", beatSheet };
}

function toScenes(state, { defaultPov, wordsPerScene } = {}) {
  const sceneGrid = createSceneGrid({
    beatSheet: state.beatSheet,
    defaultPov,
    wordsPerScene,
  });
  return { ...state, phase: "scenes", sceneGrid };
}

function toBible(state /*, input */) {
  const bible = createBible(state.contract, state.series);
  return { ...state, phase: "bible", bible };
}

function toScaffoldPrompt(state, { chapter, beatRange, targetWords } = {}) {
  const idx = chapter || state.chapterIndex || 1;
  const range = beatRange || deriveBeatRange(state, idx);
  const prompt = buildChapterScaffoldPrompt({
    bible: state.bible,
    beatRange: range,
    chapterNumber: idx,
    targetWords,
  });
  return {
    ...state,
    phase: "scaffold",
    chapterIndex: idx,
    pendingPrompt: { kind: "scaffold", beatRange: range, ...prompt },
  };
}

function toProsePrompt(state, { scaffold, previousLastParagraph } = {}) {
  if (!scaffold) throw new Error("pipeline: scaffold required to advance from scaffold→prose");
  const prompt = buildChapterProsePrompt({
    bible: state.bible,
    scaffold,
    previousLastParagraph,
  });
  return {
    ...state,
    phase: "prose",
    currentScaffold: scaffold,
    pendingPrompt: { kind: "prose", ...prompt },
  };
}

function deriveBeatRange(state, chapterIndex) {
  const book = state.currentBookIndex || 1;
  const scenes = state.sceneGrid?.scenes || [];
  const matching = scenes.filter((s) => s.chapter === chapterIndex);
  if (matching.length === 0) {
    return { book, beatStart: chapterIndex, beatEnd: chapterIndex };
  }
  return {
    book,
    beatStart: matching[0].arcIndex + 1,
    beatEnd: matching[matching.length - 1].arcIndex + 1,
  };
}

function toAudit(state, { prose } = {}) {
  if (typeof prose !== "string") {
    throw new Error("pipeline: prose required to advance from prose→audit");
  }
  const fingerprint = fingerprintProse(prose);
  const profile = getCorpusDefaults({
    selections: state.contract?.selections || state.selections || {},
  });
  const audit = auditChapter({
    bible: state.bible,
    scaffold: state.currentScaffold,
    prose,
    prevFingerprint: state.lastFingerprint || null,
    options: {
      maxNewCharsPerChapter: profile.maxNewCharsPerChapter,
      voiceDriftThreshold: profile.voiceDriftThreshold,
      maxLatency: profile.maxPromiseLatency,
    },
  });
  return {
    ...state,
    phase: "audit",
    currentProse: prose,
    currentAudit: audit,
    currentFingerprint: fingerprint,
  };
}

function toIngest(state /*, input */) {
  const { bible } = ingestChapter({
    bible: state.bible,
    scaffold: state.currentScaffold,
    prose: state.currentProse,
    fingerprint: state.currentFingerprint,
    audit: state.currentAudit,
  });
  return {
    ...state,
    phase: "ingest",
    bible,
    lastFingerprint: state.currentFingerprint || state.lastFingerprint,
  };
}

function toNextChapterOrDone(state /*, input */) {
  const total =
    state.arcPlan?.totalChapters || state.sceneGrid?.scenes?.[state.sceneGrid.scenes.length - 1]?.chapter || 0;
  const next = (state.chapterIndex || 0) + 1;
  if (next > total) {
    return { ...state, phase: "done", pendingPrompt: null };
  }
  return {
    ...state,
    phase: "bible",
    chapterIndex: next,
    currentScaffold: null,
    currentProse: null,
    currentAudit: null,
    currentFingerprint: null,
    pendingPrompt: null,
  };
}

// ── convenience ────────────────────────────────────────────────────────

/**
 * Run all the deterministic phases (selections → bible) in one go. Stops at
 * the first phase that needs LLM input. `perPhaseInput` is keyed by the
 * *destination* phase (e.g. `{ arcs: { totalChapters: 12 } }` is consumed by
 * the transition that produces the arcs phase).
 */
export function runDeterministicPhases(state, perPhaseInput = {}) {
  // current phase → input key (destination phase)
  const destinationKey = {
    selections: "contract",
    contract: "series",
    series: "outline",
    outline: "arcs",
    arcs: "beats",
    beats: "scenes",
    scenes: "bible",
  };
  let s = state;
  while (destinationKey[s.phase]) {
    const key = destinationKey[s.phase];
    s = advance(s, perPhaseInput[key] || {});
  }
  return s;
}

export const __testing = {
  toContract,
  toSeries,
  toOutline,
  toArcs,
  toBeats,
  toScenes,
  toBible,
};
