// src/lib/bible.js
//
// Phase 12: Story Bible.
//
// The bible is contract + series plan + characters + locations + factions +
// lore + glossary + style guide + system rules + chapter history, all in one
// versioned envelope. This is the artifact that drives prose generation in
// Phase 13.
//
// Pure functions; no DOM. All updates are immutable.

import { CONTRACT_VERSION } from "./contract.js";

export const BIBLE_VERSION = "1.0";

let _idCounter = 0;
function nextId(prefix = "ent") {
  _idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${_idCounter.toString(36)}`;
}

/**
 * @typedef {Object} Character
 * @property {string} id
 * @property {string} name
 * @property {string} [role]            "protagonist"|"antagonist"|"ally"|...
 * @property {string} [archetype]
 * @property {string} [classRef]
 * @property {string} [lifeStage]
 * @property {string[]} [anchors]       relational anchors
 * @property {string} [arcSummary]
 * @property {string[]} [voiceNotes]    speech tags / verbal tics
 * @property {Array<{book:number,beat:number}>} [beatsPresent]
 *
 * @typedef {Object} StyleGuide
 * @property {string} [pov]
 * @property {string} [tense]
 * @property {string[]} [voiceRules]
 * @property {string[]} [doNot]
 *
 * @typedef {Object} StoryBible
 * @property {string} version
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {Object} contract          a StoryContract
 * @property {Object} series            a SeriesPlan
 * @property {Character[]} characters
 * @property {Array} locations
 * @property {Array} factions
 * @property {Array} lore
 * @property {Array} glossary
 * @property {StyleGuide} styleGuide
 * @property {Array} systemRules
 * @property {Array} chapters           ChapterRecord[]
 */

/**
 * Create an empty bible from an existing contract + series plan.
 */
export function createBible(contract, series) {
  const now = new Date().toISOString();
  return {
    version: BIBLE_VERSION,
    createdAt: now,
    updatedAt: now,
    contract: contract || null,
    series: series || null,
    characters: [],
    locations: [],
    factions: [],
    lore: [],
    glossary: [],
    styleGuide: { pov: "", tense: "", voiceRules: [], doNot: [] },
    systemRules: [],
    chapters: [],
    // Rolling-summary slot. Surfaces a recent-context window into the next
    // chapter prompt without dragging the entire bible into the LLM call.
    // `summary` is a free-form recap (typically the last N chapter outcomes,
    // open promises, and tone notes); `lastNChapters` is the window size used
    // to produce it.
    rollingSummary: { lastNChapters: 3, summary: "", updatedAt: now },
  };
}

function touch(bible) {
  return { ...bible, updatedAt: new Date().toISOString() };
}

function pushList(bible, key, item, prefix) {
  const id = item.id || nextId(prefix);
  const next = { ...item, id };
  return [touch({ ...bible, [key]: [...(bible[key] || []), next] }), id];
}

export function addCharacter(bible, char) {
  const [next, id] = pushList(bible, "characters", char, "char");
  return { bible: next, id };
}

export function addLocation(bible, loc) {
  const [next, id] = pushList(bible, "locations", loc, "loc");
  return { bible: next, id };
}

export function addFaction(bible, faction) {
  const [next, id] = pushList(bible, "factions", faction, "fac");
  return { bible: next, id };
}

export function addLore(bible, entry) {
  const [next, id] = pushList(bible, "lore", entry, "lore");
  return { bible: next, id };
}

export function addGlossary(bible, term) {
  const [next, id] = pushList(bible, "glossary", term, "term");
  return { bible: next, id };
}

export function addSystemRule(bible, rule) {
  const [next, id] = pushList(bible, "systemRules", rule, "rule");
  return { bible: next, id };
}

export function setStyleGuide(bible, patch) {
  return touch({
    ...bible,
    styleGuide: { ...(bible.styleGuide || {}), ...patch },
  });
}

/**
 * Append a chapter record. Used by chapterPlan after a chapter is drafted.
 */
export function appendChapterRecord(bible, record) {
  const id = record.id || nextId("ch");
  const rec = { ...record, id };
  return {
    bible: touch({ ...bible, chapters: [...(bible.chapters || []), rec] }),
    id,
  };
}

/**
 * Set / replace the rolling summary. `lastNChapters` is optional and defaults
 * to whatever the bible currently has (or 3).
 */
export function setRollingSummary(bible, summary, lastNChapters) {
  const prev = bible.rollingSummary || { lastNChapters: 3, summary: "" };
  return touch({
    ...bible,
    rollingSummary: {
      lastNChapters:
        typeof lastNChapters === "number" ? lastNChapters : prev.lastNChapters,
      summary: typeof summary === "string" ? summary : "",
      updatedAt: new Date().toISOString(),
    },
  });
}

/**
 * Mark a character as present at a given beat, deduplicated.
 */
export function linkCharacterToBeat(bible, characterId, where) {
  return touch({
    ...bible,
    characters: (bible.characters || []).map((c) => {
      if (c.id !== characterId) return c;
      const list = c.beatsPresent || [];
      if (
        list.some(
          (x) => x.book === where.book && x.beat === where.beat
        )
      ) {
        return c;
      }
      return { ...c, beatsPresent: [...list, where] };
    }),
  });
}

export function serializeBible(bible) {
  return JSON.stringify(bible, null, 2);
}

export function parseBible(text) {
  try {
    const raw = typeof text === "string" ? JSON.parse(text) : text;
    if (!raw || typeof raw !== "object") {
      return { bible: null, errors: ["not-an-object"] };
    }
    const errors = [];
    if (!raw.version) errors.push("missing-version");
    const migrated = {
      version: BIBLE_VERSION,
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || new Date().toISOString(),
      contract: raw.contract || null,
      series: raw.series || null,
      characters: raw.characters || [],
      locations: raw.locations || [],
      factions: raw.factions || [],
      lore: raw.lore || [],
      glossary: raw.glossary || [],
      styleGuide: raw.styleGuide || { pov: "", tense: "", voiceRules: [], doNot: [] },
      systemRules: raw.systemRules || [],
      chapters: raw.chapters || [],
      rollingSummary: raw.rollingSummary || {
        lastNChapters: 3,
        summary: "",
        updatedAt: raw.updatedAt || new Date().toISOString(),
      },
    };
    return { bible: migrated, errors };
  } catch (e) {
    return { bible: null, errors: ["unparseable", String(e?.message || e)] };
  }
}

/**
 * Render the bible as Markdown. Includes contract, series, characters,
 * world-building, style guide, system rules. Chapter prose is NOT included
 * by default (it's huge); pass { includeChapters: true } to override.
 */
export function exportBibleMarkdown(bible, { includeChapters = false } = {}) {
  if (!bible) return "";
  const out = [];
  out.push("# Story Bible");
  out.push("");
  out.push(`- **Version:** ${bible.version}`);
  out.push(`- **Created:** ${bible.createdAt}`);
  out.push(`- **Updated:** ${bible.updatedAt}`);
  out.push("");

  // Style guide
  const sg = bible.styleGuide || {};
  out.push("## Style guide");
  out.push("");
  if (sg.pov) out.push(`- **POV:** ${sg.pov}`);
  if (sg.tense) out.push(`- **Tense:** ${sg.tense}`);
  if ((sg.voiceRules || []).length) {
    out.push(`- **Voice rules:**`);
    for (const r of sg.voiceRules) out.push(`  - ${r}`);
  }
  if ((sg.doNot || []).length) {
    out.push(`- **Do NOT:**`);
    for (const r of sg.doNot) out.push(`  - ${r}`);
  }
  out.push("");

  // System rules
  if ((bible.systemRules || []).length) {
    out.push("## System rules (cannot be retconned)");
    out.push("");
    for (const r of bible.systemRules) {
      out.push(`- **${r.name || r.id}:** ${r.rule || r.description || ""}`);
      if (r.exceptions) out.push(`  - _Exceptions:_ ${r.exceptions}`);
    }
    out.push("");
  }

  // Characters
  if ((bible.characters || []).length) {
    out.push("## Characters");
    out.push("");
    for (const c of bible.characters) {
      out.push(`### ${c.name || c.id}`);
      if (c.role) out.push(`- **Role:** ${c.role}`);
      if (c.archetype) out.push(`- **Archetype:** ${c.archetype}`);
      if (c.classRef) out.push(`- **Class:** ${c.classRef}`);
      if (c.lifeStage) out.push(`- **Life stage:** ${c.lifeStage}`);
      if ((c.anchors || []).length) out.push(`- **Anchors:** ${c.anchors.join(", ")}`);
      if (c.arcSummary) out.push(`- **Arc:** ${c.arcSummary}`);
      if ((c.voiceNotes || []).length) {
        out.push(`- **Voice:**`);
        for (const v of c.voiceNotes) out.push(`  - ${v}`);
      }
      out.push("");
    }
  }

  // Locations
  if ((bible.locations || []).length) {
    out.push("## Locations");
    out.push("");
    for (const l of bible.locations) {
      out.push(`- **${l.name || l.id}** — ${l.description || ""}`);
    }
    out.push("");
  }

  // Factions
  if ((bible.factions || []).length) {
    out.push("## Factions");
    out.push("");
    for (const f of bible.factions) {
      out.push(`- **${f.name || f.id}** — ${f.description || ""}`);
    }
    out.push("");
  }

  // Lore
  if ((bible.lore || []).length) {
    out.push("## Lore");
    out.push("");
    for (const e of bible.lore) {
      out.push(`- **${e.topic || e.id}:** ${e.summary || ""}`);
    }
    out.push("");
  }

  // Glossary
  if ((bible.glossary || []).length) {
    out.push("## Glossary");
    out.push("");
    for (const g of bible.glossary) {
      out.push(`- **${g.term || g.id}:** ${g.definition || ""}`);
    }
    out.push("");
  }

  // Chapters (titles only by default)
  if ((bible.chapters || []).length) {
    out.push("## Chapter history");
    out.push("");
    for (const ch of bible.chapters) {
      out.push(
        `- **${ch.num || ch.id}.** ${ch.title || "(untitled)"} — ${ch.summary || ""}`
      );
      if (includeChapters && ch.prose) {
        out.push("");
        out.push(ch.prose);
        out.push("");
      }
    }
    out.push("");
  }

  return out.join("\n");
}

/**
 * Cross-reference checks. Returns string[] of warnings.
 */
export function validateBible(bible) {
  const warnings = [];
  if (!bible) return ["empty-bible"];

  if (!bible.contract) warnings.push("Bible has no contract attached.");
  if (!bible.series) warnings.push("Bible has no series plan attached.");

  // Contract version mismatch
  if (
    bible.contract &&
    bible.contract.version &&
    bible.contract.version !== CONTRACT_VERSION
  ) {
    warnings.push(
      `Contract version (${bible.contract.version}) differs from current (${CONTRACT_VERSION}); run migrateContract.`
    );
  }

  // Style guide minimum
  const sg = bible.styleGuide || {};
  if (!sg.pov) warnings.push("Style guide is missing a POV (1st/3rd/etc).");
  if (!sg.tense) warnings.push("Style guide is missing a tense (past/present).");

  // Characters appearing in beats must exist
  const charIds = new Set((bible.characters || []).map((c) => c.id));
  for (const ch of bible.chapters || []) {
    for (const cid of ch.charactersPresent || []) {
      if (!charIds.has(cid)) {
        warnings.push(
          `Chapter ${ch.num || ch.id} references unknown character id ${cid}.`
        );
      }
    }
  }

  // System rules with no name
  for (const r of bible.systemRules || []) {
    if (!r.name && !r.id) warnings.push("System rule has no name.");
    if (!r.rule && !r.description) {
      warnings.push(`System rule ${r.name || r.id || "(unnamed)"} has no body.`);
    }
  }

  // Glossary collisions
  const seen = new Map();
  for (const g of bible.glossary || []) {
    const t = (g.term || "").toLowerCase().trim();
    if (!t) continue;
    if (seen.has(t)) {
      warnings.push(`Glossary term "${g.term}" is defined more than once.`);
    } else {
      seen.set(t, true);
    }
  }

  return warnings;
}
