// src/lib/fillRest.js
//
// "Fill the rest with me" — single-shot LLM completion of empty fields.
//
// Per decision: v1 is a single round-trip. We ask the model for a JSON map
// { fieldId: chosenValue } restricted to the allow-list we provide, then
// validate each value against the field's actual options before merging.

import { buildFieldIndex, normalizeOption, optionValue } from "./options.js";

/**
 * Collect single-select fields whose current value is empty.
 * Returns [{ fieldId, label, description?, options: string[] }].
 * Skips multi-select and freeform fields (v1 scope).
 */
export function collectEmptyFields(layers, selections) {
  const out = [];
  for (const layer of layers || []) {
    for (const group of layer.groups || []) {
      for (const comp of group.components || []) {
        if (comp.multi || comp.freeform) continue;
        const v = selections?.[comp.id];
        if (v != null && v !== "") continue;
        const values = (comp.options || [])
          .map((o) => optionValue(o))
          .filter(Boolean);
        if (!values.length) continue;
        out.push({
          fieldId: comp.id,
          label: comp.label || comp.id,
          options: values,
        });
      }
    }
  }
  return out;
}

/**
 * Build a prompt asking the model to pick one value per empty field.
 * Strictly lists allowed values so the model can't invent text.
 */
export function buildFillPrompt({ layers, selections, userNotes }) {
  const empties = collectEmptyFields(layers, selections);

  // Surface the currently-filled choices so the model can keep consistency.
  const idx = buildFieldIndex(layers || []);
  const currentLines = [];
  for (const [fieldId, v] of Object.entries(selections || {})) {
    const comp = idx[fieldId];
    if (!comp || comp.multi) continue;
    if (v == null || v === "") continue;
    const norm = (comp.options || [])
      .map(normalizeOption)
      .find((o) => o && o.value === v);
    currentLines.push(
      `- ${comp.label || fieldId}: ${v}${norm?.description ? ` — ${norm.description}` : ""}`
    );
  }

  const emptyBlock = empties
    .map((f) => `### ${f.fieldId} — ${f.label}\n${f.options.map((o) => `  - ${o}`).join("\n")}`)
    .join("\n\n");

  const system = `You are a story-structure assistant completing a progression-fantasy story seed.
The user has filled some choices. Fill each REMAINING field by picking ONE value from its allow-list — verbatim.
Rules:
1. Every value you return MUST appear verbatim in that field's allow-list.
2. Stay consistent with the user's existing choices (echo their tone, stakes, and world).
3. Return a single JSON object of the form { "fieldId": "chosen value", ... }. No prose, no markdown.
4. If a field genuinely has no good fit, omit it from the JSON rather than inventing a value.`;

  const user = [
    "# CURRENT CHOICES",
    currentLines.length ? currentLines.join("\n") : "(none yet)",
    "",
    "# REMAINING FIELDS TO FILL",
    empties.length ? emptyBlock : "(all fields are already filled)",
    userNotes ? `\n# USER NOTES\n${userNotes}` : "",
    "",
    "Return the JSON object now.",
  ].join("\n");

  return { system, user, emptyFieldIds: empties.map((e) => e.fieldId) };
}

/**
 * Parse + validate a model response.
 * Returns { accepted: { fieldId: value }, rejected: [{ fieldId, value, reason }] }.
 */
export function parseFillResponse(text, layers) {
  const cleaned = String(text || "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Try to recover by extracting first {...} block.
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return { accepted: {}, rejected: [{ reason: "unparseable" }] };
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return { accepted: {}, rejected: [{ reason: "unparseable" }] };
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { accepted: {}, rejected: [{ reason: "not-an-object" }] };
  }

  const idx = buildFieldIndex(layers || []);
  const accepted = {};
  const rejected = [];
  for (const [fieldId, value] of Object.entries(parsed)) {
    const comp = idx[fieldId];
    if (!comp) {
      rejected.push({ fieldId, value, reason: "unknown-field" });
      continue;
    }
    if (comp.multi || comp.freeform) {
      rejected.push({ fieldId, value, reason: "unsupported-field-type" });
      continue;
    }
    const allowed = (comp.options || []).map((o) => optionValue(o));
    if (!allowed.includes(value)) {
      rejected.push({ fieldId, value, reason: "value-not-in-allow-list" });
      continue;
    }
    accepted[fieldId] = value;
  }
  return { accepted, rejected };
}

/**
 * Merge accepted fills into selections. Never overwrites existing values.
 */
export function applyFillResult(selections, accepted) {
  const out = { ...(selections || {}) };
  for (const [fieldId, value] of Object.entries(accepted || {})) {
    const current = out[fieldId];
    if (current == null || current === "") {
      out[fieldId] = value;
    }
  }
  return out;
}
