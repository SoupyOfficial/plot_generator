// src/lib/rarity.js
//
// Classify a completed (or in-progress) selection as Common / Uncommon /
// Rare / Legendary based on:
//   1. Number of distinct tag overlaps across selected options
//   2. Number of high-value combos triggered
//   3. Completeness (incomplete seeds cap at "Common")
//
// Pure computation. No side effects.

import { buildFieldIndex, normalizeOption, findOption } from "./options.js";
import { detectHighValueCombos } from "./prompt.js";

const TIERS = [
  { min: 14, tier: "Legendary", blurb: "A rare alignment of themes, combos, and tonal resonance." },
  { min: 9,  tier: "Rare",      blurb: "Multiple thematic echoes and at least one classic combo." },
  { min: 5,  tier: "Uncommon",  blurb: "Some shared motifs across selections." },
  { min: 0,  tier: "Common",    blurb: "Functional, but unremarkable — consider leaning into a motif." },
];

export const RARITY_ORDER = ["Common", "Uncommon", "Rare", "Legendary"];

/**
 * Count how many (tag, occurrences>1) pairs exist across all selected options.
 * A tag shared by 2 options = 1 overlap. Shared by 3 = 2 overlaps. Etc.
 */
function countTagOverlaps(fieldIndex, selections) {
  const counts = new Map();
  for (const [fieldId, v] of Object.entries(selections || {})) {
    const values = Array.isArray(v) ? v : [v];
    for (const x of values) {
      const opt = findOption(fieldIndex, fieldId, x);
      if (!opt?.tags) continue;
      for (const t of opt.tags) counts.set(t, (counts.get(t) || 0) + 1);
    }
  }
  let overlaps = 0;
  const shared = [];
  for (const [tag, n] of counts.entries()) {
    if (n > 1) {
      overlaps += n - 1;
      shared.push({ tag, count: n });
    }
  }
  shared.sort((a, b) => b.count - a.count);
  return { overlaps, shared };
}

function tierForScore(score) {
  for (const t of TIERS) if (score >= t.min) return t;
  return TIERS[TIERS.length - 1];
}

/**
 * @param {object} args
 * @param {Array}  args.layers
 * @param {object} args.selections
 * @param {object} [args.systemDesign]
 * @param {number} [args.warningsCount]
 * @returns {{ tier, score, blurb, overlaps, combos, topTags }}
 */
export function computeRarity({ layers, selections = {}, systemDesign, warningsCount = 0 } = {}) {
  const idx = buildFieldIndex(layers || []);
  const { overlaps, shared } = countTagOverlaps(idx, selections);
  const combos = systemDesign ? detectHighValueCombos(systemDesign, selections).length : 0;

  // Score composition:
  //   tag overlaps count directly (1 pt each)
  //   every combo is worth 4 pts
  //   every active warning drops 2 pts (contradictions reduce rarity)
  const score = Math.max(0, overlaps + combos * 4 - warningsCount * 2);

  // Cap at Common if essentially empty.
  const anyFilled = Object.values(selections).some(
    (v) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0)
  );
  const band = anyFilled ? tierForScore(score) : TIERS[TIERS.length - 1];

  return {
    tier: band.tier,
    blurb: band.blurb,
    score,
    overlaps,
    combos,
    topTags: shared.slice(0, 5),
  };
}
