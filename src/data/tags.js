// src/data/tags.js
//
// Strict allow-list of tags used on Option objects in App.jsx.
// Keep this list short and meaningful. Adding a new tag? Add it here first,
// then use it on an option. Unknown tags trigger a dev-time warning
// (see `assertKnownTags`).
//
// Grouping is informational — code only cares about membership in ALLOWED_TAGS.

export const TAG_GROUPS = {
  // What this option implies structurally
  structural: [
    "mystery",              // story leans on unknowns
    "mystery-friendly",     // option plays well with mystery arcs
    "twist",                // single-reveal payoff
    "requires-breadcrumbs", // needs early setup to land
    "foreknowledge",        // protagonist knows things the reader doesn't
    "compounding-required", // must escalate or premise stalls
  ],
  // Character/arc coloring
  character: [
    "pragmatic",
    "tool-user",
    "cerebral",
    "autonomous",
    "constructive",
    "reluctant",
    "faith-break",
  ],
  // System/world stance
  worldStance: [
    "anti-system",
    "audience-pressure",
    "visible-constraint",
  ],
  // Protagonist life stage (new)
  lifeStage: [
    "adolescent",
    "threshold-adult",
    "quarter-life",
    "mid-life",
    "late-career",
    "elder",
    "generational",
  ],
  // Coming-of-age / identity-transition axis (new)
  identityTransition: [
    "first-competence",
    "moral-compromise",
    "vocation",
    "authority-transfer",
    "body-change",
    "reckoning-prior-self",
    "parenthood",
    "mortality",
    "class-crossing",
    "first-love-loss",
  ],
  // Structural trope / story engine (new)
  storyEngine: [
    "tournament",
    "tower-climb",
    "dungeon-delve",
    "regression-loop",
    "base-building",
    "war-campaign",
    "investigation",
    "expedition",
    "slice-of-life",
    "revenge-quest",
    "wave-defense",
    "academy-arc",
  ],
  // Protagonist origin (new)
  origin: [
    "native",
    "isekai",
    "reincarnation",
    "transmigration",
    "regression",
    "awakened",
    "constructed",
    "reborn-in-novel",
  ],
  // Theme coloring (new)
  theme: [
    "found-family",
    "belonging",
    "legacy",
    "duty-vs-desire",
    "becoming",
    "self-authorship",
  ],
  // Protagonist class / genre identity (new)
  protagonistClass: [
    "summoner",
    "necromancer",
    "crafter",
    "merchant",
    "healer",
    "rogue",
    "knight",
    "mage",
    "warrior",
    "ranger",
    "beast-tamer",
    "alchemist",
    "enchanter",
    "bard",
    "unique-class",
    "classless",
    "monster-pov",
  ],
  // Relational anchor (new)
  relational: [
    "lone-wolf",
    "duo",
    "found-family-bond",
    "blood-family",
    "spouse",
    "child-dependent",
    "elder-dependent",
    "master-disciple",
    "rival-pair",
    "community",
  ],
  // Body / mortality (new)
  body: [
    "youthful",
    "chronic-illness",
    "aging",
    "augmented",
    "post-human",
    "dysphoric",
    "disabled",
  ],
};

export const ALLOWED_TAGS = new Set(
  Object.values(TAG_GROUPS).flat()
);

/**
 * Returns true if every tag in `tags` is in the allow-list.
 */
export function areTagsValid(tags) {
  if (!Array.isArray(tags)) return true; // no tags is fine
  return tags.every((t) => ALLOWED_TAGS.has(t));
}

/**
 * Return the subset of `tags` that are NOT in the allow-list.
 */
export function unknownTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags.filter((t) => !ALLOWED_TAGS.has(t));
}

/**
 * Dev-only: walks a LAYERS array and console.warns for any unknown tags.
 * Safe to call in production (no-op unless unknown tags found).
 */
export function assertKnownTags(layers) {
  const bad = [];
  for (const layer of layers || []) {
    for (const group of layer.groups || []) {
      for (const comp of group.components || []) {
        for (const opt of comp.options || []) {
          if (opt && typeof opt === "object" && Array.isArray(opt.tags)) {
            const unknown = unknownTags(opt.tags);
            if (unknown.length) {
              bad.push({ fieldId: comp.id, value: opt.value, unknown });
            }
          }
        }
      }
    }
  }
  if (bad.length && typeof console !== "undefined") {
    // eslint-disable-next-line no-console
    console.warn("[tags] unknown tags detected:", bad);
  }
  return bad;
}
