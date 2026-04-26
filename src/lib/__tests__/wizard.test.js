// src/lib/__tests__/wizard.test.js

import { describe, it, expect } from "vitest";
import {
  WIZARD_STORAGE_KEYS,
  REQUIRED_FIELDS_BY_LAYER,
  buildSteps,
  totalRequiredFields,
  requiredFieldsRemaining,
  isStepComplete,
  overallProgress,
  firstIncompleteIndex,
  defaultWizardState,
  hasDraft,
  loadDraft,
  saveDraft,
  clearDraft,
  loadWizardState,
  saveWizardState,
  loadViewMode,
  saveViewMode,
} from "../wizard.js";

function fakeStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    _dump: () => Object.fromEntries(map),
  };
}

const SAMPLE_LAYERS = [
  { id: "macro", num: 1, title: "Macro Structure", subtitle: "The bones." },
  { id: "system", num: 2, title: "System", subtitle: "The rules." },
  { id: "subplots", num: 5, title: "Subplots", subtitle: "Pick 2–4." },
];

describe("buildSteps", () => {
  it("sandwiches preset + review around the layer steps", () => {
    const steps = buildSteps(SAMPLE_LAYERS);
    expect(steps.length).toBe(SAMPLE_LAYERS.length + 2);
    expect(steps[0].kind).toBe("preset");
    expect(steps[steps.length - 1].kind).toBe("review");
    expect(steps[1].kind).toBe("layer");
  });

  it("pulls required fields from REQUIRED_FIELDS_BY_LAYER", () => {
    const steps = buildSteps(SAMPLE_LAYERS);
    const macro = steps.find((s) => s.id === "layer:macro");
    expect(macro.requiredFields).toEqual(REQUIRED_FIELDS_BY_LAYER.macro);
    expect(macro.optional).toBe(false);
    const subplots = steps.find((s) => s.id === "layer:subplots");
    expect(subplots.requiredFields).toEqual([]);
    expect(subplots.optional).toBe(true);
  });

  it("handles empty / missing input", () => {
    expect(buildSteps([]).length).toBe(2);
    expect(buildSteps(undefined).length).toBe(2);
  });
});

describe("step completion helpers", () => {
  const steps = buildSteps(SAMPLE_LAYERS);
  const macroStep = steps.find((s) => s.id === "layer:macro");

  it("requiredFieldsRemaining counts empty / missing values", () => {
    expect(requiredFieldsRemaining(macroStep, {})).toEqual(macroStep.requiredFields);
    expect(
      requiredFieldsRemaining(macroStep, {
        subgenre: "X",
        integrationType: "",
        worldScale: "  ",
        techLevel: "Modern",
      }),
    ).toEqual(["integrationType", "worldScale"]);
  });

  it("isStepComplete is true when nothing remains", () => {
    expect(isStepComplete(macroStep, {})).toBe(false);
    const all = Object.fromEntries(macroStep.requiredFields.map((k) => [k, "x"]));
    expect(isStepComplete(macroStep, all)).toBe(true);
  });

  it("optional steps are always complete", () => {
    const presetStep = steps[0];
    expect(isStepComplete(presetStep, {})).toBe(true);
  });

  it("overallProgress is 0 when nothing filled, 1 when all filled", () => {
    expect(overallProgress(steps, {})).toBe(0);
    const all = {};
    for (const s of steps) for (const k of s.requiredFields) all[k] = "x";
    expect(overallProgress(steps, all)).toBe(1);
  });

  it("firstIncompleteIndex finds the first gap (or -1)", () => {
    expect(firstIncompleteIndex(steps, {})).toBeGreaterThanOrEqual(0);
    const all = {};
    for (const s of steps) for (const k of s.requiredFields) all[k] = "x";
    expect(firstIncompleteIndex(steps, all)).toBe(-1);
  });

  it("totalRequiredFields sums across steps", () => {
    const total = totalRequiredFields(steps);
    let manual = 0;
    for (const s of steps) manual += s.requiredFields.length;
    expect(total).toBe(manual);
    expect(total).toBeGreaterThan(0);
  });
});

describe("hasDraft", () => {
  it("rejects nullish / empty", () => {
    expect(hasDraft(null)).toBe(false);
    expect(hasDraft({})).toBe(false);
    expect(hasDraft({ a: "" })).toBe(false);
    expect(hasDraft({ a: [] })).toBe(false);
  });

  it("accepts even one filled key", () => {
    expect(hasDraft({ a: "x" })).toBe(true);
    expect(hasDraft({ subplots: ["x"] })).toBe(true);
  });
});

describe("draft persistence", () => {
  it("round-trips through injectable storage", () => {
    const storage = fakeStorage();
    expect(loadDraft(storage)).toBe(null);
    saveDraft({ subgenre: "Cozy LitRPG / low-stakes" }, storage);
    expect(loadDraft(storage)).toEqual({ subgenre: "Cozy LitRPG / low-stakes" });
    clearDraft(storage);
    expect(loadDraft(storage)).toBe(null);
  });

  it("uses the documented storage key", () => {
    const storage = fakeStorage();
    saveDraft({ a: 1 }, storage);
    const dump = storage._dump();
    expect(dump[WIZARD_STORAGE_KEYS.draft]).toBeTypeOf("string");
  });
});

describe("wizard state persistence", () => {
  it("returns defaults when nothing stored", () => {
    const storage = fakeStorage();
    expect(loadWizardState(storage)).toEqual(defaultWizardState());
  });

  it("merges stored state over defaults and stamps lastSavedAt", () => {
    const storage = fakeStorage();
    saveWizardState({ stepIndex: 3, visited: { macro: true } }, storage);
    const loaded = loadWizardState(storage);
    expect(loaded.stepIndex).toBe(3);
    expect(loaded.visited.macro).toBe(true);
    expect(loaded.completedAt).toEqual({});
    expect(loaded.lastSavedAt).toBeGreaterThan(0);
  });
});

describe("view-mode persistence", () => {
  it("returns the fallback when missing or invalid", () => {
    const storage = fakeStorage();
    expect(loadViewMode(storage)).toBe("wizard");
    expect(loadViewMode(storage, "power")).toBe("power");
    storage.setItem(WIZARD_STORAGE_KEYS.mode, "garbage");
    expect(loadViewMode(storage, "wizard")).toBe("wizard");
  });

  it("only writes valid modes", () => {
    const storage = fakeStorage();
    expect(saveViewMode("wizard", storage)).toBe(true);
    expect(loadViewMode(storage)).toBe("wizard");
    expect(saveViewMode("garbage", storage)).toBe(false);
    expect(loadViewMode(storage)).toBe("wizard");
    expect(saveViewMode("power", storage)).toBe(true);
    expect(loadViewMode(storage)).toBe("power");
  });
});
