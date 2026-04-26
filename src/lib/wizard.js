// src/lib/wizard.js
//
// Pure helpers for the wizard / step-by-step view of the form.
//
// The wizard is a *view* over the existing LAYERS data — it does not change
// the underlying selections schema, validation, or any other lib. It groups
// LAYERS into a sequence of steps (preset → 8 layers → review) and tracks
// per-step completion plus persistent draft + view-mode state in
// localStorage.
//
// All localStorage access is funneled through an injectable `storage`
// argument so we can unit-test with a fake.

export const WIZARD_STORAGE_KEYS = Object.freeze({
  draft: "plot_generator:selections-draft",
  wizard: "plot_generator:wizard-state",
  mode: "plot_generator:view-mode",
});

/**
 * Required fields per *layer id* — mirrors the canonical list in App.jsx.
 * If you add a required field, add it here so step completion stays accurate.
 */
export const REQUIRED_FIELDS_BY_LAYER = Object.freeze({
  macro: ["subgenre", "integrationType", "worldScale", "techLevel"],
  system: [
    "systemVisibility",
    "systemOrigin",
    "systemPurpose",
    "systemAlignment",
    "systemCeiling",
  ],
  entry: ["entryCondition", "startingState", "knowledgeAdvantage"],
  conflict: ["primaryConflict", "conflictOrigin"],
  ending: ["resolutionMode", "protagonistOutcome"],
  protagonist: ["archetype", "flawType"],
  subplots: [], // multi-select, validated separately (2–4)
  themes: ["primaryTheme"],
});

/**
 * Build the ordered step list. Each step references one or more layer ids
 * from LAYERS plus a synthetic preset step at the front and review step at
 * the end.
 *
 * @param {Array<{id:string,num?:number,title:string,subtitle?:string}>} layers
 * @returns {Array<{id:string,kind:"preset"|"layer"|"review",label:string,subtitle?:string,layerIds:string[],requiredFields:string[],optional:boolean}>}
 */
export function buildSteps(layers) {
  const steps = [];
  steps.push({
    id: "preset",
    kind: "preset",
    label: "Preset",
    subtitle: "Optional starting point — pick a subgenre or skip.",
    layerIds: [],
    requiredFields: [],
    optional: true,
  });
  for (const layer of layers || []) {
    const required = REQUIRED_FIELDS_BY_LAYER[layer.id] || [];
    steps.push({
      id: `layer:${layer.id}`,
      kind: "layer",
      label: layer.title || layer.id,
      subtitle: layer.subtitle || "",
      layerIds: [layer.id],
      requiredFields: required,
      optional: required.length === 0,
    });
  }
  steps.push({
    id: "review",
    kind: "review",
    label: "Review & Generate",
    subtitle: "Confirm everything, then generate.",
    layerIds: [],
    requiredFields: [],
    optional: true,
  });
  return steps;
}

/** Total required-field count across all steps (used for global progress). */
export function totalRequiredFields(steps) {
  return steps.reduce((n, s) => n + (s.requiredFields?.length || 0), 0);
}

/** Required fields still empty for one step. */
export function requiredFieldsRemaining(step, selections = {}) {
  if (!step || !step.requiredFields) return [];
  return step.requiredFields.filter((id) => isEmpty(selections[id]));
}

/** Whether a step is fully satisfied. */
export function isStepComplete(step, selections = {}) {
  return requiredFieldsRemaining(step, selections).length === 0;
}

/**
 * Coarse "interview progress": fraction of required fields satisfied
 * across the whole form. 0..1.
 */
export function overallProgress(steps, selections = {}) {
  const total = totalRequiredFields(steps);
  if (total === 0) return 1;
  let filled = 0;
  for (const step of steps) {
    for (const id of step.requiredFields || []) {
      if (!isEmpty(selections[id])) filled += 1;
    }
  }
  return filled / total;
}

/** Find the index of the first incomplete step, or -1 if all complete. */
export function firstIncompleteIndex(steps, selections = {}) {
  for (let i = 0; i < steps.length; i++) {
    if (!isStepComplete(steps[i], selections)) return i;
  }
  return -1;
}

// ── persistence ───────────────────────────────────────────────────────────

/** Default in-flight wizard state. */
export function defaultWizardState() {
  return {
    stepIndex: 0,
    visited: {},
    completedAt: {},
    lastSavedAt: 0,
  };
}

/** Detect a non-trivial draft (presence of >=1 selection key with value). */
export function hasDraft(draft) {
  if (!draft || typeof draft !== "object") return false;
  for (const k of Object.keys(draft)) {
    if (!isEmpty(draft[k])) return true;
  }
  return false;
}

export function loadDraft(storage = safeStorage()) {
  return readJson(storage, WIZARD_STORAGE_KEYS.draft, null);
}

export function saveDraft(selections, storage = safeStorage()) {
  return writeJson(storage, WIZARD_STORAGE_KEYS.draft, selections || {});
}

export function clearDraft(storage = safeStorage()) {
  return removeKey(storage, WIZARD_STORAGE_KEYS.draft);
}

export function loadWizardState(storage = safeStorage()) {
  const raw = readJson(storage, WIZARD_STORAGE_KEYS.wizard, null);
  return { ...defaultWizardState(), ...(raw || {}) };
}

export function saveWizardState(state, storage = safeStorage()) {
  return writeJson(storage, WIZARD_STORAGE_KEYS.wizard, {
    ...state,
    lastSavedAt: Date.now(),
  });
}

export function loadViewMode(storage = safeStorage(), fallback = "wizard") {
  const v = readRaw(storage, WIZARD_STORAGE_KEYS.mode);
  if (v === "wizard" || v === "power") return v;
  return fallback;
}

export function saveViewMode(mode, storage = safeStorage()) {
  if (mode !== "wizard" && mode !== "power") return false;
  return writeRaw(storage, WIZARD_STORAGE_KEYS.mode, mode);
}

// ── internals ─────────────────────────────────────────────────────────────

function isEmpty(v) {
  if (v === undefined || v === null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

function readJson(storage, key, fallback) {
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function readRaw(storage, key) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(storage, key, value) {
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function removeKey(storage, key) {
  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function safeStorage() {
  if (typeof globalThis !== "undefined" && globalThis.localStorage) {
    return globalThis.localStorage;
  }
  // No-op storage so SSR / tests without DOM don't crash.
  const mem = new Map();
  return {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
  };
}
