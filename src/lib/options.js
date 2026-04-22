// src/lib/options.js
//
// Option metadata helpers. Supports mixed input: options can be plain strings
// OR objects ({ value, description?, tags?, forbids?, implies?, requires? }).
//
// Phase 1 of the roadmap — the foundation that unlocks data-driven validation,
// dynamic filtering, and richer LLM prompts.

/**
 * Normalize an option (string | object) to a canonical object shape.
 */
export function normalizeOption(opt) {
  if (opt == null) return null;
  if (typeof opt === "string") return { value: opt };
  if (typeof opt === "object" && typeof opt.value === "string") {
    return {
      value: opt.value,
      description: opt.description,
      tags: opt.tags,
      forbids: opt.forbids,
      implies: opt.implies,
      requires: opt.requires,
    };
  }
  return null;
}

/**
 * Extract the stored value from a mixed string|object option.
 */
export function optionValue(opt) {
  const n = normalizeOption(opt);
  return n ? n.value : "";
}

/**
 * Flatten all component definitions across LAYERS into a field-id → component map.
 */
export function buildFieldIndex(layers) {
  const index = {};
  for (const layer of layers) {
    for (const group of layer.groups || []) {
      for (const comp of group.components || []) {
        index[comp.id] = { ...comp, layerId: layer.id, groupId: group.id };
      }
    }
  }
  return index;
}

/**
 * Locate the normalized option object for a field+value pair.
 */
export function findOption(fieldIndex, fieldId, value) {
  const comp = fieldIndex[fieldId];
  if (!comp || !Array.isArray(comp.options)) return null;
  for (const raw of comp.options) {
    const n = normalizeOption(raw);
    if (n && n.value === value) return n;
  }
  return null;
}

/**
 * True if a single current selection matches a `forbids` / `implies` spec.
 * Spec can be a single string or an array of allowed matches. A wildcard
 * "*" matches any non-empty value. Matches are substring-based (case insensitive).
 */
function specMatches(spec, currentValue) {
  if (spec == null) return false;
  const values = Array.isArray(spec) ? spec : [spec];
  const current = (currentValue || "").toString().toLowerCase();
  if (!current) return false;
  for (const s of values) {
    if (s === "*") return true;
    if (typeof s !== "string") continue;
    if (current.includes(s.toLowerCase())) return true;
  }
  return false;
}

/**
 * Given a proposed (fieldId, option) and the user's current selections, return
 * the list of conflicts — each `{ otherField, currentValue, spec }` — that
 * would make this option incompatible. Empty array means "safe to pick."
 *
 * Handles both directions:
 *   1. The proposed option's own `forbids` vs. current selections
 *   2. Already-selected options whose `forbids` rule out the proposed value
 */
export function conflictsForOption(fieldIndex, selections, fieldId, option) {
  const normalized = normalizeOption(option);
  if (!normalized) return [];

  const conflicts = [];

  // (1) Proposed option forbids something the user already picked
  for (const [otherField, spec] of Object.entries(normalized.forbids || {})) {
    const currentValue = selections[otherField];
    if (Array.isArray(currentValue)) {
      // multi-select: any matching entry is a conflict
      for (const v of currentValue) {
        if (specMatches(spec, v)) {
          conflicts.push({ otherField, currentValue: v, spec, direction: "forward" });
        }
      }
    } else if (specMatches(spec, currentValue)) {
      conflicts.push({ otherField, currentValue, spec, direction: "forward" });
    }
  }

  // (2) Current selections forbid THIS value
  for (const [otherField, otherValue] of Object.entries(selections)) {
    if (otherField === fieldId) continue;
    const values = Array.isArray(otherValue) ? otherValue : [otherValue];
    for (const v of values) {
      const otherOpt = findOption(fieldIndex, otherField, v);
      const spec = otherOpt?.forbids?.[fieldId];
      if (spec && specMatches(spec, normalized.value)) {
        conflicts.push({
          otherField,
          currentValue: v,
          spec,
          direction: "reverse",
        });
      }
    }
  }

  return conflicts;
}

/**
 * Collect ALL active forbid conflicts across current selections. Used to
 * produce validation warnings without re-running per-option in the UI.
 */
export function collectForbidConflicts(fieldIndex, selections) {
  const warnings = [];
  const seen = new Set();
  for (const [fieldId, value] of Object.entries(selections)) {
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) {
      if (!v) continue;
      const opt = findOption(fieldIndex, fieldId, v);
      if (!opt?.forbids) continue;
      for (const [otherField, spec] of Object.entries(opt.forbids)) {
        const otherValue = selections[otherField];
        const otherValues = Array.isArray(otherValue) ? otherValue : [otherValue];
        for (const ov of otherValues) {
          if (specMatches(spec, ov)) {
            const key = [fieldId, v, otherField, ov].join("|");
            if (seen.has(key)) continue;
            seen.add(key);
            warnings.push({
              severity: "hard",
              fieldId,
              value: v,
              otherField,
              otherValue: ov,
              message:
                opt.description
                  ? `${fieldId}=${v} is incompatible with ${otherField}=${ov}. ${opt.description}`
                  : `${fieldId}=${v} is incompatible with ${otherField}=${ov}.`,
            });
          }
        }
      }
    }
  }
  return warnings;
}
