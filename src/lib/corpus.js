// src/lib/corpus.js
//
// Hand-curated subgenre / story-engine defaults — the "corpus" the rest of
// the pipeline consults when it needs an opinion about pacing, length,
// cast bloat, voice drift tolerance, etc.
//
// These are *defaults*, not laws. Every consumer should accept overrides.
// Pure-function. No I/O.

/**
 * @typedef {Object} CorpusProfile
 * @property {number} medianChapterWords         target words per chapter
 * @property {number} minChapterWords            soft floor (warn below)
 * @property {number} maxChapterWords            soft ceiling (warn above)
 * @property {number} wordsPerScene              default scene size
 * @property {number} beatsPerChapter            default beats per chapter
 * @property {number} actionRatio                0..1, fraction of chapters that are action vs rest
 * @property {number} tierUpEveryNChapters       expected cadence between power-curve climbs
 * @property {number} maxNewCharsPerChapter      cast-bloat threshold
 * @property {number} voiceDriftThreshold        0..1, voiceFingerprint drift
 * @property {number} maxPromiseLatency          chapters between plant and pay
 */

/** Conservative baseline — used when nothing else matches. */
export const DEFAULT_CORPUS_PROFILE = Object.freeze({
  medianChapterWords: 3000,
  minChapterWords: 1500,
  maxChapterWords: 6000,
  wordsPerScene: 750,
  beatsPerChapter: 1,
  actionRatio: 0.6,
  tierUpEveryNChapters: 8,
  maxNewCharsPerChapter: 3,
  voiceDriftThreshold: 0.3,
  maxPromiseLatency: 12,
});

/**
 * Subgenre overrides — keyed by the exact `selections.subgenre` strings used
 * in the LAYERS data. Anything missing falls through to DEFAULT.
 */
export const SUBGENRE_PROFILES = Object.freeze({
  "Classical progression fantasy (cultivation / ranks)": {
    medianChapterWords: 3500,
    actionRatio: 0.55,
    tierUpEveryNChapters: 10,
    maxPromiseLatency: 20,
  },
  "System apocalypse": {
    medianChapterWords: 4000,
    actionRatio: 0.7,
    tierUpEveryNChapters: 6,
    maxNewCharsPerChapter: 4,
  },
  "Cozy LitRPG / low-stakes": {
    medianChapterWords: 2500,
    actionRatio: 0.25,
    tierUpEveryNChapters: 14,
    maxPromiseLatency: 8,
  },
  "Regression / time loop": {
    medianChapterWords: 3500,
    actionRatio: 0.55,
    maxPromiseLatency: 25,
    voiceDriftThreshold: 0.35,
  },
  "Magical academy": {
    medianChapterWords: 3000,
    actionRatio: 0.45,
    tierUpEveryNChapters: 12,
    maxNewCharsPerChapter: 4,
  },
  "Dungeon crawl / tower climb": {
    medianChapterWords: 3500,
    actionRatio: 0.75,
    tierUpEveryNChapters: 5,
  },
});

/**
 * Story-engine overrides — applied AFTER subgenre. Engine wins on conflicts
 * because engine cadence is a stronger predictor of chapter rhythm.
 * Keyed by `selections.storyEngine`.
 */
export const ENGINE_PROFILES = Object.freeze({
  "Tournament arc": {
    actionRatio: 0.7,
    beatsPerChapter: 2,
    tierUpEveryNChapters: 6,
  },
  "Dungeon crawl / tower climb": {
    actionRatio: 0.8,
    tierUpEveryNChapters: 4,
  },
  "Heist / con": {
    actionRatio: 0.6,
    beatsPerChapter: 2,
  },
  "Wave defense / integration apocalypse": {
    actionRatio: 0.75,
    tierUpEveryNChapters: 5,
    maxNewCharsPerChapter: 4,
  },
  "Base / settlement building": {
    actionRatio: 0.35,
    tierUpEveryNChapters: 12,
    maxPromiseLatency: 10,
  },
  "Slice-of-life drift": {
    actionRatio: 0.2,
    medianChapterWords: 2500,
    tierUpEveryNChapters: 16,
    maxPromiseLatency: 8,
  },
  "Academy arc (year-by-year)": {
    actionRatio: 0.45,
    tierUpEveryNChapters: 12,
  },
  "Regression / time loop": {
    voiceDriftThreshold: 0.35,
    maxPromiseLatency: 25,
  },
  "Hybrid (multiple engines layered)": {
    // Hybrid = no strong opinion; defer to subgenre.
  },
});

/**
 * Resolve a corpus profile from a selections object.
 * Order: DEFAULT ← subgenre ← engine ← explicit overrides.
 *
 * @param {Object} [args]
 * @param {Object} [args.selections]
 * @param {Partial<CorpusProfile>} [args.overrides]
 * @returns {CorpusProfile}
 */
export function getCorpusDefaults({ selections = {}, overrides = {} } = {}) {
  const sub = SUBGENRE_PROFILES[selections.subgenre] || {};
  const eng = ENGINE_PROFILES[selections.storyEngine] || {};
  const merged = {
    ...DEFAULT_CORPUS_PROFILE,
    ...sub,
    ...eng,
    ...overrides,
  };
  return clampProfile(merged);
}

/**
 * Look up a single profile field with the same precedence rules.
 * Convenient when a consumer only needs one knob.
 */
export function getCorpusField(field, args = {}) {
  const profile = getCorpusDefaults(args);
  return profile[field];
}

/** Names of all subgenres with a curated profile. */
export function listSubgenres() {
  return Object.keys(SUBGENRE_PROFILES);
}

/** Names of all engines with a curated profile. */
export function listEngines() {
  return Object.keys(ENGINE_PROFILES);
}

// ---------------------------------------------------------------------------

function clampProfile(p) {
  return {
    medianChapterWords: clamp(p.medianChapterWords, 500, 20000),
    minChapterWords: clamp(p.minChapterWords, 200, p.medianChapterWords),
    maxChapterWords: clamp(p.maxChapterWords, p.medianChapterWords, 30000),
    wordsPerScene: clamp(p.wordsPerScene, 100, 5000),
    beatsPerChapter: clamp(p.beatsPerChapter, 1, 8),
    actionRatio: clamp(p.actionRatio, 0, 1),
    tierUpEveryNChapters: clamp(p.tierUpEveryNChapters, 1, 200),
    maxNewCharsPerChapter: clamp(p.maxNewCharsPerChapter, 0, 20),
    voiceDriftThreshold: clamp(p.voiceDriftThreshold, 0, 1),
    maxPromiseLatency: clamp(p.maxPromiseLatency, 1, 200),
  };
}

function clamp(n, lo, hi) {
  if (typeof n !== "number" || Number.isNaN(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}
