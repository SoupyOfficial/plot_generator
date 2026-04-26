// src/lib/reverseEngineer.js
//
// Phase 10: Reverse Mode.
//
// Given prose (premise / synopsis / chapter 1), build a prompt that asks the
// LLM to fill the LAYERS schema, and parse + validate the response against
// the actual option allow-lists.
//
// Mirrors the design of fillRest.js intentionally so the UI's diff-and-accept
// flow can be reused.

import { buildFieldIndex, normalizeOption, optionValue } from "./options.js";

/**
 * Collect EVERY single-select field with its allow-list. Unlike
 * `collectEmptyFields`, we include filled fields too — but mark them, so the
 * model can choose whether to confirm or override.
 */
function collectAllFields(layers) {
  const out = [];
  for (const layer of layers || []) {
    for (const group of layer.groups || []) {
      for (const comp of group.components || []) {
        if (comp.multi || comp.freeform) continue;
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
 * Build the reverse-engineer prompt.
 *
 * @param {Object} args
 * @param {Array}  args.layers
 * @param {string} args.prose - the user's existing prose / synopsis / pitch
 * @param {Object} [args.knownSelections] - previously made user selections;
 *   model is told these are NOT to be overridden unless contradicted by prose.
 */
export function buildReverseEngineerPrompt({ layers, prose, knownSelections } = {}) {
  const fields = collectAllFields(layers);
  const idx = buildFieldIndex(layers || []);

  const knownLines = [];
  for (const [fieldId, v] of Object.entries(knownSelections || {})) {
    const comp = idx[fieldId];
    if (!comp || comp.multi) continue;
    if (v == null || v === "") continue;
    knownLines.push(`- ${comp.label || fieldId}: ${v}`);
  }

  const schemaBlock = fields
    .map(
      (f) =>
        `### ${f.fieldId} — ${f.label}\n${f.options.map((o) => `  - ${o}`).join("\n")}`
    )
    .join("\n\n");

  const system = `You are a story-structure analyst. The user will paste prose (a premise, synopsis, or chapter 1). Your job is to fill a LitRPG / progression-fantasy story schema by inferring values from the prose.
Rules:
1. For each schema field, output ONE value chosen verbatim from that field's allow-list.
2. If the prose does not give enough signal for a field, OMIT that field. Do not invent.
3. Prefer the most specific value the prose justifies; do not over-claim.
4. Return a single JSON object: { "fieldId": "chosen value", ... }. No prose, no markdown.`;

  const user = [
    "# AUTHOR-PROVIDED CHOICES (treat as truth unless prose contradicts)",
    knownLines.length ? knownLines.join("\n") : "(none)",
    "",
    "# PROSE TO ANALYZE",
    String(prose || "").trim() || "(no prose provided)",
    "",
    "# SCHEMA — pick one value per field, verbatim, from each allow-list",
    schemaBlock,
    "",
    "Return the JSON object now.",
  ].join("\n");

  return { system, user, allFieldIds: fields.map((f) => f.fieldId) };
}

/**
 * Parse a reverse-engineer response. Same allow-list validation as fillRest.
 * Returns { accepted, rejected }.
 */
export function parseReverseEngineerResponse(text, layers) {
  const cleaned = String(text || "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
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
      rejected.push({ fieldId, value, reason: "not-in-allow-list" });
      continue;
    }
    accepted[fieldId] = value;
  }
  return { accepted, rejected };
}

/**
 * Build a "diagnose drift" prompt: given a current contract and recent draft
 * prose, ask the model to flag where the draft has stopped honoring the
 * contract.
 */
export function buildDiagnoseDriftPrompt({ contract, prose }) {
  const summary = (() => {
    if (!contract?.selections) return "(empty)";
    return Object.entries(contract.selections)
      .filter(([, v]) => v != null && v !== "" && (!Array.isArray(v) || v.length))
      .map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(" / ") : v}`)
      .join("\n");
  })();

  const system = `You are a manuscript continuity reviewer. Given a story CONTRACT (locked structural choices) and DRAFT PROSE, identify places where the draft contradicts, weakens, or silently abandons the contract.
For each issue, return: { fieldId, contractSays, draftDoes, severity: "critical"|"warning"|"nudge", quote }.
Return JSON: { "issues": [...] }. No prose outside the JSON.`;

  const user = [
    "# CONTRACT",
    summary,
    "",
    contract?.themeArgument
      ? `Theme argument: ${contract.themeArgument}\n`
      : "",
    "# DRAFT PROSE",
    String(prose || "").trim() || "(no prose)",
    "",
    "Return the JSON object now.",
  ].join("\n");

  return { system, user };
}

/**
 * Parse a diagnose-drift response. Always returns { issues: [...] } — never
 * throws on bad input.
 */
export function parseDiagnoseDriftResponse(text) {
  const cleaned = String(text || "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return { issues: [] };
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return { issues: [] };
    }
  }
  if (!parsed || typeof parsed !== "object") return { issues: [] };
  const issues = Array.isArray(parsed.issues) ? parsed.issues : [];
  return { issues: issues.filter((x) => x && typeof x === "object") };
}
