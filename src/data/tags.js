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
