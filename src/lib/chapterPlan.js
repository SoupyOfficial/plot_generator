// src/lib/chapterPlan.js
//
// Phase 13: Chapter Planner & Prose Prompt Builder.
//
// Two passes per chapter:
//
//   Pass 1 — buildChapterScaffoldPrompt: bible + previous-chapter summary +
//            beat range → LLM proposes a scaffold (title, POV, scene grid,
//            foreshadow ledger updates, characters present, ~5-sentence
//            outline).
//
//   Pass 2 — buildChapterProsePrompt: bible + scaffold + last paragraph →
//            LLM drafts chapter prose honoring contract, style guide, and
//            current foreshadow state.
//
// Chapter is the right granularity (not page). For ProgFan / serial pacing,
// 2.5–4k word chapters are the genre default; this is the unit fans expect
// and that fits cleanly in modern context windows alongside the bible.

import { promisesActiveAt } from "./seriesPlan.js";

export const DEFAULT_CHAPTER_TARGET_WORDS = 3000;

/**
 * Compact a list of characters for prompts: include only those marked as
 * present in `expectedPresent` ids; fall back to all characters if no list.
 */
function summarizeCharacters(bible, expectedIds) {
  const all = bible?.characters || [];
  const list = expectedIds && expectedIds.length
    ? all.filter((c) => expectedIds.includes(c.id))
    : all;
  return list
    .map((c) => {
      const bits = [];
      if (c.role) bits.push(c.role);
      if (c.archetype) bits.push(c.archetype);
      if (c.classRef) bits.push(c.classRef);
      const tag = bits.length ? ` (${bits.join(" / ")})` : "";
      const arc = c.arcSummary ? ` — ${c.arcSummary}` : "";
      const voice = (c.voiceNotes || []).length
        ? ` Voice: ${c.voiceNotes.slice(0, 2).join("; ")}.`
        : "";
      return `- **${c.name || c.id}**${tag}${arc}${voice}`;
    })
    .join("\n");
}

function summarizeStyleGuide(sg) {
  if (!sg) return "(no style guide)";
  const lines = [];
  if (sg.pov) lines.push(`POV: ${sg.pov}`);
  if (sg.tense) lines.push(`Tense: ${sg.tense}`);
  if ((sg.voiceRules || []).length) {
    lines.push(`Voice rules:\n${sg.voiceRules.map((r) => `  - ${r}`).join("\n")}`);
  }
  if ((sg.doNot || []).length) {
    lines.push(`Do NOT:\n${sg.doNot.map((r) => `  - ${r}`).join("\n")}`);
  }
  return lines.join("\n") || "(no style guide)";
}

function summarizeSystemRules(rules) {
  if (!rules || !rules.length) return "(none)";
  return rules
    .map((r) => `- **${r.name || r.id}:** ${r.rule || r.description || ""}`)
    .join("\n");
}

function summarizeContract(contract) {
  if (!contract) return "(no contract)";
  const out = [];
  if (contract.themeArgument) out.push(`Theme: ${contract.themeArgument}`);
  const sel = contract.selections || {};
  const keep = Object.entries(sel)
    .filter(([, v]) => v != null && v !== "" && (!Array.isArray(v) || v.length))
    .slice(0, 25); // cap to keep prompt focused
  for (const [k, v] of keep) {
    out.push(`- ${k}: ${Array.isArray(v) ? v.join(" / ") : v}`);
  }
  return out.join("\n") || "(empty contract)";
}

function summarizePromises(plan, bookIndex) {
  const open = promisesActiveAt(plan, bookIndex || 1);
  if (!open.length) return "(no open promises)";
  return open
    .map(
      (e) =>
        `- [${e.id}] planted in book ${e.plantedIn?.book} beat ${e.plantedIn?.beat}, pays off in book ${e.paysOffIn?.book} beat ${e.paysOffIn?.beat}: ${e.description}`
    )
    .join("\n");
}

/**
 * Pass 1: Build a chapter-scaffold prompt.
 *
 * @param {Object} args
 * @param {Object} args.bible
 * @param {{book:number, beatStart:number, beatEnd:number}} args.beatRange
 * @param {Object} [args.previousChapter]   { num, title, summary, lastParagraph }
 * @param {number} [args.chapterNumber]
 * @param {number} [args.targetWords]
 */
export function buildChapterScaffoldPrompt({
  bible,
  beatRange,
  previousChapter,
  chapterNumber,
  targetWords = DEFAULT_CHAPTER_TARGET_WORDS,
} = {}) {
  if (!bible) throw new Error("buildChapterScaffoldPrompt: bible required");
  const book = beatRange?.book || 1;
  const beatStart = beatRange?.beatStart || 1;
  const beatEnd = beatRange?.beatEnd || beatStart;

  const system = `You are a chapter-planner for a LitRPG / progression-fantasy serial. Given a STORY BIBLE (contract, style guide, characters, system rules) and a target BEAT RANGE in a specific book, propose ONE chapter scaffold.
Return strict JSON only:
{
  "title": string,
  "povCharacterId": string,
  "setting": string,
  "sceneGrid": { "goal": string, "conflict": string, "outcome": string },
  "outline": [string, string, string, string, string],
  "charactersPresent": [string],
  "foreshadowToPlant": [{ "description": string, "paysOffIn": { "book": number, "beat": number } }],
  "foreshadowToPay": [string],
  "wordCountTarget": number
}
Use only ids that already exist in the bible. Honor the style guide POV/tense and system rules. Do NOT invent magic mechanics that contradict system rules.`;

  const prevBlock = previousChapter
    ? [
        "# PREVIOUS CHAPTER",
        `Number: ${previousChapter.num ?? "?"}`,
        previousChapter.title ? `Title: ${previousChapter.title}` : "",
        previousChapter.summary ? `Summary: ${previousChapter.summary}` : "",
        previousChapter.lastParagraph
          ? `Final paragraph:\n${previousChapter.lastParagraph}`
          : "",
        "",
      ]
        .filter(Boolean)
        .join("\n")
    : "# PREVIOUS CHAPTER\n(none — this is the opener)\n";

  const user = [
    "# CONTRACT",
    summarizeContract(bible.contract),
    "",
    "# STYLE GUIDE",
    summarizeStyleGuide(bible.styleGuide),
    "",
    "# SYSTEM RULES",
    summarizeSystemRules(bible.systemRules),
    "",
    "# CHARACTERS (use these ids verbatim)",
    summarizeCharacters(bible) || "(no characters yet)",
    "",
    "# OPEN FORESHADOW PROMISES",
    summarizePromises(bible.series, book),
    "",
    ...(bible.rollingSummary && bible.rollingSummary.summary
      ? [
          `# RECENT-CONTEXT (last ${bible.rollingSummary.lastNChapters || 3} chapters)`,
          bible.rollingSummary.summary,
          "",
        ]
      : []),
    prevBlock,
    "# TARGET",
    `Chapter number: ${chapterNumber ?? "next"}`,
    `Book: ${book}`,
    `Beat range: ${beatStart}–${beatEnd}`,
    `Target word count: ${targetWords}`,
    "",
    "Return the JSON object now.",
  ].join("\n");

  return { system, user };
}

/**
 * Parse a scaffold response. Tolerates ```json fences. Returns
 * { scaffold, errors }.
 */
export function parseChapterScaffold(text) {
  const cleaned = String(text || "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return { scaffold: null, errors: ["unparseable"] };
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return { scaffold: null, errors: ["unparseable"] };
    }
  }
  if (!parsed || typeof parsed !== "object") {
    return { scaffold: null, errors: ["not-an-object"] };
  }
  const errors = [];
  if (!parsed.title) errors.push("missing-title");
  if (!parsed.sceneGrid) errors.push("missing-sceneGrid");
  if (!Array.isArray(parsed.outline)) errors.push("missing-outline");
  return { scaffold: parsed, errors };
}

/**
 * Pass 2: Build a prose prompt from a finalized scaffold.
 *
 * @param {Object} args
 * @param {Object} args.bible
 * @param {Object} args.scaffold
 * @param {string} [args.previousLastParagraph]
 * @param {number} [args.targetWords]
 */
export function buildChapterProsePrompt({
  bible,
  scaffold,
  previousLastParagraph,
  targetWords,
} = {}) {
  if (!bible) throw new Error("buildChapterProsePrompt: bible required");
  if (!scaffold) throw new Error("buildChapterProsePrompt: scaffold required");

  const target =
    targetWords ||
    scaffold.wordCountTarget ||
    DEFAULT_CHAPTER_TARGET_WORDS;

  const system = `You are a LitRPG / progression-fantasy novelist. Draft ONE chapter as PROSE, honoring the BIBLE (contract, style guide, characters, system rules) and the SCAFFOLD (title, POV, scene grid, outline, foreshadow). Write in the bible's POV and tense. Do not break system rules. Do not invent named characters who are not in the bible. Plant the listed foreshadow naturally; pay off the listed promises with earned setup. Aim for the target word count.
Return PROSE ONLY. Begin with the chapter heading "Chapter ${scaffold.chapterNumber || ""}: ${scaffold.title || ""}" on its own line, then the prose. No commentary, no JSON.`;

  const presentIds = scaffold.charactersPresent || [];

  const user = [
    "# CONTRACT",
    summarizeContract(bible.contract),
    "",
    "# STYLE GUIDE",
    summarizeStyleGuide(bible.styleGuide),
    "",
    "# SYSTEM RULES",
    summarizeSystemRules(bible.systemRules),
    "",
    "# CHARACTERS PRESENT IN THIS CHAPTER",
    summarizeCharacters(bible, presentIds) || "(unspecified — use ids from bible)",
    "",
    ...(bible.rollingSummary && bible.rollingSummary.summary
      ? [
          `# RECENT-CONTEXT (last ${bible.rollingSummary.lastNChapters || 3} chapters)`,
          bible.rollingSummary.summary,
          "",
        ]
      : []),
    "# SCAFFOLD",
    `Title: ${scaffold.title || ""}`,
    `POV: ${scaffold.povCharacterId || "(unspecified)"}`,
    `Setting: ${scaffold.setting || ""}`,
    `Scene goal: ${scaffold.sceneGrid?.goal || ""}`,
    `Scene conflict: ${scaffold.sceneGrid?.conflict || ""}`,
    `Scene outcome: ${scaffold.sceneGrid?.outcome || ""}`,
    "",
    "Outline:",
    ...(scaffold.outline || []).map((s, i) => `${i + 1}. ${s}`),
    "",
    "Foreshadow to plant:",
    ...((scaffold.foreshadowToPlant || []).map(
      (f) =>
        `- ${f.description} (pays off book ${f.paysOffIn?.book}, beat ${f.paysOffIn?.beat})`
    ) || []),
    "",
    "Foreshadow to pay off this chapter:",
    ...((scaffold.foreshadowToPay || []).map((id) => `- ${id}`) || []),
    "",
    previousLastParagraph
      ? `# CONTINUITY — last paragraph of previous chapter:\n${previousLastParagraph}\n`
      : "",
    `# TARGET WORD COUNT: ${target}`,
    "",
    "Draft the chapter now.",
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}

/**
 * Build a "re-roll just one beat range" prompt — useful when the user wants
 * to redo beats 6–10 without recomputing the whole 15-beat plan. Mirrors the
 * scaffold prompt but at beat granularity.
 */
export function buildBeatExpansionPrompt({ bible, beatRange }) {
  if (!bible) throw new Error("buildBeatExpansionPrompt: bible required");
  const book = beatRange?.book || 1;
  const beatStart = beatRange?.beatStart || 1;
  const beatEnd = beatRange?.beatEnd || beatStart;

  const system = `You are a beat-doctor. Given a STORY BIBLE and a target BEAT RANGE within a specific book, propose new content for ONLY those beats. Do not change beats outside the range. Honor contract, style guide, and system rules.
Return strict JSON: { "beats": [ { "index": number, "title": string, "content": string } ] }`;

  const user = [
    "# CONTRACT",
    summarizeContract(bible.contract),
    "",
    "# SYSTEM RULES",
    summarizeSystemRules(bible.systemRules),
    "",
    "# CHARACTERS",
    summarizeCharacters(bible) || "(none)",
    "",
    "# OPEN FORESHADOW",
    summarizePromises(bible.series, book),
    "",
    "# TARGET",
    `Book: ${book}`,
    `Beat range to redo: ${beatStart}–${beatEnd}`,
    "",
    "Return the JSON now.",
  ].join("\n");

  return { system, user };
}
