// src/lib/validation.js
//
// Phase 3: hybrid validation layer.
//   - data-driven: runs through `forbids` on every selected option
//   - cross-cutting: rules that span 2+ fields or involve arrays / counts,
//     kept as explicit functions.
//
// All warnings are returned as plain strings (back-compat with existing UI)
// but include a `{severity, message}` object for richer UIs if needed.

import { buildFieldIndex, collectForbidConflicts } from "./options.js";

const has = (s, id, frag) =>
  (s[id] || "").toString().toLowerCase().includes(frag.toLowerCase());

/**
 * Cross-cutting rules — these don't map cleanly to a single option's `forbids`
 * because they depend on counts, array contents, or multi-field combinations.
 */
export function crossCuttingRules(selections) {
  const warnings = [];
  const s = selections;
  const subplots = s.subplots || [];

  // Returner archetype → foreknowledge must compound
  if ((s.archetype || "").startsWith("The Returner")) {
    if (
      !has(s, "knowledgeAdvantage", "Future knowledge") &&
      !has(s, "knowledgeAdvantage", "Meta knowledge")
    ) {
      warnings.push(
        "The Returner archetype requires foreknowledge. Select 'Future knowledge' or 'Meta knowledge' under Knowledge Advantage."
      );
    }
    const hasCompounding =
      subplots.some(
        (x) =>
          x.toLowerCase().includes("mystery") ||
          x.toLowerCase().includes("rival") ||
          x.toLowerCase().includes("competitor")
      ) ||
      has(s, "antagonistType", "rival") ||
      has(s, "truthRevealPacing", "red herrings");
    if (!hasCompounding) {
      warnings.push(
        "Returner premise: foreknowledge MUST create compounding problems (rivals, mystery reveals, herrings). Add a Mystery subplot, a Rival antagonist, or Red Herrings reveal pacing."
      );
    }
  }

  // Neutral system + no cost of power = inert system
  if (has(s, "systemAlignment", "Neutral") && has(s, "costOfPower", "None")) {
    warnings.push(
      "Neutral system + No cost of power = inert system. Neutral ≠ inert. Add a cost of power or change alignment."
    );
  }

  // Theme Knowledge vs Consequence → mystery must be engine
  if (s.primaryTheme === "Knowledge vs Consequence") {
    const mysteryActive =
      subplots.some(
        (x) =>
          x.toLowerCase().includes("mystery") ||
          x.toLowerCase().includes("investigation") ||
          x.toLowerCase().includes("conspiracy")
      ) || has(s, "resolutionMode", "Exposure");
    if (!mysteryActive) {
      warnings.push(
        "Theme 'Knowledge vs Consequence' requires the system-origin mystery to be the engine. Add a Mystery/Investigation subplot or set Resolution Mode to Exposure."
      );
    }
  }

  // Open-ended series → need at least 2 anti-drift mechanisms
  if (
    has(s, "arcType", "Continuous narrative") ||
    has(s, "seriesCeiling", "Open-ended") ||
    has(s, "seriesCeiling", "No planned ending")
  ) {
    const ad = s.antiDrift || [];
    if (ad.length < 2) {
      warnings.push(
        "Open-ended / continuous series needs at least 2 anti-drift mechanisms locked. Add more structural locks in Layer 7.3."
      );
    }
  }
  if (has(s, "seriesCeiling", "No planned ending") && s.primaryTheme) {
    if (!has(s, "seriesCeiling", "thematic")) {
      warnings.push(
        "'No planned ending' is the highest drift risk. Strongly consider 'Open-ended with thematic endpoint' instead."
      );
    }
  }

  // Cost of Power = None → need human-cost subplot
  if (has(s, "costOfPower", "None")) {
    const humanCost = subplots.some((x) =>
      ["romance", "family", "identity", "secret", "obsession"].some((k) =>
        x.toLowerCase().includes(k)
      )
    );
    if (!humanCost) {
      warnings.push(
        "Costless power needs human cost instead. Add a Romance, Family, Identity Crisis, Secret, or Obsession subplot."
      );
    }
  }

  // Exposure ending + Single late reveal = twist, not resolution
  if (has(s, "resolutionMode", "Exposure") && has(s, "truthRevealPacing", "Single late reveal")) {
    warnings.push(
      "Exposure ending + Single late reveal = twist, not resolution. Use Drip or Two-stage pacing so the first breadcrumb lands on page one."
    );
  }

  // Subplot count 2–4
  if (subplots.length && (subplots.length < 2 || subplots.length > 4)) {
    warnings.push(`Subplot count is ${subplots.length}. Pick 2–4 for a single book.`);
  }

  return warnings;
}

/**
 * Full validation: data-driven `forbids` + cross-cutting rules.
 * Returns string[] for compatibility with current UI rendering.
 */
export function validateSelections(selections, layers) {
  const idx = buildFieldIndex(layers || []);
  const forbidWarnings = collectForbidConflicts(idx, selections).map((w) => w.message);
  const crossWarnings = crossCuttingRules(selections);
  // de-dup
  const seen = new Set();
  const out = [];
  for (const w of [...forbidWarnings, ...crossWarnings]) {
    if (seen.has(w)) continue;
    seen.add(w);
    out.push(w);
  }
  return out;
}
