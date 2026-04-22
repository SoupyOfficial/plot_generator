// src/lib/presets.js
//
// Apply a preset to the user's current selections.
//
// Conflict model (per decision #2 "confirm + replace conflicting"):
//   - For each field the preset sets, if current selections have a different
//     value for that field, it's a conflict.
//   - Callers should show a confirm dialog listing conflicts before replacing.
//   - When applied with replaceConflicting=true, preset values win on conflicts.
//   - Fields not mentioned by the preset are left untouched.

/**
 * Return the list of fields that would change if preset were applied.
 * Each item: { fieldId, current, next }.
 */
export function conflictsForPreset(currentSelections, preset) {
  if (!preset || !preset.selections) return [];
  const conflicts = [];
  for (const [fieldId, next] of Object.entries(preset.selections)) {
    const current = currentSelections?.[fieldId];
    // Only a conflict if the user already set a different value.
    if (current != null && current !== "" && current !== next) {
      conflicts.push({ fieldId, current, next });
    }
  }
  return conflicts;
}

/**
 * Merge preset.selections into currentSelections.
 *
 * Options:
 *   replaceConflicting (default true): when true, preset values overwrite
 *     differing current values. When false, current values win.
 *
 * Returns a NEW selections object (does not mutate input).
 */
export function applyPreset(currentSelections, preset, opts = {}) {
  const { replaceConflicting = true } = opts;
  const base = { ...(currentSelections || {}) };
  if (!preset || !preset.selections) return base;

  for (const [fieldId, next] of Object.entries(preset.selections)) {
    const current = base[fieldId];
    const hasCurrent = current != null && current !== "";
    if (!hasCurrent || replaceConflicting) {
      base[fieldId] = next;
    }
    // else: keep current
  }
  return base;
}
