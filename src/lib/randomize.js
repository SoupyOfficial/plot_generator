// src/lib/randomize.js
//
// Weighted random selection + draft helpers for the gamification layer.
//
// "Roll the dice" walks every single-select field, picks a value, and prefers
// values whose tags overlap tags already present in the current selections.
// Conflicts (via forbids) are filtered out so the resulting seed is always
// internally consistent.

import {
  buildFieldIndex,
  normalizeOption,
  conflictsForOption,
  findOption,
} from "./options.js";

/**
 * Collect the tag set implied by the currently-selected values.
 */
export function selectionTags(layers, selections) {
  const idx = buildFieldIndex(layers || []);
  const tags = new Set();
  for (const [fieldId, value] of Object.entries(selections || {})) {
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) {
      const opt = findOption(idx, fieldId, v);
      if (opt?.tags) for (const t of opt.tags) tags.add(t);
    }
  }
  return tags;
}

/**
 * Weight = 1 + tag-overlap bonus + mild jitter, to prefer thematically
 * consistent picks without being deterministic.
 */
function weightOption(opt, activeTags, rng) {
  let w = 1;
  if (Array.isArray(opt.tags)) {
    for (const t of opt.tags) if (activeTags.has(t)) w += 1.5;
  }
  // Small random jitter so equally-weighted options still shuffle.
  return w * (0.85 + rng() * 0.3);
}

function pickWeighted(items, weights, rng) {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return items[Math.floor(rng() * items.length)];
  let t = rng() * total;
  for (let i = 0; i < items.length; i++) {
    t -= weights[i];
    if (t <= 0) return items[i];
  }
  return items[items.length - 1];
}

/**
 * Return the non-conflicting, non-freeform options for a field — normalized.
 */
export function availableOptions(fieldIndex, selections, fieldId) {
  const comp = fieldIndex[fieldId];
  if (!comp || !Array.isArray(comp.options)) return [];
  return comp.options
    .map(normalizeOption)
    .filter(Boolean)
    .filter((opt) => conflictsForOption(fieldIndex, selections || {}, fieldId, opt).length === 0);
}

/**
 * Pick N distinct options from a field, weighted by active-tag overlap.
 * Used by Draft Mode — deals N options for the user to choose from.
 */
export function dealOptions(layers, selections, fieldId, count = 3, rng = Math.random) {
  const idx = buildFieldIndex(layers || []);
  const active = selectionTags(layers, selections);
  const pool = availableOptions(idx, selections, fieldId);
  if (!pool.length) return [];
  const chosen = [];
  const remaining = pool.slice();
  while (chosen.length < count && remaining.length) {
    const weights = remaining.map((o) => weightOption(o, active, rng));
    const pick = pickWeighted(remaining, weights, rng);
    chosen.push(pick);
    const idxRem = remaining.indexOf(pick);
    if (idxRem >= 0) remaining.splice(idxRem, 1);
  }
  return chosen;
}

/**
 * Roll every empty single-select field, picking tag-weighted values.
 * Returns a new selections object (does not mutate input). Fields the user
 * already locked are preserved.
 *
 * @param {object} opts
 * @param {Array}  opts.layers
 * @param {object} opts.selections - existing (possibly partial) selections
 * @param {string[]} [opts.preserveIds] - field ids to never overwrite
 * @param {function} [opts.rng] - injectable RNG for tests
 * @param {boolean} [opts.overwrite] - re-roll even locked values (default false)
 */
export function rollDice({
  layers,
  selections = {},
  preserveIds = [],
  rng = Math.random,
  overwrite = false,
} = {}) {
  const idx = buildFieldIndex(layers || []);
  const preserve = new Set(preserveIds);
  // Work on a copy; we'll apply picks one field at a time so tag-weighting
  // builds up progressively.
  const next = { ...selections };
  const changed = [];

  for (const layer of layers || []) {
    for (const group of layer.groups || []) {
      for (const comp of group.components || []) {
        if (comp.multi || comp.freeform) continue;
        if (preserve.has(comp.id)) continue;
        const existing = next[comp.id];
        if (existing && !overwrite) continue;
        const pool = availableOptions(idx, next, comp.id);
        if (!pool.length) continue;
        const active = selectionTags(layers, next);
        const weights = pool.map((o) => weightOption(o, active, rng));
        const pick = pickWeighted(pool, weights, rng);
        if (pick) {
          next[comp.id] = pick.value;
          changed.push(comp.id);
        }
      }
    }
  }

  // Multi-select: fill subplots with 2-4 picks if empty.
  const subplotsComp = idx.subplots;
  if (subplotsComp && (!next.subplots || next.subplots.length === 0) && !preserve.has("subplots")) {
    const pool = (subplotsComp.options || []).map(normalizeOption).filter(Boolean);
    const want = 2 + Math.floor(rng() * 3); // 2, 3, or 4
    const shuffled = pool
      .map((o) => [o, rng()])
      .sort((a, b) => a[1] - b[1])
      .map(([o]) => o);
    next.subplots = shuffled.slice(0, want).map((o) => o.value);
    changed.push("subplots");
  }

  return { selections: next, changed };
}

// ============================================================================
// Re-roll budget — session-scoped so it resets per page-visit but feels
// precious within the session.
// ============================================================================

const BUDGET_KEY = "plot_generator:reroll-budget";
const DEFAULT_BUDGET = 3;

function readBudget() {
  try {
    const raw = sessionStorage.getItem(BUDGET_KEY);
    if (raw == null) return DEFAULT_BUDGET;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : DEFAULT_BUDGET;
  } catch {
    return DEFAULT_BUDGET;
  }
}

function writeBudget(n) {
  try {
    sessionStorage.setItem(BUDGET_KEY, String(Math.max(0, n)));
  } catch {
    /* ignore */
  }
}

export function getRerollBudget() {
  if (typeof sessionStorage === "undefined") return DEFAULT_BUDGET;
  return readBudget();
}

export function consumeReroll() {
  if (typeof sessionStorage === "undefined") return DEFAULT_BUDGET - 1;
  const current = readBudget();
  const next = Math.max(0, current - 1);
  writeBudget(next);
  return next;
}

export function resetRerollBudget(n = DEFAULT_BUDGET) {
  if (typeof sessionStorage !== "undefined") writeBudget(n);
  return n;
}

export const DEFAULT_REROLL_BUDGET = DEFAULT_BUDGET;
