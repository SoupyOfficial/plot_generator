// src/lib/combos.js
//
// Combo toast detection. Walks a set of recognizable (field + value) pairs
// and emits a toast text when a new combo lights up.
//
// This is intentionally a curated list — the automatic `highValueCombos`
// from system_story_data keys on archetype+resolution, but the FUN of combo
// toasts is in catching unexpected two-field resonances ("Regressor + Tower").

const COMBOS = [
  {
    id: "regressor-fate",
    label: "⚡ Regressor + Fate-locked ending — classic Korean tower setup.",
    match: (s) =>
      (s.archetype || "").includes("Returner") &&
      (s.resolutionMode || "").toLowerCase().includes("fulfillment"),
  },
  {
    id: "exploiter-apocalypse",
    label: "⚡ Exploiter + System apocalypse — DCC-style dungeon optimizer.",
    match: (s) =>
      (s.archetype || "").includes("Exploiter") &&
      (s.subgenre || "").toLowerCase().includes("apocalypse"),
  },
  {
    id: "builder-cozy",
    label: "🌱 Builder + Cozy LitRPG — Legends-&-Lattes cottagecore vibes.",
    match: (s) =>
      (s.archetype || "").includes("Builder") &&
      (s.subgenre || "").toLowerCase().includes("cozy"),
  },
  {
    id: "investigator-exposure",
    label: "🔎 Investigator + Exposure ending — the mystery IS the climax.",
    match: (s) =>
      (s.archetype || "").includes("Investigator") &&
      (s.resolutionMode || "").toLowerCase().includes("exposure"),
  },
  {
    id: "defier-adversarial",
    label: "🔥 Defier vs. Openly adversarial system — pure autonomy thesis.",
    match: (s) =>
      (s.archetype || "").includes("Defier") &&
      (s.systemAlignment || "").toLowerCase().includes("openly adversarial"),
  },
  {
    id: "truebeliever-deceptive",
    label: "💔 True Believer + Deceptively benevolent system — heartbreak loaded.",
    match: (s) =>
      (s.archetype || "").includes("True Believer") &&
      (s.systemAlignment || "").toLowerCase().includes("deceptively"),
  },
  {
    id: "returner-rival",
    label: "♟ Returner + Rival subplot — foreknowledge meets a peer threat.",
    match: (s) =>
      (s.archetype || "").includes("Returner") &&
      (s.subplots || []).some((x) => (x || "").toLowerCase().includes("rival")),
  },
  {
    id: "exploiter-crafting",
    label: "🛠 Exploiter + Crafting empire — economic-power escalation.",
    match: (s) =>
      (s.archetype || "").includes("Exploiter") &&
      (s.subplots || []).some((x) => (x || "").toLowerCase().includes("crafting")),
  },
  {
    id: "academy-chosen",
    label: "🏫 Academy + Chosen entry — Harry-Potter-but-leveling trope.",
    match: (s) =>
      (s.subgenre || "").toLowerCase().includes("academy") &&
      (s.entryCondition || "").toLowerCase().includes("chosen"),
  },
  {
    id: "dungeon-core-single-loc",
    label: "🏰 Dungeon core + Dungeon-only scale — claustrophobic mastery.",
    match: (s) =>
      (s.subgenre || "").toLowerCase().includes("dungeon core") &&
      (s.worldScale || "").toLowerCase().includes("dungeon"),
  },
  {
    id: "regression-mystery",
    label: "🕰 Regression subgenre + Mystery subplot — Mother-of-Learning pattern.",
    match: (s) =>
      (s.subgenre || "").toLowerCase().includes("regression") &&
      (s.subplots || []).some((x) => (x || "").toLowerCase().includes("mystery")),
  },
  {
    id: "postapoc-survival",
    label: "☣ Post-apocalyptic survival + Costless power flagged — add a human cost.",
    // intentionally a warning-ish combo; shows even contradictions have flavor.
    match: (s) =>
      (s.subgenre || "").toLowerCase().includes("post-apoc") &&
      (s.costOfPower || "").toLowerCase().includes("none"),
  },
  {
    id: "xianxia-pre-modern",
    label: "⛩ Xianxia / wuxia + Pre-modern — classic jianghu tone.",
    match: (s) =>
      (s.subgenre || "").toLowerCase().includes("xianxia") &&
      (s.techLevel || "").toLowerCase().includes("pre-modern"),
  },
  {
    id: "accidental-reluctant",
    label: "🎭 Accidental + Reluctant subplots — humanity-first grounding.",
    match: (s) =>
      (s.archetype || "").includes("Accidental") &&
      (s.archetypeFlavor || "").toLowerCase().includes("reluctant"),
  },
  {
    id: "knowledge-consequence",
    label: "📜 Knowledge-vs-Consequence theme + Conspiracy subplot — the good kind of drift.",
    match: (s) =>
      (s.primaryTheme || "").toLowerCase().includes("knowledge") &&
      (s.subplots || []).some((x) => (x || "").toLowerCase().includes("conspiracy")),
  },
];

/**
 * Return the combo IDs currently triggered by the given selections.
 */
export function detectCombos(selections = {}) {
  const out = [];
  for (const c of COMBOS) {
    try {
      if (c.match(selections)) out.push({ id: c.id, label: c.label });
    } catch {
      /* ignore match errors */
    }
  }
  return out;
}

/**
 * Compare old vs. new selections and return combos that are NEWLY triggered
 * (not present before). Used to fire toasts only on new transitions.
 */
export function newlyTriggered(prevSelections, nextSelections) {
  const prev = new Set(detectCombos(prevSelections).map((c) => c.id));
  const curr = detectCombos(nextSelections);
  return curr.filter((c) => !prev.has(c.id));
}

export { COMBOS as KNOWN_COMBOS };
