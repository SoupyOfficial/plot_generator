// src/lib/coherence.js
//
// Compute a qualitative coherence rating for the current selections.
// Returns { score, label, breakdown } where:
//   - score is an integer 0-100 (exposed via tooltip only)
//   - label is the user-facing qualitative word
//   - breakdown is an object with each contributor, for the tooltip
//
// Per the decision: qualitative label is primary; numeric is tooltip-only.

const LABELS = [
  { min: 85, label: "Banger", blurb: "Story spine is coherent and rich — ship it." },
  { min: 65, label: "Query-Ready", blurb: "Mostly consistent; minor friction." },
  { min: 40, label: "Workshop", blurb: "Review warnings before generating." },
  { min: 0,  label: "Rough Draft", blurb: "Contradictions present; seed will drift." },
];

export function labelForScore(score) {
  for (const band of LABELS) {
    if (score >= band.min) return band;
  }
  return LABELS[LABELS.length - 1];
}

/**
 * @param {object} args
 * @param {string[]} args.requiredIds  - required non-multi field IDs
 * @param {object}   args.selections
 * @param {string[]} [args.warnings]   - active validation warnings
 * @param {number}   [args.subplotCount]
 * @param {number}   [args.highValueCombos] - count of detected combos
 * @param {number}   [args.subplotMin=2]
 * @param {number}   [args.subplotMax=4]
 */
export function computeCoherence({
  requiredIds = [],
  selections = {},
  warnings = [],
  subplotCount = 0,
  highValueCombos = 0,
  subplotMin = 2,
  subplotMax = 4,
}) {
  // Completeness: % of required fields filled (+ subplot count within range)
  const filled = requiredIds.filter((id) => {
    const v = selections[id];
    return v != null && v !== "" && !(Array.isArray(v) && v.length === 0);
  }).length;
  const requiredTotal = requiredIds.length || 1;
  const requiredRatio = filled / requiredTotal;
  const subplotOk =
    subplotCount >= subplotMin && subplotCount <= subplotMax ? 1 : 0;
  const completeness = Math.round(
    100 * (requiredRatio * 0.9 + subplotOk * 0.1)
  );

  // Compatibility: every warning drops the compatibility sub-score.
  // 0 warnings = 100, 5+ warnings = 0.
  const compatibility = Math.max(0, 100 - warnings.length * 20);

  // Cohesion bonus: high-value combos lift the ceiling a bit.
  const cohesionBonus = Math.min(10, highValueCombos * 5);

  // Weighted composite: completeness 70%, compatibility 30%, plus bonus (cap 100).
  // Completeness is weighted higher so an empty selection reads as fractured
  // even when there are no warnings to penalize compatibility.
  const raw = completeness * 0.7 + compatibility * 0.3 + cohesionBonus;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  const band = labelForScore(score);
  return {
    score,
    label: band.label,
    blurb: band.blurb,
    breakdown: {
      completeness,
      compatibility,
      cohesionBonus,
      filled,
      requiredTotal,
      warnings: warnings.length,
      subplotCount,
      subplotOk: !!subplotOk,
      highValueCombos,
    },
  };
}
