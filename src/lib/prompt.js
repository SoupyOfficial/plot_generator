// src/lib/prompt.js
//
// Phase 2 of the roadmap: structured, sectioned prompt instead of a raw
// JSON.stringify dump. Pulls option descriptions into context, detects
// high-value combos from system_story_data, and appends optional user notes.

import { normalizeOption, findOption, buildFieldIndex } from "./options.js";

/**
 * Resolve a stored selection value → human-friendly line "value — description".
 */
function resolveLine(fieldIndex, fieldId, value) {
  const opt = findOption(fieldIndex, fieldId, value);
  if (opt?.description) return `${opt.value} — ${opt.description}`;
  return value;
}

/**
 * Render a single non-multi field as a Markdown bullet (skip empty selections).
 */
function renderField(fieldIndex, selections, fieldId, label) {
  const v = selections[fieldId];
  if (!v || (Array.isArray(v) && v.length === 0)) return null;
  if (Array.isArray(v)) {
    const rendered = v.map((x) => `  - ${resolveLine(fieldIndex, fieldId, x)}`).join("\n");
    return `- **${label}:**\n${rendered}`;
  }
  return `- **${label}:** ${resolveLine(fieldIndex, fieldId, v)}`;
}

/**
 * Theme → argument sentence map. Kept in sync with App.jsx themeQuestion().
 */
const THEME_ARGUMENTS = {
  "Power vs Humanity":
    "Can you grow strong enough to matter without losing what made you worth saving?",
  "Control vs Freedom":
    "Is the order the system provides worth the autonomy it costs?",
  "Survival vs Morality":
    "Does surviving without your values still count as living?",
  "Progress vs Identity":
    "Does becoming more mean leaving behind who you were?",
  "Knowledge vs Consequence":
    "Is knowing the truth worth the agency it destroys?",
  "Individual vs Collective":
    "Does your growth serve only you, and if so — is that enough?",
  "Truth vs Comfort":
    "Is understanding the system's real purpose worth shattering everything you believed?",
};

/**
 * Detect any high-value combo from system_story_data.highValueCombos that fits
 * the user's archetype + resolution-mode selections.
 *
 * highValueCombos entries look like:
 *   { archetype: "The Exploiter", resolution: "Reformation", note: "..." }
 */
function detectHighValueCombos(systemDesign, selections) {
  const combos = systemDesign?.highValueCombos;
  if (!Array.isArray(combos)) return [];
  const arc = (selections.archetype || "").toLowerCase();
  const res = (selections.resolutionMode || "").toLowerCase();
  return combos.filter((c) => {
    const a = (c.archetype || "").toLowerCase();
    const r = (c.resolution || c.resolutionMode || "").toLowerCase();
    return (!a || arc.includes(a)) && (!r || res.includes(r));
  });
}

/**
 * Build the sectioned, human-readable brief that goes to the model as `user`.
 * Skips empty sections automatically.
 *
 * @param {object} args
 * @param {Array} args.layers - LAYERS array (for field index)
 * @param {object} args.selections
 * @param {object} [args.systemDesign] - SYSTEM_STORY_DESIGN from system_story_data
 * @param {string[]} [args.activeWarnings] - validation warnings to restate as constraints
 * @param {string} [args.userNotes] - freeform textarea content
 */
export function buildStructuredBrief({
  layers,
  selections,
  systemDesign,
  activeWarnings,
  userNotes,
}) {
  const idx = buildFieldIndex(layers || []);
  const sections = [];

  const push = (title, body) => {
    if (body && body.trim()) sections.push(`## ${title}\n${body.trim()}`);
  };

  // MACRO — WORLD
  push(
    "Macro — World",
    [
      renderField(idx, selections, "integrationType", "Integration"),
      renderField(idx, selections, "worldScale", "World scale"),
      renderField(idx, selections, "techLevel", "Tech level"),
    ]
      .filter(Boolean)
      .join("\n")
  );

  // MACRO — SYSTEM
  push(
    "Macro — System",
    [
      renderField(idx, selections, "systemVisibility", "Visibility"),
      renderField(idx, selections, "systemOrigin", "Origin"),
      renderField(idx, selections, "systemPurpose", "Purpose (hidden archetype)"),
      renderField(idx, selections, "systemAlignment", "Alignment"),
      renderField(idx, selections, "systemCeiling", "Ceiling"),
    ]
      .filter(Boolean)
      .join("\n")
  );

  // MACRO — ENTRY + CONFLICT
  push(
    "Macro — Entry & Conflict",
    [
      renderField(idx, selections, "entryCondition", "Entry condition"),
      renderField(idx, selections, "startingState", "Starting state"),
      renderField(idx, selections, "knowledgeAdvantage", "Knowledge advantage"),
      renderField(idx, selections, "primaryConflict", "Primary conflict"),
      renderField(idx, selections, "conflictOrigin", "Conflict origin"),
    ]
      .filter(Boolean)
      .join("\n")
  );

  // MACRO — ENDING (LOCKED)
  push(
    "Macro — Ending (LOCKED: all 15 beats must converge here)",
    [
      renderField(idx, selections, "resolutionMode", "Resolution mode"),
      renderField(idx, selections, "protagonistOutcome", "Protagonist outcome"),
    ]
      .filter(Boolean)
      .join("\n")
  );

  // MID — PROGRESSION, ANTAGONIST, FACTIONS, STAKES, REVELATION
  push(
    "Mid — Progression",
    [
      renderField(idx, selections, "progressionMechanic", "Mechanic"),
      renderField(idx, selections, "progressionPacing", "Pacing"),
      renderField(idx, selections, "powerCeilingFeel", "Ceiling feel"),
      renderField(idx, selections, "powerExpression", "Power expression"),
    ]
      .filter(Boolean)
      .join("\n")
  );
  push(
    "Mid — Antagonist",
    [
      renderField(idx, selections, "antagonistType", "Type"),
      renderField(idx, selections, "antagonistMotivation", "Motivation"),
      renderField(idx, selections, "antagonistReveal", "Reveal timing"),
    ]
      .filter(Boolean)
      .join("\n")
  );
  push(
    "Mid — Factions",
    [
      renderField(idx, selections, "factionLandscape", "Landscape"),
      renderField(idx, selections, "factionRole", "Protagonist role"),
      renderField(idx, selections, "politicalTexture", "Political texture"),
    ]
      .filter(Boolean)
      .join("\n")
  );
  push(
    "Mid — Stakes",
    [
      renderField(idx, selections, "escalationType", "Escalation"),
      renderField(idx, selections, "costOfPower", "Cost of power"),
    ]
      .filter(Boolean)
      .join("\n")
  );
  push(
    "Mid — System Revelation",
    [
      renderField(idx, selections, "truthRevealPacing", "Reveal pacing"),
      renderField(idx, selections, "revelationTrigger", "Revelation trigger"),
      renderField(idx, selections, "truthImpact", "Truth impact"),
    ]
      .filter(Boolean)
      .join("\n")
  );

  // SUBPLOTS
  push("Subplots", renderField(idx, selections, "subplots", "Subplots"));

  // PROTAGONIST
  push(
    "Protagonist",
    [
      renderField(idx, selections, "archetype", "Archetype"),
      renderField(idx, selections, "flawType", "Flaw"),
      renderField(idx, selections, "flawArc", "Flaw arc"),
      renderField(idx, selections, "howTheyWin", "How they win"),
      renderField(idx, selections, "competencyReveal", "Competency reveal"),
    ]
      .filter(Boolean)
      .join("\n")
  );

  // MICRO
  push(
    "Micro — Texture",
    [
      renderField(idx, selections, "primaryTone", "Primary tone"),
      renderField(idx, selections, "toneConsistency", "Tone consistency"),
      renderField(idx, selections, "chapterStructure", "Chapter structure"),
      renderField(idx, selections, "actionRestRatio", "Action/rest"),
      renderField(idx, selections, "infoRelease", "Info release"),
      renderField(idx, selections, "hookType", "Hook type"),
    ]
      .filter(Boolean)
      .join("\n")
  );

  // SERIES
  push(
    "Series",
    [
      renderField(idx, selections, "arcType", "Arc type"),
      renderField(idx, selections, "seriesCeiling", "Series ceiling"),
      renderField(idx, selections, "antiDrift", "Anti-drift locks"),
    ]
      .filter(Boolean)
      .join("\n")
  );

  // THEME (+ argument sentence)
  const primaryTheme = selections.primaryTheme;
  if (primaryTheme) {
    const argSentence = THEME_ARGUMENTS[primaryTheme] || "—";
    const parts = [
      `- **Primary theme:** ${primaryTheme}`,
      `- **Argument (must be the book's central question):** "${argSentence}"`,
    ];
    if (selections.secondaryTheme && selections.secondaryTheme !== "None") {
      parts.push(`- **Secondary theme:** ${selections.secondaryTheme}`);
    }
    push("Central Tension", parts.join("\n"));
  }

  // HIGH-VALUE COMBOS
  const combos = detectHighValueCombos(systemDesign, selections);
  if (combos.length > 0) {
    const body = combos
      .map(
        (c) =>
          `- **${c.archetype || "?"} × ${c.resolution || c.resolutionMode || "?"}:** ${c.note || c.description || ""}`
      )
      .join("\n");
    push("High-Value Combos Detected", body);
  }

  // ACTIVE CONSTRAINTS (from validation warnings, restated as requirements)
  if (Array.isArray(activeWarnings) && activeWarnings.length > 0) {
    const body = activeWarnings
      .map((w) => `- ${typeof w === "string" ? w : w.message || ""}`)
      .filter((s) => s.length > 2)
      .join("\n");
    push(
      "Active Constraints (must be honored in beats & seed)",
      body
    );
  }

  // USER NOTES
  if (userNotes && userNotes.trim()) {
    push("User Notes (verbatim — honor tone & specifics)", userNotes.trim());
  }

  return sections.join("\n\n");
}

/**
 * System prompt — identical intent to the original, refined for clarity.
 */
export const SYSTEM_PROMPT = `You are a story structure assistant for LitRPG / Progression Fantasy. Given a set of structural selections, produce:

1. A one-paragraph STORY SEED (150–200 words) written as a back-cover blurb in plain English. It must clearly imply the locked ending without spoiling the twist, and must surface the central theme as tension.
2. A BEAT MAP: map all 15 Save the Cat beats (Opening Image, Theme Stated, Setup, Catalyst, Debate, Break into Act Two, B Story, Fun and Games, Midpoint, Bad Guys Close In, All Is Lost, Dark Night of the Soul, Break into Act Three, Finale, Final Image) to concrete, specific moments derived from the user's selections. One or two sentences per beat.

Honor every item under "Active Constraints" and "User Notes" exactly. Let the option descriptions guide the *feel* of the beats, not just the labels.

Output strictly as JSON with shape: {"seed": "...", "beats": [{"name":"Opening Image","description":"..."}, ...]} and nothing else. No code fences.`;

/**
 * Top-level prompt builder. Returns { system, user } ready for Anthropic / OpenAI.
 */
export function buildGenerationPrompt({
  layers,
  selections,
  systemDesign,
  activeWarnings,
  userNotes,
}) {
  const brief = buildStructuredBrief({
    layers,
    selections,
    systemDesign,
    activeWarnings,
    userNotes,
  });
  return {
    system: SYSTEM_PROMPT,
    user: `# STORY BRIEF\n\n${brief}`,
  };
}
